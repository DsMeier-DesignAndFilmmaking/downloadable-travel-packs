import { motion, type Variants, type BezierDefinition } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition Component
 * Provides a high-end "Curtain" animation using quintic easing.
 * Features a directional logic (Bottom-to-Top for guides, Top-to-Bottom for Home).
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Logic to determine curtain direction
  const isReturningHome = location.pathname === '/';

  /** * The "Apple-Style" Ease: [0.22, 1, 0.36, 1] 
   * This is a Quintic-Out curve. It starts very fast to provide 
   * instant feedback, then spends the majority of the duration 
   * decelerating smoothly.
   */
  const appleEase: BezierDefinition = [0.22, 1, 0.36, 1];

  const curtainVariants: Variants = {
    initial: { scaleY: 0 },
    exit: { 
      scaleY: 1,
      transition: { 
        duration: 0.45, 
        ease: appleEase 
      } 
    }
  };

  const revealVariants: Variants = {
    initial: { scaleY: 1 },
    animate: { 
      scaleY: 0,
      transition: { 
        duration: 0.5, 
        delay: 0.05, 
        ease: appleEase 
      } 
    }
  };

  const contentVariants: Variants = {
    initial: { opacity: 0, y: 15 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: 0.35, 
        duration: 0.5, 
        ease: appleEase 
      } 
    }
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      {/* CLOSING CURTAIN 
        This layer covers the screen when the user clicks a link.
      */}
      <motion.div
        className="fixed inset-0 bg-[#FFDD00] z-[9999] pointer-events-none shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
        style={{ originY: isReturningHome ? 0 : 1 }} 
        variants={curtainVariants}
        initial="initial"
        exit="exit"
      />
      
      {/* REVEALING CURTAIN 
        This layer slides away when the new page is mounted.
      */}
      <motion.div
        className="fixed inset-0 bg-[#FFDD00] z-[9999] pointer-events-none"
        style={{ originY: isReturningHome ? 1 : 0 }}
        variants={revealVariants}
        initial="initial"
        animate="animate"
      />

      {/* CONTENT LAYER 
        Adds a subtle "lift" and fade-in as the yellow curtain reveals the page.
      */}
      <motion.div 
        variants={contentVariants}
        initial="initial"
        animate="animate"
      >
        {children}
      </motion.div>
    </div>
  );
}