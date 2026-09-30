import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import HomePage from './pages/Home';
import ReportsPage from './pages/Reports';
import ReportDetailPage from './pages/ReportDetail';
import DiagnosesPage from './pages/Diagnoses';
import MedicationsPage from './pages/Medications';
import TrendPage from './pages/Trend';
import UploadPage from './pages/Upload';
import ProfilePage from './pages/Profile';
import MembershipPage from './pages/Membership';

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
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportDetailPage />} />
        <Route path="diagnoses" element={<DiagnosesPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="trend" element={<TrendPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
