import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation, 
  useNavigationType,
  useNavigate 
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Views
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';
import PrivacyPolicyView from './pages/PrivacyPolicyView';
import TermsOfServiceView from './pages/TermsOfServiceView';
import TravelDisclaimerView from './pages/TravelDisclaimerView';
import SystemSpecsView from './pages/SystemSpecsView';
import SecurityProtocolView from './pages/SecurityProtocolView';
import SettingsView from './pages/SettingsView';

// Components
import PageTransition from './components/PageTransition';
import Footer from './components/Footer';

/**
 * AnimatedRoutes with scroll restoration
 */
function AnimatedRoutes() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Store scroll positions per location key
  const scrollPositions = useRef<Record<string, number>>({});

  // Save scroll position before navigation
  useEffect(() => {
    return () => {
      scrollPositions.current[location.key] = window.scrollY;
    };
  }, [location]);

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        // Restore scroll on back/forward navigation
        if (navigationType === 'POP') {
          const saved = scrollPositions.current[location.key] ?? 0;
          // Restore on next frame to avoid layout flash
          requestAnimationFrame(() => {
            window.scrollTo(0, saved);
          });
        } else {
          // For new navigations, scroll to top
          window.scrollTo(0, 0);
        }
      }}
    >
      <Routes location={location} key={location.pathname}>
        {/* Home */}
        <Route
          path="/"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />

        {/* Dynamic City Guide — matches by pathname only; query (e.g. ?utm_source=pwa) is preserved and does not redirect to / */}
        <Route
          path="/guide/:slug"
          element={
            <PageTransition>
              <CityGuideView />
            </PageTransition>
          }
        />

        {/* Protocol Pages */}
        <Route
          path="/specs"
          element={
            <PageTransition>
              <SystemSpecsView />
            </PageTransition>
          }
        />
        <Route
          path="/security-protocol"
          element={
            <PageTransition>
              <SecurityProtocolView />
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <SettingsView />
            </PageTransition>
          }
        />

        {/* Compliance Pages */}
        <Route
          path="/privacy"
          element={
            <PageTransition>
              <PrivacyPolicyView />
            </PageTransition>
          }
        />
        <Route
          path="/terms"
          element={
            <PageTransition>
              <TermsOfServiceView />
            </PageTransition>
          }
        />
        <Route
          path="/disclaimer"
          element={
            <PageTransition>
              <TravelDisclaimerView />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

/**
 * When PWA is opened in standalone, redirect from "/" to last viewed pack if stored.
 * Runs only after router is ready and ASSETS ARE VERIFIED.
 */
function PWAStandaloneRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [routerReady, setRouterReady] = useState(false);

  useEffect(() => {
    const raf = typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame
      : (cb: () => void) => setTimeout(cb, 0);
    raf(() => setRouterReady(true));
  }, []);

  useEffect(() => {
    if (!routerReady || typeof window === 'undefined') return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone && location.pathname === '/') {
      const lastPath = localStorage.getItem('pwa_last_pack');
      const slug = lastPath?.startsWith('/guide/') ? lastPath.slice('/guide/'.length).split('/')[0] : null;
      const citySynced = slug ? localStorage.getItem(`sync_${slug}`) === 'true' : false;
      if (lastPath && citySynced) navigate(lastPath, { replace: true });
    }
  }, [routerReady, location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <Router>
      <PWAStandaloneRedirect />
      <div className="flex flex-col min-h-screen bg-[#F7F7F7]">
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>

        <Footer />
      </div>
    </Router>
  );
}