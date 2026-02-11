import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';

// Import the new views we just created
import PrivacyPolicyView from './pages/PrivacyPolicyView';
import TermsOfServiceView from './pages/TermsOfServiceView';
import TravelDisclaimerView from './pages/TravelDisclaimerView';
import SystemSpecsView from './pages/SystemSpecsView';
import SecurityProtocolView from './pages/SecurityProtocolView';

import PageTransition from './components/PageTransition';
import Footer from './components/Footer';

/**
 * Animated Routes Wrapper
 * Handles the logic for page transitions and route mapping
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Core Pages */}
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/guide/:slug" element={<PageTransition><CityGuideView /></PageTransition>} />

        {/* Compliance & Protocol Pages (Linked from Footer) */}
        <Route path="/specs" element={<PageTransition><SystemSpecsView /></PageTransition>} />
        <Route path="/security-protocol" element={<PageTransition><SecurityProtocolView /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPolicyView /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsOfServiceView /></PageTransition>} />
        <Route path="/disclaimer" element={<PageTransition><TravelDisclaimerView /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop /> 
      <div className="flex flex-col min-h-screen bg-[#F7F7F7]">
        {/* The 'flex-grow' ensures the footer is pushed down on short pages */}
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        
        {/* Global Footer - Persists across all route changes */}
        <Footer />
      </div>
    </Router>
  );
}