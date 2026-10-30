import { useState, useRef } from "react";
import { X, Share2, Download, Check, Sparkles, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
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
  exportPixelRatio: number;
}

const FORMAT_CONFIGS: Record<ShareFormat, FormatConfig> = {
  story: {
    id: "story",
    label: "Story",
    sublabel: "1080 × 1920",
    exportWidth: 1080,
    exportHeight: 1920,
    previewWidth: 360,
    previewHeight: 640, // 9:16 exact integer ratio 3x
    exportPixelRatio: 3,
  },
  square: {
    id: "square",
    label: "Square",
    sublabel: "1080 × 1080",
    exportWidth: 1080,
    exportHeight: 1080,
    previewWidth: 360,
    previewHeight: 360, // 1:1 exact integer ratio 3x
    exportPixelRatio: 3,
  },
  twitter: {
    id: "twitter",
    label: "Landscape",
    sublabel: "1600 × 900",
    exportWidth: 1600,
    exportHeight: 900,
    previewWidth: 400,
    previewHeight: 225, // 16:9 exact integer ratio 4x
    exportPixelRatio: 4,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeConfig = FORMAT_CONFIGS[selectedFormat];

  // Filter tasks completed today
  const todayCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return t.completedAt.startsWith(dateString);
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

  const handleShareOrDownload = async () => {
    if (!cardRef.current || isGenerating) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      haptics.selection().catch(() => {});

      // Use exact integer pixel ratio for razor-sharp canvas rasterization
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: activeConfig.exportPixelRatio,
        cacheBust: true,
        backgroundColor: "#09090D",
      });

      const fileName = `Daymark-${selectedFormat}-${dateString}.png`;

      // 1. Native Capacitor Share (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            title: "Daymark Daily Focus",
            text: `“${quote.text}” — Mark Your Day`,
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
            text: `“${quote.text}” — Mark Your Day`,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[96vh] w-full max-w-lg flex-col items-center overflow-y-auto border border-[#262632] bg-[#121217] p-3.5 sm:p-5 shadow-2xl touch-scroll select-none text-[#F4F4F6]"
      >
        {/* Top Modal Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-[#202028] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Share2 className="size-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F6] tracking-tight">
                Share Daily Card
              </h3>
              <p className="text-[11px] text-[#8E8E9A]">
                {activeConfig.label} • {activeConfig.sublabel} (Dark Mode)
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
            className="rounded-full text-[#9D9DA8] hover:bg-[#202028] hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Format Selector Tabs */}
        <div className="w-full flex items-center justify-between gap-1 p-1 bg-[#1A1A22] rounded-2xl mb-3">
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
                    ? "bg-[#282834] text-white shadow-xs font-semibold"
                    : "text-[#8E8E9E] hover:text-[#F4F4F6] font-medium"
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
          <div className="w-full p-2.5 mb-3 bg-[#321414] border border-[#4E2121] rounded-xl flex items-center gap-2 text-xs text-[#FCA5A5]">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Interactive Preview Canvas (Exclusively Dark Mode, High Fidelity) */}
        <div className="w-full flex justify-center py-1 overflow-x-auto">
          <div
            ref={cardRef}
            style={{
              width: `${activeConfig.previewWidth}px`,
              height: `${activeConfig.previewHeight}px`,
            }}
            className="relative rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden shrink-0 bg-[#09090D] text-[#F4F4F6] border border-[#22222E]"
          >
            {/* Ambient Background Accent Glow */}
            <div className="absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br from-indigo-500/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 size-56 rounded-full bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

            {/* 1. FORMAT: STORY (9:16 Portrait) */}
            {selectedFormat === "story" && (
              <>
                {/* Header with iOS Squircle Emblem */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2.5">
                      {/* iOS Squircle App Icon Badge */}
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#242430] to-[#12121A] p-[1px] shadow-md ring-1 ring-white/10 flex items-center justify-center">
                        <div className="w-full h-full rounded-[11px] bg-[#14141C] flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="2 2" />
                            <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                            <path d="M6 12C6 8.686 8.686 6 12 6C15.314 6 18 8.686 18 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold tracking-[0.14em] uppercase text-white block">
                          DAYMARK
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono tracking-wide">
                          Daily Reflection
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-medium tracking-tight px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Daily Mindset Quote */}
                  <div className="mt-8">
                    <span className="text-[10.5px] font-semibold tracking-widest uppercase flex items-center gap-1.5 text-amber-400">
                      <Sparkles className="size-3" />
                      Daily Mindset
                    </span>
                    <blockquote className="mt-3 text-[19px] font-serif italic leading-relaxed tracking-tight text-white/95">
                      &ldquo;{quote.text}&rdquo;
                    </blockquote>
                  </div>
                </div>

                {/* Accomplishments Card */}
                <div className="relative z-10 my-auto">
                  <div className="p-4 rounded-2xl bg-[#14141C]/90 border border-white/[0.08] backdrop-blur-md shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                        {todayCompleted.length > 0 ? "Accomplished Today" : "Daily Perspective"}
                      </span>
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {todayCompleted.length} {todayCompleted.length === 1 ? "task done" : "tasks done"}
                      </span>
                    </div>

                    {todayCompleted.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {displayTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 text-xs">
                            <span className="size-4 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/25 text-emerald-400">
                              <Check className="size-2.5 stroke-[3]" />
                            </span>
                            <span className="truncate font-medium text-zinc-200">{t.title}</span>
                          </div>
                        ))}

                        {extraCount > 0 && (
                          <p className="text-[10px] text-zinc-400 italic pt-1">
                            + {extraCount} more task{extraCount > 1 ? "s" : ""} accomplished
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic py-1 leading-relaxed">
                        A quiet day of preparation, intentional pacing, and focus.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 pt-3 border-t border-white/[0.07] flex items-center justify-between text-[10.5px] text-zinc-500">
                  <span>Every conscious step moves forward</span>
                  <span className="font-bold tracking-widest uppercase text-zinc-400">MARK YOUR DAY</span>
                </div>
              </>
            )}

            {/* 2. FORMAT: SQUARE (1:1) */}
            {selectedFormat === "square" && (
              <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Top Branding & Date */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#1E1E28] border border-white/10 flex items-center justify-center">
                      <span className="text-[11px] font-serif font-bold text-amber-400">M</span>
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase text-white">DAYMARK</span>
                  </div>
                  <span className="text-[10.5px] font-medium tracking-tight px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-300">
                    {formattedDate}
                  </span>
                </div>

                {/* Quote */}
                <div className="my-auto py-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1 mb-1.5 text-amber-400">
                    <Sparkles className="size-3" />
                    Daily Mindset
                  </span>
                  <blockquote className="text-[16px] font-serif italic leading-snug tracking-tight text-white/95">
                    &ldquo;{quote.text}&rdquo;
                  </blockquote>
                </div>

                {/* Accomplishments Summary */}
                <div className="p-3 rounded-2xl bg-[#14141C]/90 border border-white/[0.08] mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-300">
                      Today's Progress
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      {todayCompleted.length} {todayCompleted.length === 1 ? "done" : "completed"}
                    </span>
                  </div>

                  {todayCompleted.length > 0 ? (
                    <div className="space-y-1.5">
                      {displayTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-[11.5px]">
                          <span className="size-3.5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/25 text-emerald-400">
                            <Check className="size-2 stroke-[3]" />
                          </span>
                          <span className="truncate font-medium text-zinc-200">{t.title}</span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[9.5px] text-zinc-400 italic block">
                          +{extraCount} more completed
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400 italic leading-tight">
                      A quiet day of preparation and intentional focus.
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-white/[0.07] flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Every conscious step moves forward</span>
                  <span className="font-semibold tracking-wider text-zinc-400">MARK YOUR DAY</span>
                </div>
              </div>
            )}

            {/* 3. FORMAT: LANDSCAPE / TWITTER (16:9) */}
            {selectedFormat === "twitter" && (
              <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Top Branding & Date Row */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#1E1E28] border border-white/10 flex items-center justify-center">
                      <span className="text-[11px] font-serif font-bold text-amber-400">M</span>
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white">
                      DAYMARK
                    </span>
                  </div>
                  <span className="text-[10px] font-medium tracking-tight px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    {formattedDate}
                  </span>
                </div>

                {/* 2-Column Landscape Layout */}
                <div className="grid grid-cols-12 gap-4 my-auto py-1 items-stretch">
                  {/* Left: Quote */}
                  <div className="col-span-7 flex flex-col justify-between pr-2">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 mb-1.5 text-amber-400">
                        <Sparkles className="size-2.5" />
                        Daily Mindset
                      </span>
                      <blockquote className="text-[14.5px] font-serif italic leading-relaxed tracking-tight text-white/95 line-clamp-3">
                        &ldquo;{quote.text}&rdquo;
                      </blockquote>
                    </div>
                    <p className="text-[9.5px] text-zinc-500 font-medium tracking-wide mt-auto pt-1">
                      Every conscious step moves forward
                    </p>
                  </div>

                  {/* Right: Accomplishments */}
                  <div className="col-span-5 p-3 rounded-2xl bg-[#14141C]/90 border border-white/[0.08] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                        Today
                      </span>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {todayCompleted.length} {todayCompleted.length === 1 ? "done" : "completed"}
                      </span>
                    </div>

                    {todayCompleted.length > 0 ? (
                      <div className="space-y-1">
                        {displayTasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                            <span className="size-3.5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/25 text-emerald-400">
                              <Check className="size-2 stroke-[3]" />
                            </span>
                            <span className="truncate font-medium text-zinc-200">
                              {t.title}
                            </span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[9.5px] text-zinc-400 italic block pt-0.5">
                            +{extraCount} more completed
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-400 italic leading-tight py-2">
                        A quiet day of intentional focus and forward progress.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Footer */}
                <div className="pt-2 border-t border-white/[0.07] flex items-center justify-between text-[9.5px] text-zinc-500">
                  <span>Every conscious step moves forward</span>
                  <span className="font-bold tracking-widest uppercase text-zinc-400">MARK YOUR DAY</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full flex items-center justify-between gap-3 pt-3.5 border-t border-[#202028] mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#8E8E9A] hover:bg-[#202028] hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleShareOrDownload}
            disabled={isGenerating}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
      </DialogContent>
    </Dialog>
  );
};
