import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Bell, Mic, CheckCircle2, ShieldAlert, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { notificationService } from "../services/notifications/NotificationService";
import { audioRecorderService } from "../services/audio/AudioRecorderService";
import { DaymarkLogo } from "./DaymarkLogo";
import { Button } from "./ui/button";
import { haptics } from "../lib/haptics";

interface PermissionsGateScreenProps {
  onPermissionsGranted: () => void;
}

export function PermissionsGateScreen({ onPermissionsGranted }: PermissionsGateScreenProps) {
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [notifDenied, setNotifDenied] = useState(false);

  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const [isRequesting, setIsRequesting] = useState(false);

  const checkAllPermissions = useCallback(async () => {
    // 1. Notification Check
    if (!notificationService.isSupported()) {
      setNotifGranted(true);
      setNotifDenied(false);
    } else {
      const status = await notificationService.getPermissionStatus();
      if (status === "granted") {
        setNotifGranted(true);
        setNotifDenied(false);
      } else if (status === "denied") {
        setNotifGranted(false);
        setNotifDenied(true);
      } else {
        setNotifGranted(false);
        setNotifDenied(false);
      }
    }

    // 2. Microphone Check
    const micAvail = await audioRecorderService.isAvailable();
    if (!micAvail) {
      setMicGranted(true);
      setMicDenied(false);
    } else {
      const hasMic = await audioRecorderService.checkPermission();
      setMicGranted(hasMic);
      setMicDenied(false);
    }
  }, []);

  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  // If both permissions become granted, automatically proceed
  useEffect(() => {
    if (notifGranted === true && micGranted === true) {
      localStorage.setItem("daymark_permissions_onboarding_completed", "true");
      haptics.taskSaved().catch(() => {});
      const timer = setTimeout(() => {
        onPermissionsGranted();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [notifGranted, micGranted, onPermissionsGranted]);

  const handleRequestNotification = async () => {
    setIsRequesting(true);
    try {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        setNotifGranted(true);
        setNotifDenied(false);
        haptics.selection().catch(() => {});
      } else {
        const status = await notificationService.getPermissionStatus();
        setNotifGranted(status === "granted");
        setNotifDenied(status === "denied");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestMicrophone = async () => {
    setIsRequesting(true);
    try {
      const granted = await audioRecorderService.requestPermission();
      setMicGranted(granted);
      setMicDenied(!granted);
      if (granted) {
        haptics.selection().catch(() => {});
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleGrantAll = async () => {
    setIsRequesting(true);
    try {
      // 1. Request notification first
      if (!notifGranted && notificationService.isSupported()) {
        const nGranted = await notificationService.requestPermissions();
        if (nGranted) {
          setNotifGranted(true);
          setNotifDenied(false);
        } else {
          const status = await notificationService.getPermissionStatus();
          setNotifGranted(status === "granted");
          setNotifDenied(status === "denied");
        }
      }

      // 2. Request microphone
      if (!micGranted) {
        const mGranted = await audioRecorderService.requestPermission();
        setMicGranted(mGranted);
        setMicDenied(!mGranted);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const isBothGranted = notifGranted === true && micGranted === true;
  const isAnyDenied = notifDenied || micDenied;

  return (
    <div className="min-h-screen w-full bg-[#F8F7F3] dark:bg-[#0C0C0E] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-[#151518] border border-[#E6E4DC] dark:border-[#242429] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
      >
        {/* Decorative Top Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5E5CE6] via-[#7C3AED] to-[#5E5CE6]" />

        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6 pt-2">
          <DaymarkLogo size={60} showGlow useImage className="mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F4F4F6]">
            Welcome to Daymark
          </h2>
          <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#9D9DA8] mt-2 max-w-xs leading-relaxed">
            Please allow the required permissions below to enter the app and enable voice tasks &amp; reminders.
          </p>
        </div>

        {/* Permission Cards */}
        <div className="space-y-3 mb-6">
          {/* 1. Notifications Permission Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#ECEAE4] dark:border-[#242429] bg-[#FAF9F6] dark:bg-[#1B1B20]">
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div
                className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                  notifGranted
                    ? "bg-[#ECFDF5] text-[#10B981] dark:bg-[#064E3B]/40 dark:text-[#34D399]"
                    : notifDenied
                    ? "bg-[#FEF2F2] text-[#EF4444] dark:bg-[#450A0A]/40 dark:text-[#F87171]"
                    : "bg-[#EEF2FF] text-[#5E5CE6] dark:bg-[#20202E] dark:text-[#818CF8]"
                }`}
              >
                {notifGranted ? (
                  <CheckCircle2 className="size-6 stroke-[2.2]" />
                ) : notifDenied ? (
                  <ShieldAlert className="size-6 stroke-[2.2]" />
                ) : (
                  <Bell className="size-6 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] truncate">
                    Notifications
                  </h4>
                  {notifGranted && (
                    <span className="text-[10px] font-semibold text-[#10B981] dark:text-[#34D399] uppercase tracking-wider">
                      Granted
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] leading-tight mt-0.5">
                  Timely reminders for your scheduled tasks
                </p>
              </div>
            </div>

            {!notifGranted && (
              <Button
                type="button"
                size="sm"
                onClick={handleRequestNotification}
                disabled={isRequesting}
                className="shrink-0 rounded-xl bg-[#5E5CE6] text-white hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] text-xs h-9 px-3.5"
              >
                Allow
              </Button>
            )}
          </div>

          {/* 2. Microphone Permission Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#ECEAE4] dark:border-[#242429] bg-[#FAF9F6] dark:bg-[#1B1B20]">
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div
                className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                  micGranted
                    ? "bg-[#ECFDF5] text-[#10B981] dark:bg-[#064E3B]/40 dark:text-[#34D399]"
                    : micDenied
                    ? "bg-[#FEF2F2] text-[#EF4444] dark:bg-[#450A0A]/40 dark:text-[#F87171]"
                    : "bg-[#EEF2FF] text-[#5E5CE6] dark:bg-[#20202E] dark:text-[#818CF8]"
                }`}
              >
                {micGranted ? (
                  <CheckCircle2 className="size-6 stroke-[2.2]" />
                ) : micDenied ? (
                  <ShieldAlert className="size-6 stroke-[2.2]" />
                ) : (
                  <Mic className="size-6 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] truncate">
                    Microphone &amp; Voice
                  </h4>
                  {micGranted && (
                    <span className="text-[10px] font-semibold text-[#10B981] dark:text-[#34D399] uppercase tracking-wider">
                      Granted
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] leading-tight mt-0.5">
                  Hands-free AI task capture powered by Groq
                </p>
              </div>
            </div>

            {!micGranted && (
              <Button
                type="button"
                size="sm"
                onClick={handleRequestMicrophone}
                disabled={isRequesting}
                className="shrink-0 rounded-xl bg-[#5E5CE6] text-white hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] text-xs h-9 px-3.5"
              >
                Allow
              </Button>
            )}
          </div>
        </div>

        {/* Warning if blocked */}
        {isAnyDenied && (
          <div className="mb-5 p-3 rounded-xl bg-[#FEF2F2] dark:bg-[#450A0A]/30 border border-[#FEE2E2] dark:border-[#7F1D1D]/50 text-xs text-[#DC2626] dark:text-[#FCA5A5] leading-relaxed flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <span>
              One or more permissions were denied in your settings. Please enable Notifications and Microphone in your browser address bar (lock icon) or device settings, then tap &ldquo;Check Again&rdquo;.
            </span>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="space-y-2.5">
          {!isBothGranted ? (
            <>
              <Button
                type="button"
                size="lg"
                onClick={handleGrantAll}
                disabled={isRequesting}
                className="w-full rounded-2xl bg-[#5E5CE6] text-white shadow-lg shadow-[#5E5CE6]/25 hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:shadow-[#7C79F2]/25 dark:hover:bg-[#6865E8] font-semibold text-sm h-12"
              >
                <Sparkles className="size-4 mr-1.5" />
                {isRequesting ? "Requesting Permissions..." : "Grant Required Permissions"}
              </Button>

              {isAnyDenied && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={checkAllPermissions}
                  disabled={isRequesting}
                  className="w-full rounded-2xl border-[#E6E4DC] dark:border-[#242429] text-[#1C1C1E] dark:text-[#F4F4F6] text-xs h-11"
                >
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Check Again
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={onPermissionsGranted}
              className="w-full rounded-2xl bg-[#10B981] text-white shadow-lg shadow-[#10B981]/25 hover:bg-[#059669] font-semibold text-sm h-12"
            >
              Enter Daymark
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          )}
        </div>

        <p className="text-[11px] text-[#A1A1AA] dark:text-[#686874] text-center mt-4">
          Daymark strictly uses permissions for your tasks only. No data is shared.
        </p>
      </motion.div>
    </div>
  );
}
