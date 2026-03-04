import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashLogo from "@/assets/splash-logo.png";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 600);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          {/* Animated logo */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Glow ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.3, 1.1], opacity: [0, 0.4, 0] }}
              transition={{ duration: 1.8, delay: 0.4, ease: "easeOut" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                width: "200%",
                height: "200%",
                top: "-50%",
                left: "-50%",
              }}
            />
            <img
              src={splashLogo}
              alt="MediCare+ Logo"
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain relative z-10"
            />
          </motion.div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            className="mt-6 flex flex-col items-center"
          >
            <span
              className="text-2xl sm:text-3xl tracking-tight italic"
              style={{ fontFamily: "'Alegreya', serif" }}
            >
              <span className="text-blue-600 dark:text-blue-400">MediCare</span>
              <span className="text-teal-500 dark:text-white font-extrabold">+</span>
            </span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
              className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium mt-1"
            >
              effortless care, delivered
            </motion.span>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 w-40 h-1 rounded-full bg-muted overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1, delay: 0.9, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-teal-500 to-blue-500"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
