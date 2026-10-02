import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, List, Tag, Button, Empty, Spin, Alert, Space } from 'antd';
import { FileTextOutlined, MedicineBoxOutlined, CloudUploadOutlined, ArrowUpOutlined, CalendarOutlined } from '@ant-design/icons';
import api from '../utils/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard').catch(() => ({ data: { totalReports: 0, recentReports: [] } })),
      api.get('/medications/current').catch(() => ({ data: [] })),
      api.get('/reports/trackable-items').catch(() => ({ data: [] })),
      api.get('/diagnoses/upcoming-visits').catch(() => ({ data: [] })),
    ])
      .then(([reportsRes, medsRes, trackRes, visitsRes]) => {
        setDashboard({
          totalReports: reportsRes.data.totalReports || 0,
          currentMedications: Array.isArray(medsRes.data) ? medsRes.data.length : 0,
          trackableItems: Array.isArray(trackRes.data) ? trackRes.data.length : 0,
          recentReports: reportsRes.data.recentReports || [],
        });
        setUpcomingVisits(Array.isArray(visitsRes.data) ? visitsRes.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>健康概览</h2>

      {upcomingVisits.length > 0 && (
        <Alert
          style={{ marginBottom: 24 }}
          type={upcomingVisits.some((v) => v.overdue) ? 'error' : 'warning'}
          showIcon
          icon={<CalendarOutlined />}
          message={
            <span>
              复诊提醒：{upcomingVisits.filter((v) => v.overdue).length > 0 && `${upcomingVisits.filter((v) => v.overdue).length} 项已逾期，`}
              {upcomingVisits.filter((v) => !v.overdue).length > 0 && `${upcomingVisits.filter((v) => !v.overdue).length} 项即将到期`}
            </span>
          }
          description={
            <Space direction="vertical" size={4}>
              {upcomingVisits.slice(0, 3).map((v: any) => (
                <span key={v.id}>
                  {v.member?.name ? `${v.member.name} · ` : ''}
                  {v.hospital || '就诊'} 复诊：{v.nextVisitDate?.slice(0, 10)}
                  {v.overdue
                    ? <Tag color="red" style={{ marginLeft: 8 }}>已逾期 {-v.daysLeft} 天</Tag>
                    : <Tag color="orange" style={{ marginLeft: 8 }}>{v.daysLeft === 0 ? '今天' : `${v.daysLeft} 天后`}</Tag>}
                </span>
              ))}
            </Space>
          }
          action={<Button size="small" onClick={() => navigate('/diagnoses')}>查看全部</Button>}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="检查报告" value={dashboard.totalReports} prefix={<FileTextOutlined />} suffix="份" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="当前用药" value={dashboard.currentMedications} prefix={<MedicineBoxOutlined />} suffix="种" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="可追踪指标" value={dashboard.trackableItems} prefix={<ArrowUpOutlined />} suffix="项" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
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
        <Col xs={24} lg={8}>
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
