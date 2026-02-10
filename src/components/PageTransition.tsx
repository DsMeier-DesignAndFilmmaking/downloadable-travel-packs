import { motion, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isReturningHome = location.pathname === '/';

  const curtainVariants: Variants = {
    initial: { scaleY: 0 },
    exit: { 
      scaleY: 1,
      transition: { 
        duration: 0.4, 
        ease: [0.76, 0, 0.24, 1] 
      } 
    }
  };

  const revealVariants: Variants = {
    initial: { scaleY: 1 },
    animate: { 
      scaleY: 0,
      transition: { 
        duration: 0.4, 
        delay: 0.1, 
        ease: [0.76, 0, 0.24, 1] 
      } 
    }
  };

  return (
    <div className="w-full min-h-screen">
      {/* Directional Logic:
          - When going TO a guide: Curtain closes from BOTTOM to TOP.
          - When going HOME: Curtain closes from TOP to BOTTOM.
      */}
      <motion.div
        className="fixed inset-0 bg-[#FFDD00] z-[9999] pointer-events-none"
        style={{ originY: isReturningHome ? 0 : 1 }} 
        variants={curtainVariants}
        initial="initial"
        exit="exit"
      />
      
      {/* Reverse Logic for Opening:
          - When entering guide: Curtain opens from BOTTOM to TOP.
          - When entering home: Curtain opens from TOP to BOTTOM.
      */}
      <motion.div
        className="fixed inset-0 bg-[#FFDD00] z-[9999] pointer-events-none"
        style={{ originY: isReturningHome ? 1 : 0 }}
        variants={revealVariants}
        initial="initial"
        animate="animate"
      />

      <div className="relative">
        {children}
      </div>
    </div>
  );
}