package app.jongibit.reader;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.hardware.input.InputManager;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;

public class PaperOverlayService extends Service {
    public static final String PREFS = "jongibit_overlay";
    public static final String ACTION_UPDATE = "app.jongibit.reader.ACTION_UPDATE_OVERLAY";
    public static final String ACTION_STOP = "app.jongibit.reader.ACTION_STOP_OVERLAY";
    private static final String CHANNEL_ID = "jongibit_paper_overlay";
    private static final int NOTIF_ID = 1041;

    private WindowManager windowManager;
    private View overlayView;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            setEnabledPref(this, false);
            removeOverlay();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!Settings.canDrawOverlays(this)) {
            setEnabledPref(this, false);
            stopSelf();
            return START_NOT_STICKY;
        }

        ensureNotificationChannel();
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ID, notification);
        }

        applyCurrentTint();
        return START_STICKY;
    }

    private void applyCurrentTint() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String mode = prefs.getString("mode", "light-color");
        int strength = prefs.getInt("strength", 92);
        int warmth = prefs.getInt("warmth", 24);

        if (windowManager == null) {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        }

        if (overlayView == null) {
            overlayView = new View(this);
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            );
            windowManager.addView(overlayView, params);
        }

        float maxSafeAlpha = 0.48f;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            InputManager im = (InputManager) getSystemService(INPUT_SERVICE);
            if (im != null) {
                maxSafeAlpha = Math.min(0.48f, im.getMaximumObscuringOpacityForTouch() * 0.85f);
            }
        }

        float s = Math.max(0f, Math.min(1f, strength / 100f));
        float w = Math.max(0f, Math.min(1f, warmth / 100f));

        int r, g, b;
        float rawAlpha;
        if ("ink-paper".equals(mode)) {
            r = 216;
            g = 212;
            b = 202;
            rawAlpha = 0.22f + 0.16f * s;
        } else if ("nature".equals(mode)) {
            r = 250;
            g = 242;
            b = 228;
            rawAlpha = 0.08f * w;
        } else {
            r = 246;
            g = Math.round(236 - 14 * w);
            b = Math.round(218 - 32 * w);
            rawAlpha = 0.14f + 0.18f * s + 0.08f * w;
        }

        float clampedAlpha = Math.max(0.02f, Math.min(maxSafeAlpha, rawAlpha));
        int alphaInt = Math.round(clampedAlpha * 255f);
        overlayView.setBackgroundColor(Color.argb(alphaInt, r, g, b));
    }

    private void removeOverlay() {
        if (windowManager != null && overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception ignored) {
            }
            overlayView = null;
        }
    }

    @Override
    public void onDestroy() {
        removeOverlay();
        super.onDestroy();
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "종이빛 화면 필터",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        Intent stopIntent = new Intent(this, PaperOverlayService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        return builder
            .setContentTitle("종이빛 화면 필터 켜짐")
            .setContentText("눈이 편안한 종이 색감이 적용 중입니다.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(openPi)
            .addAction(new Notification.Action.Builder(null, "끄기", stopPi).build())
            .setOngoing(true)
            .build();
    }

    public static void setEnabledPref(Context ctx, boolean enabled) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("enabled", enabled).apply();
    }
}
