import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CityGuideView from './pages/CityGuideView';

/**
 * App Router Strategy:
 * 1. Root (/) is the search/discovery hub (Web Only).
 * 2. /guide/:slug is the installable Survival Pack (PWA Scoped).
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/:slug" element={<CityGuideView />} />
        {/* Fallback to Home if route doesn't exist */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;