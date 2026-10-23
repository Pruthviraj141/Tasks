package app.daymark.tasks;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Daymark Android Home-Screen Widget Provider.
 * Displays today's task snapshot, allows one-tap task completion directly from the widget,
 * and provides instant one-tap voice capture launch action.
 */
public class DaymarkWidgetProvider extends AppWidgetProvider {

    public static final String PREF_NAME = "CapacitorStorage";
    public static final String KEY_SNAPSHOT = "daymark_widget_snapshot";
    public static final String KEY_PENDING_TOGGLES = "pending_widget_toggles";

    public static final String ACTION_TOGGLE_TASK = "app.daymark.tasks.ACTION_TOGGLE_TASK";
    public static final String EXTRA_TASK_ID = "extra_task_id";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_TOGGLE_TASK.equals(intent.getAction())) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            if (taskId != null && !taskId.isEmpty()) {
                handleTaskToggle(context, taskId);
            }
        }
    }

    /**
     * Toggles the task's completion status directly in the cached snapshot, records the toggle
     * in pending list for SQLite synchronization, and updates all active widgets immediately.
     */
    private void handleTaskToggle(Context context, String taskId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String snapshotJson = prefs.getString(KEY_SNAPSHOT, null);

            if (snapshotJson != null) {
                JSONObject json = new JSONObject(snapshotJson);
                JSONArray tasks = json.optJSONArray("todayTasks");
                int completedCount = 0;

                if (tasks != null) {
                    for (int i = 0; i < tasks.length(); i++) {
                        JSONObject t = tasks.getJSONObject(i);
                        if (taskId.equals(t.optString("id"))) {
                            boolean wasDone = t.optBoolean("isCompleted", false);
                            t.put("isCompleted", !wasDone);
                        }
                        if (t.optBoolean("isCompleted", false)) {
                            completedCount++;
                        }
                    }
                    json.put("completedCount", completedCount);
                    json.put("todayTasks", tasks);

                    // Record in pending toggles for React/SQLite sync
                    String pendingStr = prefs.getString(KEY_PENDING_TOGGLES, "[]");
                    JSONArray pendingArray = new JSONArray(pendingStr);
                    pendingArray.put(taskId);

                    prefs.edit()
                            .putString(KEY_SNAPSHOT, json.toString())
                            .putString(KEY_PENDING_TOGGLES, pendingArray.toString())
                            .apply();

                    updateAllWidgets(context);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Triggers an immediate refresh of all Daymark widget instances on the home screen.
     */
    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, DaymarkWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.daymark_widget);

        // 1. Set current formatted date
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE, MMM d", Locale.getDefault());
        String todayFormatted = sdf.format(new Date());
        views.setTextViewText(R.id.widget_date, todayFormatted);

        // 2. Click on widget root opens MainActivity
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent);

        // 3. Click on mic button opens MainActivity with "action=voice" to trigger voice composer
        Intent voiceIntent = new Intent(context, MainActivity.class);
        voiceIntent.putExtra("action", "voice");
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent voicePendingIntent = PendingIntent.getActivity(
                context,
                1,
                voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_mic, voicePendingIntent);

        // 4. Populate task data from snapshot
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String snapshotJson = prefs.getString(KEY_SNAPSHOT, null);

            if (snapshotJson != null) {
                JSONObject json = new JSONObject(snapshotJson);
                int totalCount = json.optInt("totalCount", 0);
                int completedCount = json.optInt("completedCount", 0);
                JSONArray tasks = json.optJSONArray("todayTasks");

                views.setTextViewText(R.id.widget_summary, completedCount + " of " + totalCount + " completed today");

                if (tasks != null && tasks.length() > 0) {
                    views.setViewVisibility(R.id.widget_task_container, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_empty_view, View.GONE);

                    int[] rowIds = {R.id.widget_task_row_1, R.id.widget_task_row_2, R.id.widget_task_row_3};
                    int[] checkIds = {R.id.widget_task_check_1, R.id.widget_task_check_2, R.id.widget_task_check_3};
                    int[] titleIds = {R.id.widget_task_title_1, R.id.widget_task_title_2, R.id.widget_task_title_3};

                    for (int i = 0; i < 3; i++) {
                        if (i < tasks.length()) {
                            JSONObject taskObj = tasks.getJSONObject(i);
                            String taskId = taskObj.optString("id", "");
                            String title = taskObj.optString("title", "Task");
                            boolean isDone = taskObj.optBoolean("isCompleted", false);

                            views.setViewVisibility(rowIds[i], View.VISIBLE);
                            views.setTextViewText(titleIds[i], title);

                            if (isDone) {
                                views.setTextViewText(checkIds[i], "✓");
                                views.setTextColor(checkIds[i], Color.parseColor("#34D399")); // Emerald
                                views.setTextColor(titleIds[i], Color.parseColor("#888894"));
                            } else {
                                views.setTextViewText(checkIds[i], "○");
                                views.setTextColor(checkIds[i], Color.parseColor("#7C79F2")); // Violet
                                views.setTextColor(titleIds[i], Color.parseColor("#E2E2E8"));
                            }

                            // One-tap checkbox toggle broadcast
                            Intent toggleIntent = new Intent(context, DaymarkWidgetProvider.class);
                            toggleIntent.setAction(ACTION_TOGGLE_TASK);
                            toggleIntent.putExtra(EXTRA_TASK_ID, taskId);
                            PendingIntent togglePendingIntent = PendingIntent.getBroadcast(
                                    context,
                                    100 + i,
                                    toggleIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
                            );
                            views.setOnClickPendingIntent(checkIds[i], togglePendingIntent);

                            // Tap title opens app
                            views.setOnClickPendingIntent(titleIds[i], openAppPendingIntent);
                        } else {
                            views.setViewVisibility(rowIds[i], View.GONE);
                        }
                    }
                } else {
                    // Empty list state
                    views.setViewVisibility(R.id.widget_task_container, View.GONE);
                    views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE);
                    views.setTextViewText(R.id.widget_summary, "0 of 0 completed today");
                }
            } else {
                views.setViewVisibility(R.id.widget_task_container, View.GONE);
                views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE);
                views.setTextViewText(R.id.widget_summary, "Tap mic to speak tasks");
            }
        } catch (Exception e) {
            views.setViewVisibility(R.id.widget_task_container, View.GONE);
            views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE);
            views.setTextViewText(R.id.widget_summary, "Daymark • Offline Ready");
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
