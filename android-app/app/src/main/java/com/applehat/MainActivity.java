package com.applehat.applehat;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MainActivity extends Activity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;
    private static final int CAMERA_CAPTURE_REQUEST_CODE = 2002;

    private WebView mWebView;

    // 文件选择器状态（Android 5.0+）
    private ValueCallback<Uri[]> mFilePathCallback;
    private String[] mFileChooserAcceptTypes;
    private boolean mFileChooserMultiple;

    // 老版本文件选择（Android 4.x）
    private ValueCallback<Uri> mOldFilePathCallback;
    private String mOldFileChooserAcceptType;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 保持常亮
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // 沉浸式
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        mWebView = new WebView(this);
        setContentView(mWebView);

        // WebView 背景透明 → 露出 Manifest 设置的白底
        mWebView.setBackgroundColor(0xFFFFFFFF);

        WebSettings s = mWebView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setDefaultTextEncodingName("utf-8");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            // 摄像头/麦克风/通知 权限（WebRTC）
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            // ===== 文件选择（Android 5.0+ / API 21+）=====
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {

                // 如果还有上一次没处理完的，先取消
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                mFileChooserAcceptTypes = fileChooserParams != null
                        ? fileChooserParams.getAcceptTypes() : new String[0];
                mFileChooserMultiple = fileChooserParams != null
                        && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;

                // 优先走 OPEN_DOCUMENT（Android 5.0+，支持 SAF，无需存储权限）
                // 回退到 GET_CONTENT（兼容老设备）
                Intent intent;
                if (Build.VERSION.SDK_INT >= 19) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                } else {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                }
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(getMimeTypeForFileChooser(mFileChooserAcceptTypes));
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, mFileChooserMultiple);

                startActivityForResult(
                        Intent.createChooser(intent, "选择文件"),
                        FILE_CHOOSER_REQUEST_CODE);
                return true;
            }

            // ===== 文件选择（Android 4.x / 遗留 API）=====
            @SuppressWarnings("deprecation")
            public void openFileChooser(ValueCallback<Uri> uploadMsg) {
                openFileChooser(uploadMsg, null, null);
            }

            @SuppressWarnings("deprecation")
            public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType) {
                openFileChooser(uploadMsg, acceptType, null);
            }

            @SuppressWarnings("deprecation")
            public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType, String capture) {
                if (mOldFilePathCallback != null) {
                    mOldFilePathCallback.onReceiveValue(null);
                }
                mOldFilePathCallback = uploadMsg;
                mOldFileChooserAcceptType = acceptType;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(acceptType != null && !acceptType.isEmpty() ? acceptType : "*/*");

                startActivityForResult(
                        Intent.createChooser(intent, "选择文件"),
                        FILE_CHOOSER_REQUEST_CODE);
            }
        });

        mWebView.setVerticalScrollBarEnabled(false);
        mWebView.setHorizontalScrollBarEnabled(false);
        mWebView.setScrollBarStyle(WebView.SCROLLBARS_OUTSIDE_OVERLAY);

        mWebView.loadUrl("file:///android_asset/public/index.html");

        requestRuntimePermissions();
    }

    // ---- 把 accept 属性转成单个 MIME type ----
    private String getMimeTypeForFileChooser(String[] acceptTypes) {
        if (acceptTypes == null || acceptTypes.length == 0) return "*/*";
        for (String t : acceptTypes) {
            if (t != null && !t.isEmpty()) return t;
        }
        return "*/*";
    }

    // ---- onActivityResult 接收文件选择结果 ----
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            // ==== Android 5.0+ 返回多条 Uri[] ====
            if (Build.VERSION.SDK_INT >= 21) {
                if (mFilePathCallback != null) {
                    Uri[] results = null;
                    if (resultCode == Activity.RESULT_OK && data != null) {
                        results = parseResultUris(data);
                    }
                    mFilePathCallback.onReceiveValue(results);
                    mFilePathCallback = null;
                } else if (mOldFilePathCallback != null) {
                    // 老版本单 Uri 回退
                    Uri result = (resultCode == Activity.RESULT_OK && data != null)
                            ? data.getData() : null;
                    mOldFilePathCallback.onReceiveValue(result);
                    mOldFilePathCallback = null;
                }
            } else {
                // ==== Android 4.x 单 Uri ====
                if (mOldFilePathCallback != null) {
                    Uri result = (resultCode == Activity.RESULT_OK && data != null)
                            ? data.getData() : null;
                    mOldFilePathCallback.onReceiveValue(result);
                    mOldFilePathCallback = null;
                }
            }
        }
    }

    // 从 Intent 里把所有 Uri 抠出来（兼容单文件 + 多文件）
    private Uri[] parseResultUris(Intent data) {
        List<Uri> list = new ArrayList<>();

        if (data == null) return null;

        // 多文件：clipData
        if (Build.VERSION.SDK_INT >= 16 && data.getClipData() != null) {
            int n = data.getClipData().getItemCount();
            for (int i = 0; i < n; i++) {
                list.add(data.getClipData().getItemAt(i).getUri());
            }
        }

        // 单文件：data.getData()
        if (data.getData() != null) {
            list.add(data.getData());
        }

        return list.isEmpty() ? null : list.toArray(new Uri[0]);
    }

    private void requestRuntimePermissions() {
        if (Build.VERSION.SDK_INT < 23) return;

        List<String> needed = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33) {
            needed.addAll(Arrays.asList(
                    Manifest.permission.POST_NOTIFICATIONS,
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_AUDIO,
                    Manifest.permission.READ_MEDIA_VIDEO
            ));
        } else if (Build.VERSION.SDK_INT >= 30) {
            needed.addAll(Arrays.asList(
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO
            ));
        } else {
            needed.addAll(Arrays.asList(
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
            ));
        }

        List<String> pending = new ArrayList<>();
        for (String p : needed) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                pending.add(p);
            }
        }
        if (!pending.isEmpty()) {
            requestPermissions(pending.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        // 清理未处理的文件选择回调（避免 Activity 重建时 crash）
        if (mFilePathCallback != null) {
            mFilePathCallback.onReceiveValue(null);
            mFilePathCallback = null;
        }
        if (mOldFilePathCallback != null) {
            mOldFilePathCallback.onReceiveValue(null);
            mOldFilePathCallback = null;
        }

        if (mWebView != null) {
            mWebView.stopLoading();
            mWebView.removeAllViews();
            mWebView.destroy();
            mWebView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onPause() {
        if (mWebView != null) mWebView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mWebView != null) mWebView.onResume();
    }
}
