import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import HomePage from './pages/Home';
import ReportsPage from './pages/Reports';
import ReportDetailPage from './pages/ReportDetail';
import MedicationsPage from './pages/Medications';
import TrendPage from './pages/Trend';
import UploadPage from './pages/Upload';
import ProfilePage from './pages/Profile';

function App() {
  const token = localStorage.getItem('token');

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
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="trend" element={<TrendPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
