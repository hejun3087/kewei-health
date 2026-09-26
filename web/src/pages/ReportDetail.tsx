import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Image, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const mockReport = {
  reportDate: '2026-09-20', categoryL1: '血液检查', categoryL2: '血常规',
  hospital: '北京协和医院', department: '检验科', doctor: '李医生',
  summary: '血常规检查，各项指标基本正常',
  items: [
    { name: '白细胞计数', value: '6.8', unit: '10^9/L', reference: '3.5-9.5', abnormal: 'NORMAL' },
    { name: '红细胞计数', value: '4.52', unit: '10^12/L', reference: '4.3-5.8', abnormal: 'NORMAL' },
    { name: '血红蛋白', value: '138', unit: 'g/L', reference: '130-175', abnormal: 'NORMAL' },
    { name: '血小板计数', value: '225', unit: '10^9/L', reference: '125-350', abnormal: 'NORMAL' },
  ],
};

const itemColumns = [
  { title: '检查项目', dataIndex: 'name', key: 'name' },
  { title: '检测结果', dataIndex: 'value', key: 'value' },
  { title: '单位', dataIndex: 'unit', key: 'unit' },
  { title: '参考范围', dataIndex: 'reference', key: 'reference' },
  {
    title: '异常', dataIndex: 'abnormal', key: 'abnormal',
    render: (v: string) => {
      if (v === 'HIGH') return <Tag color="red">偏高 ↑</Tag>;
      if (v === 'LOW') return <Tag color="blue">偏低 ↓</Tag>;
      return <Tag color="green">正常</Tag>;
    },
  },
];

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Card title="报告详情">
        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="报告日期">{mockReport.reportDate}</Descriptions.Item>
          <Descriptions.Item label="医院">{mockReport.hospital}</Descriptions.Item>
          <Descriptions.Item label="分类"><Tag color="blue">{mockReport.categoryL1}</Tag> {mockReport.categoryL2}</Descriptions.Item>
          <Descriptions.Item label="科室">{mockReport.department}</Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}>{mockReport.summary}</Descriptions.Item>
        </Descriptions>

        <Tabs items={[
          {
            key: 'items',
            label: '检查明细',
            children: <Table dataSource={mockReport.items} columns={itemColumns} rowKey="name" pagination={false} />,
          },
          {
            key: 'images',
            label: '原始图片',
            children: <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无原始图片</div>,
          },
          {
            key: 'trend',
            label: '趋势图',
            children: <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>需要至少2次同类检查数据才能生成趋势图</div>,
          },
        ]} />
      </Card>
    </div>
  );
}
