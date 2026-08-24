import JSZip from 'jszip';
import { fileSystemService } from './fileSystem';
import { apkSignerService } from './apkSignerService';
import { webPreviewService } from './webPreviewService';

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

        // Patch AndroidManifest.xml binary package name so it installs as an independent app
        // NOTE: We replace com.pocketcode.ide for package/permissions/authorities, but KEEP .MainActivity intact so Android finds the Java class in DEX!
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

          const mainActivitySuffix = '.MainActivity';
          const mainActivityBuf = new Uint8Array(mainActivitySuffix.length * 2);
          for (let i = 0; i < mainActivitySuffix.length; i++) {
            const code = mainActivitySuffix.charCodeAt(i);
            mainActivityBuf[i * 2] = code & 0xff;
            mainActivityBuf[i * 2 + 1] = (code >> 8) & 0xff;
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
              // Check if followed by .MainActivity (must NOT replace class name, DEX holds com.pocketcode.ide.MainActivity)
              let isMainActivity = true;
              for (let k = 0; k < mainActivityBuf.length; k++) {
                if (manifestBytes[i + oldBuf.length + k] !== mainActivityBuf[k]) {
                  isMainActivity = false;
                  break;
                }
              }

              if (!isMainActivity) {
                manifestBytes.set(newBuf, i);
              }
              i += oldBuf.length - 1;
            }
          }
          zip.file('AndroidManifest.xml', manifestBytes);
        }

        onProgress(`[3/5] Bundling and compiling your real project files for Android WebView...`, 'output');

        // 1. Inject all raw files into assets/public/
        allFiles.forEach(f => {
          if (!f.isFolder && f.content !== undefined) {
            const relPath = f.path.replace(/^\/+/, '');
            zip.file(`assets/public/${relPath}`, f.content);
            // Also write at root level of public if it's an asset or entry file
            if (f.name === 'index.html' || f.name.endsWith('.html') || f.name.endsWith('.css') || f.name.endsWith('.js') || f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.svg')) {
              zip.file(`assets/public/${f.name}`, f.content);
            }
          }
        });

        // 2. Generate the real, fully-compiled standalone HTML (full screen for mobile device)
        const bundledAppHtml = webPreviewService.buildPreviewHtml(allFiles, true);
        zip.file('assets/public/index.html', bundledAppHtml);

        // Patch resources.arsc to change App Name (PocketCode IDE -> projectName)
        const arscFile = zip.file('resources.arsc');
        if (arscFile) {
          const arscData = await arscFile.async('uint8array');
          const oldName = 'PocketCode IDE';
          const newName = projectName.substring(0, 14); // Max 14 chars to fit exactly in byte slot
          
          const oldBuf8 = new Uint8Array(oldName.length);
          for (let i = 0; i < oldName.length; i++) oldBuf8[i] = oldName.charCodeAt(i);
          
          const newBuf8 = new Uint8Array(oldName.length); // Pad with 0s
          for (let i = 0; i < newName.length; i++) newBuf8[i] = newName.charCodeAt(i);

          for (let i = 0; i <= arscData.length - oldBuf8.length; i++) {
            let match = true;
            for (let j = 0; j < oldBuf8.length; j++) {
              if (arscData[i + j] !== oldBuf8[j]) { match = false; break; }
            }
            if (match) {
              arscData.set(newBuf8, i);
              i += oldBuf8.length - 1;
            }
          }
          zip.file('resources.arsc', arscData, { compression: 'STORE' });
        }

        // Generate Custom Icon using Canvas and overwrite PNG icons (DO NOT remove XML files to prevent ResourcesNotFoundException)
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 192; canvas.height = 192;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw vibrant background
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.beginPath(); ctx.arc(96, 96, 96, 0, Math.PI * 2); ctx.fill();
            // Draw bold project initial
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 100px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(projectName.charAt(0).toUpperCase(), 96, 104);
            
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.split(',')[1];
            
            const iconPaths = [
              'res/mipmap-mdpi-v4/ic_launcher.png',
              'res/mipmap-hdpi-v4/ic_launcher.png',
              'res/mipmap-xhdpi-v4/ic_launcher.png',
              'res/mipmap-xxhdpi-v4/ic_launcher.png',
              'res/mipmap-xxxhdpi-v4/ic_launcher.png',
              'res/mipmap-mdpi-v4/ic_launcher_round.png',
              'res/mipmap-hdpi-v4/ic_launcher_round.png',
              'res/mipmap-xhdpi-v4/ic_launcher_round.png',
              'res/mipmap-xxhdpi-v4/ic_launcher_round.png',
              'res/mipmap-xxxhdpi-v4/ic_launcher_round.png',
              'res/mipmap-mdpi-v4/ic_launcher_foreground.png',
              'res/mipmap-hdpi-v4/ic_launcher_foreground.png',
              'res/mipmap-xhdpi-v4/ic_launcher_foreground.png',
              'res/mipmap-xxhdpi-v4/ic_launcher_foreground.png',
              'res/mipmap-xxxhdpi-v4/ic_launcher_foreground.png'
            ];
            for (const p of iconPaths) {
              if (zip.file(p)) {
                zip.file(p, base64Data, { base64: true });
              }
            }
          }
        } catch {
          // Fallback if canvas is not available in non-DOM environment
        }

        // Update Capacitor configuration
        const capConfig = JSON.stringify({
          appId: packageName,
          appName: projectName,
          webDir: 'public',
          bundledWebRuntime: false,
          server: {
            androidScheme: "https",
            cleartext: true
          }
        }, null, 2);
        zip.file('assets/capacitor.config.json', capConfig);

        onProgress(`[4/5] Computing SHA-256 Merkle tree & applying APK Signature Scheme v2...`, 'system');
        const signedApkBytes = await apkSignerService.signAPK(zip, (msg) => onProgress(msg, 'output'));

        onProgress(`[5/5] Packaging installable Android APK (${projectName}.apk)...`, 'output');
        const apkBlob = new Blob([signedApkBytes], { type: 'application/vnd.android.package-archive' });

        const apkFilename = `${projectName}.apk`;
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
