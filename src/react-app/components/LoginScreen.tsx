import React, { useState } from "react";
import { Sparkles, Shield, Smartphone, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      setErrorMessage(error.message || "Unable to start Google sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0C0C0E] text-[#F4F4F6] flex flex-col justify-between items-center p-6 sm:p-10 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-gradient-to-b from-indigo-500/10 via-amber-500/8 to-transparent blur-3xl pointer-events-none" />

      {/* Top spacer */}
      <div className="w-full flex justify-end items-center max-w-md pt-2">
        <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-600">
          Mark Your Day
        </span>
      </div>

      {/* Central Hero Block */}
      <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10 my-auto py-6">
        {/* iOS-inspired Squircle Application Icon */}
        <div className="relative mb-8 group">
          {/* Subtle warm backlight glow */}
          <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-tr from-amber-500/25 to-indigo-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

          {/* App Squircle Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-gradient-to-b from-[#242430] via-[#161620] to-[#0A0A0E] p-[1.5px] shadow-2xl ring-1 ring-white/10">
            <div className="w-full h-full rounded-[26.5px] bg-gradient-to-b from-[#1E1E28] via-[#13131A] to-[#09090D] flex items-center justify-center relative overflow-hidden">
              {/* Inner glass highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-60" />

              {/* Minimalist Daymark Sun-Compass Emblem */}
              <svg
                className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer delicate ring */}
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeOpacity="0.4"
                  strokeDasharray="2 3"
                />
                {/* Central golden core & horizon arc */}
                <circle cx="24" cy="24" r="6.5" fill="currentColor" fillOpacity="0.9" />
                <path
                  d="M12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="9" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>

        {/* Branding Title & Tagline */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
          Mark Your Day
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-[280px] leading-relaxed">
          Design your day with intention. Simplicity, focus, and effortless daily planning.
        </p>

        {/* Value Highlights */}
        <div className="w-full flex flex-col gap-2.5 my-7 px-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-zinc-300 font-medium">
              Calm daily focus & productivity pulse
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-zinc-300 font-medium">
              Private and encrypted cloud backup
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-zinc-300 font-medium">
              Seamless across web and Android
            </span>
          </div>
        </div>

        {/* Error notification if OAuth failed */}
        {errorMessage && (
          <div className="w-full flex items-center gap-2 p-3 mb-4 text-xs bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Sign-In Action Button */}
        <div className="w-full pt-1">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-xl shadow-black/40 disabled:opacity-60 cursor-pointer touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
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
            <span className="font-semibold tracking-tight">
              {isLoading ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Subtle Note */}
      <div className="w-full max-w-sm pb-2 text-center">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Sign in to access your synchronized tasks across your devices.
        </p>
      </div>
    </div>
  );
};
