import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../utils/api';

const abnormalMap: Record<string, { color: string; text: string }> = {
  NORMAL: { color: 'green', text: '正常' },
  HIGH: { color: 'red', text: '偏高 ↑' },
  LOW: { color: 'blue', text: '偏低 ↓' },
  ABNORMAL: { color: 'orange', text: '异常' },
};

const itemColumns = [
  { title: '检查项目', dataIndex: 'name', key: 'name' },
  { title: '检测结果', dataIndex: 'value', key: 'value' },
  { title: '单位', dataIndex: 'unit', key: 'unit', render: (v: string) => v || '-' },
  { title: '参考范围', dataIndex: 'referenceText', key: 'referenceText', render: (v: string) => v || '-' },
  {
    title: '异常', dataIndex: 'abnormal', key: 'abnormal',
    render: (v: string) => {
      const info = abnormalMap[v];
      return info ? <Tag color={info.color}>{info.text}</Tag> : '-';
    },
  },
];

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/reports/${id}`)
      .then((res) => setReport(res.data))
      .catch(() => navigate('/reports'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;
  if (!report) return <Empty description="报告不存在" />;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Card title="报告详情">
        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="报告日期">{report.reportDate?.slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="医院">{report.hospital || '-'}</Descriptions.Item>
          <Descriptions.Item label="分类"><Tag color="blue">{report.categoryL1}</Tag> {report.categoryL2 || ''}</Descriptions.Item>
          <Descriptions.Item label="科室">{report.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}>{report.summary || '-'}</Descriptions.Item>
        </Descriptions>

        {report.items?.length > 0 ? (
          <Table dataSource={report.items} columns={itemColumns} rowKey="id" pagination={false} />
        ) : (
          <Empty description="暂无检查明细" style={{ padding: 40 }} />
        )}
      </Card>
    </div>
  );
}
