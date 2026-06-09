"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

interface ConfettiSuccessProps {
  show: boolean;
  title: string;
  subtitle?: string;
  emoji?: string;
  onClose?: () => void;
  autoCloseMs?: number;
}

const PIEZAS = ["🍣", "🍱", "🥢", "🍤", "🐟", "✨", "🎉"];

export function ConfettiSuccess({
  show,
  title,
  subtitle,
  emoji = "🍣",
  onClose,
  autoCloseMs = 2600,
}: ConfettiSuccessProps) {
  useEffect(() => {
    if (!show || !onClose || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [show, onClose, autoCloseMs]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-accent/95 px-6 text-center text-accent-foreground backdrop-blur-sm"
        >
          {/* lluvia de piezas */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-2xl"
              style={{ left: `${(i * 53) % 100}%`, top: "-10%" }}
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{
                duration: 2 + (i % 5) * 0.3,
                delay: (i % 7) * 0.12,
                ease: "easeIn",
              }}
            >
              {PIEZAS[i % PIEZAS.length]}
            </motion.span>
          ))}

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="text-7xl"
          >
            {emoji}
          </motion.div>
          <motion.h2
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-4 font-headline text-3xl font-bold"
          >
            {title}
          </motion.h2>
          {subtitle && (
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 max-w-xs text-accent-foreground/85"
            >
              {subtitle}
            </motion.p>
          )}
          <p className="mt-8 text-xs text-accent-foreground/60">
            Toca para continuar
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
