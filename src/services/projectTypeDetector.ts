import { FileItem } from '../types';

export type ProjectKind = 
  | 'native-android-kotlin'
  | 'native-android-java'
  | 'web-application'
  | 'react-web'
  | 'vue-web'
  | 'python'
  | 'c-cpp'
  | 'rust'
  | 'generic';

export interface ProjectAnalysis {
  kind: ProjectKind;
  isNativeAndroid: boolean;
  isWebProject: boolean;
  hasGradle: boolean;
  hasManifest: boolean;
  hasIndexHtml: boolean;
  hasCompose: boolean;
  packageName: string;
  applicationName: string;
  entryFiles: string[];
  allKotlinFiles: string[];
  allJavaFiles: string[];
  allXmlFiles: string[];
  totalFileCount: number;
  suggestedBuildCommand: string;
  description: string;
}

export class ProjectTypeDetector {
  analyze(files: FileItem[]): ProjectAnalysis {
    const flatFiles = this.flatten(files);
    const paths = flatFiles.map(f => f.path.replace(/\\/g, '/').toLowerCase());
    const fileMap = new Map<string, FileItem>();
    flatFiles.forEach(f => fileMap.set(f.path.replace(/\\/g, '/').toLowerCase(), f));

    const kotlinFiles = flatFiles.filter(f => f.path.endsWith('.kt') || f.path.endsWith('.kts'));
    const javaFiles = flatFiles.filter(f => f.path.endsWith('.java'));
    const xmlFiles = flatFiles.filter(f => f.path.endsWith('.xml'));
    const hasGradle = paths.some(p => p.includes('build.gradle') || p.includes('settings.gradle') || p.includes('gradlew'));
    const hasManifest = paths.some(p => p.includes('androidmanifest.xml'));
    const hasIndexHtml = paths.some(p => p.endsWith('index.html') || p === 'index.html');

    // Check for Jetpack Compose in Kotlin files or gradle files
    let hasCompose = false;
    for (const kf of kotlinFiles) {
      if (kf.content && (
        kf.content.includes('@Composable') || 
        kf.content.includes('androidx.compose') ||
        kf.content.includes('setContent {')
      )) {
        hasCompose = true;
        break;
      }
    }
    if (!hasCompose) {
      for (const f of flatFiles) {
        if (f.path.includes('gradle') && f.content && f.content.includes('compose')) {
          hasCompose = true;
          break;
        }
      }
    }

    // Determine package name from AndroidManifest.xml or package statements in Kotlin
    let packageName = 'com.pocketcode.app';
    let applicationName = '';

    // 1. Check strings.xml for app_name
    for (const f of flatFiles) {
      if (f.path.toLowerCase().endsWith('strings.xml') && f.content) {
        const appNameMatch = f.content.match(/<string\s+name=["']app_name["']>([^<]+)<\/string>/i);
        if (appNameMatch && appNameMatch[1] && appNameMatch[1].trim()) {
          applicationName = appNameMatch[1].trim();
        }
      }
    }

    // 2. Check AndroidManifest.xml
    for (const f of flatFiles) {
      if (f.path.toLowerCase().endsWith('androidmanifest.xml') && f.content) {
        const pkgMatch = f.content.match(/package\s*=\s*["']([^"']+)["']/i);
        if (pkgMatch && pkgMatch[1]) {
          packageName = pkgMatch[1];
        }
        if (!applicationName) {
          const labelMatch = f.content.match(/android:label\s*=\s*["']([^"']+)["']/i);
          if (labelMatch && labelMatch[1] && !labelMatch[1].startsWith('@string/')) {
            applicationName = labelMatch[1].trim();
          }
        }
      }
    }

    // 3. Check settings.gradle / settings.gradle.kts
    if (!applicationName) {
      for (const f of flatFiles) {
        if (f.path.toLowerCase().endsWith('settings.gradle') || f.path.toLowerCase().endsWith('settings.gradle.kts')) {
          const rootProjMatch = f.content?.match(/rootProject\.name\s*=\s*["']([^"']+)["']/i);
          if (rootProjMatch && rootProjMatch[1] && rootProjMatch[1].trim()) {
            applicationName = rootProjMatch[1].trim();
          }
        }
      }
    }

    // 4. Check active project name in localStorage
    if (!applicationName) {
      try {
        const savedProjectName = localStorage.getItem('pocketcode_active_project_name_v3');
        if (savedProjectName && savedProjectName !== 'PocketCode App' && savedProjectName.trim()) {
          applicationName = savedProjectName.trim();
        }
      } catch (e) {}
    }

    if (!applicationName) {
      applicationName = 'EduDepth K-12';
    }

    // Fallback: check package statement in first Kotlin or Java file
    if (packageName === 'com.pocketcode.app') {
      const firstSrc = kotlinFiles[0] || javaFiles[0];
      if (firstSrc && firstSrc.content) {
        const pkgMatch = firstSrc.content.match(/^\s*package\s+([a-zA-Z0-9_.]+)/m);
        if (pkgMatch && pkgMatch[1]) {
          packageName = pkgMatch[1];
        }
      }
    }

    // Extract entry files
    const entryFiles: string[] = [];
    if (hasIndexHtml) {
      const idx = flatFiles.find(f => f.path.toLowerCase().endsWith('index.html'));
      if (idx) entryFiles.push(idx.path);
    }
    const mainKotlin = kotlinFiles.find(f => f.path.toLowerCase().includes('mainactivity') || f.path.toLowerCase().includes('main.kt'));
    if (mainKotlin) entryFiles.push(mainKotlin.path);

    // Classify Project Kind
    let kind: ProjectKind = 'generic';
    let isNativeAndroid = false;
    let isWebProject = false;
    let suggestedBuildCommand = 'npm run build';
    let description = 'Standard Workspace Project';

    if (hasGradle || hasManifest || kotlinFiles.length > 0 || javaFiles.length > 0) {
      if (kotlinFiles.length >= javaFiles.length && kotlinFiles.length > 0) {
        kind = 'native-android-kotlin';
        isNativeAndroid = true;
        suggestedBuildCommand = './gradlew assembleDebug';
        description = hasCompose 
          ? `Native Android App (Kotlin + Jetpack Compose) [${kotlinFiles.length} Kotlin files]`
          : `Native Android App (Kotlin) [${kotlinFiles.length} Kotlin files]`;
      } else if (javaFiles.length > 0) {
        kind = 'native-android-java';
        isNativeAndroid = true;
        suggestedBuildCommand = './gradlew assembleDebug';
        description = `Native Android App (Java) [${javaFiles.length} Java files]`;
      }
    }

    if (!isNativeAndroid) {
      if (hasIndexHtml) {
        const isReact = paths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx') || p.includes('react'));
        const isVue = paths.some(p => p.endsWith('.vue') || p.includes('vue'));
        if (isReact) {
          kind = 'react-web';
          isWebProject = true;
          suggestedBuildCommand = 'apk build';
          description = 'React Web Application (Compiles with Offline APK Engine)';
        } else if (isVue) {
          kind = 'vue-web';
          isWebProject = true;
          suggestedBuildCommand = 'apk build';
          description = 'Vue Web Application (Compiles with Offline APK Engine)';
        } else {
          kind = 'web-application';
          isWebProject = true;
          suggestedBuildCommand = 'apk build';
          description = 'HTML5 / Web Application (Compiles with Offline APK Engine)';
        }
      } else if (paths.some(p => p.endsWith('.py'))) {
        kind = 'python';
        suggestedBuildCommand = 'python main.py';
        description = 'Python Script / Application';
      } else if (paths.some(p => p.endsWith('.cpp') || p.endsWith('.c'))) {
        kind = 'c-cpp';
        suggestedBuildCommand = 'g++ main.cpp -o main && ./main';
        description = 'C/C++ Project';
      }
    }

    return {
      kind,
      isNativeAndroid,
      isWebProject,
      hasGradle,
      hasManifest,
      hasIndexHtml,
      hasCompose,
      packageName,
      applicationName,
      entryFiles,
      allKotlinFiles: kotlinFiles.map(f => f.path),
      allJavaFiles: javaFiles.map(f => f.path),
      allXmlFiles: xmlFiles.map(f => f.path),
      totalFileCount: flatFiles.length,
      suggestedBuildCommand,
      description
    };
  }

  private flatten(items: FileItem[]): FileItem[] {
    const res: FileItem[] = [];
    const walk = (list: FileItem[]) => {
      for (const item of list) {
        if (!item.isFolder) {
          res.push(item);
        }
        if (item.children && item.children.length > 0) {
          walk(item.children);
        }
      }
    };
    walk(items);
    return res;
  }
}

export const projectTypeDetector = new ProjectTypeDetector();
