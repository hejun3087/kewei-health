import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Empty } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../utils/api';

const medColumns = [
  { title: '药品名称', dataIndex: 'drugName', key: 'drugName' },
  { title: '用法用量', key: 'usage', render: (_: any, r: any) => [r.usage, r.dosage, r.frequency].filter(Boolean).join(' · ') || '-' },
  { title: '开始日期', dataIndex: 'startDate', key: 'startDate', render: (v: string) => v?.slice(0, 10) || '-' },
  {
    title: '状态', dataIndex: 'status', key: 'status',
    render: (v: string) => v === 'USING' ? <Tag color="green">使用中</Tag> : <Tag>已停用</Tag>,
  },
];

export default function DiagnosisDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [linkedReport, setLinkedReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/diagnoses/${id}`)
      .then(async (res) => {
        const data = res.data;
        setDiagnosis(data);
        // 关联报告联动：诊断.reportId → 报告详情（含关联用药）
        if (data.reportId) {
          try {
            const r = await api.get(`/reports/${data.reportId}`);
            setLinkedReport(r.data);
          } catch { /* 关联报告可能已删除 */ }
        }
      })
      .catch(() => navigate('/diagnoses'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;
  if (!diagnosis) return <Empty description="就诊记录不存在" />;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Card title="就诊详情" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="就诊日期">{diagnosis.visitDate?.slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="家庭成员">{diagnosis.member?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="医院">{diagnosis.hospital || '-'}</Descriptions.Item>
          <Descriptions.Item label="科室">{diagnosis.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="接诊医生">{diagnosis.doctor || '-'}</Descriptions.Item>
          <Descriptions.Item label="ICD-10 编码">{diagnosis.diagnosisCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="主诉" span={2}>{diagnosis.complaint || '-'}</Descriptions.Item>
          <Descriptions.Item label="诊断结果" span={2}>{diagnosis.diagnosisText}</Descriptions.Item>
          <Descriptions.Item label="医嘱" span={2}>{diagnosis.advice || '-'}</Descriptions.Item>
          <Descriptions.Item label="下次复诊" span={2}>{diagnosis.nextVisitDate?.slice(0, 10) || '未安排'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="关联检查报告" style={{ marginBottom: 16 }}>
        {linkedReport ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="报告日期">{linkedReport.reportDate?.slice(0, 10)}</Descriptions.Item>
            <Descriptions.Item label="分类"><Tag color="blue">{linkedReport.categoryL1}</Tag> {linkedReport.categoryL2 || ''}</Descriptions.Item>
            <Descriptions.Item label="医院">{linkedReport.hospital || '-'}</Descriptions.Item>
            <Descriptions.Item label="摘要">{linkedReport.summary || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作" span={2}>
              <Link to={`/reports/${linkedReport.id}`}><Button type="link" icon={<FileTextOutlined />}>查看报告详情</Button></Link>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description={diagnosis.reportId ? '关联报告已删除' : '本次就诊未关联检查报告'} style={{ padding: 24 }} />
        )}
      </Card>

      <Card title="关联用药">
        {linkedReport?.medications?.length > 0 ? (
          <Table dataSource={linkedReport.medications} columns={medColumns} rowKey="id" pagination={false} />
        ) : (
          <Empty description="暂无关联用药记录" style={{ padding: 24 }} />
        )}
      </Card>
    </div>
  );
}
