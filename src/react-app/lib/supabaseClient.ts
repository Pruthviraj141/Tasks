import { createClient, type Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

// Safe public variables injected via Vite define / .env.local
const safeEnv =
  typeof import.meta !== "undefined" && import.meta && import.meta.env
    ? import.meta.env
    : (typeof process !== "undefined" && process.env ? process.env : {});

const supabaseUrl =
  (safeEnv.VITE_SUPABASE_URL as string) || "https://gngoelfmkxiqcluojefl.supabase.co";
const supabaseAnonKey =
  (safeEnv.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    console.warn("Supabase credentials missing. Cloud sync will be unavailable.");
  }
}


export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || "sb_publishable_placeholder_for_offline_or_test",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export const ANDROID_OAUTH_CALLBACK = "app.daymark.tasks://auth/callback";

let isAndroidDeepLinkRegistered = false;

/**
 * Trigger Google OAuth sign-in.
 * On Web: redirects via browser to /auth/callback.
 * On Android (Capacitor): opens native system browser via @capacitor/browser
 * and listens for app.daymark.tasks://auth/callback deep link.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative ? ANDROID_OAUTH_CALLBACK : `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: isNative, // For native Android we open with @capacitor/browser manually
      },
    });

    if (error) {
      return { error };
    }

    if (isNative && data.url) {
      // Open system browser for Google OAuth (Never use embedded webview)
      await Browser.open({
        url: data.url,
        windowName: "_self",
      });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Sign out and clear stored session.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Initialize Android OAuth deep link listener.
 * Prevents multiple registrations and loops.
 */
export function initAndroidAuthListener(onSessionRestored?: (session: Session) => void) {
  if (!Capacitor.isNativePlatform() || isAndroidDeepLinkRegistered) return;
  isAndroidDeepLinkRegistered = true;

  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith("app.daymark.tasks")) return;

    try {
      // Close system browser overlay
      await Browser.close().catch(() => {});

      // Parse code or tokens from URL
      const parsedUrl = new URL(url);

      // Handle PKCE Authorization Code: ?code=...
      const code = parsedUrl.searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session && onSessionRestored) {
          onSessionRestored(data.session);
        }
        return;
      }

      // Handle Hash fragment: #access_token=...&refresh_token=...
      if (parsedUrl.hash) {
        const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session && onSessionRestored) {
            onSessionRestored(data.session);
          }
        }
      }
    } catch (err) {
      console.error("Failed to process Android OAuth deep link:", err);
    }
  });
}
