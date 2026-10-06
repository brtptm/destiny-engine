import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { auth, useDashboard } from './lib/api.js';
import { Spinner, ErrorNote } from './components/ui.jsx';
import Shell, { JourneyLayout } from './components/Shell.jsx';
import Landing from './pages/Landing.jsx';
const Auth = lazy(() => import('./pages/Auth.jsx'));
const Questionnaire = lazy(() => import('./pages/Questionnaire.jsx'));
const ProfileAnalysis = lazy(() => import('./pages/ProfileAnalysis.jsx'));
const DreamInput = lazy(() => import('./pages/DreamInput.jsx'));
const Feasibility = lazy(() => import('./pages/Feasibility.jsx'));
const Today = lazy(() => import('./pages/Today.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const Progress = lazy(() => import('./pages/Progress.jsx'));
const Coach = lazy(() => import('./pages/Coach.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const STAGE_HOME = { profile: '/setup', dream: '/dream', roadmap: '/feasibility', active: '/today' };
const ALLOWED = {
  profile: ['/setup', '/settings'],
  dream: ['/setup', '/analysis', '/dream', '/settings'],
  roadmap: ['/setup', '/analysis', '/dream', '/feasibility', '/settings'],
};

/** Signed-in gate that also keeps people on the right step of the journey. */
function RequireJourney() {
  const loc = useLocation();
  const { data, isLoading, error, refetch } = useDashboard();
  if (!auth.signedIn()) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  if (isLoading) return <Spinner label="Loading your journey" />;
  if (error) return <div className="max-w-md mx-auto p-6"><ErrorNote error={error} onRetry={refetch} /></div>;
  const allowed = ALLOWED[data.stage];
  if (allowed && !allowed.includes(loc.pathname)) return <Navigate to={STAGE_HOME[data.stage]} replace />;
  return <Suspense fallback={<Spinner />}><Outlet /></Suspense>;
}

export function stageHome(stage) { return STAGE_HOME[stage] || '/today'; }

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/signin', element: <Suspense fallback={<Spinner />}><Auth mode="signin" /></Suspense> },
  { path: '/signup', element: <Suspense fallback={<Spinner />}><Auth mode="signup" /></Suspense> },
  {
    element: <RequireJourney />,
    children: [
      {
        element: <JourneyLayout />,
        children: [
          { path: '/setup', element: <Questionnaire /> },
          { path: '/analysis', element: <ProfileAnalysis /> },
          { path: '/dream', element: <DreamInput /> },
          { path: '/feasibility', element: <Feasibility /> },
        ],
      },
      {
        element: <Shell />,
        children: [
          { path: '/today', element: <Today /> },
          { path: '/roadmap', element: <Roadmap /> },
          { path: '/progress', element: <Progress /> },
          { path: '/coach', element: <Coach /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
