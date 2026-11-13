package app.jongibit.reader;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemPaperOverlay")
public class SystemPaperOverlayPlugin extends Plugin {
    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(buildStateJson(getContext()));
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context ctx = getContext();
        if (Settings.canDrawOverlays(ctx)) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + ctx.getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
        JSObject res = new JSObject();
        res.put("granted", false);
        call.resolve(res);
    }

    @PluginMethod
    public void applyFilter(PluginCall call) {
        Context ctx = getContext();
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        String mode = call.getString("mode", "light-color");
        int strength = call.getInt("strength", 92);
        int warmth = call.getInt("warmth", 24);

        SharedPreferences prefs = ctx.getSharedPreferences(PaperOverlayService.PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("enabled", enabled && Settings.canDrawOverlays(ctx))
            .putString("mode", mode)
            .putInt("strength", strength)
            .putInt("warmth", warmth)
            .apply();

        Intent svc = new Intent(ctx, PaperOverlayService.class);
        if (enabled && Settings.canDrawOverlays(ctx)) {
            svc.setAction(PaperOverlayService.ACTION_UPDATE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc);
            } else {
                ctx.startService(svc);
            }
        } else {
            svc.setAction(PaperOverlayService.ACTION_STOP);
            ctx.startService(svc);
        }

        call.resolve(buildStateJson(ctx));
    }

    @PluginMethod
    public void openColorCorrectionSettings(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
        call.resolve();
    }

    private static JSObject buildStateJson(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PaperOverlayService.PREFS, Context.MODE_PRIVATE);
        JSObject obj = new JSObject();
        obj.put("supported", true);
        obj.put("hasPermission", Settings.canDrawOverlays(ctx));
        obj.put("enabled", prefs.getBoolean("enabled", false) && Settings.canDrawOverlays(ctx));
        obj.put("mode", prefs.getString("mode", "light-color"));
        obj.put("strength", prefs.getInt("strength", 92));
        obj.put("warmth", prefs.getInt("warmth", 24));
        return obj;
    }
}
