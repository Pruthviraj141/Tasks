import { useState, useRef, type MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { haptics } from "../lib/haptics";
import { cn } from "cn";

interface CircularCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
}

interface Sparkle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
}

export const CircularCheckbox = ({
  checked,
  onToggle,
  className,
  disabled = false,
}: CircularCheckboxProps) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [rippleKey, setRippleKey] = useState(0);
  const isAnimatingRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!checked && !shouldReduceMotion) {
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        setRippleKey((k) => k + 1);

        // Native subtle haptic feedback
        haptics.taskCompleted().catch(() => {});

        // Restrained professional sparkle burst (refined indigo & emerald tones)
        const palette = ["#4F46E5", "#6366F1", "#818CF8", "#10B981", "#34D399", "#818CF8"];
        const newSparkles: Sparkle[] = Array.from({ length: 6 }, (_, i) => ({
          id: Date.now() + i,
          angle: i * 60 + (Math.random() * 10 - 5),
          distance: 16 + Math.random() * 6,
          size: 2.5,
          color: palette[i % palette.length],
        }));

        setSparkles(newSparkles);

        setTimeout(() => {
          setSparkles([]);
          isAnimatingRef.current = false;
        }, 400);
      }
    }

    onToggle();
  };

  return (
    // Accessible touch target (guaranteed >= 44x44 CSS px)
    <div className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 touch-manipulation">
      {/* Soft restrained expanding ripple */}
      {checked && !shouldReduceMotion && (
        <motion.span
          key={rippleKey}
          initial={{ scale: 0.8, opacity: 0.85 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="absolute size-5 rounded-full border border-[#4F46E5] dark:border-[#6366F1] pointer-events-none"
        />
      )}

      {/* Restrained micro-sparkle burst */}
      {sparkles.map((s) => {
        const rad = (s.angle * Math.PI) / 180;
        const targetX = Math.cos(rad) * s.distance;
        const targetY = Math.sin(rad) * s.distance;

        return (
          <motion.span
            key={s.id}
            initial={{ x: 0, y: 0, scale: 0.8, opacity: 1 }}
            animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: s.size,
              height: s.size,
              backgroundColor: s.color,
            }}
          />
        );
      })}

      {/* 22px Circular Checkbox Button */}
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
        animate={
          checked && !shouldReduceMotion
            ? { scale: [0.88, 1.12, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn(
          "relative flex items-center justify-center size-[22px] rounded-full transition-colors duration-180 outline-none cursor-pointer shrink-0",
          "focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 focus-visible:ring-offset-2",
          checked
            ? "bg-[#4F46E5] dark:bg-[#6366F1] border border-[#4F46E5] dark:border-[#6366F1] shadow-2xs shadow-[#4F46E5]/25"
            : "border-[1.5px] border-[#C8C5BC] dark:border-[#3A3A42] bg-white dark:bg-[#1C1C22] hover:border-[#71717A] dark:hover:border-[#686874]",
          className
        )}
      >
        {/* Animated Checkmark Drawing */}
        <motion.svg
          width="12"
          height="9"
          viewBox="0 0 13 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={false}
          animate={{
            scale: checked ? 1 : 0.4,
            opacity: checked ? 1 : 0,
          }}
          transition={{ duration: 0.16 }}
        >
          <motion.path
            d="M1.5 5L4.5 8L11.5 1.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{
              pathLength: checked ? 1 : 0,
            }}
            transition={{
              duration: shouldReduceMotion ? 0.05 : 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </motion.svg>
      </motion.button>
    </div>
  );
};
