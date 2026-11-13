package app.jongibit.reader;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public class PaperTileService extends TileService {
    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        if (!Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivityAndCollapse(intent);
            return;
        }
        SharedPreferences prefs = getSharedPreferences(PaperOverlayService.PREFS, MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("enabled", false);
        String mode = prefs.getString("mode", "light-color");

        String nextMode = mode;
        boolean nextEnabled;
        if (!enabled) {
            nextEnabled = true;
            nextMode = "light-color";
        } else if ("light-color".equals(mode)) {
            nextEnabled = true;
            nextMode = "ink-paper";
        } else {
            nextEnabled = false;
            nextMode = "light-color";
        }

        prefs.edit().putBoolean("enabled", nextEnabled).putString("mode", nextMode).apply();
        Intent svc = new Intent(this, PaperOverlayService.class);
        if (nextEnabled) {
            svc.setAction(PaperOverlayService.ACTION_UPDATE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(svc);
            } else {
                startService(svc);
            }
        } else {
            svc.setAction(PaperOverlayService.ACTION_STOP);
            startService(svc);
        }
        updateTile();
    }

    private void updateTile() {
        Tile tile = getQsTile();
        if (tile == null) return;
        SharedPreferences prefs = getSharedPreferences(PaperOverlayService.PREFS, MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("enabled", false);
        String mode = prefs.getString("mode", "light-color");
        tile.setState(enabled ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        if (!enabled) {
            tile.setLabel("종이빛 필터");
        } else if ("ink-paper".equals(mode)) {
            tile.setLabel("종이빛 · 잉크");
        } else {
            tile.setLabel("종이빛 · 컬러");
        }
        tile.updateTile();
    }
}
