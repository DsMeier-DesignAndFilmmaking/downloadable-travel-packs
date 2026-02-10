import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';

/**
 * Animated Routes Wrapper
 * Handles the logic for page transitions
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="popLayout">
      <Routes location={location} key={location.pathname}>
        {/* The key on the Routes is what triggers the exit/enter cycle */}
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/:slug" element={<CityGuideView />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AnimatePresence>
  );
}

// Ensure this is named 'App' and exported as 'default'
export default function App() {
  return (
    <Router>
      <ScrollToTop /> 
      <AnimatedRoutes />
    </Router>
  );
}