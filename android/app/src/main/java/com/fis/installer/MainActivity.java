package com.fis.installer;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.VideoView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long LOGO_SPLASH_MS = 2000;

    private FrameLayout splashOverlay;
    private VideoView splashVideo;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        String userAgent = settings.getUserAgentString();
        if (userAgent == null || !userAgent.contains("FISInstallerApp")) {
            settings.setUserAgentString((userAgent == null ? "" : userAgent) + " FISInstallerApp");
        }
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        showSplash();
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        Uri data = intent.getData();
        if (data == null) {
            return;
        }
        String httpsUrl = toHttpsUrl(data);
        if (httpsUrl == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.loadUrl(httpsUrl);
        }
    }

    private String toHttpsUrl(Uri data) {
        String scheme = data.getScheme();
        if ("https".equals(scheme) && "job.floorinteriorservices.com".equals(data.getHost())) {
            return data.toString();
        }
        if (!"fis-installer".equals(scheme)) {
            return null;
        }
        String host = data.getHost();
        String path = data.getPath();
        StringBuilder dest = new StringBuilder("https://job.floorinteriorservices.com");
        if (host != null && !host.isEmpty()) {
            dest.append("/").append(host);
        }
        if (path != null && !path.isEmpty() && !"/".equals(path)) {
            if (!path.startsWith("/")) {
                dest.append("/");
            }
            dest.append(path);
        }
        if (dest.toString().equals("https://job.floorinteriorservices.com")) {
            dest.append("/installer/login");
        }
        if (data.getQuery() != null && !data.getQuery().isEmpty()) {
            dest.append("?").append(data.getQuery());
        }
        return dest.toString();
    }

    private boolean isTablet() {
        return getResources().getConfiguration().smallestScreenWidthDp >= 600;
    }

    private void showSplash() {
        splashOverlay = new FrameLayout(this);
        splashOverlay.setBackgroundColor(Color.WHITE);
        splashOverlay.setClickable(true);

        if (isTablet()) {
            showLogoSplash();
        } else {
            showVideoSplash();
        }

        addSiteLabel();

        addContentView(
            splashOverlay,
            new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
    }

    private void showLogoSplash() {
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setAdjustViewBounds(true);

        int size = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                220,
                getResources().getDisplayMetrics()
            )
        );
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(size, size, Gravity.CENTER);
        splashOverlay.addView(logo, logoParams);

        splashHandler.postDelayed(this::hideSplash, LOGO_SPLASH_MS);
    }

    private void showVideoSplash() {
        splashVideo = new VideoView(this);
        splashVideo.setBackgroundColor(Color.WHITE);
        splashVideo.setVideoURI(
            Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.splash)
        );
        splashOverlay.addView(
            splashVideo,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );

        splashVideo.setOnPreparedListener(mediaPlayer -> {
            mediaPlayer.setVolume(0f, 0f);
            splashVideo.setBackgroundColor(Color.TRANSPARENT);
            splashVideo.start();
        });
        splashVideo.setOnCompletionListener(mediaPlayer -> hideSplash());
        splashVideo.setOnErrorListener((mediaPlayer, what, extra) -> {
            hideSplash();
            return true;
        });
    }

    private void addSiteLabel() {
        TextView siteLabel = new TextView(this);
        siteLabel.setText("floorinteriorservices.com");
        siteLabel.setTextColor(Color.DKGRAY);
        siteLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        siteLabel.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams labelParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        );
        labelParams.bottomMargin = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                16,
                getResources().getDisplayMetrics()
            )
        );
        splashOverlay.addView(siteLabel, labelParams);
    }

    private void hideSplash() {
        if (splashOverlay == null) {
            return;
        }
        splashOverlay
            .animate()
            .alpha(0f)
            .setDuration(400)
            .withEndAction(this::clearSplash)
            .start();
    }

    private void clearSplash() {
        splashHandler.removeCallbacksAndMessages(null);
        if (splashVideo != null) {
            splashVideo.stopPlayback();
            splashVideo = null;
        }
        if (splashOverlay != null) {
            ViewGroup parent = (ViewGroup) splashOverlay.getParent();
            if (parent != null) {
                parent.removeView(splashOverlay);
            }
            splashOverlay = null;
        }
    }

    @Override
    public void onDestroy() {
        splashHandler.removeCallbacksAndMessages(null);
        if (splashVideo != null) {
            splashVideo.stopPlayback();
        }
        splashVideo = null;
        splashOverlay = null;
        super.onDestroy();
    }
}
