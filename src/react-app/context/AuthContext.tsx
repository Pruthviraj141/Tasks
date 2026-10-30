import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import {
  supabase,
  signInWithGoogle as clientSignInWithGoogle,
  signOut as clientSignOut,
  initAndroidAuthListener,
} from "../lib/supabaseClient";
import { setAuthenticatedUser } from "../storage";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSessionChange = useCallback((newSession: Session | null) => {
    setSession(newSession);
    const currentUser = newSession?.user ?? null;
    setUser(currentUser);
    setAuthenticatedUser(currentUser?.id ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Check for incoming OAuth code (?code=...) or tokens in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (error) {
            console.error("Failed to exchange OAuth code for session:", error.message);
          } else if (data.session) {
            handleSessionChange(data.session);
          }
          // Clean URL of code and return to base path
          window.history.replaceState({}, document.title, window.location.pathname === "/auth/callback" ? "/" : window.location.pathname);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("OAuth code exchange error:", err);
          setIsLoading(false);
        });
    } else if (window.location.hash && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            if (!isMounted) return;
            if (!error && data.session) {
              handleSessionChange(data.session);
            }
            window.history.replaceState({}, document.title, window.location.pathname === "/auth/callback" ? "/" : window.location.pathname);
            setIsLoading(false);
          });
      }
    } else {
      // Restore stored session
      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn("Failed to restore Supabase session:", error.message);
        }
        handleSessionChange(initialSession);
        setIsLoading(false);

        if (window.location.pathname === "/auth/callback") {
          window.history.replaceState({}, document.title, "/");
        }
      });
    }


    // 2. Subscribe to auth state updates (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      handleSessionChange(currentSession);
      setIsLoading(false);
    });

    // 3. Native Android OAuth deep-link listener (app.daymark.tasks://auth/callback)
    initAndroidAuthListener((restoredSession) => {
      if (!isMounted) return;
      handleSessionChange(restoredSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  const signInWithGoogle = useCallback(async () => {
    return clientSignInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    const res = await clientSignOut();
    handleSessionChange(null);
    return res;
  }, [handleSessionChange]);

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
