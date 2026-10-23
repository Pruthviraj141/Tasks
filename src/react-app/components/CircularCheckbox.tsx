import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "cn";

interface CircularCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
}

export const CircularCheckbox: React.FC<CircularCheckboxProps> = ({
  checked,
  onToggle,
  className,
  disabled = false,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!checked && !shouldReduceMotion) {
      // Generate 7-8 subtle celebratory flourish particles
      const colors = ["#5E5CE6", "#818CF8", "#A5B4FC", "#F59E0B", "#10B981"];
      const newParticles: Particle[] = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        angle: (i * (360 / 8)) + (Math.random() * 20 - 10),
        distance: 18 + Math.random() * 8,
        size: 3 + Math.random() * 2,
        color: colors[i % colors.length],
      }));

      setParticles(newParticles);
      setTimeout(() => setParticles([]), 700);
    }

    onToggle();
  };

  return (
    <div className="relative inline-flex items-center justify-center p-1.5 -m-1.5 touch-manipulation">
      {/* Particle celebration flourish */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const targetX = Math.cos(rad) * p.distance;
        const targetY = Math.sin(rad) * p.distance;

        return (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0.8, opacity: 1 }}
            animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
          />
        );
      })}

      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center size-6 rounded-full transition-all duration-200 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          checked
            ? "bg-[#5E5CE6] border border-[#5E5CE6] shadow-sm shadow-[#5E5CE6]/20"
            : "border-[1.75px] border-[#C7C5BE] bg-white hover:border-[#8E8C85] active:scale-95",
          className
        )}
      >
        <motion.svg
          width="13"
          height="10"
          viewBox="0 0 13 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={false}
          animate={{
            scale: checked ? 1 : 0.4,
            opacity: checked ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.path
            d="M1.5 5L4.5 8L11.5 1.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{
              pathLength: checked ? 1 : 0,
            }}
            transition={{
              duration: shouldReduceMotion ? 0.05 : 0.25,
              ease: "easeOut",
            }}
          />
        </motion.svg>
      </button>
    </div>
  );
};
