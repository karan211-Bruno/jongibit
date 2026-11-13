package app.jongibit.reader;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemPaperOverlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
