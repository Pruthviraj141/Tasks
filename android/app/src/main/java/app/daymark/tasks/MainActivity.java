package app.daymark.tasks;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupWidgetBridge();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void setupWidgetBridge() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new DaymarkWidgetBridge(), "DaymarkNativeWidget");
        }
    }

    public class DaymarkWidgetBridge {
        @JavascriptInterface
        public void syncSnapshot(String jsonSnapshot) {
            try {
                SharedPreferences prefs = getSharedPreferences(DaymarkWidgetProvider.PREF_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(DaymarkWidgetProvider.KEY_SNAPSHOT, jsonSnapshot).apply();
                DaymarkWidgetProvider.updateAllWidgets(MainActivity.this);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getPendingToggledTasks() {
            try {
                SharedPreferences prefs = getSharedPreferences(DaymarkWidgetProvider.PREF_NAME, Context.MODE_PRIVATE);
                String pending = prefs.getString(DaymarkWidgetProvider.KEY_PENDING_TOGGLES, "[]");
                if (!"[]".equals(pending)) {
                    prefs.edit().putString(DaymarkWidgetProvider.KEY_PENDING_TOGGLES, "[]").apply();
                }
                return pending;
            } catch (Exception e) {
                return "[]";
            }
        }
    }

    private void handleIntent(Intent intent) {
        if (intent != null && "voice".equals(intent.getStringExtra("action"))) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__DAYMARK_OPEN_VOICE__ = true; window.dispatchEvent(new CustomEvent('daymark-open-voice'));",
                        null
                    );
                });
            }
        }
    }
}
