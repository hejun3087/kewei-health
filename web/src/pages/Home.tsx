import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, List, Tag, Button, Empty, Spin } from 'antd';
import { FileTextOutlined, MedicineBoxOutlined, CloudUploadOutlined, ArrowUpOutlined } from '@ant-design/icons';
import api from '../utils/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard').catch(() => ({ data: { totalReports: 0, recentReports: [] } })),
      api.get('/medications/current').catch(() => ({ data: [] })),
      api.get('/reports/trackable-items').catch(() => ({ data: [] })),
    ])
      .then(([reportsRes, medsRes, trackRes]) => {
        setDashboard({
          totalReports: reportsRes.data.totalReports || 0,
          currentMedications: Array.isArray(medsRes.data) ? medsRes.data.length : 0,
          trackableItems: Array.isArray(trackRes.data) ? trackRes.data.length : 0,
          recentReports: reportsRes.data.recentReports || [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>健康概览</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="检查报告" value={dashboard.totalReports} prefix={<FileTextOutlined />} suffix="份" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="当前用药" value={dashboard.currentMedications} prefix={<MedicineBoxOutlined />} suffix="种" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="可追踪指标" value={dashboard.trackableItems} prefix={<ArrowUpOutlined />} suffix="项" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="最近报告" extra={<Button type="link" onClick={() => navigate('/reports')}>查看全部</Button>}>
            <List
              dataSource={dashboard.recentReports}
              renderItem={(item: any) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/reports/${item.id}`)}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color="blue">{item.categoryL1}</Tag>
                        {item.categoryL2}
                      </span>
                    }
                    description={`${item.hospital || ''} · ${item.reportDate?.slice(0, 10) || ''}`}
                  />
                  <span style={{ color: '#666' }}>{item.summary || ''}</span>
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="暂无报告，快去上传吧" /> }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Button type="primary" icon={<CloudUploadOutlined />} block size="large" onClick={() => navigate('/upload')}>
              上传报告
            </Button>
            <Button icon={<FileTextOutlined />} block size="large" style={{ marginTop: 12 }} onClick={() => navigate('/reports')}>
              查看报告
            </Button>
            <Button icon={<ArrowUpOutlined />} block size="large" style={{ marginTop: 12 }} onClick={() => navigate('/trend')}>
              趋势分析
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
