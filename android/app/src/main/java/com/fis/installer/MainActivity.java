package com.fis.installer;

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
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        showSplash();
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
