import React, { useState } from "react";
import { Loader2, AlertCircle, Sun, Moon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { DaymarkLogo } from "./DaymarkLogo";

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      if (
        error.message?.includes("provider is not enabled") ||
        error.message?.includes("validation_failed")
      ) {
        setErrorMessage(
          "Google sign-in is not yet enabled in the backend. Please check your Supabase Auth provider settings."
        );
      } else {
        setErrorMessage(error.message || "Unable to start Google sign in. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F7F3] dark:bg-[#0C0C0E] text-[#18181B] dark:text-[#F4F4F6] flex flex-col justify-between items-center p-6 relative overflow-hidden select-none transition-colors duration-300">
      {/* Subtle ambient dawn glow behind the center in dark mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-amber-500/[0.035] dark:bg-amber-400/[0.05] blur-3xl pointer-events-none" />

      {/* Top Bar: Quiet Theme Switcher */}
      <header className="w-full max-w-sm flex justify-end items-center pt-2 relative z-10">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2.5 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Central Login Container */}
      <motion.main
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[320px] flex flex-col items-center text-center relative z-10 my-auto py-8"
      >
        {/* Brand App Icon */}
        <div className="mb-6">
          <DaymarkLogo size={80} showGlow useImage />
        </div>

        {/* Brand Header */}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mark Your Day
        </h1>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-[260px]">
          Design your day with calm, intentional focus.
        </p>

        {/* OAuth Error Feedback */}
        {errorMessage && (
          <div className="w-full flex items-start gap-2.5 p-3 mt-6 text-xs bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 text-left leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Action: Google Sign-In */}
        <div className="w-full mt-7">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-3 px-5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-medium text-sm shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-current" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="font-medium tracking-tight">
              {isLoading ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>
        </div>
      </motion.main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-sm pb-3 text-center relative z-10">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 tracking-tight">
          Private & encrypted • Synced across devices
        </p>
      </footer>
    </div>
  );
};
