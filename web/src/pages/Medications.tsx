import { useEffect, useState } from 'react';
import { Table, Tag, Tabs, Button, Space, Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../utils/api';

const drugCategoryOptions = [
  { value: 'WESTERN', label: '西药' },
  { value: 'CHINESE_PATENT', label: '中成药' },
  { value: 'HERBAL', label: '中草药' },
  { value: 'SUPPLEMENT', label: '保健品' },
];

export default function MedicationsPage() {
  const [medications, setMedications] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchMedications = () => {
    setLoading(true);
    api.get('/medications').then((res) => {
      setMedications(Array.isArray(res.data) ? res.data : res.data?.items || res.data?.medications || []);
    }).finally(() => setLoading(false));
  };

  const fetchMembers = () => {
    api.get('/family-members').then((res) => {
      setMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchMedications();
    fetchMembers();
  }, []);

  const handleAdd = async (values: any) => {
    try {
      const payload = { ...values };
      if (payload.startDate) payload.startDate = payload.startDate.format('YYYY-MM-DD');
      if (payload.endDate) payload.endDate = payload.endDate.format('YYYY-MM-DD');
      await api.post('/medications', payload);
      message.success('用药记录已添加');
      setModalOpen(false);
      form.resetFields();
      fetchMedications();
    } catch {}
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复',
      onOk: async () => {
        await api.delete(`/medications/${id}`);
        message.success('已删除');
        fetchMedications();
      },
    });
  };

  const columns = [
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName' },
    { title: '规格', dataIndex: 'specification', key: 'specification', render: (v: string) => v || '-' },
    { title: '用法', dataIndex: 'usage', key: 'usage', render: (v: string) => v || '-' },
    { title: '用量', dataIndex: 'dosage', key: 'dosage', render: (v: string) => v || '-' },
    { title: '频次', dataIndex: 'frequency', key: 'frequency', render: (v: string) => v || '-' },
    { title: '开始日期', dataIndex: 'startDate', key: 'startDate', render: (v: string) => v?.slice(0, 10) || '-' },
    { title: '结束日期', dataIndex: 'endDate', key: 'endDate', render: (v: string) => v?.slice(0, 10) || '-' },
    { title: '类型', dataIndex: 'category', key: 'category', width: 80, render: (v: string) => {
      const opt = drugCategoryOptions.find((o) => o.value === v);
      return opt?.label || v;
    }},
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => v === 'USING' ? <Tag color="green">使用中</Tag> : <Tag color="default">已停用</Tag> },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}><DeleteOutlined /></Button>
      ),
    },
  ];

  const current = medications.filter((m) => m.status === 'USING');
  const history = medications.filter((m) => m.status !== 'USING');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>用药记录</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加用药</Button>
      </div>

      <Tabs items={[
        {
          key: 'current',
          label: `当前用药 (${current.length})`,
          children: <Table dataSource={current} columns={columns} rowKey="id" loading={loading} pagination={false} />,
        },
        {
          key: 'history',
          label: `历史用药 (${history.length})`,
          children: <Table dataSource={history} columns={columns} rowKey="id" loading={loading} />,
        },
      ]} />

      <Modal title="添加用药记录" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleAdd} initialValues={{ category: 'WESTERN' }}>
          <Form.Item name="memberId" label="家庭成员" rules={[{ required: true }]}>
            <Select placeholder="选择成员" options={members.map((m) => ({ value: m.id, label: m.name }))} />
          </Form.Item>
          <Form.Item name="drugName" label="药品名称" rules={[{ required: true }]}>
            <Input placeholder="通用名" />
          </Form.Item>
          <Form.Item name="specification" label="规格">
            <Input placeholder="如：0.5g/粒" />
          </Form.Item>
          <Form.Item name="category" label="药品类型">
            <Select options={drugCategoryOptions} />
          </Form.Item>
          <Form.Item name="usage" label="用法">
            <Input placeholder="如：口服" />
          </Form.Item>
          <Form.Item name="dosage" label="用量">
            <Input placeholder="如：每次1粒" />
          </Form.Item>
          <Form.Item name="frequency" label="频次">
            <Input placeholder="如：每日3次" />
          </Form.Item>
          <Form.Item name="startDate" label="开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="结束日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
