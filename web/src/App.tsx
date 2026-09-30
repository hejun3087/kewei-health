import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';

// 性能优化（1.3.6）：路由级懒加载，首屏只加载 Login/Home，其余页面按需拆包
const HomePage = lazy(() => import('./pages/Home'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetail'));
const DiagnosesPage = lazy(() => import('./pages/Diagnoses'));
const DiagnosisDetailPage = lazy(() => import('./pages/DiagnosisDetail'));
const MedicationsPage = lazy(() => import('./pages/Medications'));
const TrendPage = lazy(() => import('./pages/Trend'));
const UploadPage = lazy(() => import('./pages/Upload'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MembershipPage = lazy(() => import('./pages/Membership'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

function App() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="diagnoses" element={<DiagnosesPage />} />
          <Route path="diagnoses/:id" element={<DiagnosisDetailPage />} />
          <Route path="medications" element={<MedicationsPage />} />
          <Route path="trend" element={<TrendPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="profile" element={<ProfilePage />} />
          {/* 404（2.4.3）：未登录已重定向，此处为登录后访问不存在路由，保留导航框架 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
