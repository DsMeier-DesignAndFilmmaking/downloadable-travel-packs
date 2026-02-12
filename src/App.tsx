import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation, 
  useNavigationType 
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

// Views
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';
import PrivacyPolicyView from './pages/PrivacyPolicyView';
import TermsOfServiceView from './pages/TermsOfServiceView';
import TravelDisclaimerView from './pages/TravelDisclaimerView';
import SystemSpecsView from './pages/SystemSpecsView';
import SecurityProtocolView from './pages/SecurityProtocolView';

// Components
import PageTransition from './components/PageTransition';
import Footer from './components/Footer';

/** Match PageTransition exit (0.45s) + reveal/content (~0.55s) so scroll restores after animation. */
const SCROLL_RESTORE_DELAY_MS = 1000;

/**
 * Scroll Restoration Logic
 *
 * Behavior:
 * - POP (browser back/forward) → restore scroll AFTER exit/enter animation (useEffect + delay)
 * - PUSH (new navigation) → scroll to top
 * Uses delay instead of AnimatePresence callbacks to avoid conflicts with Framer Motion exit.
 */
function useScrollBehavior() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const key = `scroll-${location.key}`;

    if (navigationType === 'POP') {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const y = parseInt(saved);
        const id = window.setTimeout(() => {
          window.scrollTo(0, y);
        }, SCROLL_RESTORE_DELAY_MS);
        return () => {
          window.clearTimeout(id);
          sessionStorage.setItem(key, window.scrollY.toString());
        };
      }
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      sessionStorage.setItem(
        key,
        window.scrollY.toString()
      );
    };
  }, [location, navigationType]);
}

/**
 * AnimatedRoutes Component
 */
function AnimatedRoutes() {
  const location = useLocation();

  useScrollBehavior();

  return (
    <AnimatePresence mode="wait">
      <Routes 
        location={location} 
        key={location.pathname + location.key}
      >
        {/* Home */}
        <Route 
          path="/" 
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          } 
        />

        {/* Dynamic City Guide */}
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

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#F7F7F7]">
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>

        <Footer />
      </div>
    </Router>
  );
}