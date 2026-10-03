import { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, message, Descriptions, Modal, List, Tag, Space, Alert, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const relationOptions = [
  { value: 'SELF', label: '本人' },
  { value: 'SPOUSE', label: '配偶' },
  { value: 'FATHER', label: '父亲' },
  { value: 'MOTHER', label: '母亲' },
  { value: 'CHILD', label: '子女' },
  { value: 'SIBLING', label: '兄弟姐妹' },
  { value: 'OTHER', label: '其他' },
];

const relationMap: Record<string, string> = {
  SELF: '本人', SPOUSE: '配偶', FATHER: '父亲', MOTHER: '母亲',
  CHILD: '子女', SIBLING: '兄弟姐妹', OTHER: '其他',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [members, setMembers] = useState<any[]>([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        nickname: user.nickname,
        phone: user.phone,
        gender: user.gender,
        birthDate: user.birthDate?.slice(0, 10),
        height: user.height,
        weight: user.weight,
        allergyHistory: user.allergyHistory,
        medicalHistory: user.medicalHistory,
      });
    }
    fetchMembers();
  }, [user]);

  const fetchMembers = () => {
    api.get('/family-members').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.members || [];
      setMembers(data);
    }).catch(() => {});
  };

  const handleSaveProfile = async (values: any) => {
    try {
      await api.put('/user/profile', values);
      message.success('个人信息已保存');
      refreshUser();
    } catch {}
  };

  const handleAddMember = async (values: any) => {
    const { consent, ...payload } = values; // consent 仅为前端授权确认勾选项，不提交后端
    try {
      if (editingMember) {
        await api.put(`/family-members/${editingMember.id}`, payload);
        message.success('成员信息已更新');
      } else {
        await api.post('/family-members', payload);
        message.success('家庭成员已添加');
      }
      setMemberModalOpen(false);
      setEditingMember(null);
      memberForm.resetFields();
      fetchMembers();
    } catch {}
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    memberForm.setFieldsValue(member);
    setMemberModalOpen(true);
  };

  const handleDeleteMember = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复',
      onOk: async () => {
        await api.delete(`/family-members/${id}`);
        message.success('已删除');
        fetchMembers();
      },
    });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>个人中心</h2>

      <Card title="个人信息" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSaveProfile}>
          <Form.Item label="昵称" name="nickname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input disabled />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select options={[{ value: 'MALE', label: '男' }, { value: 'FEMALE', label: '女' }]} allowClear />
          </Form.Item>
          <Form.Item label="出生日期" name="birthDate">
            <Input type="date" />
          </Form.Item>
          <Form.Item label="身高(cm)" name="height">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="体重(kg)" name="weight">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="过敏史" name="allergyHistory">
            <Input.TextArea rows={3} placeholder="如：青霉素过敏、花粉过敏等" />
          </Form.Item>
          <Form.Item label="慢性病史" name="medicalHistory">
            <Input.TextArea rows={3} placeholder="如：高血压、糖尿病等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="家庭成员管理"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
            setEditingMember(null);
            memberForm.resetFields();
            setMemberModalOpen(true);
          }}>
            添加成员
          </Button>
        }
      >
        <List
          dataSource={members}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditMember(item)}>编辑</Button>,
                !item.isDefault && <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteMember(item.id)}>删除</Button>,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <span>
                    {item.name}
                    {item.isDefault && <Tag color="blue" style={{ marginLeft: 8 }}>默认</Tag>}
                  </span>
                }
                description={relationMap[item.relation] || item.relation}
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editingMember ? '编辑家庭成员' : '添加家庭成员'}
        open={memberModalOpen}
        onCancel={() => { setMemberModalOpen(false); setEditingMember(null); }}
        onOk={() => memberForm.submit()}
      >
        <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input placeholder="成员姓名" />
          </Form.Item>
          <Form.Item name="relation" label="与本人关系" rules={[{ required: true }]}>
            <Select options={relationOptions.filter((o) => o.value !== 'SELF')} placeholder="选择关系" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select options={[{ value: 'MALE', label: '男' }, { value: 'FEMALE', label: '女' }]} allowClear />
          </Form.Item>
          <Form.Item name="birthDate" label="出生日期">
            <Input type="date" />
          </Form.Item>
          {!editingMember && (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="您正在录入他人（家庭成员）的个人健康信息"
                description="请确保已征得该成员本人同意；若其为未满十四周岁未成年人或无民事行为能力人，需征得其监护人同意。"
              />
              <Form.Item
                name="consent"
                valuePropName="checked"
                rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('请先确认已获本人/监护人授权'))) }]}
              >
                <Checkbox>
                  我确认已获得该成员本人（或其监护人）的授权，代其录入并管理健康信息。
                </Checkbox>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
