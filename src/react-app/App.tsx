import { useState, useMemo, useEffect } from "react";
import { useTasks } from "./hooks/useTasks";
import type { Task, TaskFilter, CreateTaskInput, UpdateTaskInput } from "./types/task";
import { Header } from "./components/Header";
import { TaskItem } from "./components/TaskItem";
import { CompletedSection } from "./components/CompletedSection";
import { TaskSheet } from "./components/TaskSheet";
import { QuickAddBar } from "./components/QuickAddBar";
import { VoiceComposer } from "./components/voice/VoiceComposer";
import { EmptyState } from "./components/EmptyState";
import { FocusModeModal } from "./components/FocusModeModal";
import { ShareCardModal } from "./components/ShareCardModal";
import { ProductivityPulse } from "./components/ProductivityPulse";
import { getTodayISODate } from "./lib/dateUtils";
import { calculateProductivityPulse } from "./lib/pulseUtils";
import { getDailyQuote } from "./data/motivationalQuotes";
import { getTaskRepository } from "./storage";

export default function App() {
  const {
    activeTasks,
    completedTasks,
    isLoading,
    totalCount,
    completedCount,
    progressPercentage,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    refresh,
  } = useTasks();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("today");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      interface WindowWithVoiceFlag extends Window {
        __DAYMARK_OPEN_VOICE__?: boolean;
      }
      const win = window as WindowWithVoiceFlag;
      if (win.__DAYMARK_OPEN_VOICE__) {
        win.__DAYMARK_OPEN_VOICE__ = false;
        return true;
      }
    }
    return false;
  });
  const [isPulseOpen, setIsPulseOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const todayStr = useMemo(() => getTodayISODate(), []);
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  // Productivity pulse statistics
  const allTasks = useMemo(
    () => [...activeTasks, ...completedTasks],
    [activeTasks, completedTasks]
  );
  const pulseStats = useMemo(
    () => calculateProductivityPulse(allTasks),
    [allTasks]
  );

  // Listen for native Android widget intent to trigger voice composer immediately
  useEffect(() => {
    const handleVoiceEvent = () => setIsVoiceModalOpen(true);
    window.addEventListener("daymark-open-voice", handleVoiceEvent);
    return () => window.removeEventListener("daymark-open-voice", handleVoiceEvent);
  }, []);

  // Filter active tasks
  const filteredActiveTasks = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return activeTasks.filter(
          (t) =>
            t.scheduledDate === todayStr ||
            t.dueDate === todayStr ||
            (!t.scheduledDate && !t.dueDate)
        );
      case "upcoming":
        return activeTasks.filter(
          (t) =>
            (t.scheduledDate && t.scheduledDate > todayStr) ||
            (t.dueDate && t.dueDate > todayStr)
        );
      default:
        return activeTasks;
    }
  }, [activeTasks, activeFilter, todayStr]);

  const counts = useMemo(
    () => ({
      all: activeTasks.length,
      today: activeTasks.filter(
        (t) =>
          t.scheduledDate === todayStr ||
          t.dueDate === todayStr ||
          (!t.scheduledDate && !t.dueDate)
      ).length,
      upcoming: activeTasks.filter(
        (t) =>
          (t.scheduledDate && t.scheduledDate > todayStr) ||
          (t.dueDate && t.dueDate > todayStr)
      ).length,
      completed: completedTasks.length,
    }),
    [activeTasks, completedTasks, todayStr]
  );

  const handleOpenCreate = () => {
    setTaskToEdit(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsSheetOpen(true);
  };

  const handleSaveTask = async (data: CreateTaskInput) => {
    if (taskToEdit) {
      await updateTask(taskToEdit.id, data as UpdateTaskInput);
    } else {
      await createTask(data);
    }
  };

  const handleQuickAdd = async (title: string) => {
    await createTask({
      title,
      scheduledDate: todayStr,
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] dark:bg-[#08080A] flex flex-col items-center justify-start sm:p-4 selection:bg-[#5E5CE6]/20 dark:selection:bg-[#7C79F2]/30 transition-colors duration-200">
      {/* Mobile Device Simulation / Centered Container on Desktop */}
      <main className="w-full sm:max-w-[430px] min-h-screen sm:min-h-[850px] bg-[#FAF9F6] dark:bg-[#121215] sm:rounded-[36px] sm:shadow-[0_12px_44px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_16px_48px_rgba(0,0,0,0.6)] sm:border border-[#E8E6E0] dark:border-[#222228] flex flex-col relative overflow-x-hidden safe-top safe-bottom transition-colors duration-200">
        {/* Header */}
        <Header
          totalCount={totalCount}
          completedCount={completedCount}
          progressPercentage={progressPercentage}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
          streakCount={pulseStats.currentStreak}
          onOpenPulse={() => setIsPulseOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
        />

        {/* Task List Content Area */}
        <div className="flex-1 px-4 pb-28 pt-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="size-6 border-2 border-[#5E5CE6] dark:border-[#7C79F2] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-[#71717A] dark:text-[#9E9EA8]">Loading tasks...</p>
            </div>
          ) : filteredActiveTasks.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              onOpenCreate={handleOpenCreate}
            />
          ) : (
            <div className="space-y-2">
              {filteredActiveTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onClick={handleOpenEdit}
                  onDelete={deleteTask}
                  onStartFocus={(t) => setFocusTask(t)}
                />
              ))}
            </div>
          )}

          {/* Completed Tasks Collapsible */}
          <CompletedSection
            completedTasks={completedTasks}
            onToggle={toggleTask}
            onClick={handleOpenEdit}
            onDelete={deleteTask}
          />
        </div>

        {/* Floating Quick Action & Voice Bar */}
        <div className="fixed bottom-0 inset-x-0 sm:absolute sm:bottom-0 p-3 sm:p-4 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/95 to-transparent dark:from-[#121215] dark:via-[#121215]/95 dark:to-transparent pt-6 pointer-events-none z-20 transition-colors duration-200">
          <div className="pointer-events-auto max-w-[430px] mx-auto">
            <QuickAddBar
              onQuickAdd={handleQuickAdd}
              onOpenFullSheet={handleOpenCreate}
              onOpenVoice={() => setIsVoiceModalOpen(true)}
            />
          </div>
        </div>

        {/* Task Sheet (Create & Edit) */}
        <TaskSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          taskToEdit={taskToEdit}
          onSave={handleSaveTask}
          onDelete={deleteTask}
        />

        {/* Voice Composer Modal */}
        <VoiceComposer
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          repository={getTaskRepository()}
          onTasksSaved={refresh}
          onOpenManualCreate={handleOpenCreate}
        />

        {/* Focus Mode Countdown Modal */}
        <FocusModeModal
          task={focusTask}
          isOpen={Boolean(focusTask)}
          onClose={() => setFocusTask(null)}
          onCompleteTask={toggleTask}
        />

        {/* Share Story Card Modal */}
        <ShareCardModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          quote={dailyQuote}
          completedTasks={completedTasks}
          dateString={todayStr}
        />

        {/* Productivity Pulse Modal */}
        <ProductivityPulse
          stats={pulseStats}
          isOpen={isPulseOpen}
          onClose={() => setIsPulseOpen(false)}
        />
      </main>
    </div>
  );
}
