import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Spin, Result, Image, Typography } from 'antd';
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
  { title: '参考范围', dataIndex: 'referenceText', key: 'referenceText', render: (v: string, r: any) => v || [r.referenceMin, r.referenceMax].filter((x: any) => x != null).join(' ~ ') || '-' },
  {
    title: '异常', dataIndex: 'abnormal', key: 'abnormal',
    render: (v: string) => {
      const info = abnormalMap[v];
      return info ? <Tag color={info.color}>{info.text}</Tag> : '-';
    },
  },
];

// 免登录只读分享页（4.3.2）：凭 token 查看，展示脱敏数据
export default function ShareViewPage() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/share/view/${token}`)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err?.response?.data?.message || '分享链接无效或已过期'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  if (error || !report) {
    return (
      <Result
        status="403"
        title="无法查看该报告"
        subTitle={error || '分享链接无效或已过期'}
        style={{ paddingTop: 80 }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Typography.Title level={4}>健康报告分享</Typography.Title>
      <Typography.Paragraph type="secondary">来自「可为健康」的只读分享，链接 30 天内有效。</Typography.Paragraph>

      <Card title="报告信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="报告日期">{report.reportDate?.slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="成员">{report.member?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="分类"><Tag color="blue">{report.categoryL1}</Tag> {report.categoryL2 || ''}</Descriptions.Item>
          <Descriptions.Item label="医院">{report.hospital || '-'}</Descriptions.Item>
          <Descriptions.Item label="科室">{report.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}>{report.summary || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="检查明细">
        {report.items?.length > 0 ? (
          <Table dataSource={report.items} columns={itemColumns} rowKey={(r: any) => r.name + (r.value ?? '')} pagination={false} size="small" />
        ) : (
          <Typography.Text type="secondary">暂无检查明细</Typography.Text>
        )}

        {report.images?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Typography.Paragraph strong>原始报告图片</Typography.Paragraph>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {report.images.map((img: any, i: number) => (
                  <Image key={i} width={120} src={img.thumbnailUrl || img.imageUrl} />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}
      </Card>
    </div>
  );
}
