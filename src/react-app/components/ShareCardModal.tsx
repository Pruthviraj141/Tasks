import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Share2, Download, Check, Sparkles, AlertCircle } from "lucide-react";
import { toPng } from "html-to-image";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import type { Task } from "../types/task";
import type { MotivationalQuote } from "../data/motivationalQuotes";
import { haptics } from "../lib/haptics";

export type ShareFormat = "story" | "square" | "twitter";

interface FormatConfig {
  id: ShareFormat;
  label: string;
  sublabel: string;
  exportWidth: number;
  exportHeight: number;
  previewWidth: number;
  previewHeight: number;
}

const FORMAT_CONFIGS: Record<ShareFormat, FormatConfig> = {
  story: {
    id: "story",
    label: "Instagram Story",
    sublabel: "1080 × 1920",
    exportWidth: 1080,
    exportHeight: 1920,
    previewWidth: 320,
    previewHeight: 568, // 9:16
  },
  square: {
    id: "square",
    label: "Square / WhatsApp",
    sublabel: "1080 × 1080",
    exportWidth: 1080,
    exportHeight: 1080,
    previewWidth: 340,
    previewHeight: 340, // 1:1
  },
  twitter: {
    id: "twitter",
    label: "X / Twitter Post",
    sublabel: "1600 × 900",
    exportWidth: 1600,
    exportHeight: 900,
    previewWidth: 384,
    previewHeight: 216, // 16:9
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>("story");
  const [cardTheme, setCardTheme] = useState<"dark" | "light">("dark");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeConfig = FORMAT_CONFIGS[selectedFormat];

  // Filter tasks completed today
  const todayCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return t.completedAt.startsWith(dateString);
  });

  // Limit tasks based on format
  const maxTasks = selectedFormat === "story" ? 5 : selectedFormat === "square" ? 3 : 4;
  const displayTasks = todayCompleted.slice(0, maxTasks);
  const extraCount = todayCompleted.length - displayTasks.length;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: selectedFormat === "twitter" ? "short" : "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const handleShareOrDownload = async () => {
    if (!cardRef.current || isGenerating) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      haptics.selection().catch(() => {});

      // Calculate pixel ratio to scale preview DOM node to exact export dimensions
      const scaleRatio = activeConfig.exportWidth / activeConfig.previewWidth;

      const dataUrl = await toPng(cardRef.current, {
        canvasWidth: activeConfig.exportWidth,
        canvasHeight: activeConfig.exportHeight,
        pixelRatio: scaleRatio,
        cacheBust: true,
      });

      const fileName = `Daymark-${selectedFormat}-${dateString}.png`;

      // 1. Native Capacitor Share (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            title: "Daymark Daily Focus",
            text: `“${quote.text}” — Daymark`,
            url: dataUrl,
            dialogTitle: `Share ${activeConfig.label}`,
          });
          onClose();
          return;
        } catch (shareErr) {
          console.warn("Capacitor share fallback:", shareErr);
        }
      }

      // 2. Web WebShare API with file support
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: "Daymark Daily Focus",
            text: `“${quote.text}”`,
            files: [file],
          });
          onClose();
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
        }
      }

      // 3. Download Fallback for Web Browsers
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      haptics.taskSaved().catch(() => {});
    } catch (err) {
      console.error("Failed to export share card", err);
      setErrorMessage("Could not generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isDark = cardTheme === "dark";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#16161B] rounded-3xl p-5 shadow-2xl border border-[#E8E6E0] dark:border-[#282832] flex flex-col items-center z-10 max-h-[94vh] overflow-y-auto"
          >
            {/* Top Modal Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-[#F2F0EB] dark:border-[#22222A] mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#5E5CE6]/10 text-[#5E5CE6] dark:text-[#7C79F2]">
                  <Share2 className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    Share Daily Card
                  </h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#9D9DA8]">
                    {activeConfig.label} • {activeConfig.sublabel}
                  </p>
                </div>
              </div>

              {/* Theme Toggle for Card */}
              <div className="flex items-center gap-1.5">
                <div className="flex bg-[#F4F3EE] dark:bg-[#202027] rounded-xl p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCardTheme("dark")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                      isDark
                        ? "bg-[#16161B] text-[#F4F4F6] shadow-xs"
                        : "text-[#71717A] hover:text-[#1C1C1E]"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardTheme("light")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                      !isDark
                        ? "bg-white text-[#1C1C1E] shadow-xs"
                        : "text-[#9D9DA8] hover:text-white"
                    }`}
                  >
                    Light
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Share Modal"
                  title="Close"
                  className="p-1.5 text-[#8E8C85] dark:text-[#9D9DA8] hover:text-[#1C1C1E] dark:hover:text-white rounded-full hover:bg-[#F4F3EE] dark:hover:bg-[#22222A] cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Format Selector Tabs */}
            <div className="w-full flex items-center justify-between gap-1 p-1 bg-[#F4F3EE] dark:bg-[#1E1E26] rounded-2xl mb-4">
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
                        ? "bg-white dark:bg-[#2A2A36] text-[#1C1C1E] dark:text-[#F4F4F6] shadow-xs font-semibold"
                        : "text-[#71717A] dark:text-[#8E8E9E] hover:text-[#1C1C1E] font-medium"
                    }`}
                  >
                    <span className="text-xs block leading-tight">{cfg.label}</span>
                    <span className="text-[10px] opacity-70 block font-mono">{cfg.sublabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="w-full p-2.5 mb-3 bg-[#FEF2F2] dark:bg-[#321414] border border-[#FECACA] dark:border-[#4E2121] rounded-xl flex items-center gap-2 text-xs text-[#DC2626] dark:text-[#FCA5A5]">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Interactive Preview Canvas */}
            <div className="w-full flex justify-center py-1 overflow-hidden">
              <div
                ref={cardRef}
                style={{
                  width: `${activeConfig.previewWidth}px`,
                  height: `${activeConfig.previewHeight}px`,
                }}
                className={`relative rounded-3xl p-5 flex flex-col justify-between shadow-xl overflow-hidden transition-colors shrink-0 ${
                  isDark
                    ? "bg-[#0C0C10] text-[#F4F4F6] border border-[#262634]"
                    : "bg-[#FAF9F5] text-[#1C1C1E] border border-[#E8E6DE]"
                }`}
              >
                {/* Decorative Subtle Accent Light */}
                <div
                  className={`absolute -top-16 -right-16 size-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
                    isDark ? "bg-[#7C79F2]" : "bg-[#5E5CE6]"
                  }`}
                />

                {/* 1. FORMAT: STORY (9:16 Portrait) */}
                {selectedFormat === "story" && (
                  <>
                    {/* Header */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-2.5 rounded-full ${
                              isDark ? "bg-[#7C79F2]" : "bg-[#5E5CE6]"
                            }`}
                          />
                          <span className="text-xs font-bold tracking-widest uppercase">
                            Daymark
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-medium tracking-wide ${
                            isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                          }`}
                        >
                          {formattedDate}
                        </span>
                      </div>

                      {/* Quote */}
                      <div className="mt-7">
                        <span
                          className={`text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1 ${
                            isDark ? "text-[#7C79F2]" : "text-[#5E5CE6]"
                          }`}
                        >
                          <Sparkles className="size-3" />
                          Daily Mindset
                        </span>
                        <blockquote className="mt-2.5 text-[16.5px] font-serif italic leading-relaxed tracking-tight">
                          &ldquo;{quote.text}&rdquo;
                        </blockquote>
                      </div>
                    </div>

                    {/* Accomplishments Card */}
                    <div className="relative z-10 my-auto">
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          isDark
                            ? "bg-[#16161E]/90 border-[#2A2A38]"
                            : "bg-white/90 border-[#E8E6DE]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider">
                            {todayCompleted.length > 0 ? "Accomplished Today" : "Daily Perspective"}
                          </span>
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              isDark
                                ? "bg-[#7C79F2]/20 text-[#A5B4FC]"
                                : "bg-[#5E5CE6]/15 text-[#4338CA]"
                            }`}
                          >
                            {todayCompleted.length} {todayCompleted.length === 1 ? "done" : "completed"}
                          </span>
                        </div>

                        {todayCompleted.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {displayTasks.map((t) => (
                              <div key={t.id} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`size-4 rounded-full flex items-center justify-center shrink-0 ${
                                    isDark
                                      ? "bg-[#10B981]/20 text-[#34D399]"
                                      : "bg-[#10B981]/15 text-[#059669]"
                                  }`}
                                >
                                  <Check className="size-2.5 stroke-[3]" />
                                </span>
                                <span className="truncate font-medium">{t.title}</span>
                              </div>
                            ))}

                            {extraCount > 0 && (
                              <p
                                className={`text-[10px] italic pt-0.5 ${
                                  isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                                }`}
                              >
                                + {extraCount} more task{extraCount > 1 ? "s" : ""} accomplished
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-xs italic py-1 leading-relaxed ${
                              isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                            }`}
                          >
                            A quiet day of preparation and intentional focus.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className={`relative z-10 pt-3 border-t flex items-center justify-between text-[10.5px] ${
                        isDark ? "border-[#252532] text-[#717182]" : "border-[#ECEAE4] text-[#8E8C85]"
                      }`}
                    >
                      <span>Every conscious step moves forward</span>
                      <span className="font-semibold tracking-wider">DAYMARK</span>
                    </div>
                  </>
                )}

                {/* 2. FORMAT: SQUARE (1:1) */}
                {selectedFormat === "square" && (
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Top Branding & Date */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-2.5 rounded-full ${
                            isDark ? "bg-[#7C79F2]" : "bg-[#5E5CE6]"
                          }`}
                        />
                        <span className="text-xs font-bold tracking-widest uppercase">Daymark</span>
                      </div>
                      <span
                        className={`text-[11px] font-medium tracking-wide ${
                          isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                        }`}
                      >
                        {formattedDate}
                      </span>
                    </div>

                    {/* Quote */}
                    <div className="my-auto py-1">
                      <span
                        className={`text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1 mb-1.5 ${
                          isDark ? "text-[#7C79F2]" : "text-[#5E5CE6]"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        Daily Thought
                      </span>
                      <blockquote className="text-[14.5px] font-serif italic leading-snug tracking-tight">
                        &ldquo;{quote.text}&rdquo;
                      </blockquote>
                    </div>

                    {/* Accomplishments Summary */}
                    <div
                      className={`p-2.5 rounded-2xl border mb-2 ${
                        isDark
                          ? "bg-[#16161E]/90 border-[#2A2A38]"
                          : "bg-white/90 border-[#E8E6DE]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                          Today's Progress
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDark
                              ? "bg-[#7C79F2]/20 text-[#A5B4FC]"
                              : "bg-[#5E5CE6]/15 text-[#4338CA]"
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
                                  isDark
                                    ? "bg-[#10B981]/20 text-[#34D399]"
                                    : "bg-[#10B981]/15 text-[#059669]"
                                }`}
                              >
                                <Check className="size-2 stroke-[3]" />
                              </span>
                              <span className="truncate font-medium">{t.title}</span>
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <span
                              className={`text-[9.5px] italic block ${
                                isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                              }`}
                            >
                              +{extraCount} more completed
                            </span>
                          )}
                        </div>
                      ) : (
                        <p
                          className={`text-[11px] italic leading-tight ${
                            isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                          }`}
                        >
                          A quiet day of preparation and intentional focus.
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div
                      className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                        isDark ? "border-[#252532] text-[#717182]" : "border-[#ECEAE4] text-[#8E8C85]"
                      }`}
                    >
                      <span>Every conscious step moves forward</span>
                      <span className="font-semibold tracking-wider">DAYMARK</span>
                    </div>
                  </div>
                )}

                {/* 3. FORMAT: X / TWITTER (16:9 Landscape - 2-Column Grid) */}
                {selectedFormat === "twitter" && (
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Top Branding Row */}
                    <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`size-2 rounded-full ${
                            isDark ? "bg-[#7C79F2]" : "bg-[#5E5CE6]"
                          }`}
                        />
                        <span className="text-[11px] font-bold tracking-widest uppercase">
                          Daymark
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-medium tracking-wide ${
                          isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                        }`}
                      >
                        {formattedDate}
                      </span>
                    </div>

                    {/* 2-Column Layout */}
                    <div className="grid grid-cols-12 gap-3 my-auto py-1 items-center">
                      {/* Left: Quote */}
                      <div className="col-span-7 pr-1">
                        <span
                          className={`text-[9.5px] font-semibold tracking-wider uppercase flex items-center gap-1 mb-1 ${
                            isDark ? "text-[#7C79F2]" : "text-[#5E5CE6]"
                          }`}
                        >
                          <Sparkles className="size-2.5" />
                          Daily Mindset
                        </span>
                        <blockquote className="text-[13px] font-serif italic leading-snug line-clamp-3 tracking-tight">
                          &ldquo;{quote.text}&rdquo;
                        </blockquote>
                      </div>

                      {/* Right: Tasks Card */}
                      <div
                        className={`col-span-5 p-2 rounded-xl border ${
                          isDark
                            ? "bg-[#16161E]/90 border-[#2A2A38]"
                            : "bg-white/90 border-[#E8E6DE]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider">
                            Today
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isDark
                                ? "bg-[#7C79F2]/20 text-[#A5B4FC]"
                                : "bg-[#5E5CE6]/15 text-[#4338CA]"
                            }`}
                          >
                            {todayCompleted.length} done
                          </span>
                        </div>

                        {todayCompleted.length > 0 ? (
                          <div className="space-y-0.5">
                            {displayTasks.map((t) => (
                              <div key={t.id} className="flex items-center gap-1 text-[10px]">
                                <span
                                  className={`size-3 rounded-full flex items-center justify-center shrink-0 ${
                                    isDark
                                      ? "bg-[#10B981]/20 text-[#34D399]"
                                      : "bg-[#10B981]/15 text-[#059669]"
                                  }`}
                                >
                                  <Check className="size-2 stroke-[3]" />
                                </span>
                                <span className="truncate font-medium">{t.title}</span>
                              </div>
                            ))}
                            {extraCount > 0 && (
                              <span
                                className={`text-[9px] italic block ${
                                  isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                                }`}
                              >
                                +{extraCount} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-[9.5px] italic leading-tight ${
                              isDark ? "text-[#9D9DA8]" : "text-[#71717A]"
                            }`}
                          >
                            Intentional focus day.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className={`pt-1 border-t flex items-center justify-between text-[9px] ${
                        isDark ? "border-[#252532] text-[#717182]" : "border-[#ECEAE4] text-[#8E8C85]"
                      }`}
                    >
                      <span>Every conscious step moves forward</span>
                      <span className="font-semibold tracking-wider">DAYMARK</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-[#F2F0EB] dark:border-[#22222A] mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F4F3EE] dark:hover:bg-[#202027] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleShareOrDownload}
                disabled={isGenerating}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] rounded-xl shadow-md shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating {activeConfig.sublabel}...
                  </>
                ) : (
                  <>
                    {Capacitor.isNativePlatform() ? (
                      <Share2 className="size-3.5" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {Capacitor.isNativePlatform()
                      ? `Share (${activeConfig.sublabel})`
                      : `Download PNG (${activeConfig.sublabel})`}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
