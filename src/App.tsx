import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';
import PageTransition from './components/PageTransition';
import Footer from './components/Footer';

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

export default function App() {
  return (
    <Router>
      <ScrollToTop /> 
      {/* Main Layout Wrapper:
          'flex-col min-h-screen' ensures the footer stays at the bottom
          even if the page content is shorter than the viewport.
      */}
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        
        {/* Global Footer - Persists across all route changes */}
        <Footer />
      </div>
    </Router>
  );
}