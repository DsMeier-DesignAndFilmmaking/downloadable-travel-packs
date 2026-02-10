import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';
import PageTransition from './components/PageTransition';

/**
 * Animated Routes Wrapper
 * Handles the logic for page transitions
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          } 
        />
        <Route 
          path="/guide/:slug" 
          element={
            <PageTransition>
              <CityGuideView />
            </PageTransition>
          } 
        />
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