import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePhoneLogin = async (values: { phone: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success('登录成功');
        navigate('/');
      }
    } catch (err) {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success('登录成功');
        navigate('/');
      }
    } catch (err) {
      message.error('登录失败，请检查手机号和密码');
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
                  <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
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
