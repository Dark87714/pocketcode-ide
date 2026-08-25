/**
 * Path Utilities & Canonical Normalization
 * Ensures consistent, secure path handling across the IDE filesystem.
 */

/**
 * Normalizes any relative or absolute path into a canonical relative path (e.g. "src/components/App.tsx")
 * - Converts backslashes to forward slashes
 * - Strips leading/trailing slashes
 * - Collapses duplicate slashes
 * - Resolves '.' and '..' without escaping above root
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '';

  const clean = rawPath.replace(/[\\]/g, '/').trim();
  const segments = clean.split('/');
  const resolved: string[] = [];

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed || trimmed === '.') continue;
    if (trimmed === '..') {
      if (resolved.length > 0) {
        resolved.pop();
      }
      // If at root, do not allow climbing above root (jail to workspace)
      continue;
    }
    resolved.push(trimmed);
  }

  return resolved.join('/');
}

/**
 * Validates a single filename (not a full path)
 */
export function validateFilename(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'File name cannot be empty.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'File name cannot be blank.' };
  }

  if (trimmed === '.' || trimmed === '..') {
    return { valid: false, error: 'File name cannot be "." or "..".' };
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'File name cannot contain path separators (/ or \\).' };
  }

  // Check for control characters or null bytes
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: 'File name contains invalid control characters.' };
  }

  // Check invalid filename characters across OSes (< > : " | ? *)
  if (/[<>:"|?*]/.test(trimmed)) {
    return { valid: false, error: 'File name contains illegal characters (< > : " | ? *).' };
  }

  return { valid: true };
}

/**
 * Gets the basename of a path (e.g. "src/main.ts" -> "main.ts")
 */
export function getBasename(path: string): string {
  const norm = normalizePath(path);
  if (!norm) return '';
  const parts = norm.split('/');
  return parts[parts.length - 1];
}

/**
 * Gets the parent directory of a path (e.g. "src/components/App.tsx" -> "src/components", "index.html" -> "")
 */
export function getParentPath(path: string): string {
  const norm = normalizePath(path);
  if (!norm) return '';
  const parts = norm.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

/**
 * Joins path segments into a canonical normalized path
 */
export function joinPaths(...parts: (string | undefined | null)[]): string {
  const valid = parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return normalizePath(valid.join('/'));
}
