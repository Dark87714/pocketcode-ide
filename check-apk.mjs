import fs from 'fs';
import JSZip from 'jszip';

async function checkApk() {
  const apkBuffer = fs.readFileSync('public/templates/base-template.apk');
  const zip = new JSZip();
  await zip.loadAsync(apkBuffer);

  const paths = Object.keys(zip.files).filter(p => p.startsWith('assets/'));
  console.log('Assets in base-template.apk:');
  console.log(paths.slice(0, 20)); // show first 20
  
  if (paths.length > 20) console.log('...and more');
}

checkApk().catch(console.error);
