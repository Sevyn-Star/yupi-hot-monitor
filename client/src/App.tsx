import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import { AppProvider } from './context/AppContext';
import { useToast } from './hooks/useToast';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import KeywordsPage from './pages/KeywordsPage';
import SearchPage from './pages/SearchPage';
import DiscoverPage from './pages/DiscoverPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  const { toast, showToast } = useToast();

  return (
    <AppProvider showToast={showToast}>
      <Toast toast={toast} />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="keywords" element={<KeywordsPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="hotspots/:id" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
