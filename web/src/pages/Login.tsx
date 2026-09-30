import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Tabs, message } from 'antd';
import { LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePhoneLogin = async (values: { phone: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/phone', values);
      if (res.data.token) {
        login(res.data.token, res.data.user);
        message.success('登录成功');
        navigate('/');
      }
    } catch {
      // 错误由拦截器处理
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/password', values);
      if (res.data.token) {
        login(res.data.token, res.data.user);
        message.success('登录成功');
        navigate('/');
      }
    } catch {
      // 错误由拦截器处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', margin: 0 }}>可为健康</h1>
          <p style={{ color: '#666', marginTop: 8 }}>个人健康档案智能管理平台</p>
        </div>

        <Tabs
          centered
          items={[
            {
              key: 'phone',
              label: '手机号登录',
              children: (
                <Form onFinish={handlePhoneLogin} size="large">
                  <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}>
                    <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      登录 / 注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'password',
              label: '密码登录',
              children: (
                <Form onFinish={handlePasswordLogin} size="large">
                  <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                    <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
