import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  LineChartOutlined,
  CloudUploadOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/reports', icon: <FileTextOutlined />, label: '检查报告' },
  { key: '/medications', icon: <MedicineBoxOutlined />, label: '用药记录' },
  { key: '/trend', icon: <LineChartOutlined />, label: '趋势分析' },
  { key: '/upload', icon: <CloudUploadOutlined />, label: '上传报告' },
  { key: '/profile', icon: <UserOutlined />, label: '个人中心' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  // 当前选中的菜单项
  const selectedKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220} style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1677ff', margin: 0 }}>
            可为健康
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span>我的账户</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
