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
  SafetyCertificateOutlined,
  TeamOutlined,
  LinkOutlined,
  SettingOutlined,
  UserSwitchOutlined,
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

// RBAC P0/P1/P2：管理端菜单分组（按角色显隐子项）。
// 隐藏菜单仅为体验，不是安全边界；实际路由与管理端 API 受 RequireRole + 后端 RolesGuard/StepUpGuard 双重保护。
const ADMIN_SUBMENU = {
  key: 'admin',
  icon: <SettingOutlined />,
  label: '管理后台',
  children: [
    { key: '/admin/audit', icon: <SafetyCertificateOutlined />, label: '管理端日志', roles: ['SUPER_ADMIN', 'AUDITOR'] },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理', roles: ['SUPER_ADMIN', 'OPERATOR', 'AUDITOR'] },
    { key: '/admin/shares', icon: <LinkOutlined />, label: '分享管理', roles: ['SUPER_ADMIN', 'OPERATOR', 'AUDITOR'] },
    { key: '/admin/permission-history', icon: <UserSwitchOutlined />, label: '权限变更履历', roles: ['SUPER_ADMIN', 'AUDITOR'] },
  ],
};

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

  // /admin/xxx 两段路径直接高亮完整路径；其余取一级路径
  const selectedKey = location.pathname.startsWith('/admin/')
    ? location.pathname
    : location.pathname === '/'
      ? '/'
      : '/' + location.pathname.split('/')[1];

  // 基于后端 /auth/me 回传的角色快照动态拼接菜单（普通用户不展示管理端入口）
  const userRoles = Array.isArray(user?.roles) ? user!.roles! : [];
  const adminChildren = ADMIN_SUBMENU.children.filter((c) => c.roles.some((r) => userRoles.includes(r)));
  const visibleMenuItems = adminChildren.length
    ? [
        ...menuItems.slice(0, menuItems.length - 1),
        { ...ADMIN_SUBMENU, children: adminChildren.map(({ roles: _roles, ...item }) => item) },
        menuItems[menuItems.length - 1],
      ]
    : menuItems;

  // 菜单内容桌面/移动共用一份
  const renderMenu = (onNavigate?: () => void) => (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={visibleMenuItems}
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
