# PocketCode IDE — Runtime Compatibility & Architecture Guide

This document outlines the architecture, execution models, security controls, and runtime boundaries of PocketCode IDE.

---

## 1. Core Architecture Overview

PocketCode IDE is a 100% client-side mobile/desktop developer environment built with **React**, **TypeScript**, and **WebAssembly/Web Worker** execution pipelines.

```
+-------------------------------------------------------------------------+
|                           PocketCode IDE UI                             |
|       (Monaco Editor + Xterm.js Terminal + Multi-Tab Workspaces)        |
+-------------------------------------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Web Worker Sandbox   |                       |    Pyodide / WASM     |
|   (V8 JS Engine)      |                       |    Engine Layer       |
| - Global Allowlist    |                       | - Python 3.11 Runtime |
| - Prototype Freeze    |                       | - SQLite3 In-Memory   |
| - Output Quota (500)  |                       | - C/Rust/Java Sim     |
| - 10s Watchdog Limit  |                       +-----------------------+
| - WAF URL Interceptor |                                   |
+-----------------------+                                   v
            |                                   +-----------------------+
            +---------------------------------->| Optional Remote PTY   |
                                                | (Termux / Linux Node) |
                                                +-----------------------+
```

---

## 2. Language Execution Compatibility Matrix

| Runtime / Language | Execution Engine | Compatibility Level | Supported Features & Standard Library | Known Boundaries & Differences from Native OS |
| :--- | :--- | :--- | :--- | :--- |
| **JavaScript (ES2023)** | Dedicated Web Worker | **Full** (Client V8) | ES Modules, Async/Await, Math, JSON, Web APIs (sandboxed), RegExp | Client-side memory limits, no OS syscalls |
| **TypeScript 5.x** | In-Memory Transpiler | **Full** | Type checking, modern transpilation down to ES2022 | Executed in the same V8 worker sandbox |
| **HTML5 / CSS3 / JS** | Sandboxed `<iframe>` | **Full** | DOM manipulation, Canvas, CSS Animations, Local Storage | Cross-origin framing guarded by CSP |
| **Python 3.x** | Pyodide / WASM | **High** | Core standard library (`sys`, `math`, `json`, `re`, `datetime`), micropip | Native C-extensions requiring GCC toolchains |
| **SQLite3** | SQL.js (WASM) | **Full** | Standard SQL queries, tables, indices, triggers, transactions | File persistence is managed via IndexedDB VFS |
| **Node.js Environment** | In-Browser Worker Emulation | **Emulated** | Mocked `path`, `os`, `util`, `assert`, `events`, `process.env` | Native OS modules (`net`, `http`, `child_process`, `fs`) are unsupported |
| **npm Package Manager** | Virtual CDN Resolution | **Virtual** | ESM CDN resolution (esm.sh / unpkg), package.json dependency tracking | Binary npm build scripts and native node-gyp builds |
| **C / C++ / Rust / Java** | WASM Interpreted Simulation | **Simulation** | Algorithmic logic, standard math, standard I/O emulation | Full OS syscalls, thread affinity, platform assembly |

---

## 3. Sandboxing & Defensive Controls

PocketCode applies multi-layered defensive controls before and during execution:

1. **Global Scope Allowlist Stripping**
   - Strips all non-allowlisted properties from worker global scope (`self` / `globalThis`).
   - Disables Worker instantiation, SharedWorkers, WebSockets, EventSources, BroadcastChannels, and raw IndexedDB.
2. **Deep Prototype Lockdown**
   - Built-in prototypes (`Object.prototype`, `Array.prototype`, `Function.prototype`, `String.prototype`, `Number.prototype`, `Boolean.prototype`) are deeply frozen (`Object.freeze`) inside execution workers before running user code to eliminate prototype pollution vectors.
3. **Execution Resource Watchdog**
   - **Timeout Limit:** Every execution is guarded by a 10-second watchdog timer to intercept and safely terminate runaway infinite loops (`while(true){}`).
   - **Console Output Quotas:** Console logs are rate-limited to a maximum of 500 lines and capped at 10KB per line to safeguard device memory and prevent UI lockups.
4. **Network Firewall & SSRF Guard**
   - Outbound `fetch()` calls pass through WAF strict validation, disallowing connections to private subnets (RFC 1918) and dangerous protocols (`javascript:`, `data:text/html`).
5. **Remote Terminal Bridge Protocol Guard**
   - Remote WebSocket terminal bridges (`termux connect`) require strict `ws://` / `wss://` protocol validation and disallow unencrypted communication over public networks.

---

## 4. Terminal Commands Reference

- `compat` / `runtime`: View the real-time runtime compatibility status.
- `test:security`: Run the 12-point automated security regression test suite.
- `test:perf` / `benchmark`: Run the internal CPU, VFS, memory allocation, and WAF throughput benchmarks.
- `node <file.js>`: Execute a JavaScript file inside the V8 worker sandbox.
- `python <file.py>`: Execute a Python script inside Pyodide.
- `termux connect <url>`: Connect to an external Termux / Linux PTY server for real native OS bash execution.
