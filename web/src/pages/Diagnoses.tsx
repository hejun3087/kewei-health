import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../utils/api';
import EmptyGuide from '../components/EmptyGuide';

export default function DiagnosesPage() {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get('/diagnoses').then((res) => {
      setDiagnoses(Array.isArray(res.data) ? res.data : res.data?.items || res.data?.diagnoses || []);
    }).finally(() => setLoading(false));
  };

  const fetchMembers = () => {
    api.get('/family-members').then((res) => {
      setMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchData();
    fetchMembers();
  }, []);

  const handleAdd = async (values: any) => {
    try {
      const payload = {
        ...values,
        visitDate: values.visitDate.format('YYYY-MM-DD'),
      };
      await api.post('/diagnoses', payload);
      message.success('就诊记录已添加');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {}
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复',
      onOk: async () => {
        await api.delete(`/diagnoses/${id}`);
        message.success('已删除');
        fetchData();
      },
    });
  };

  const columns = [
    { title: '就诊日期', dataIndex: 'visitDate', key: 'visitDate', width: 120, render: (v: string) => v?.slice(0, 10) },
    { title: '医院', dataIndex: 'hospital', key: 'hospital', render: (v: string) => v || '-' },
    { title: '科室', dataIndex: 'department', key: 'department', width: 100, render: (v: string) => v || '-' },
    { title: '诊断', dataIndex: 'diagnosisText', key: 'diagnosisText', ellipsis: true },
    { title: '医嘱', dataIndex: 'advice', key: 'advice', ellipsis: true },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/diagnoses/${record.id}`)}>详情</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}><DeleteOutlined /></Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>就诊记录</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>手动添加</Button>
      </div>

      <Table dataSource={diagnoses} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} locale={{ emptyText: <EmptyGuide description="还没有就诊记录，添加后可关联检查报告与用药，形成完整就诊脉络" actionText="添加就诊记录" onAction={() => setModalOpen(true)} /> }} />

      <Modal title="添加就诊记录" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="memberId" label="家庭成员" rules={[{ required: true }]}>
            <Select placeholder="选择成员" options={members.map((m) => ({ value: m.id, label: m.name }))} />
          </Form.Item>
          <Form.Item name="visitDate" label="就诊日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hospital" label="医院">
            <Input placeholder="医院名称" />
          </Form.Item>
          <Form.Item name="department" label="科室">
            <Input placeholder="如：内科" />
          </Form.Item>
          <Form.Item name="complaint" label="主诉">
            <Input.TextArea rows={2} placeholder="症状描述" />
          </Form.Item>
          <Form.Item name="diagnosisText" label="诊断结果" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="医生诊断" />
          </Form.Item>
          <Form.Item name="advice" label="医嘱">
            <Input.TextArea rows={2} placeholder="医嘱/处置意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
