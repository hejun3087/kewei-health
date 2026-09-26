import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, List, Tag, Button, Empty } from 'antd';
import { FileTextOutlined, MedicineBoxOutlined, CloudUploadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export default function HomePage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    // TODO: 从API获取数据，当前使用模拟数据
    setDashboard({
      totalReports: 12,
      currentMedications: 3,
      trackableItems: 8,
      recentReports: [
        { id: '1', reportDate: '2026-09-20', categoryL1: '血液检查', categoryL2: '血常规', hospital: '北京协和医院', summary: '各项指标正常' },
        { id: '2', reportDate: '2026-09-15', categoryL1: '生化检查', categoryL2: '肝功能', hospital: '北京协和医院', summary: 'ALT偏高' },
        { id: '3', reportDate: '2026-09-10', categoryL1: '影像检查', categoryL2: '腹部B超', hospital: '北京大学人民医院', summary: '未见异常' },
      ],
    });
  }, []);

  if (!dashboard) return null;

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
                    description={`${item.hospital} · ${item.reportDate}`}
                  />
                  <span style={{ color: '#666' }}>{item.summary}</span>
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
