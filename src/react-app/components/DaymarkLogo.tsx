import React from "react";

interface DaymarkLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
  useImage?: boolean;
}

export const DaymarkLogo: React.FC<DaymarkLogoProps> = ({
  size = 64,
  className = "",
  showGlow = false,
  useImage = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Optional ambient warm backlight */}
      {showGlow && (
        <div
          className="absolute -inset-2 rounded-[28px] bg-gradient-to-tr from-amber-500/25 via-amber-400/15 to-transparent blur-xl pointer-events-none"
          style={{ width: size + 16, height: size + 16 }}
        />
      )}

      {useImage ? (
        <div
          className="relative w-full h-full rounded-[24%] overflow-hidden shadow-2xl ring-1 ring-white/15 dark:ring-white/10 bg-[#0C0C0E]"
          style={{ width: size, height: size }}
        >
          <img
            src="/daymark-logo.jpg"
            alt="Mark Your Day Logo"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        /* Standalone high-fidelity vector SVG */
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-xl"
        >
          <defs>
            {/* Dark titanium squircle gradient */}
            <linearGradient id="dm-squircle" x1="10" y1="6" x2="70" y2="76" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E1E26" />
              <stop offset="50%" stopColor="#121217" />
              <stop offset="100%" stopColor="#08080B" />
            </linearGradient>

            {/* Specular edge border gradient */}
            <linearGradient id="dm-border" x1="16" y1="4" x2="64" y2="76" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="40%" stopColor="rgba(245,158,11,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
            </linearGradient>

            {/* Brushed champagne-gold solar dawn gradient */}
            <linearGradient id="dm-gold-sun" x1="22" y1="18" x2="58" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="25%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Radiant mark stroke gradient */}
            <linearGradient id="dm-gold-mark" x1="32" y1="48" x2="64" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="45%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#FFFBEB" />
            </linearGradient>

            {/* Subtle inner radial glow */}
            <radialGradient id="dm-inner-glow" cx="40" cy="38" r="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
              <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Squircle base */}
          <rect
            x="2"
            y="2"
            width="76"
            height="76"
            rx="22"
            fill="url(#dm-squircle)"
            stroke="url(#dm-border)"
            strokeWidth="1.2"
          />

          {/* Inner ambient atmosphere */}
          <rect x="2" y="2" width="76" height="76" rx="22" fill="url(#dm-inner-glow)" />

          {/* Sun Rising Arc (The "Day" motif - sweeping solar crest) */}
          <path
            d="M 23 48 C 21 34 29 23 41 21 C 51 19.5 59 25 61 31 C 58.5 30 54 28.5 48 29.5 C 38 31 31 37.5 28.5 47 C 27.5 47.6 25 48 23 48 Z"
            fill="url(#dm-gold-sun)"
          />

          {/* Golden Core Horizon Arc */}
          <path
            d="M 28 47.5 C 33 41 40 37.5 49 37.5 C 53.5 37.5 57 39 59 40.5 C 57.5 43 54.5 44 49 44 C 41 44 34.5 46 31 49 C 29.5 49 28.5 48.2 28 47.5 Z"
            fill="#B45309"
            opacity="0.45"
          />

          {/* The Precision Zenith Mark (The "Mark" motif - crisp checkmark that marks the day) */}
          <path
            d="M 32 45 L 40 53.5 L 61 24.5"
            stroke="url(#dm-gold-mark)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};
