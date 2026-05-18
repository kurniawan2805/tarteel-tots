import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { SyncProvider } from './contexts/SyncContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/dexie';

const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/Auth/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/Onboarding/OnboardingPage'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard/ParentDashboard'));
const SettingsPage = lazy(() => import('./pages/ParentDashboard/SettingsPage'));
const ChildPlayPage = lazy(() => import('./pages/ChildPlay/ChildPlayPage'));
const LiveGuidePage = lazy(() => import('./pages/ChildPlay/LiveGuidePage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-spin-slow text-4xl">🌴</div>
    </div>
  );
}

function OnboardingCheck({ children }) {
  const { loading } = useAuth();
  const location = useLocation();
  const onboardingComplete = useLiveQuery(async () => {
    const val = await db.settings.get('onboarding_complete');
    return val?.value === true;
  }, []);

  if (loading || onboardingComplete === undefined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin-slow text-4xl">🌴</div>
      </div>
    );
  }

  if (onboardingComplete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function ProtectedRoute({ children }) {
  const { user, isLocalMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin-slow text-4xl">🌴</div>
      </div>
    );
  }

  if (!user && !isLocalMode) {
    return <Navigate to="/login" replace />;
  }

  return <OnboardingCheck>{children}</OnboardingCheck>;
}

function PublicRoute({ children }) {
  const { user, isLocalMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin-slow text-4xl">🌴</div>
      </div>
    );
  }

  if (user || isLocalMode) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ParentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play/:childId"
          element={
            <ProtectedRoute>
              <ChildPlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live-guide/:childId"
          element={
            <ProtectedRoute>
              <LiveGuidePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <AppRoutes />
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
