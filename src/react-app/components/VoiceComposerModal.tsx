import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, X, Sparkles, Keyboard } from "lucide-react";

interface VoiceComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManualCreate: () => void;
}

export const VoiceComposerModal: React.FC<VoiceComposerModalProps> = ({
  isOpen,
  onClose,
  onOpenManualCreate,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-[2px]"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E8E6E0] overflow-hidden p-6 text-center z-10"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-[#8E8C85] hover:text-[#1C1C1E] rounded-full hover:bg-[#F4F3EE] transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Pulsing Voice Sphere visualizer */}
            <div className="relative mx-auto mt-4 mb-6 size-24 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.35, 0.15, 0.35],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-[#5E5CE6]"
              />
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.6, 0.3, 0.6],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                className="absolute inset-2 rounded-full bg-[#818CF8]/40"
              />
              <div className="relative size-16 rounded-full bg-gradient-to-tr from-[#5E5CE6] to-[#7C3AED] shadow-lg shadow-[#5E5CE6]/35 flex items-center justify-center text-white">
                <Mic className="size-7" />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[11.5px] font-semibold tracking-wide mb-3">
              <Sparkles className="size-3" />
              Voice Intelligence • Phase 2
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-semibold text-[#1C1C1E] mb-2 tracking-tight">
              Natural Voice Task Capture
            </h3>
            <p className="text-xs leading-relaxed text-[#71717A] mb-6 px-2">
              Speech recognition and intelligent task parsing are wired for Phase 2 integration with Cloudflare Workers AI. You can create and schedule tasks using the quick composer right now.
            </p>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManualCreate();
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] rounded-xl shadow-sm shadow-[#5E5CE6]/30 transition-all flex items-center justify-center gap-2"
              >
                <Keyboard className="size-4" />
                Add Task with Keyboard
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 text-xs font-medium text-[#71717A] hover:bg-[#F4F3EE] rounded-xl transition-colors"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
