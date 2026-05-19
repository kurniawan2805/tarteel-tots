import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { SyncProvider } from './contexts/SyncContext';
import InstallPrompt from './components/common/InstallPrompt';

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
  const { loading, onboardingComplete } = useAuth();
  const location = useLocation();

  if (loading || onboardingComplete === null) {
    return <LoadingScreen />;
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

function PublicRoute({ children, allowAfterSignup = false }) {
  const { user, isLocalMode, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin-slow text-4xl">🌴</div>
      </div>
    );
  }

  // Allow /signup to proceed after user signup (Step 2: Create/Join family)
  if ((user || isLocalMode) && !(allowAfterSignup && location.pathname === '/signup')) {
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
            <PublicRoute allowAfterSignup={true}>
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
          <InstallPrompt />
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
