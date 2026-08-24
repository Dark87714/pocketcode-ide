import JSZip from 'jszip';
import { fileSystemService } from './fileSystem';
import { apkSignerService } from './apkSignerService';

export class APKBuilderService {
  /**
   * Generates a REAL, INSTALLABLE Android APK directly on device
   * by injecting the user's project files into a pre-compiled native Android runtime container
   */
  async buildProjectAPK(
    onProgress: (msg: string, type: 'system' | 'output' | 'success' | 'error') => void
  ): Promise<{ success: boolean; apkName?: string; error?: string }> {
    const projectName = fileSystemService.getCurrentProjectName() || 'my-app';
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const packageName = `com.pocketcode.${cleanName}`;
    const versionName = '1.0.0';

    onProgress(`==================================================================`, 'system');
    onProgress(`📱 BUILDING REAL ANDROID APK: '${projectName}'`, 'system');
    onProgress(`==================================================================`, 'system');

    try {
      // 1. Gather all files in the active workspace
      onProgress(`[1/5] Scanning workspace files & packaging assets...`, 'system');
      const allFiles = fileSystemService.getAllFlatFiles();
      if (allFiles.length === 0) {
        throw new Error('Workspace is empty. Create some files first.');
      }
      await new Promise(r => setTimeout(r, 400));

      // 2. Fetch the pre-compiled Android native runtime template APK
      onProgress(`[2/5] Loading pre-compiled Android Native Runtime container...`, 'output');
      let templateBuffer: ArrayBuffer | null = null;
      try {
        const res = await fetch('/templates/base-template.apk');
        if (res.ok) {
          templateBuffer = await res.arrayBuffer();
        }
      } catch {
        // Fallback below if fetch fails
      }

      const zip = new JSZip();

      if (templateBuffer) {
        // Load the authentic compiled Android APK (containing real classes.dex, resources.arsc, AndroidManifest.xml)
        await zip.loadAsync(templateBuffer);

        // Remove old template public web assets
        const existingPaths = Object.keys(zip.files);
        for (const p of existingPaths) {
          if (p.startsWith('assets/public/') || p.startsWith('assets/capacitor.config.json')) {
            zip.remove(p);
          }
        }

        // Patch AndroidManifest.xml binary package name so it installs as an independent app (no conflict with PocketCode IDE)
        const manifestFile = zip.file('AndroidManifest.xml');
        if (manifestFile) {
          const manifestBytes = await manifestFile.async('uint8array');
          const oldPkg = 'com.pocketcode.ide';
          const newPkg = 'com.pocketcode.app';
          
          const oldBuf = new Uint8Array(oldPkg.length * 2);
          for (let i = 0; i < oldPkg.length; i++) {
            const code = oldPkg.charCodeAt(i);
            oldBuf[i * 2] = code & 0xff;
            oldBuf[i * 2 + 1] = (code >> 8) & 0xff;
          }

          const newBuf = new Uint8Array(newPkg.length * 2);
          for (let i = 0; i < newPkg.length; i++) {
            const code = newPkg.charCodeAt(i);
            newBuf[i * 2] = code & 0xff;
            newBuf[i * 2 + 1] = (code >> 8) & 0xff;
          }

          for (let i = 0; i <= manifestBytes.length - oldBuf.length; i++) {
            let match = true;
            for (let j = 0; j < oldBuf.length; j++) {
              if (manifestBytes[i + j] !== oldBuf[j]) {
                match = false;
                break;
              }
            }
            if (match) {
              manifestBytes.set(newBuf, i);
              break;
            }
          }
          zip.file('AndroidManifest.xml', manifestBytes);
        }

        onProgress(`[3/5] Injecting your project files into Android Native WebView host...`, 'output');

        // Check if there is an index.html, if not, create a fallback launcher
        let hasIndexHtml = false;

        allFiles.forEach(f => {
          if (!f.isFolder && f.content) {
            const relPath = f.path.replace(/^\//, '');
            zip.file(`assets/public/${relPath}`, f.content);
            if (relPath.toLowerCase() === 'index.html') {
              hasIndexHtml = true;
            }
          }
        });

        if (!hasIndexHtml) {
          // If project has no index.html (e.g. only main.js or App.jsx), generate a clean runtime envelope
          const jsFiles = allFiles.filter(f => !f.isFolder && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.html')));
          const mainScript = jsFiles.find(f => f.name === 'index.js' || f.name === 'main.js' || f.name === 'app.js')?.name || jsFiles[0]?.name || '';

          const generatedIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${projectName}</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #121212; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .card { background: #1e1e1e; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 90%; }
    h1 { color: #38bdf8; margin-top: 0; }
    p { color: #888; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 ${projectName}</h1>
    <p>PocketCode Android App is running smoothly!</p>
    <div id="app"></div>
  </div>
  ${mainScript ? `<script src="${mainScript}"></script>` : ''}
</body>
</html>`;
          zip.file('assets/public/index.html', generatedIndex);
        }

        // Update Capacitor configuration
        const capConfig = JSON.stringify({
          appId: packageName,
          appName: projectName,
          webDir: 'public',
          bundledWebRuntime: false
        }, null, 2);
        zip.file('assets/capacitor.config.json', capConfig);

        onProgress(`[4/5] Computing SHA-256 Merkle tree & applying APK Signature Scheme v2...`, 'system');
        const signedApkBytes = await apkSignerService.signAPK(zip, (msg) => onProgress(msg, 'output'));

        onProgress(`[5/5] Packaging installable Android APK (${cleanName}-v${versionName}-debug.apk)...`, 'output');
        const apkBlob = new Blob([signedApkBytes], { type: 'application/vnd.android.package-archive' });

        const apkFilename = `${cleanName}-v${versionName}-debug.apk`;
        const apkUrl = URL.createObjectURL(apkBlob);

        // Download directly to phone
        const a = document.createElement('a');
        a.href = apkUrl;
        a.download = apkFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(apkUrl);

        const sizeMb = (apkBlob.size / (1024 * 1024)).toFixed(2);

        onProgress(`\n==================================================================`, 'success');
        onProgress(`🎉 BUILD SUCCESSFUL! Real Android APK generated: ${apkFilename} (${sizeMb} MB)`, 'success');
        onProgress(`📲 Download started automatically to your device's Download folder!`, 'success');
        onProgress(`💡 Open your phone's File Manager / Downloads and tap '${apkFilename}' to install!`, 'success');
        onProgress(`==================================================================\n`, 'success');

        return { success: true, apkName: apkFilename };
      } else {
        // Fallback to generating the complete native Android Gradle source package
        onProgress(`[3/5] Template not reachable directly, generating complete Native Gradle bundle...`, 'output');
        await this.exportAndroidStudioProject(onProgress);
        return { success: true, apkName: `${cleanName}-android-project.zip` };
      }
    } catch (err: any) {
      onProgress(`\n❌ APK Build Failed: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  }

  /**
   * Generates a complete, authentic Android Studio & Gradle project zip
   */
  async exportAndroidStudioProject(
    onProgress?: (msg: string, type: 'system' | 'output' | 'success' | 'error') => void
  ): Promise<{ success: boolean; filename: string }> {
    const projectName = fileSystemService.getCurrentProjectName() || 'my-app';
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const packageName = `com.pocketcode.${cleanName}`;
    const versionName = '1.0.0';
    const versionCode = 1;

    onProgress?.(`📦 Creating Complete Native Android Project for '${projectName}'...`, 'system');

    const zip = new JSZip();
    const allFiles = fileSystemService.getAllFlatFiles();

    zip.file('build.gradle', `buildscript {
    repositories { google(); mavenCentral() }
    dependencies { classpath 'com.android.tools.build:gradle:8.2.2' }
}
allprojects { repositories { google(); mavenCentral() } }
`);
    zip.file('settings.gradle', `include ':app'\nrootProject.name = "${projectName}"\n`);
    zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m\nandroid.useAndroidX=true\n`);

    zip.file('app/build.gradle', `plugins { id 'com.android.application' }
android {
    namespace "${packageName}"
    compileSdk 34
    defaultConfig {
        applicationId "${packageName}"
        minSdk 22
        targetSdk 34
        versionCode ${versionCode}
        versionName "${versionName}"
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}
`);

    zip.file('app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${packageName}">
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:label="${projectName}" android:theme="@style/Theme.AppCompat.Light.NoActionBar">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

    const javaPath = packageName.replace(/\./g, '/');
    zip.file(`app/src/main/java/${javaPath}/MainActivity.java`, `package ${packageName};
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView wv = new WebView(this);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.getSettings().setDomStorageEnabled(true);
        wv.setWebViewClient(new WebViewClient());
        wv.loadUrl("file:///android_asset/public/index.html");
        setContentView(wv);
    }
}
`);

    zip.file('app/src/main/res/values/strings.xml', `<resources><string name="app_name">${projectName}</string></resources>`);

    allFiles.forEach(f => {
      if (!f.isFolder && f.content) {
        zip.file(`app/src/main/assets/public/${f.path.replace(/^\//, '')}`, f.content);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${cleanName}-android-project.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onProgress?.(`✅ Android Native Project downloaded: ${filename}`, 'success');
    return { success: true, filename };
  }
}

export const apkBuilderService = new APKBuilderService();
