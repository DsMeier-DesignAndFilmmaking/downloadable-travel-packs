import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // We wait 300ms (matching the curtain exit duration) 
    // before snapping to the top. This ensures the 
    // Home Page stays at its current scroll position 
    // while the yellow curtain is sliding up.
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 300); 

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}