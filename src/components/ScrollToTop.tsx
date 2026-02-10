// src/components/ScrollToTop.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // We use 'instant' to prevent a slow smooth scroll which causes jitter
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}