import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, Clock, Flag, Trash2, Check } from "lucide-react";
import type { Task, CreateTaskInput } from "../types/task";
import { getTodayISODate, getTomorrowISODate } from "../lib/dateUtils";
import { cn } from "cn";

interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSave: (data: CreateTaskInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const TaskSheet = ({
  isOpen,
  onClose,
  taskToEdit,
  onSave,
  onDelete,
}: TaskSheetProps) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setNotes(taskToEdit.notes || "");
      setScheduledDate(taskToEdit.scheduledDate || "");
      setScheduledTime(taskToEdit.scheduledTime || "");
      setDurationMinutes(taskToEdit.durationMinutes);
      setDueDate(taskToEdit.dueDate || "");
      setShowAdvanced(Boolean(taskToEdit.notes || taskToEdit.dueDate || taskToEdit.durationMinutes));
    } else {
      setTitle("");
      setNotes("");
      setScheduledDate(getTodayISODate());
      setScheduledTime("");
      setDurationMinutes(undefined);
      setDueDate("");
      setShowAdvanced(false);
    }
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        durationMinutes: durationMinutes,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save task", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || !onDelete) return;
    try {
      setIsSubmitting(true);
      await onDelete(taskToEdit.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete task", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = getTodayISODate();
  const tomorrowStr = getTomorrowISODate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          {/* Sheet Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#16161B] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E8E6E0] dark:border-[#282832] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10"
          >
            {/* Sheet Drag Handle for mobile */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 bg-[#D1CFC7] dark:bg-[#32323D] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[#F2F0EB] dark:border-[#22222A]">
              <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                {taskToEdit ? "Edit Task" : "New Task"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1.5 text-[#8E8C85] hover:text-[#1C1C1E] dark:text-[#9D9DA8] dark:hover:text-[#F4F4F6] rounded-full hover:bg-[#F4F3EE] dark:hover:bg-[#22222A] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  autoFocus
                  required
                  className="w-full text-lg font-medium text-[#1C1C1E] dark:text-[#F4F4F6] placeholder:text-[#A1A1AA] dark:placeholder:text-[#636370] bg-transparent outline-none border-none py-1 focus:ring-0"
                />
              </div>

              {/* Notes input */}
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details, links, or notes..."
                  rows={2}
                  className="w-full text-sm text-[#3F3F46] dark:text-[#E2E2E8] placeholder:text-[#A1A1AA] dark:placeholder:text-[#636370] bg-[#FBFBFA] dark:bg-[#111115] rounded-xl p-3 outline-none border border-[#ECEAE4] dark:border-[#25252E] focus:border-[#5E5CE6]/60 dark:focus:border-[#7C79F2]/70 transition-colors resize-none"
                />
              </div>

              {/* Quick Date Chips */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#5E5CE6] dark:text-[#7C79F2]" />
                  Schedule Date
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduledDate(todayStr)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-xl font-medium transition-all",
                      scheduledDate === todayStr
                        ? "bg-[#5E5CE6] dark:bg-[#7C79F2] text-white shadow-sm shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25"
                        : "bg-[#F4F3EE] dark:bg-[#202027] text-[#55534E] dark:text-[#C4C4CE] hover:bg-[#EAE8E1] dark:hover:bg-[#282833]"
                    )}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledDate(tomorrowStr)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-xl font-medium transition-all",
                      scheduledDate === tomorrowStr
                        ? "bg-[#5E5CE6] dark:bg-[#7C79F2] text-white shadow-sm shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25"
                        : "bg-[#F4F3EE] dark:bg-[#202027] text-[#55534E] dark:text-[#C4C4CE] hover:bg-[#EAE8E1] dark:hover:bg-[#282833]"
                    )}
                  >
                    Tomorrow
                  </button>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="text-xs bg-[#F4F3EE] dark:bg-[#202027] text-[#55534E] dark:text-[#E2E2E8] rounded-xl px-2.5 py-1.5 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
                  />
                  {scheduledDate && (
                    <button
                      type="button"
                      onClick={() => setScheduledDate("")}
                      className="text-xs text-[#A1A1AA] hover:text-[#EF4444] dark:text-[#6E6E7A] dark:hover:text-[#F87171] px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Time & Duration */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[12px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Clock className="size-3.5 text-[#5E5CE6] dark:text-[#7C79F2]" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full text-xs bg-[#F4F3EE] dark:bg-[#202027] text-[#55534E] dark:text-[#E2E2E8] rounded-xl px-3 py-2 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Clock className="size-3.5 text-[#5E5CE6] dark:text-[#7C79F2]" />
                    Duration
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(durationMinutes === mins ? undefined : mins)}
                        className={cn(
                          "flex-1 py-1.5 text-[11px] rounded-lg font-medium transition-all",
                          durationMinutes === mins
                            ? "bg-[#5E5CE6] dark:bg-[#7C79F2] text-white"
                            : "bg-[#F4F3EE] dark:bg-[#202027] text-[#55534E] dark:text-[#C4C4CE] hover:bg-[#EAE8E1] dark:hover:bg-[#282833]"
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Advanced Settings (Due Date) */}
              <div className="pt-1">
                {!showAdvanced ? (
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(true)}
                    className="text-xs font-medium text-[#5E5CE6] dark:text-[#9B99F8] hover:underline inline-flex items-center gap-1"
                  >
                    + Set Due Date / Deadline
                  </button>
                ) : (
                  <div className="p-3 bg-[#FAF9F6] dark:bg-[#121216] rounded-xl border border-[#ECEAE4] dark:border-[#25252E] space-y-2">
                    <label className="text-[12px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider flex items-center gap-1.5">
                      <Flag className="size-3.5 text-[#F59E0B]" />
                      Due Date (Deadline)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="text-xs bg-white dark:bg-[#1A1A21] text-[#55534E] dark:text-[#E2E2E8] rounded-xl px-3 py-1.5 border border-[#E8E6E0] dark:border-[#2D2D38] outline-none flex-1"
                      />
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate("")}
                          className="text-xs text-[#A1A1AA] hover:text-[#EF4444] dark:text-[#6E6E7A] dark:hover:text-[#F87171] px-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#F2F0EB] dark:border-[#22222A] flex items-center justify-between gap-3">
                {taskToEdit && onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-2 text-xs font-medium text-[#EF4444] dark:text-[#F87171] hover:bg-[#FEE2E2]/60 dark:hover:bg-[#EF4444]/15 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F4F3EE] dark:hover:bg-[#22222A] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || isSubmitting}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm shadow-[#5E5CE6]/30 dark:shadow-[#7C79F2]/30 transition-all flex items-center gap-1.5"
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                    {taskToEdit ? "Update Task" : "Add Task"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
