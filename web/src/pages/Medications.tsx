import { Table, Tag, Tabs, Button } from 'antd';

const mockMedications = [
  { id: '1', drugName: '阿莫西林胶囊', specification: '0.5g', usage: '口服', dosage: '每次1粒', frequency: '每日3次', startDate: '2026-09-20', status: 'USING' },
  { id: '2', drugName: '布洛芬缓释胶囊', specification: '0.3g', usage: '口服', dosage: '每次1粒', frequency: '每日2次', startDate: '2026-09-20', status: 'USING' },
  { id: '3', drugName: '阿司匹林肠溶片', specification: '100mg', usage: '口服', dosage: '每次1片', frequency: '每日1次', startDate: '2026-08-01', endDate: '2026-09-01', status: 'STOPPED' },
];

const columns = [
  { title: '药品名称', dataIndex: 'drugName', key: 'drugName' },
  { title: '规格', dataIndex: 'specification', key: 'specification' },
  { title: '用法', dataIndex: 'usage', key: 'usage' },
  { title: '用量', dataIndex: 'dosage', key: 'dosage' },
  { title: '频次', dataIndex: 'frequency', key: 'frequency' },
  { title: '开始日期', dataIndex: 'startDate', key: 'startDate' },
  { title: '结束日期', dataIndex: 'endDate', key: 'endDate', render: (v: string) => v || '-' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => v === 'USING' ? <Tag color="green">使用中</Tag> : <Tag color="default">已停用</Tag> },
];

export default function MedicationsPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用药记录</h2>
      <Tabs items={[
        {
          key: 'current',
          label: '当前用药',
          children: <Table dataSource={mockMedications.filter(m => m.status === 'USING')} columns={columns} rowKey="id" pagination={false} />,
        },
        {
          key: 'history',
          label: '历史用药',
          children: <Table dataSource={mockMedications} columns={columns} rowKey="id" />,
        },
      ]} />
    </div>
  );
}
