import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DaymarkLogo } from "./DaymarkLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      if (error.message.includes("provider is not enabled") || error.message.includes("validation_failed")) {
        setErrorMessage(
          "Google Auth is not enabled yet in your Supabase Dashboard. Please enable the Google provider under Auth > Providers."
        );
      } else {
        setErrorMessage(error.message || "Failed to start Google sign-in. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-card border border-border/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 text-card-foreground">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand & Title */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="mb-3">
            <DaymarkLogo size={52} useImage showGlow />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Sign in to Mark Your Day
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
            Synchronize your tasks securely across web and mobile with private cloud backup.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 text-xs bg-destructive/10 text-destructive rounded-xl border border-destructive/20 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-foreground text-background font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-background" />
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
            <span>{isLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>
        </div>

        {/* Security / Privacy Footnote */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80 pt-1 border-t border-border/30">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Private and securely encrypted</span>
        </div>
      </div>
    </div>
  );
};
