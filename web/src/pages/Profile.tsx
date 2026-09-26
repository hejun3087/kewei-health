import { useState } from 'react';
import { Card, Form, Input, Select, Button, message, Descriptions, Divider } from 'antd';

export default function ProfilePage() {
  const [form] = Form.useForm();

  const handleSave = (values: any) => {
    message.success('个人信息已保存');
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>个人中心</h2>

      <Card title="个人信息" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ nickname: '张三', phone: '138****8888' }}>
          <Form.Item label="昵称" name="nickname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input disabled />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select options={[{ value: 'MALE', label: '男' }, { value: 'FEMALE', label: '女' }]} />
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

      <Card title="家庭成员管理">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="本人">张三（默认）</Descriptions.Item>
        </Descriptions>
        <Button type="dashed" block style={{ marginTop: 16 }}>+ 添加家庭成员</Button>
      </Card>
    </div>
  );
}
