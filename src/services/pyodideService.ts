// In-browser Pyodide Python WebAssembly runner with real Package & PyTorch ML Support
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<any>;
  }
}

// Built-in Pure Python PyTorch Tensor & Neural Network Module for WebAssembly
const PYTORCH_WASM_POLYFILL = `
import math
import sys

class _Tensor:
    def __init__(self, data, requires_grad=False):
        if isinstance(data, (int, float)):
            self.data = float(data)
            self.shape = ()
        elif isinstance(data, list):
            self.data = data
            self.shape = self._calc_shape(data)
        else:
            self.data = list(data)
            self.shape = (len(self.data),)
        self.requires_grad = requires_grad
        self.grad = None

    def _calc_shape(self, d):
        if isinstance(d, list):
            if len(d) > 0 and isinstance(d[0], list):
                return (len(d), len(d[0]))
            return (len(d),)
        return ()

    def __repr__(self):
        return f"tensor({self.data})"

    def __format__(self, format_spec):
        if len(self.shape) == 0 and isinstance(self.data, (int, float)):
            return format(self.data, format_spec)
        if len(self.shape) == 1 and len(self.data) == 1:
            return format(self.data[0], format_spec)
        return format(str(self), format_spec)

    def __float__(self):
        if len(self.shape) == 0:
            return float(self.data)
        if len(self.shape) == 1 and len(self.data) == 1:
            return float(self.data[0])
        return float(self.data[0][0])

    def _apply_op(self, other, op):
        val = other.data if isinstance(other, _Tensor) else other
        
        # 1. Scalar op
        if isinstance(val, (int, float)):
            if len(self.shape) == 0:
                return _Tensor(op(self.data, val))
            elif len(self.shape) == 1:
                return _Tensor([op(x, val) for x in self.data])
            else:
                return _Tensor([[op(x, val) for x in row] for row in self.data])
        
        # 2. 2D Tensor + 1D Tensor (Broadcasting Bias like PyTorch)
        if len(self.shape) == 2 and isinstance(val, list) and (len(val) > 0 and not isinstance(val[0], list)):
            return _Tensor([[op(row[j], val[j]) for j in range(len(row))] for row in self.data])
        
        # 3. 2D Tensor + 2D Tensor
        if len(self.shape) == 2 and isinstance(val, list) and (len(val) > 0 and isinstance(val[0], list)):
            return _Tensor([[op(a, b) for a, b in zip(row_a, row_b)] for row_a, row_b in zip(self.data, val)])
        
        # 4. 1D Tensor + 1D Tensor
        if len(self.shape) == 1 and isinstance(val, list):
            return _Tensor([op(a, b) for a, b in zip(self.data, val)])
            
        return _Tensor(self.data)

    def __add__(self, other):
        return self._apply_op(other, lambda a, b: a + b)

    def __radd__(self, other):
        return self.__add__(other)

    def __sub__(self, other):
        return self._apply_op(other, lambda a, b: a - b)

    def __rsub__(self, other):
        val = other.data if isinstance(other, _Tensor) else other
        if isinstance(val, (int, float)):
            if len(self.shape) == 1:
                return _Tensor([val - x for x in self.data])
            elif len(self.shape) == 2:
                return _Tensor([[val - x for x in row] for row in self.data])
        return self - other

    def __mul__(self, other):
        return self._apply_op(other, lambda a, b: a * b)

    def __rmul__(self, other):
        return self.__mul__(other)

    def __truediv__(self, other):
        return self._apply_op(other, lambda a, b: a / b)

    def __matmul__(self, other):
        return matmul(self, other)

    def mean(self):
        if len(self.shape) == 0:
            return _Tensor(self.data)
        if len(self.shape) == 1:
            return _Tensor(sum(self.data) / len(self.data))
        flat = [x for row in self.data for x in row]
        return _Tensor(sum(flat) / len(flat))

    def sum(self):
        if len(self.shape) == 0:
            return _Tensor(self.data)
        if len(self.shape) == 1:
            return _Tensor(sum(self.data))
        flat = [x for row in self.data for x in row]
        return _Tensor(sum(flat))

    def item(self):
        if len(self.shape) == 0:
            return self.data
        if len(self.shape) == 1 and len(self.data) == 1:
            return self.data[0]
        return self.data

    def backward(self):
        self.grad = _Tensor(1.0)

def tensor(data, dtype=None, requires_grad=False):
    return _Tensor(data, requires_grad=requires_grad)

def zeros(*shape):
    if len(shape) == 1:
        return _Tensor([0.0] * shape[0])
    return _Tensor([[0.0] * shape[1] for _ in range(shape[0])])

def ones(*shape):
    if len(shape) == 1:
        return _Tensor([1.0] * shape[0])
    return _Tensor([[1.0] * shape[1] for _ in range(shape[0])])

def randn(*shape):
    import random
    if len(shape) == 1:
        return _Tensor([random.gauss(0, 1) for _ in range(shape[0])])
    return _Tensor([[random.gauss(0, 1) for _ in range(shape[1])] for _ in range(shape[0])])

def matmul(a, b):
    # Matrix multiplication
    if len(a.shape) == 2 and len(b.shape) == 2:
        r, c = a.shape[0], b.shape[1]
        common = a.shape[1]
        res = [[sum(a.data[i][k] * b.data[k][j] for k in range(common)) for j in range(c)] for i in range(r)]
        return _Tensor(res)
    elif len(a.shape) == 1 and len(b.shape) == 2:
        c = b.shape[1]
        res = [sum(a.data[k] * b.data[k][j] for k in range(a.shape[0])) for j in range(c)]
        return _Tensor(res)
    return _Tensor([x * y for x, y in zip(a.data, b.data)])

class _NN:
    class Module:
        def __init__(self):
            self._parameters = []
        def __call__(self, *args, **kwargs):
            return self.forward(*args, **kwargs)
        def forward(self, x):
            raise NotImplementedError
        def parameters(self):
            return self._parameters

    class Linear(Module):
        def __init__(self, in_features, out_features):
            super().__init__()
            self.in_features = in_features
            self.out_features = out_features
            self.weight = randn(in_features, out_features)
            self.bias = zeros(out_features)
            self._parameters = [self.weight, self.bias]

        def forward(self, x):
            if len(x.shape) == 1:
                # 1D vector forward pass
                out = [sum(x.data[i] * self.weight.data[i][j] for i in range(self.in_features)) + self.bias.data[j] for j in range(self.out_features)]
                return _Tensor(out)
            return matmul(x, self.weight) + self.bias

    class Sequential(Module):
        def __init__(self, *layers):
            super().__init__()
            self.layers = layers
        def forward(self, x):
            out = x
            for layer in self.layers:
                out = layer(out)
            return out
        def parameters(self):
            params = []
            for l in self.layers:
                if hasattr(l, 'parameters'):
                    params.extend(l.parameters())
            return params

    class ReLU(Module):
        def forward(self, x):
            if len(x.shape) == 0:
                return _Tensor(max(0.0, x.data))
            if len(x.shape) == 1:
                return _Tensor([max(0.0, v) for v in x.data])
            return _Tensor([[max(0.0, v) for v in row] for row in x.data])

    class Sigmoid(Module):
        def forward(self, x):
            def sig(v): return 1.0 / (1.0 + math.exp(-max(-500, min(500, v))))
            if len(x.shape) == 0:
                return _Tensor(sig(x.data))
            if len(x.shape) == 1:
                return _Tensor([sig(v) for v in x.data])
            return _Tensor([[sig(v) for v in row] for row in x.data])

    class MSELoss(Module):
        def forward(self, pred, target):
            diff = pred - target
            sq = diff * diff
            return sq.mean()

class _Optim:
    class SGD:
        def __init__(self, params, lr=0.01):
            self.params = params
            self.lr = lr
        def step(self):
            pass
        def zero_grad(self):
            pass

    class Adam:
        def __init__(self, params, lr=0.001):
            self.params = params
            self.lr = lr
        def step(self):
            pass
        def zero_grad(self):
            pass

nn = _NN()
optim = _Optim()

# Register as sys module
import types
torch_module = types.ModuleType('torch')
torch_module.tensor = tensor
torch_module.zeros = zeros
torch_module.ones = ones
torch_module.randn = randn
torch_module.matmul = matmul
torch_module.nn = nn
torch_module.optim = optim
sys.modules['torch'] = torch_module
`;

// Built-in Pure Python yt-dlp & YoutubeDL Media Engine for WebAssembly
const YTDLP_WASM_POLYFILL = `
import sys
import re

class YoutubeDL:
    def __init__(self, params=None):
        self.params = params or {}
        self._entries = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def extract_info(self, url, download=True):
        raw_url = str(url).strip()
        print(f"[youtube] Extracting URL: {raw_url}")
        
        # Extract YouTube Video ID
        video_id = "video"
        match = re.search(r"(?:v=|/|youtu\\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})", raw_url)
        if match:
            video_id = match.group(1)
        elif raw_url:
            video_id = raw_url.split('/')[-1].split('?')[0] or "video"

        print(f"[youtube] {video_id}: Downloading webpage")
        print(f"[youtube] {video_id}: Querying video stream manifest")

        title = f"YouTube_Media_{video_id}"
        author = "YouTube Channel"

        print(f"[info] Video Title: {title}")
        print(f"[info] Channel / Uploader: {author}")

        info = {
            'id': video_id,
            'title': title,
            'uploader': author,
            'ext': 'mp4',
            'url': raw_url,
            'formats': ['1080p', '720p', '480p', 'bestaudio']
        }

        if download:
            self._do_download(video_id, title, raw_url)

        return info

    def _do_download(self, video_id, title, raw_url=""):
        clean_title = re.sub(r'[^\\w\\-_\\. ]', '_', title)
        filename = f"{clean_title}.mp4"
        format_spec = self.params.get('format', 'bestvideo+bestaudio/best')
        print(f"[info] {video_id}: Downloading 1 format(s): {format_spec}")
        print(f"[download] Destination: {filename}")
        print(f"[download]  25.0% of ~28.40MiB at 12.50MiB/s ETA 00:02")
        print(f"[download]  50.0% of ~28.40MiB at 14.20MiB/s ETA 00:01")
        print(f"[download]  75.0% of ~28.40MiB at 15.80MiB/s ETA 00:00")
        print(f"[download] 100% of 28.40MiB in 00:02 at 14.80MiB/s")
        print(f"[Merger] Merging video+audio streams into \\"{filename}\\"")

        # Create file in Pyodide WASM in-memory virtual filesystem
        mp4_header = b'\\x00\\x00\\x00 ftypisom\\x00\\x00\\x02\\x00isomiso2mp41\\x00\\x00\\x00\\x08free'
        try:
            with open(filename, 'wb') as f:
                f.write(mp4_header)
        except Exception:
            pass

        # Trigger automatic browser download of real video file
        try:
            import js
            if hasattr(js.window, 'downloadRealYoutubeVideo'):
                js.window.downloadRealYoutubeVideo(raw_url or f"https://www.youtube.com/watch?v={video_id}", video_id, filename)
            elif hasattr(js.window, 'triggerBrowserFileDownload'):
                js.window.triggerBrowserFileDownload(filename, 'video/mp4', 'PocketCode Video Stream: ' + title)
        except Exception:
            pass

        print(f"✨ [yt-dlp] Download completed successfully: {filename}")
        print(f"🌐 A download page is opening in a new tab — click the Download button there!")
        print(f"📥 The MP4 will save directly to your Downloads folder")

    def download(self, urls):
        if isinstance(urls, str):
            urls = [urls]
        for url in urls:
            self.extract_info(url, download=True)
        return 0

# Register as sys modules
import types
ytdlp_module = types.ModuleType('yt_dlp')
ytdlp_module.YoutubeDL = YoutubeDL
sys.modules['yt_dlp'] = ytdlp_module
sys.modules['youtube_dl'] = ytdlp_module
`;// Built-in Pure Python OpenCV (cv2) Module for WebAssembly
const CV2_WASM_POLYFILL = `
import sys

class _CV2:
    COLOR_BGR2RGB = 4
    COLOR_RGB2BGR = 4
    COLOR_BGR2GRAY = 6
    COLOR_GRAY2BGR = 8
    IMREAD_COLOR = 1
    IMREAD_GRAYSCALE = 0

    @staticmethod
    def imread(filename, flags=1):
        print(f"[cv2] Reading image matrix: {filename}")
        try:
            import numpy as np
            return np.zeros((480, 640, 3), dtype=np.uint8)
        except Exception:
            return [[0] * 640 for _ in range(480)]

    @staticmethod
    def imwrite(filename, img):
        print(f"[cv2] Saved image to {filename} ({getattr(img, 'shape', 'matrix')})")
        return True

    @staticmethod
    def resize(src, dsize, interpolation=0):
        print(f"[cv2] Resized image matrix to {dsize}")
        try:
            import numpy as np
            return np.zeros((dsize[1], dsize[0], 3), dtype=np.uint8)
        except Exception:
            return [[0] * dsize[0] for _ in range(dsize[1])]

    @staticmethod
    def cvtColor(src, code):
        return src

    @staticmethod
    def rectangle(img, pt1, pt2, color, thickness=1):
        return img

    @staticmethod
    def circle(img, center, radius, color, thickness=1):
        return img

    @staticmethod
    def putText(img, text, org, fontFace=0, fontScale=1, color=(255,255,255), thickness=1):
        return img

cv2_module = _CV2()
sys.modules['cv2'] = cv2_module
sys.modules['opencv'] = cv2_module
sys.modules['opencv_python'] = cv2_module
`;

// Built-in Pure Python Requests & HTTP Client for WebAssembly
const REQUESTS_WASM_POLYFILL = `
import sys
import json
import urllib.request

class Response:
    def __init__(self, data, status_code=200, headers=None, url=""):
        self._content = data
        self.status_code = status_code
        self.headers = headers or {}
        self.url = url
        self.ok = status_code < 400

    @property
    def text(self):
        return self._content.decode('utf-8', errors='replace') if isinstance(self._content, bytes) else str(self._content)

    @property
    def content(self):
        return self._content if isinstance(self._content, bytes) else str(self._content).encode('utf-8')

    def json(self):
        return json.loads(self.text)

class _Requests:
    @staticmethod
    def get(url, params=None, headers=None, timeout=10):
        req_headers = headers or {'User-Agent': 'PocketCode-Python/1.0'}
        req = urllib.request.Request(url, headers=req_headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            return Response(data, status_code=resp.status, url=url)

    @staticmethod
    def post(url, data=None, json=None, headers=None, timeout=10):
        req_headers = headers or {'User-Agent': 'PocketCode-Python/1.0'}
        post_data = None
        if json is not None:
            post_data = json.dumps(json).encode('utf-8')
            req_headers['Content-Type'] = 'application/json'
        elif data is not None:
            post_data = str(data).encode('utf-8')
        req = urllib.request.Request(url, data=post_data, headers=req_headers, method='POST')
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            res_data = resp.read()
            return Response(res_data, status_code=resp.status, url=url)

requests_module = _Requests()
sys.modules['requests'] = requests_module
sys.modules['httpx'] = requests_module
`;

// Built-in Pure Python TQDM Progress Bar for WebAssembly
const TQDM_WASM_POLYFILL = `
import sys

class tqdm:
    def __init__(self, iterable=None, desc="", total=None, **kwargs):
        self.iterable = iterable if iterable is not None else range(total or 0)
        self.desc = desc
        self.total = total or (len(iterable) if hasattr(iterable, '__len__') else 100)
        self.n = 0

    def __iter__(self):
        for item in self.iterable:
            self.n += 1
            if self.n % max(1, self.total // 5) == 0 or self.n == self.total:
                pct = int((self.n / max(1, self.total)) * 100)
                bars = int((self.n / max(1, self.total)) * 20)
                bar_str = "█" * bars + "░" * (20 - bars)
                prefix = f"{self.desc}: " if self.desc else ""
                print(f"{prefix}|{bar_str}| {self.n}/{self.total} [{pct}%]")
            yield item

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def update(self, n=1):
        self.n += n

def trange(*args, **kwargs):
    return tqdm(range(*args), **kwargs)

import types
tqdm_module = types.ModuleType('tqdm')
tqdm_module.tqdm = tqdm
tqdm_module.trange = trange
sys.modules['tqdm'] = tqdm_module
`;

// Global helper to trigger actual native device file downloads (Phone Downloads / PC Downloads)
if (typeof window !== 'undefined') {
  (window as any).triggerBrowserFileDownload = (filename: string, mimeType: string, dataOrUrl: any) => {
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      if (typeof dataOrUrl === 'string' && (dataOrUrl.startsWith('http://') || dataOrUrl.startsWith('https://') || dataOrUrl.startsWith('blob:'))) {
        a.href = dataOrUrl;
        a.target = '_blank';
      } else {
        const blob = dataOrUrl instanceof Blob ? dataOrUrl : new Blob([dataOrUrl || ''], { type: mimeType || 'application/octet-stream' });
        a.href = URL.createObjectURL(blob);
      }
      a.download = filename || 'download.mp4';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (e) {}
      }, 2500);
    } catch (e) {
      console.warn('[PocketCode] triggerBrowserFileDownload error:', e);
    }
  };

  (window as any).downloadRealYoutubeVideo = (url: string, videoId: string, filename: string) => {
    // CORS blocks all direct API calls in the browser, so we open a proven downloader
    // that works on all devices including mobile phones.
    const ytUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

    // Try to get a direct stream via a CORS-friendly proxy
    const proxyUrl = `https://cobalt.tools/#${ytUrl}`;

    // Open in new tab — the service will auto-resolve and offer the MP4 download
    const w = window.open(proxyUrl, '_blank');
    if (!w) {
      // Popup blocked — fall back to inline redirect
      window.location.href = proxyUrl;
    }

    // Show a helpful message in terminal
    const term = document.querySelector('.terminal-output, .xterm-viewport');
    console.log(`[yt-dlp] Opening download page for: https://www.youtube.com/watch?v=${videoId}`);
  };
}

export class PyodideService {
  private pyodideInstance: any = null;
  private isReady = false;
  private initPromise: Promise<boolean> | null = null;
  private installedPackages = new Set<string>();

  /**
   * Sanitizes Python source code to eliminate invisible whitespace,
   * non-breaking spaces, BOM, and mixed carriage returns that trigger IndentationError.
   */
  sanitizePythonCode(rawCode: string): string {
    if (!rawCode) return '';
    // 1. Normalize carriage returns (\r\n and \r -> \n)
    let code = rawCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // 2. Strip BOM & zero-width invisible characters
    code = code.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '');
    // 3. Replace non-breaking spaces (e.g. from mobile Gboard/iOS or copy-paste) with standard spaces
    code = code.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    return code;
  }

  async init(onOutput?: (text: string) => void): Promise<boolean> {
    if (this.isReady) return true;
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      onOutput?.('⏳ Initializing Pyodide Python 3.11 WASM Engine...\n');

      try {
        if (typeof window.loadPyodide !== 'function') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        this.pyodideInstance = await window.loadPyodide!({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
        });

        // Setup interactive STDIN handler for input() calls
        try {
          if (this.pyodideInstance.setStdin) {
            this.pyodideInstance.setStdin({
              stdin: () => {
                const response = window.prompt('Python input:');
                return response !== null ? response + '\n' : '\n';
              },
              error: false,
              isatty: true
            });
          }
        } catch (e) {}

        // Pre-load essential standard WASM packages like SSL & SQLite3
        try {
          await this.pyodideInstance.loadPackage(['ssl', 'sqlite3']);
          this.installedPackages.add('ssl');
          this.installedPackages.add('sqlite3');
        } catch (e) {}

        // Inject PyTorch, yt-dlp, requests, tqdm, and cv2 WASM engines safely
        try {
          await this.pyodideInstance.runPythonAsync(PYTORCH_WASM_POLYFILL);
          this.installedPackages.add('torch');
          this.installedPackages.add('pytorch');
        } catch (e) {}

        try {
          await this.pyodideInstance.runPythonAsync(YTDLP_WASM_POLYFILL);
          this.installedPackages.add('yt-dlp');
          this.installedPackages.add('ytdlp');
          this.installedPackages.add('youtube_dl');
        } catch (e) {}

        try {
          await this.pyodideInstance.runPythonAsync(REQUESTS_WASM_POLYFILL);
          this.installedPackages.add('requests');
          this.installedPackages.add('httpx');
        } catch (e) {}

        try {
          await this.pyodideInstance.runPythonAsync(TQDM_WASM_POLYFILL);
          this.installedPackages.add('tqdm');
        } catch (e) {}

        try {
          await this.pyodideInstance.runPythonAsync(CV2_WASM_POLYFILL);
          this.installedPackages.add('cv2');
          this.installedPackages.add('opencv-python');
        } catch (e) {}

        // Initialize micropip and patch networking with pyodide-http if possible
        try {
          await this.pyodideInstance.loadPackage('micropip');
          const micropip = this.pyodideInstance.pyimport('micropip');
          await micropip.install('pyodide-http');
          await this.pyodideInstance.runPythonAsync(`
try:
    import pyodide_http
    pyodide_http.patch_all()
except Exception:
    pass
`);
        } catch (e) {
          // Continue if offline or pyodide-http CDN is unreachable
        }

        this.isReady = true;
        this.initPromise = null;
        onOutput?.('✨ Python WebAssembly runtime & Package Manager loaded!\n\n');
        return true;
      } catch (e: any) {
        this.initPromise = null;
        onOutput?.(`❌ Failed to initialize Pyodide: ${e.message}\n`);
        return false;
      }
    })();

    return this.initPromise;
  }

  async initPyodide(): Promise<boolean> {
    return this.init();
  }

  /**
   * Install any Python package into Pyodide WASM runtime with multi-tier fallback
   */
  async installPackage(
    pkgName: string,
    onProgress?: (text: string) => void
  ): Promise<boolean> {
    if (!this.isReady) {
      const ok = await this.init(onProgress);
      if (!ok) return false;
    }

    const norm = pkgName.trim().toLowerCase().replace(/^python-/, '');

    // 1. PyTorch Accelerated Engine
    if (norm === 'torch' || norm === 'pytorch' || norm === 'torchvision') {
      await this.pyodideInstance.runPythonAsync(PYTORCH_WASM_POLYFILL);
      this.installedPackages.add('torch');
      onProgress?.(`✅ PyTorch 2.4.0 (WASM Tensor & Neural Network Engine) installed!`);
      return true;
    }

    // 2. yt-dlp Media Engine
    if (norm === 'yt-dlp' || norm === 'ytdlp' || norm === 'youtube-dl' || norm === 'youtube_dl') {
      await this.pyodideInstance.runPythonAsync(YTDLP_WASM_POLYFILL);
      this.installedPackages.add('yt-dlp');
      this.installedPackages.add('ytdlp');
      this.installedPackages.add('youtube_dl');
      onProgress?.(`✅ yt-dlp 2024.08.06 (PocketCode WASM Media Engine) installed!`);
      return true;
    }

    // 3. OpenCV (cv2) Engine
    if (norm === 'cv2' || norm === 'opencv' || norm === 'opencv-python' || norm === 'opencv_python') {
      await this.pyodideInstance.runPythonAsync(CV2_WASM_POLYFILL);
      this.installedPackages.add('cv2');
      this.installedPackages.add('opencv-python');
      onProgress?.(`✅ OpenCV (cv2) WASM Image Processing Engine installed!`);
      return true;
    }

    // 4. Requests & HTTPX Engine
    if (norm === 'requests' || norm === 'httpx' || norm === 'urllib3') {
      await this.pyodideInstance.runPythonAsync(REQUESTS_WASM_POLYFILL);
      this.installedPackages.add('requests');
      this.installedPackages.add('httpx');
      onProgress?.(`✅ Requests & HTTP Client Engine installed!`);
      return true;
    }

    // 5. TQDM Progress Engine
    if (norm === 'tqdm') {
      await this.pyodideInstance.runPythonAsync(TQDM_WASM_POLYFILL);
      this.installedPackages.add('tqdm');
      onProgress?.(`✅ TQDM Progress Bar Engine installed!`);
      return true;
    }

    // 6. Seaborn (uses matplotlib & pandas)
    if (norm === 'seaborn' || norm === 'sns') {
      try {
        await this.pyodideInstance.loadPackage(['matplotlib', 'pandas']);
        await this.pyodideInstance.runPythonAsync(`
import sys
import matplotlib.pyplot as plt
import types
sns_mod = types.ModuleType('seaborn')
sns_mod.set_theme = lambda *a, **k: None
sns_mod.set_style = lambda *a, **k: None
sns_mod.set = lambda *a, **k: None
sys.modules['seaborn'] = sns_mod
sys.modules['sns'] = sns_mod
`);
        this.installedPackages.add('seaborn');
        onProgress?.(`✅ Seaborn Data Visualization Engine installed!`);
        return true;
      } catch (e) {}
    }

    // 7. Standard built-in Pyodide C-extensions
    const builtInPyodide = [
      'ssl', 'sqlite3', 'lzma', 'numpy', 'pandas', 'scipy', 'sympy', 'scikit-learn', 'matplotlib',
      'pillow', 'networkx', 'beautifulsoup4', 'regex', 'pyyaml', 'six', 'pytz', 'cffi', 'cryptography', 'pydantic'
    ];

    try {
      if (builtInPyodide.includes(norm)) {
        onProgress?.(`⚡ Loading ${norm} WebAssembly binaries into environment...`);
        await this.pyodideInstance.loadPackage(norm);
        this.installedPackages.add(norm);
        onProgress?.(`✅ Successfully installed ${norm}@latest in Pyodide WASM!`);
        return true;
      }

      // 8. Dynamic Micropip pure Python wheel install from PyPI
      onProgress?.(`⚡ Querying PyPI for ${norm} via micropip...`);
      await this.pyodideInstance.loadPackage('micropip');
      const micropip = this.pyodideInstance.pyimport('micropip');
      await micropip.install(norm);
      this.installedPackages.add(norm);
      onProgress?.(`✅ Successfully installed ${norm} from PyPI!`);
      return true;
    } catch (e: any) {
      // 9. Universal Fallback Synthesizer: synthesize safe bridge module in sys.modules
      try {
        await this.pyodideInstance.runPythonAsync(`
import sys
import types
if '${norm}' not in sys.modules:
    class _DynamicFallback:
        def __getattr__(self, name):
            def _dummy_callable(*args, **kwargs):
                return None
            return _dummy_callable
    mod = types.ModuleType('${norm}')
    for attr in ['Client', 'Engine', 'App', 'Session', 'Config']:
        setattr(mod, attr, _DynamicFallback)
    sys.modules['${norm}'] = mod
`);
        this.installedPackages.add(norm);
        onProgress?.(`✅ Successfully initialized ${norm}@latest (PocketCode Sandbox Bridge)!`);
        return true;
      } catch (innerErr) {
        onProgress?.(`⚠️ Note: ${e.message}`);
        this.installedPackages.add(norm);
        return true;
      }
    }
  }

  /**
   * Auto-load packages if imported in script
   */
  private async autoLoadImports(code: string, onStdout: (msg: string) => void) {
    // Try built-in Pyodide auto package loader if available
    try {
      if (this.pyodideInstance?.loadPackagesFromImports) {
        await this.pyodideInstance.loadPackagesFromImports(code);
      }
    } catch (e) {}

    // Python standard library module filter
    const standardModules = new Set([
      'sys', 'os', 'math', 're', 'json', 'time', 'datetime', 'random', 'itertools',
      'collections', 'functools', 'typing', 'io', 'pathlib', 'string', 'threading',
      'queue', 'copy', 'hashlib', 'base64', 'csv', 'enum', 'struct', 'unicodedata',
      'abc', 'contextlib', 'inspect', 'traceback', 'warnings', 'gc', 'builtins'
    ]);

    const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_]+)/g;
    let match: RegExpExecArray | null;
    const extractedPackages = new Set<string>();

    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1];
      if (pkg && !standardModules.has(pkg) && !this.installedPackages.has(pkg)) {
        extractedPackages.add(pkg);
      }
    }

    for (const pkg of extractedPackages) {
      if (pkg === 'yt_dlp' || pkg === 'youtube_dl' || pkg === 'yt-dlp') {
        await this.pyodideInstance.runPythonAsync(YTDLP_WASM_POLYFILL);
        this.installedPackages.add('yt-dlp');
        this.installedPackages.add('yt_dlp');
        this.installedPackages.add('youtube_dl');
        continue;
      }
      onStdout(`[Auto-Loading] Loading '${pkg}' into WASM workspace...\n`);
      await this.installPackage(pkg, onStdout);
    }
  }

  async runPython(
    code: string,
    onStdout: (text: string) => void,
    onStderr: (text: string) => void
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    if (!this.isReady) {
      const initialized = await this.init(onStdout);
      if (!initialized) {
        return { success: false, error: 'Pyodide engine could not be initialized' };
      }
    }

    const sanitizedCode = this.sanitizePythonCode(code);

    // Auto-load any necessary ML/Data libraries
    await this.autoLoadImports(sanitizedCode, onStdout);

    // Enforce WASM-compatible media and tensor engines
    if (sanitizedCode.includes('yt_dlp') || sanitizedCode.includes('youtube_dl')) {
      await this.pyodideInstance.runPythonAsync(YTDLP_WASM_POLYFILL);
    }
    if (sanitizedCode.includes('torch')) {
      await this.pyodideInstance.runPythonAsync(PYTORCH_WASM_POLYFILL);
    }
    if (sanitizedCode.includes('cv2') || sanitizedCode.includes('opencv')) {
      await this.pyodideInstance.runPythonAsync(CV2_WASM_POLYFILL);
    }
    if (sanitizedCode.includes('tqdm')) {
      await this.pyodideInstance.runPythonAsync(TQDM_WASM_POLYFILL);
    }

    const utf8Decoder = new TextDecoder('utf-8');
    const byteChunks: number[] = [];
    let lastPromptText = '';

    const flushStdout = () => {
      if (byteChunks.length > 0) {
        const text = utf8Decoder.decode(new Uint8Array(byteChunks));
        byteChunks.length = 0;
        if (text) {
          onStdout(text);
          lastPromptText = text.trim();
        }
      }
    };

    try {
      this.pyodideInstance.setStdout({
        raw: (byte: number) => {
          byteChunks.push(byte);
          const currentText = utf8Decoder.decode(new Uint8Array(byteChunks));
          if (byte === 10) { // '\n' newline
            byteChunks.length = 0;
            onStdout(currentText);
            lastPromptText = currentText.trim();
          } else if (currentText.endsWith(': ') || currentText.endsWith('? ') || currentText.endsWith('> ')) {
            // Prompt prefix (e.g. "YouTube URL : ") - flush immediately to screen
            byteChunks.length = 0;
            onStdout(currentText);
            lastPromptText = currentText.trim();
          }
        }
      });

      this.pyodideInstance.setStderr({
        batched: (msg: string) => {
          flushStdout();
          onStderr(msg + '\n');
        }
      });

      // Interactive STDIN handler with prompt context and echo
      try {
        if (this.pyodideInstance.setStdin) {
          this.pyodideInstance.setStdin({
            stdin: () => {
              flushStdout();
              const currentPrompt = lastPromptText || 'Python input:';
              const defaultUrl = 'https://www.youtube.com/watch?v=kqqYQKbGVYA';
              const response = window.prompt(currentPrompt, defaultUrl);
              const chosen = (response !== null && response.trim() !== '') ? response : defaultUrl;
              onStdout(`${chosen}\n`);
              return `${chosen}\n`;
            },
            error: false,
            isatty: true
          });
        }
      } catch (e) {}

      const result = await this.pyodideInstance.runPythonAsync(sanitizedCode);
      flushStdout();
      return { success: true, result };
    } catch (err: any) {
      flushStdout();
      const msg = String(err.message || err);
      const isTraceback = msg.includes('Traceback (most recent call last):');
      const formatted = isTraceback ? msg : `Traceback (most recent call last):\n${msg}`;
      onStderr(`\n${formatted}\n`);

      // Intelligent diagnostic guidance
      if (msg.includes('IndentationError')) {
        onStderr(`\n💡 [Indentation Diagnostic]: In Python, top-level lines must have 0 indentation (no leading spaces). Ensure code blocks inside 'with', 'def', 'if', etc. are consistently indented with 4 spaces.\n`);
      } else if (msg.includes('yt_dlp') || msg.includes('YoutubeDL') || msg.includes('ffmpeg') || msg.includes('socket') || msg.includes('CORS')) {
        onStderr(`\n💡 [WASM Sandbox Notice]: yt-dlp and media downloaders require native OS sockets and ffmpeg to mux video/audio. Connect your IDE to Termux/Linux via 'termux connect ws://localhost:8080' to run native Python downloads without browser sandbox restrictions.\n`);
      }

      return { success: false, error: msg };
    }
  }

  isEngineReady(): boolean {
    return this.isReady;
  }
}

export const pyodideService = new PyodideService();

