import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Drawer, Button, Grid } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  LineChartOutlined,
  CloudUploadOutlined,
  UserOutlined,
  LogoutOutlined,
  SolutionOutlined,
  CrownOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/reports', icon: <FileTextOutlined />, label: '检查报告' },
  { key: '/diagnoses', icon: <SolutionOutlined />, label: '就诊记录' },
  { key: '/medications', icon: <MedicineBoxOutlined />, label: '用药记录' },
  { key: '/trend', icon: <LineChartOutlined />, label: '趋势分析' },
  { key: '/upload', icon: <CloudUploadOutlined />, label: '上传报告' },
  { key: '/membership', icon: <CrownOutlined />, label: '会员中心' },
  { key: '/shares', icon: <ShareAltOutlined />, label: '我的分享' },
  { key: '/access-records', icon: <HistoryOutlined />, label: '访问记录' },
  { key: '/profile', icon: <UserOutlined />, label: '个人中心' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  // 响应式（2.4.4）：<lg 断点视为移动端，侧边栏收纳为抽屉
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  const selectedKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];

  // 菜单内容桌面/移动共用一份
  const renderMenu = (onNavigate?: () => void) => (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={({ key }) => {
        navigate(key);
        onNavigate?.();
      }}
      style={{ border: 'none', marginTop: 8 }}
    />
  );

  const brandHeader = (
    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1677ff', margin: 0 }}>
        可为健康
      </h1>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端：固定侧边栏 */}
      {!isMobile && (
        <Sider theme="light" width={220} style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}>
          {brandHeader}
          {renderMenu()}
        </Sider>
      )}
      <Layout>
        <Header style={{ background: '#fff', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {isMobile ? (
            <>
              <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="打开菜单" />
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>可为健康</span>
            </>
          ) : null}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              {!isMobile && <span>{user?.nickname || '我的账户'}</span>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24, padding: isMobile ? 12 : 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* 移动端：抽屉式菜单 */}
      <Drawer
        placement="left"
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={240}
        styles={{ body: { padding: 0 } }}
        title="可为健康"
      >
        {renderMenu(() => setDrawerOpen(false))}
      </Drawer>
    </Layout>
  );
}
