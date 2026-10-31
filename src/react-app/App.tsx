import { useState, useMemo, useEffect, useRef, type TouchEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { RotateCw, ArrowDown } from "lucide-react";
import { toast } from "sonner";
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
import { PermissionsGateScreen } from "./components/PermissionsGateScreen";
import { TaskMigrationModal } from "./components/TaskMigrationModal";
import { Toaster } from "./components/ui/sonner";
import { getTodayISODate, getTomorrowISODate, getTaskDateBucket } from "./lib/dateUtils";
import { calculateProductivityPulse } from "./lib/pulseUtils";
import { getDailyQuote } from "./data/motivationalQuotes";
import { getTaskRepository } from "./storage";
import { notificationService } from "./services/notifications/NotificationService";
import { audioRecorderService } from "./services/audio/AudioRecorderService";
import { haptics } from "./lib/haptics";
import { useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { DaymarkLogo } from "./components/DaymarkLogo";

export default function App() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    activeTasks,
    completedTasks,
    isLoading,
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

  const shouldReduceMotion = useReducedMotion();
  const todayStr = useMemo(() => getTodayISODate(), []);
  const tomorrowStr = useMemo(() => getTomorrowISODate(), []);
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  // Pull-to-refresh mobile state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Productivity pulse statistics
  const allTasks = useMemo(
    () => [...activeTasks, ...completedTasks],
    [activeTasks, completedTasks]
  );
  const pulseStats = useMemo(
    () => calculateProductivityPulse(allTasks),
    [allTasks]
  );

  // Keep taskToEdit synced with latest task state when toggled inside the detail sheet
  const currentTaskToEdit = useMemo(() => {
    if (!taskToEdit) return null;
    return allTasks.find((t) => t.id === taskToEdit.id) || taskToEdit;
  }, [taskToEdit, allTasks]);

  // Listen for native Android widget intent to trigger voice composer immediately
  useEffect(() => {
    const handleVoiceEvent = () => setIsVoiceModalOpen(true);
    window.addEventListener("daymark-open-voice", handleVoiceEvent);
    return () => window.removeEventListener("daymark-open-voice", handleVoiceEvent);
  }, []);

  // Listen for notification tap to bring up active focus session
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      if (action.notification.extra?.isFocusTimer) {
        try {
          const savedStr = localStorage.getItem("daymark_focus_session");
          if (savedStr) {
            const saved = JSON.parse(savedStr);
            if (saved.taskId) {
              const target = allTasks.find((t) => t.id === saved.taskId);
              if (target) setFocusTask(target);
            }
          }
        } catch {
          // Ignore
        }
      }
    });

    return () => {
      sub.then((handle) => handle.remove()).catch(() => {});
    };
  }, [allTasks]);

  const [hasPermissions, setHasPermissions] = useState<boolean | null>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("daymark_permissions_onboarding_completed");
      if (saved === "true") return true;
    }
    return null;
  });

  // Verify both notification and microphone permissions before granting app entry
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    async function verifyPermissions() {
      const notifStatus = notificationService.isSupported()
        ? await notificationService.getPermissionStatus()
        : "granted";
      const micStatus = await audioRecorderService.checkPermission();
      if (!isCancelled) {
        if (notifStatus === "granted" && micStatus) {
          localStorage.setItem("daymark_permissions_onboarding_completed", "true");
          setHasPermissions(true);
        } else {
          setHasPermissions(false);
        }
      }
    }
    verifyPermissions();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Single source of truth for which day-bucket a task belongs to.
  const taskBuckets = useMemo(
    () => new Map(activeTasks.map((t) => [t.id, getTaskDateBucket(t, todayStr, tomorrowStr)])),
    [activeTasks, todayStr, tomorrowStr]
  );

  // Filter tasks based on selected tab. Overdue tasks are surfaced first within "Today".
  const displayedTasks = useMemo(() => {
    switch (activeFilter) {
      case "today": {
        const todayTasks = activeTasks.filter((t) => {
          const bucket = taskBuckets.get(t.id);
          return bucket === "today" || bucket === "anytime" || bucket === "overdue";
        });
        return [...todayTasks].sort((a, b) => {
          const aOverdue = taskBuckets.get(a.id) === "overdue" ? 0 : 1;
          const bOverdue = taskBuckets.get(b.id) === "overdue" ? 0 : 1;
          return aOverdue - bOverdue;
        });
      }
      case "tomorrow":
        return activeTasks.filter((t) => taskBuckets.get(t.id) === "tomorrow");
      case "upcoming":
        return activeTasks.filter((t) => taskBuckets.get(t.id) === "upcoming");
      case "completed":
        return completedTasks;
      case "all":
      default:
        return activeTasks;
    }
  }, [activeTasks, completedTasks, activeFilter, taskBuckets]);

  const counts = useMemo(() => {
    const result = { all: activeTasks.length, today: 0, tomorrow: 0, upcoming: 0, overdue: 0, completed: completedTasks.length };
    for (const t of activeTasks) {
      const bucket = taskBuckets.get(t.id);
      if (bucket === "today" || bucket === "anytime" || bucket === "overdue") result.today++;
      else if (bucket === "tomorrow") result.tomorrow++;
      else if (bucket === "upcoming") result.upcoming++;
      if (bucket === "overdue") result.overdue++;
    }
    return result;
  }, [activeTasks, completedTasks, taskBuckets]);

  // Helper to extract local date string YYYY-MM-DD from any date string / timestamp
  const toLocalDateStr = (dateVal?: string | null): string | null => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Completed tasks scoped strictly to the selected filter tab
  const displayedCompletedTasks = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return completedTasks.filter((t) => {
          if (t.scheduledDate === todayStr || t.dueDate === todayStr) return true;
          const compLocalDate = toLocalDateStr(t.completedAt);
          if (compLocalDate === todayStr) return true;
          if (!t.scheduledDate && !t.dueDate) {
            const createdLocalDate = toLocalDateStr(t.createdAt);
            if (createdLocalDate === todayStr) return true;
          }
          return false;
        });
      case "tomorrow":
        return completedTasks.filter((t) => t.scheduledDate === tomorrowStr || t.dueDate === tomorrowStr);
      case "upcoming":
        return completedTasks.filter((t) => {
          const effectiveDate = t.scheduledDate || t.dueDate;
          return Boolean(effectiveDate && effectiveDate > tomorrowStr);
        });
      case "completed":
      case "all":
      default:
        return completedTasks;
    }
  }, [activeFilter, completedTasks, todayStr, tomorrowStr]);

  // Filter-specific progress stats: only show Today bar & count when on Today tab!
  const filterStats = useMemo(() => {
    switch (activeFilter) {
      case "today": {
        const todayActive = activeTasks.filter((t) => {
          const bucket = taskBuckets.get(t.id);
          return bucket === "today" || bucket === "anytime" || bucket === "overdue";
        }).length;
        const todayCompleted = displayedCompletedTasks.length;
        const total = todayActive + todayCompleted;
        const progress = total === 0 ? 0 : Math.round((todayCompleted / total) * 100);
        return { total, completed: todayCompleted, progress };
      }
      case "tomorrow": {
        const tomorrowActive = activeTasks.filter((t) => taskBuckets.get(t.id) === "tomorrow").length;
        const tomorrowCompleted = displayedCompletedTasks.length;
        const total = tomorrowActive + tomorrowCompleted;
        const progress = total === 0 ? 0 : Math.round((tomorrowCompleted / total) * 100);
        return { total, completed: tomorrowCompleted, progress };
      }
      case "upcoming": {
        const upcomingActive = activeTasks.filter((t) => taskBuckets.get(t.id) === "upcoming").length;
        const upcomingCompleted = displayedCompletedTasks.length;
        const total = upcomingActive + upcomingCompleted;
        const progress = total === 0 ? 0 : Math.round((upcomingCompleted / total) * 100);
        return { total, completed: upcomingCompleted, progress };
      }
      case "completed": {
        return { total: completedTasks.length, completed: completedTasks.length, progress: 100 };
      }
      case "all":
      default: {
        const total = activeTasks.length + completedTasks.length;
        const progress = total === 0 ? 0 : Math.round((completedTasks.length / total) * 100);
        return { total, completed: completedTasks.length, progress };
      }
    }
  }, [activeFilter, activeTasks, completedTasks, displayedCompletedTasks, taskBuckets]);

  const [voiceInitialText, setVoiceInitialText] = useState<string | null>(null);

  const handleOpenVoice = () => {
    setVoiceInitialText(null);
    setIsVoiceModalOpen(true);
  };

  const handleOpenCreateManual = () => {
    setTaskToEdit(null);
    setIsSheetOpen(true);
  };

  const handleOpenTaskDetail = (task: Task) => {
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

  // Every typed quick-add submission continues through Groq GPT-OSS 20B with confirmation preview
  const handleQuickAdd = async (text: string) => {
    setVoiceInitialText(text);
    setIsVoiceModalOpen(true);
  };

  const handleUpdateTitle = async (id: string, newTitle: string) => {
    await updateTask(id, { title: newTitle });
  };

  // Interactive task completion with Undo feedback
  const handleToggleWithUndo = async (id: string) => {
    const target = allTasks.find((t) => t.id === id);
    if (!target) return;
    const wasCompleted = target.isCompleted;

    await toggleTask(id);

    if (!wasCompleted) {
      toast("Task completed", {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: async () => {
            await toggleTask(id);
          },
        },
      });
    } else {
      toast("Task reopened", {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: async () => {
            await toggleTask(id);
          },
        },
      });
    }
  };

  // Interactive task deletion with Undo feedback
  const handleDeleteWithUndo = async (id: string) => {
    const target = allTasks.find((t) => t.id === id);
    if (!target) return;

    await deleteTask(id);

    toast("Task deleted", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: async () => {
          // Restore the deleted task to repository
          await createTask({
            title: target.title,
            notes: target.notes,
            scheduledDate: target.scheduledDate,
            scheduledTime: target.scheduledTime,
            durationMinutes: target.durationMinutes,
            dueDate: target.dueDate,
            dueTime: target.dueTime,
            reminderDate: target.reminderDate,
            reminderTime: target.reminderTime,
          });
          await refresh();
        },
      },
    });
  };

  // Pull-to-refresh touch handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = 0;
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current <= 0 || isPullRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;

    if (diff > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 0) {
      const distance = Math.min(70, diff * 0.45);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= 50 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      haptics.taskSaved().catch(() => {});
      try {
        await refresh();
      } finally {
        setTimeout(() => {
          setIsPullRefreshing(false);
          setPullDistance(0);
        }, 350);
      }
    } else {
      setPullDistance(0);
    }
    touchStartYRef.current = 0;
  };

  // Minimalist splash loading state while verifying initial authentication & permissions
  if (isAuthLoading || (user && hasPermissions === null)) {
    return (
      <div className="min-h-screen w-full bg-[#F8F7F3] dark:bg-[#0C0C0E] flex flex-col items-center justify-center p-6 select-none transition-colors">
        <DaymarkLogo size={76} showGlow useImage className="animate-pulse" />
      </div>
    );
  }

  // Without login, no entry to the application
  if (!user) {
    return <LoginScreen />;
  }

  // Without required permissions, do not enter the app
  if (!hasPermissions) {
    return (
      <PermissionsGateScreen
        onPermissionsGranted={() => setHasPermissions(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F3] dark:bg-[#0C0C0E] flex flex-col items-center justify-start sm:px-4 selection:bg-[#4F46E5]/20 dark:selection:bg-[#6366F1]/30 transition-colors duration-200">
      {/* Editorial Workspace: Clean full-width on mobile, elegant max-w-2xl on desktop */}
      <main className="w-full max-w-2xl lg:max-w-3xl min-h-screen sm:min-h-screen bg-transparent flex flex-col relative overflow-x-hidden safe-top safe-bottom transition-colors duration-200">
        {/* Header with filter-specific counts & progress bar */}
        <Header
          totalCount={filterStats.total}
          completedCount={filterStats.completed}
          progressPercentage={filterStats.progress}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
          streakCount={pulseStats.currentStreak}
          onOpenPulse={() => setIsPulseOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
        />

        {/* Task List Content Area with Pull-To-Refresh */}
        <div
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 px-3.5 sm:px-5 pb-[max(7.5rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))] pt-1 overflow-y-auto overscroll-y-contain touch-scroll"
        >
          {/* Pull-To-Refresh Visual Indicator */}
          {(pullDistance > 0 || isPullRefreshing) && (
            <motion.div
              initial={false}
              animate={{
                height: isPullRefreshing ? 42 : pullDistance,
                opacity: Math.min(1, Math.max(0.2, (pullDistance || 30) / 45)),
              }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex items-center justify-center overflow-hidden mb-1"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A20] border border-[#E6E4DC] dark:border-[#242429] shadow-2xs text-[#71717A] dark:text-[#8E8E9A] text-xs font-medium">
                {isPullRefreshing ? (
                  <>
                    <RotateCw className="size-3.5 text-[#4F46E5] dark:text-[#818CF8] animate-spin" />
                    <span>Refreshing tasks...</span>
                  </>
                ) : (
                  <>
                    <ArrowDown
                      className="size-3.5 text-[#4F46E5] dark:text-[#818CF8] transition-transform duration-200"
                      style={{
                        transform: pullDistance >= 50 ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                    <span>{pullDistance >= 50 ? "Release to refresh" : "Pull down to refresh"}</span>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-between text-center min-h-[360px] select-none">
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="size-12 rounded-2xl bg-[#4F46E5] dark:bg-[#6366F1] shadow-md shadow-[#4F46E5]/25 dark:shadow-[#6366F1]/25 flex items-center justify-center text-white mb-3">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-[#18181B] dark:text-[#F4F4F6] tracking-tight">
                  Mark Your Day
                </h2>
                <div className="flex items-center gap-2 mt-3 text-[#71717A] dark:text-[#8E8E9A]">
                  <div className="size-3.5 border-2 border-[#4F46E5] dark:border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Loading your day...</span>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="pt-6"
              >
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#71717A] dark:text-[#8E8E9A]">
                  Built by Pruthvi
                </span>
              </motion.div>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeFilter}
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {displayedTasks.length === 0 ? (
                  <EmptyState
                    filter={activeFilter}
                    onOpenCreate={handleOpenVoice}
                    completedCount={displayedCompletedTasks.length}
                  />
                ) : (
                  /* Hybrid Grouped List: subtle surface, thin separators, readable rows */
                  <div className="rounded-2xl border border-[#E6E4DC] dark:border-[#242429] bg-white dark:bg-[#151518] shadow-2xs overflow-hidden divide-y divide-[#F0ECE3] dark:divide-[#202026] transition-colors">
                    {displayedTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggleWithUndo}
                        onClick={handleOpenTaskDetail}
                        onDelete={handleDeleteWithUndo}
                        onStartFocus={(t) => setFocusTask(t)}
                        onUpdateTitle={handleUpdateTitle}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Completed Tasks Collapsible for active filter */}
          {activeFilter !== "completed" && displayedCompletedTasks.length > 0 && (
            <CompletedSection
              completedTasks={displayedCompletedTasks}
              defaultOpen={displayedTasks.length === 0}
              onToggle={handleToggleWithUndo}
              onClick={handleOpenTaskDetail}
              onDelete={handleDeleteWithUndo}
              onUpdateTitle={handleUpdateTitle}
            />
          )}
        </div>

        {/* Floating Quick Action & Voice Bar */}
        <div className="fixed bottom-0 inset-x-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-[#F8F7F3] via-[#F8F7F3]/95 to-transparent dark:from-[#0C0C0E] dark:via-[#0C0C0E]/95 dark:to-transparent pt-6 pointer-events-none z-20 transition-colors duration-200">
          <div className="pointer-events-auto max-w-2xl lg:max-w-3xl mx-auto w-full">
            <QuickAddBar
              onQuickAdd={handleQuickAdd}
              onOpenFullSheet={handleOpenCreateManual}
              onOpenVoice={handleOpenVoice}
            />
          </div>
        </div>

        {/* Task Sheet (Detail View & Edit) */}
        <TaskSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          taskToEdit={currentTaskToEdit}
          onSave={handleSaveTask}
          onDelete={handleDeleteWithUndo}
          onToggle={handleToggleWithUndo}
        />

        {/* Voice Composer Modal (Microphone-first & Groq Parser) */}
        <VoiceComposer
          isOpen={isVoiceModalOpen}
          initialTypedText={voiceInitialText}
          onClose={() => {
            setIsVoiceModalOpen(false);
            setVoiceInitialText(null);
          }}
          repository={getTaskRepository()}
          onTasksSaved={refresh}
          onOpenManualCreate={handleOpenCreateManual}
        />

        {/* Focus Mode Countdown Modal */}
        <FocusModeModal
          task={focusTask}
          isOpen={Boolean(focusTask)}
          onClose={() => setFocusTask(null)}
          onCompleteTask={handleToggleWithUndo}
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
          onOpenShare={() => setIsShareOpen(true)}
        />


        {/* First-Login Local-to-Cloud Task Migration Preview */}
        <TaskMigrationModal onMigrationComplete={refresh} />

        {/* Toast Provider with 4-second undo action floating gracefully above bottom bar */}
        <Toaster position="bottom-center" />
      </main>
    </div>
  );
}
