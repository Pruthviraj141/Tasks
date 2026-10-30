import { useState, useEffect, type FormEvent } from "react";
import { X, Calendar, Clock, Flag, Bell, Trash2, Edit3, ArrowLeft, Check, AlignLeft } from "lucide-react";
import type { Task, CreateTaskInput } from "../types/task";
import { getTodayISODate, getTomorrowISODate, formatScheduledDate, formatDueDate, formatDuration } from "../lib/dateUtils";
import { CircularCheckbox } from "./CircularCheckbox";
import { Drawer, DrawerContent } from "./ui/drawer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { cn } from "cn";

interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSave: (data: CreateTaskInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onToggle?: (id: string) => void;
}

export const TaskSheet = ({
  isOpen,
  onClose,
  taskToEdit,
  onSave,
  onDelete,
  onToggle,
}: TaskSheetProps) => {
  // Mode: "view" for reading without keyboard autofocus; "edit" for modifying fields
  const [mode, setMode] = useState<"view" | "edit">("view");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderTime, setReminderTime] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      // Existing task: open in DETAIL VIEW mode (strictly NO keyboard, NO autofocus)
      setMode("view");
      setTitle(taskToEdit.title);
      setNotes(taskToEdit.notes || "");
      setScheduledDate(taskToEdit.scheduledDate || "");
      setScheduledTime(taskToEdit.scheduledTime || "");
      setDurationMinutes(taskToEdit.durationMinutes);
      setDueDate(taskToEdit.dueDate || "");
      setDueTime(taskToEdit.dueTime || "");
      setReminderDate(taskToEdit.reminderDate || "");
      setReminderTime(taskToEdit.reminderTime || "");
    } else {
      // New task creation: open directly in edit mode without autoFocus
      setMode("edit");
      setTitle("");
      setNotes("");
      setScheduledDate(getTodayISODate());
      setScheduledTime("");
      setDurationMinutes(undefined);
      setDueDate("");
      setDueTime("");
      setReminderDate("");
      setReminderTime("");
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
        dueTime: dueTime || undefined,
        reminderDate: reminderDate || undefined,
        reminderTime: reminderTime || undefined,
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

  const formattedScheduled = taskToEdit
    ? formatScheduledDate(taskToEdit.scheduledDate, taskToEdit.scheduledTime)
    : null;
  const formattedDue = taskToEdit ? formatDueDate(taskToEdit.dueDate) : null;
  const formattedDurationLabel = taskToEdit
    ? formatDuration(taskToEdit.durationMinutes)
    : null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} showSwipeHandle>
      <DrawerContent className="flex flex-col overflow-hidden border border-[#E8E6E0] bg-[#FAF9F6] shadow-2xl max-h-[92dvh] dark:border-[#272732] dark:bg-[#141418] touch-scroll">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-1 pb-2.5 border-b border-[#ECEAE4] dark:border-[#22222A] shrink-0">
          <div className="flex items-center gap-2">
            {mode === "edit" && taskToEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMode("view")}
                className="-ml-1 size-9 min-h-[44px] min-w-[44px] rounded-full text-[#71717A] dark:text-[#9D9DA8] touch-manipulation"
                title="Back to task details"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <h2 className="text-sm font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F4F4F6]">
              {mode === "view"
                ? "Task Details"
                : taskToEdit
                ? "Edit Task"
                : "Create Task"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 size-9 min-h-[44px] min-w-[44px] rounded-full text-[#8E8C85] hover:bg-[#F2F0EB] dark:text-[#9D9DA8] dark:hover:bg-[#22222A] touch-manipulation"
          >
            <X className="size-4" />
          </Button>
        </div>

            {/* 1. DETAIL VIEW MODE: Elegant, NO keyboard, NO autofocus */}
            {mode === "view" && taskToEdit && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Title and Direct Completion Control */}
                <div className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] shadow-xs">
                  <div className="shrink-0">
                    <CircularCheckbox
                      checked={taskToEdit.isCompleted}
                      onToggle={() => {
                        if (onToggle) onToggle(taskToEdit.id);
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-base font-medium leading-snug text-[#1C1C1E] dark:text-[#F4F4F6] transition-all",
                        taskToEdit.isCompleted && "line-through text-[#8E8C85] dark:text-[#686874]"
                      )}
                    >
                      {taskToEdit.title}
                    </p>
                    <p className="text-[11.5px] text-[#8E8C85] dark:text-[#888894] mt-0.5">
                      {taskToEdit.isCompleted
                        ? "Completed • Tap to reopen"
                        : "Tap circle to mark completed"}
                    </p>
                  </div>
                </div>

                {/* Notes Block */}
                {taskToEdit.notes && (
                  <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] space-y-1">
                    <span className="text-[11px] font-semibold text-[#8E8C85] dark:text-[#888894] uppercase tracking-wider flex items-center gap-1">
                      <AlignLeft className="size-3 text-[#4F46E5] dark:text-[#818CF8]" />
                      Notes
                    </span>
                    <p className="text-xs text-[#1C1C1E] dark:text-[#E2E2E8] leading-relaxed whitespace-pre-wrap">
                      {taskToEdit.notes}
                    </p>
                  </div>
                )}

                {/* Clearly Separated Schedule & Metadata Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Scheduled Date & Time */}
                  <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732]">
                    <span className="text-[10.5px] font-semibold text-[#8E8C85] dark:text-[#888894] uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Calendar className="size-3 text-[#4F46E5] dark:text-[#818CF8]" />
                      Scheduled
                    </span>
                    <p className="text-xs font-medium text-[#1C1C1E] dark:text-[#F4F4F6]">
                      {formattedScheduled || "Anytime"}
                    </p>
                  </div>

                  {/* 2. Duration */}
                  <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732]">
                    <span className="text-[10.5px] font-semibold text-[#8E8C85] dark:text-[#888894] uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Clock className="size-3 text-[#4F46E5] dark:text-[#818CF8]" />
                      Duration
                    </span>
                    <p className="text-xs font-medium text-[#1C1C1E] dark:text-[#F4F4F6]">
                      {formattedDurationLabel || "None set"}
                    </p>
                  </div>

                  {/* 3. Deadline */}
                  <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732]">
                    <span className="text-[10.5px] font-semibold text-[#8E8C85] dark:text-[#888894] uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Flag className="size-3 text-[#EF4444]" />
                      Deadline
                    </span>
                    <p className="text-xs font-medium text-[#1C1C1E] dark:text-[#F4F4F6]">
                      {formattedDue ? formattedDue.label : "None set"}
                    </p>
                  </div>

                  {/* 4. Reminder Notification */}
                  <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732]">
                    <span className="text-[10.5px] font-semibold text-[#8E8C85] dark:text-[#888894] uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Bell className="size-3 text-[#F59E0B]" />
                      Reminder
                    </span>
                    <p className="text-xs font-medium text-[#1C1C1E] dark:text-[#F4F4F6]">
                      {taskToEdit.reminderTime
                        ? `${taskToEdit.reminderDate || "Scheduled day"} at ${taskToEdit.reminderTime}`
                        : "None set"}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#ECEAE4] dark:border-[#22222A]">
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="text-[#EF4444] hover:bg-[#FEE2E2]/60 dark:text-[#F87171] dark:hover:bg-[#EF4444]/20"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  )}

                  {/* Explicit Edit Button */}
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setMode("edit")}
                    className="ml-auto rounded-xl bg-[#4F46E5] text-white shadow-2xs hover:bg-[#4338CA] dark:bg-[#6366F1] dark:hover:bg-[#4F46E5]"
                  >
                    <Edit3 className="size-3.5" />
                    Edit Task
                  </Button>
                </div>
              </div>
            )}

            {/* 2. EDIT MODE: Only opened when explicitly tapping Edit or Creating */}
            {mode === "edit" && (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-6">
                  {/* Task Title (NO autoFocus to prevent unwanted keyboard jumps) */}
                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] block mb-1">
                      Task Title *
                    </label>
                    <Input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be accomplished?"
                      required
                      className="h-auto w-full rounded-xl border-[#ECEAE4] bg-white p-3 text-[16px] sm:text-[15px] font-medium text-[#1C1C1E] placeholder:text-[#A1A1AA] focus-visible:border-[#4F46E5] focus-visible:ring-[#4F46E5]/10 dark:border-[#272732] dark:bg-[#1A1A20] dark:text-[#F4F4F6] dark:placeholder:text-[#636370] dark:focus-visible:border-[#6366F1]"
                    />
                  </div>

                  {/* 1. Date & Start Time Section */}
                  <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                        Date &amp; Start Time
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setScheduledDate(todayStr)}
                          className={cn(
                            "px-2 py-0.5 text-[11px] rounded-md border transition-colors cursor-pointer",
                            scheduledDate === todayStr
                              ? "bg-[#4F46E5] text-white border-[#4F46E5] font-medium"
                              : "text-[#71717A] dark:text-[#9D9DA8] border-[#ECEAE4] dark:border-[#2D2D38]"
                          )}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduledDate(tomorrowStr)}
                          className={cn(
                            "px-2 py-0.5 text-[11px] rounded-md border transition-colors cursor-pointer",
                            scheduledDate === tomorrowStr
                              ? "bg-[#4F46E5] text-white border-[#4F46E5] font-medium"
                              : "text-[#71717A] dark:text-[#9D9DA8] border-[#ECEAE4] dark:border-[#2D2D38]"
                          )}
                        >
                          Tomorrow
                        </button>
                        {scheduledDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledDate("");
                              setScheduledTime("");
                            }}
                            className="px-1.5 py-0.5 text-[10.5px] text-[#8E8C85] hover:text-[#EF4444] transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#8E8C85] dark:text-[#888894] block mb-1">Date</span>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="h-auto w-full rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8E8C85] dark:text-[#888894] block mb-1">Start Time</span>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="h-auto w-full rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Duration Section */}
                  <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                        Duration
                      </label>
                      {durationMinutes && (
                        <button
                          type="button"
                          onClick={() => setDurationMinutes(undefined)}
                          className="text-[10.5px] text-[#8E8C85] hover:text-[#EF4444] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDurationMinutes(mins)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer",
                            durationMinutes === mins
                              ? "bg-[#4F46E5] text-white border-[#4F46E5] font-medium"
                              : "bg-[#FAF9F6] dark:bg-[#202027] text-[#71717A] dark:text-[#9D9DA8] border-[#ECEAE4] dark:border-[#2D2D38]"
                          )}
                        >
                          {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Deadline Section */}
                  <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] flex items-center gap-1.5">
                        <Flag className="size-3.5 text-[#EF4444]" />
                        Deadline (Due Date &amp; Time)
                      </label>
                      {(dueDate || dueTime) && (
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate("");
                            setDueTime("");
                          }}
                          className="text-[10.5px] text-[#8E8C85] hover:text-[#EF4444] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="Due Date"
                        className="h-auto rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                      />
                      <Input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        placeholder="Due Time"
                        className="h-auto rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                      />
                    </div>
                  </div>

                  {/* 4. Reminder Notification Section */}
                  <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] flex items-center gap-1.5">
                        <Bell className="size-3.5 text-[#F59E0B]" />
                        Reminder Notification
                      </label>
                      {(reminderDate || reminderTime) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReminderDate("");
                            setReminderTime("");
                          }}
                          className="text-[10.5px] text-[#8E8C85] hover:text-[#EF4444] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="h-auto rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                      />
                      <Input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="h-auto rounded-xl border-[#ECEAE4] bg-[#FAF9F6] p-2.5 text-xs text-[#1C1C1E] dark:border-[#2D2D38] dark:bg-[#202027] dark:text-[#F4F4F6]"
                      />
                    </div>
                  </div>

                  {/* 5. Notes Section */}
                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] block mb-1">
                      Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional details or instructions..."
                      rows={2}
                      className="w-full resize-none rounded-xl border-[#ECEAE4] bg-white p-3 text-xs text-[#1C1C1E] dark:border-[#272732] dark:bg-[#1A1A20] dark:text-[#F4F4F6]"
                    />
                  </div>
                </div>

                {/* Sticky Action Footer: Never covered by keyboard */}
                <div className="sticky bottom-0 bg-[#FAF9F6] dark:bg-[#141418] border-t border-[#ECEAE4] dark:border-[#22222A] px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 z-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      if (taskToEdit) {
                        setMode("view");
                      } else {
                        onClose();
                      }
                    }}
                    className="min-h-[44px] text-[#71717A] dark:text-[#9D9DA8] touch-manipulation"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!title.trim() || isSubmitting}
                    className="min-h-[44px] rounded-xl bg-[#4F46E5] text-white shadow-2xs hover:bg-[#4338CA] dark:bg-[#6366F1] dark:hover:bg-[#4F46E5] touch-manipulation"
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                    {taskToEdit ? "Save Changes" : "Create Task"}
                  </Button>
                </div>
              </form>
            )}
      </DrawerContent>
    </Drawer>
  );
};
