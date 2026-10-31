import { useState, useRef, useEffect } from "react";
import { X, Share2, Download, Check, Sparkles, AlertCircle, Sun, Moon } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { toPng } from "html-to-image";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import type { Task } from "../types/task";
import type { MotivationalQuote } from "../data/motivationalQuotes";
import { haptics } from "../lib/haptics";
import { useTheme } from "../hooks/useTheme";

export type ShareFormat = "story" | "square" | "twitter";

interface FormatConfig {
  id: ShareFormat;
  label: string;
  sublabel: string;
  exportWidth: number;
  exportHeight: number;
  previewWidth: number;
  previewHeight: number;
  exportPixelRatio: number;
}

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FORMAT_CONFIGS: Record<ShareFormat, FormatConfig> = {
  story: {
    id: "story",
    label: "Story",
    sublabel: "1080 × 1920 (Instagram)",
    exportWidth: 1080,
    exportHeight: 1920,
    previewWidth: 360,
    previewHeight: 640, // 9:16 exact integer ratio 2x
    exportPixelRatio: 2,
  },
  square: {
    id: "square",
    label: "Square",
    sublabel: "1080 × 1080 (Feed)",
    exportWidth: 1080,
    exportHeight: 1080,
    previewWidth: 360,
    previewHeight: 360, // 1:1 exact integer ratio 2x
    exportPixelRatio: 2,
  },
  twitter: {
    id: "twitter",
    label: "Landscape",
    sublabel: "1600 × 900 (X / Twitter)",
    exportWidth: 1600,
    exportHeight: 900,
    previewWidth: 400,
    previewHeight: 225, // 16:9 exact integer ratio 2x
    exportPixelRatio: 2,
  },
};

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: MotivationalQuote;
  completedTasks: Task[];
  dateString: string;
}

export const ShareCardModal = ({
  isOpen,
  onClose,
  quote,
  completedTasks,
  dateString,
}: ShareCardModalProps) => {
  const { isDark } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>("story");
  const [cardTheme, setCardTheme] = useState<"light" | "dark">(() => (isDark ? "dark" : "light"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync card theme with app theme when opened
  useEffect(() => {
    if (isOpen) {
      setCardTheme(isDark ? "dark" : "light");
    }
  }, [isOpen, isDark]);

  const isCardDark = cardTheme === "dark";
  const activeConfig = FORMAT_CONFIGS[selectedFormat];

  // Filter tasks completed today (matching both ISO timestamp and local date)
  const todayCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    if (t.completedAt.startsWith(dateString)) return true;
    try {
      const d = new Date(t.completedAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}` === dateString;
    } catch {
      return false;
    }
  });

  // Limit tasks based on format
  const maxTasks = selectedFormat === "story" ? 6 : selectedFormat === "square" ? 3 : 4;
  const displayTasks = todayCompleted.slice(0, maxTasks);
  const extraCount = todayCompleted.length - displayTasks.length;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: selectedFormat === "twitter" ? "short" : "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const handleShareImage = async () => {
    if (!cardRef.current || isGenerating) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      haptics.selection().catch(() => {});

      // Use exact integer pixel ratio for razor-sharp canvas rasterization
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: activeConfig.exportPixelRatio,
        cacheBust: true,
        backgroundColor: isCardDark ? "#09090D" : "#FFFFFF",
      });

      const fileName = `MarkYourDay-${selectedFormat}-${dateString}.png`;

      // 1. Native Capacitor Share (Android/iOS) via Cache FileProvider
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          await Share.share({
            title: "Mark Your Day Daily Focus",
            text: `“${quote.text}” — Mark Your Day`,
            files: [savedFile.uri],
            dialogTitle: `Share to Instagram, X, or WhatsApp`,
          });
          haptics.taskSaved().catch(() => {});
          return;
        } catch (shareErr: unknown) {
          const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
          if (errMsg.includes("canceled") || errMsg.includes("Canceled") || errMsg.includes("cancelled")) {
            return;
          }
          console.warn("Capacitor native file share fallback:", shareErr);
        }
      }

      // 2. Web WebShare API with file support
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (
          typeof navigator !== "undefined" &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title: "Mark Your Day Daily Focus",
            text: `“${quote.text}” — Mark Your Day`,
            files: [file],
          });
          return;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }

      // 3. Download Fallback for Web Browsers
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Image saved to downloads!");
      haptics.taskSaved().catch(() => {});
    } catch (err) {
      console.error("Failed to export share card", err);
      setErrorMessage("Could not generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToX = async () => {
    haptics.selection().catch(() => {});
    const cleanQuote = quote.text.length > 120 ? quote.text.slice(0, 117) + "..." : quote.text;
    const taskCount = todayCompleted.length;
    const summary = taskCount > 0
      ? `Completed ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} today with Mark Your Day ✨`
      : `Making progress with Mark Your Day ✨`;

    const tweetText = encodeURIComponent(
      `“${cleanQuote}”\n\n${summary}\n\n#MarkYourDay #Productivity #DailyFocus`
    );

    const xUrl = `https://x.com/intent/tweet?text=${tweetText}`;
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: xUrl });
        return;
      } catch (err) {
        console.warn("Browser.open failed, fallback to window.open", err);
      }
    }
    if (typeof window !== "undefined") {
      window.open(xUrl, "_blank");
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current || isGenerating) return;
    try {
      setIsGenerating(true);
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: activeConfig.exportPixelRatio,
        cacheBust: true,
        backgroundColor: isCardDark ? "#09090D" : "#FFFFFF",
      });
      const fileName = `MarkYourDay-${selectedFormat}-${dateString}.png`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          toast.success("Saved image to Documents!");
        } catch {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          await Share.share({
            title: "Mark Your Day",
            files: [savedFile.uri],
            dialogTitle: "Save Image",
          });
        }
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image saved to downloads!");
      }
      haptics.taskSaved().catch(() => {});
    } catch (err) {
      console.error("Download failed", err);
      setErrorMessage("Could not download image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[96vh] w-full max-w-lg flex-col items-center overflow-y-auto border border-[#E6E4DC] dark:border-[#262632] bg-[#FAF9F5] sm:bg-white dark:bg-[#121217] p-3.5 sm:p-5 shadow-2xl touch-scroll select-none text-[#18181B] dark:text-[#F4F4F6] transition-colors"
      >
        {/* Top Modal Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-[#ECEAE4] dark:border-[#202028] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Share2 className="size-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6] tracking-tight">
                Share Daily Card
              </h3>
              <p className="text-[11px] text-[#71717A] dark:text-[#8E8E9A]">
                {activeConfig.label} • {activeConfig.sublabel.split(" ")[0]} ({isCardDark ? "Dark Mode" : "White Mode"})
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close Share Modal"
            title="Close"
            className="rounded-full text-[#71717A] hover:bg-[#EFECE6] hover:text-[#18181B] dark:text-[#9D9DA8] dark:hover:bg-[#202028] dark:hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Format Selector Tabs & Theme Switcher */}
        <div className="w-full flex items-center justify-between gap-1.5 p-1 bg-[#ECEAE4] dark:bg-[#1A1A22] rounded-2xl mb-3">
          <div className="flex-1 flex items-center gap-1">
            {(Object.keys(FORMAT_CONFIGS) as ShareFormat[]).map((fmtKey) => {
              const cfg = FORMAT_CONFIGS[fmtKey];
              const isActive = selectedFormat === fmtKey;
              return (
                <button
                  key={fmtKey}
                  type="button"
                  onClick={() => setSelectedFormat(fmtKey)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-[#282834] text-[#18181B] dark:text-white shadow-2xs font-semibold"
                      : "text-[#71717A] dark:text-[#8E8E9E] hover:text-[#18181B] dark:hover:text-[#F4F4F6] font-medium"
                  }`}
                >
                  <span className="text-xs block leading-tight">{cfg.label}</span>
                  <span className="text-[10px] opacity-75 block font-mono">{cfg.sublabel.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Card Theme Switcher (White Mode / Dark Mode) */}
          <button
            type="button"
            onClick={() => {
              haptics.selection().catch(() => {});
              setCardTheme(isCardDark ? "light" : "dark");
            }}
            className="py-1.5 px-2.5 rounded-xl border border-[#D5D3CC] dark:border-white/10 bg-white dark:bg-[#282834] text-[#18181B] dark:text-white shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-xs font-semibold shrink-0"
            title={isCardDark ? "Switch to White Mode card" : "Switch to Dark Mode card"}
          >
            {isCardDark ? (
              <>
                <Sun className="size-3.5 text-amber-400" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-indigo-600" />
                <span className="hidden sm:inline">White</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="w-full p-2.5 mb-3 bg-red-50 dark:bg-[#321414] border border-red-200 dark:border-[#4E2121] rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-[#FCA5A5]">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Interactive Preview Canvas (Adaptive White Mode & Dark Mode) */}
        <div className="w-full flex justify-center py-1 overflow-x-auto">
          <div
            ref={cardRef}
            style={{
              width: `${activeConfig.previewWidth}px`,
              height: `${activeConfig.previewHeight}px`,
            }}
            className={`relative rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden shrink-0 transition-colors ${
              isCardDark
                ? "bg-[#09090D] text-[#F4F4F6] border border-[#22222E]"
                : "bg-white text-[#09090B] border border-[#E4E4E7] shadow-[0_16px_50px_rgba(0,0,0,0.06)]"
            }`}
          >
            {/* Ambient Background Accent Glow */}
            {isCardDark ? (
              <>
                <div className="absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br from-indigo-500/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
              </>
            ) : (
              <>
                <div className="absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br from-indigo-500/8 via-amber-500/6 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-gradient-to-tr from-amber-500/6 via-purple-500/6 to-transparent blur-3xl pointer-events-none" />
              </>
            )}

            {/* 1. FORMAT: STORY (9:16 Portrait) */}
            {selectedFormat === "story" && (
              <>
                {/* Header with App Squircle Emblem */}
                <div className="relative z-10">
                  <div
                    className={`flex items-center justify-between pb-3 border-b ${
                      isCardDark ? "border-white/[0.08]" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl p-[1px] shadow-sm flex items-center justify-center ${
                          isCardDark
                            ? "bg-gradient-to-b from-[#242430] to-[#12121A] ring-1 ring-white/10"
                            : "bg-gradient-to-b from-zinc-200 to-zinc-300 ring-1 ring-black/5"
                        }`}
                      >
                        <div
                          className={`w-full h-full rounded-[11px] flex items-center justify-center ${
                            isCardDark ? "bg-[#14141C]" : "bg-white shadow-xs"
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 ${
                              isCardDark ? "text-amber-400" : "text-amber-500"
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="2 2" />
                            <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                            <path d="M6 12C6 8.686 8.686 6 12 6C15.314 6 18 8.686 18 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-extrabold tracking-[0.14em] uppercase block ${
                            isCardDark ? "text-white" : "text-[#09090B]"
                          }`}
                        >
                          DAYMARK
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono tracking-wide">
                          Daily Reflection
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-semibold tracking-tight px-2.5 py-1 rounded-full border ${
                        isCardDark
                          ? "bg-white/[0.05] border-white/[0.08] text-zinc-300"
                          : "bg-zinc-100 border-zinc-200 text-[#09090B]"
                      }`}
                    >
                      {formattedDate}
                    </span>
                  </div>

                  {/* Daily Mindset Quote */}
                  <div className="mt-8">
                    <span
                      className={`text-[10.5px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${
                        isCardDark ? "text-amber-400" : "text-amber-600"
                      }`}
                    >
                      <Sparkles className="size-3" />
                      Daily Mindset
                    </span>
                    <blockquote
                      className={`mt-3 text-[19px] font-serif italic leading-relaxed tracking-tight ${
                        isCardDark ? "text-white/95" : "text-[#09090B] font-semibold"
                      }`}
                    >
                      &ldquo;{quote.text}&rdquo;
                    </blockquote>
                  </div>
                </div>

                {/* Accomplishments Card */}
                <div className="relative z-10 my-auto">
                  <div
                    className={`p-4 rounded-2xl border shadow-sm ${
                      isCardDark
                        ? "bg-[#14141C]/90 border-white/[0.08] backdrop-blur-md"
                        : "bg-zinc-50/95 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isCardDark ? "text-zinc-300" : "text-[#09090B]"
                        }`}
                      >
                        {todayCompleted.length > 0 ? "Accomplished Today" : "Daily Perspective"}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCardDark
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {todayCompleted.length} {todayCompleted.length === 1 ? "task done" : "tasks done"}
                      </span>
                    </div>

                    {todayCompleted.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {displayTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 text-xs">
                            <span
                              className={`size-4 rounded-full flex items-center justify-center shrink-0 ${
                                isCardDark
                                  ? "bg-emerald-500/25 text-emerald-400"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              <Check className="size-2.5 stroke-[3]" />
                            </span>
                            <span
                              className={`truncate font-semibold ${
                                isCardDark ? "text-zinc-200" : "text-[#09090B]"
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                        ))}

                        {extraCount > 0 && (
                          <p
                            className={`text-[10px] italic pt-1 ${
                              isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                            }`}
                          >
                            + {extraCount} more task{extraCount > 1 ? "s" : ""} accomplished
                          </p>
                        )}
                      </div>
                    ) : (
                      <p
                        className={`text-xs italic py-1 leading-relaxed ${
                          isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                        }`}
                      >
                        A quiet day of preparation, intentional pacing, and focus.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className={`relative z-10 pt-3 border-t flex items-center justify-between text-[10.5px] ${
                    isCardDark ? "border-white/[0.07] text-zinc-500" : "border-zinc-200 text-zinc-500"
                  }`}
                >
                  <span>Every conscious step moves forward</span>
                  <span
                    className={`font-extrabold tracking-widest uppercase ${
                      isCardDark ? "text-zinc-400" : "text-[#09090B]"
                    }`}
                  >
                    MARK YOUR DAY
                  </span>
                </div>
              </>
            )}

            {/* 2. FORMAT: SQUARE (1:1) */}
            {selectedFormat === "square" && (
              <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Top Branding & Date */}
                <div
                  className={`flex items-center justify-between pb-2 border-b ${
                    isCardDark ? "border-white/[0.07]" : "border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                        isCardDark
                          ? "bg-[#1E1E28] border-white/10"
                          : "bg-zinc-100 border-zinc-200"
                      }`}
                    >
                      <span className="text-[11px] font-serif font-bold text-amber-500">M</span>
                    </div>
                    <span
                      className={`text-xs font-extrabold tracking-widest uppercase ${
                        isCardDark ? "text-white" : "text-[#09090B]"
                      }`}
                    >
                      DAYMARK
                    </span>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold tracking-tight px-2 py-0.5 rounded-full border ${
                      isCardDark
                        ? "bg-white/[0.05] border-transparent text-zinc-300"
                        : "bg-zinc-100 border-zinc-200 text-[#09090B]"
                    }`}
                  >
                    {formattedDate}
                  </span>
                </div>

                {/* Quote */}
                <div className="my-auto py-2">
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 mb-1.5 ${
                      isCardDark ? "text-amber-400" : "text-amber-600"
                    }`}
                  >
                    <Sparkles className="size-3" />
                    Daily Mindset
                  </span>
                  <blockquote
                    className={`text-[16px] font-serif italic leading-snug tracking-tight ${
                      isCardDark ? "text-white/95" : "text-[#09090B] font-semibold"
                    }`}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </blockquote>
                </div>

                {/* Accomplishments Summary */}
                <div
                  className={`p-3 rounded-2xl border mb-2 shadow-xs ${
                    isCardDark
                      ? "bg-[#14141C]/90 border-white/[0.08]"
                      : "bg-zinc-50/95 border-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        isCardDark ? "text-zinc-300" : "text-[#09090B]"
                      }`}
                    >
                      Today's Progress
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCardDark
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      {todayCompleted.length} {todayCompleted.length === 1 ? "done" : "completed"}
                    </span>
                  </div>

                  {todayCompleted.length > 0 ? (
                    <div className="space-y-1.5">
                      {displayTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-[11.5px]">
                          <span
                            className={`size-3.5 rounded-full flex items-center justify-center shrink-0 ${
                              isCardDark
                                ? "bg-emerald-500/25 text-emerald-400"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            <Check className="size-2 stroke-[3]" />
                          </span>
                          <span
                            className={`truncate font-semibold ${
                              isCardDark ? "text-zinc-200" : "text-[#09090B]"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <span
                          className={`text-[9.5px] italic block ${
                            isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                          }`}
                        >
                          +{extraCount} more completed
                        </span>
                      )}
                    </div>
                  ) : (
                    <p
                      className={`text-[11px] italic leading-tight ${
                        isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                      }`}
                    >
                      A quiet day of preparation and intentional focus.
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div
                  className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                    isCardDark ? "border-white/[0.07] text-zinc-500" : "border-zinc-200 text-zinc-500"
                  }`}
                >
                  <span>Every conscious step moves forward</span>
                  <span
                    className={`font-extrabold tracking-wider ${
                      isCardDark ? "text-zinc-400" : "text-[#09090B]"
                    }`}
                  >
                    MARK YOUR DAY
                  </span>
                </div>
              </div>
            )}

            {/* 3. FORMAT: LANDSCAPE / TWITTER (16:9) */}
            {selectedFormat === "twitter" && (
              <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Top Branding & Date Row */}
                <div
                  className={`flex items-center justify-between pb-2 border-b ${
                    isCardDark ? "border-white/[0.07]" : "border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                        isCardDark
                          ? "bg-[#1E1E28] border-white/10"
                          : "bg-zinc-100 border-zinc-200"
                      }`}
                    >
                      <span className="text-[11px] font-serif font-bold text-amber-500">M</span>
                    </div>
                    <span
                      className={`text-[11px] font-extrabold tracking-[0.14em] uppercase ${
                        isCardDark ? "text-white" : "text-[#09090B]"
                      }`}
                    >
                      DAYMARK
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-tight px-2 py-0.5 rounded-full border ${
                      isCardDark
                        ? "bg-white/[0.05] border-white/[0.08] text-zinc-300"
                        : "bg-zinc-100 border-zinc-200 text-[#09090B]"
                    }`}
                  >
                    {formattedDate}
                  </span>
                </div>

                {/* 2-Column Landscape Layout */}
                <div className="grid grid-cols-12 gap-4 my-auto py-1 items-stretch">
                  {/* Left: Quote */}
                  <div className="col-span-7 flex flex-col justify-between pr-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 mb-1.5 ${
                          isCardDark ? "text-amber-400" : "text-amber-600"
                        }`}
                      >
                        <Sparkles className="size-2.5" />
                        Daily Mindset
                      </span>
                      <blockquote
                        className={`text-[14.5px] font-serif italic leading-relaxed tracking-tight line-clamp-3 ${
                          isCardDark ? "text-white/95" : "text-[#09090B] font-semibold"
                        }`}
                      >
                        &ldquo;{quote.text}&rdquo;
                      </blockquote>
                    </div>
                    <p className="text-[9.5px] text-zinc-500 font-medium tracking-wide mt-auto pt-1">
                      Every conscious step moves forward
                    </p>
                  </div>

                  {/* Right: Accomplishments */}
                  <div
                    className={`col-span-5 p-3 rounded-2xl border flex flex-col justify-between shadow-xs ${
                      isCardDark
                        ? "bg-[#14141C]/90 border-white/[0.08]"
                        : "bg-zinc-50/95 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isCardDark ? "text-zinc-300" : "text-[#09090B]"
                        }`}
                      >
                        Today
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                          isCardDark
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {todayCompleted.length} {todayCompleted.length === 1 ? "done" : "completed"}
                      </span>
                    </div>

                    {todayCompleted.length > 0 ? (
                      <div className="space-y-1">
                        {displayTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`size-3.5 rounded-full flex items-center justify-center shrink-0 ${
                                isCardDark
                                  ? "bg-emerald-500/25 text-emerald-400"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              <Check className="size-2 stroke-[3]" />
                            </span>
                            <span
                              className={`truncate font-semibold ${
                                isCardDark ? "text-zinc-200" : "text-[#09090B]"
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <span
                            className={`text-[9.5px] italic block pt-0.5 ${
                              isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                            }`}
                          >
                            +{extraCount} more completed
                          </span>
                        )}
                      </div>
                    ) : (
                      <p
                        className={`text-[10px] italic leading-tight py-2 ${
                          isCardDark ? "text-zinc-400" : "text-zinc-600 font-medium"
                        }`}
                      >
                        A quiet day of intentional focus and forward progress.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Footer */}
                <div
                  className={`pt-2 border-t flex items-center justify-between text-[9.5px] ${
                    isCardDark ? "border-white/[0.07] text-zinc-500" : "border-zinc-200 text-zinc-500"
                  }`}
                >
                  <span>Every conscious step moves forward</span>
                  <span
                    className={`font-extrabold tracking-widest uppercase ${
                      isCardDark ? "text-zinc-400" : "text-[#09090B]"
                    }`}
                  >
                    MARK YOUR DAY
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full flex items-center justify-between gap-2 pt-3.5 border-t border-[#ECEAE4] dark:border-[#202028] mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-[#71717A] hover:bg-[#EFECE6] hover:text-[#18181B] dark:text-[#8E8E9A] dark:hover:bg-[#202028] dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareToX}
              className="px-3 py-2 text-xs font-semibold text-[#18181B] dark:text-zinc-300 bg-white dark:bg-[#1A1A24] hover:bg-[#F4F2EC] dark:hover:bg-[#252533] hover:text-[#18181B] dark:hover:text-white border border-[#E6E4DC] dark:border-white/10 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Post quote & progress to X"
            >
              <XIcon className="size-3.5 fill-current" />
              <span>Post to X</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="p-2 text-[#18181B] dark:text-zinc-300 bg-white dark:bg-[#1A1A24] hover:bg-[#F4F2EC] dark:hover:bg-[#252533] hover:text-[#18181B] dark:hover:text-white border border-[#E6E4DC] dark:border-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Download image"
            >
              <Download className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={handleShareImage}
              disabled={isGenerating}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5" />
                  <span>Share Card</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
