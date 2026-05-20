import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CallLogs from './pages/CallLogs';
import CreateAssistant from './pages/CreateAssistant';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const isLoggedIn = () => !!localStorage.getItem('token');

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// ─── Public Route (redirect if already logged in) ─────────────────────────────
const PublicRoute = ({ children }) => {
  if (isLoggedIn()) {
    const user = getUser();
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* User */}
        <Route path="/"                 element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/call-logs"        element={<ProtectedRoute><CallLogs /></ProtectedRoute>} />
        <Route path="/create-assistant" element={<ProtectedRoute><CreateAssistant /></ProtectedRoute>} />
        <Route path="/settings"         element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isLoggedIn() ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}