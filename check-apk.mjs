import fs from 'fs';
import JSZip from 'jszip';

async function checkApk() {
  const apkPath = 'public/templates/base-template.apk';
  if (!fs.existsSync(apkPath)) {
    console.warn(`[check-apk] APK file not found at ${apkPath}. Please place or build the base template first.`);
    return;
  }

  try {
    const apkBuffer = fs.readFileSync(apkPath);
    const zip = new JSZip();
    await zip.loadAsync(apkBuffer);

    const paths = Object.keys(zip.files).filter(p => p.startsWith('assets/'));
    console.log(`[check-apk] Assets in ${apkPath} (${paths.length} total):`);
    console.log(paths.slice(0, 20));
    
    if (paths.length > 20) console.log(`...and ${paths.length - 20} more`);
  } catch (err) {
    console.error(`[check-apk] Failed to inspect APK:`, err);
  }
}

checkApk().catch(console.error);
