# PocketCode IDE - Command Reference Manual

This document provides a comprehensive guide to all commands, shell utilities, runtimes, Git operations, and IDE tools available in the PocketCode IDE Virtual Shell and developer environment.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [File and Directory Management](#file-and-directory-management)
3. [Text and Data Processing](#text-and-data-processing)
4. [System, Shell, and Environment](#system-shell-and-environment)
5. [Language Runtimes and Package Managers](#language-runtimes-and-package-managers)
6. [Version Control (Git)](#version-control-git)
7. [Networking and Data Transfer](#networking-and-data-transfer)
8. [IDE Integration and Project Runners](#ide-integration-and-project-runners)
9. [Termux and Remote Linux Bridge](#termux-and-remote-linux-bridge)
10. [Shell Features and Keyboard Shortcuts](#shell-features-and-keyboard-shortcuts)

---

## Getting Started

PocketCode IDE features a fully sandboxed virtual shell running directly in your browser or Android WebView. It interacts directly with your project filesystem in IndexedDB and provides POSIX utilities, language runtimes, package managers, and Git operations.

- To open the terminal: Tap or click the terminal panel at the bottom of the editor.
- For quick inline help: Type `help` or `?`.
- For detailed manual on any command: Type `man <command>` or `tldr <command>`.

---

## File and Directory Management

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `ls` | `ls [-l|-a|-la] [path]` | List directory contents with file size and metadata. |
| `dir` | `dir [path]` | Alias for `ls`. |
| `tree` | `tree [path] [-L <depth>]` | Visual recursive directory tree view. |
| `cd` | `cd [path]` | Change working directory (`cd ..`, `cd ~`, `cd /workspace`). |
| `pwd` | `pwd` | Print current working directory path. |
| `cat` | `cat <file...>` | Concatenate and display file content. |
| `tac` | `tac <file>` | Display file content in reverse line order. |
| `head` | `head [-n <lines>] <file>` | Output the first N lines of a file (default: 10). |
| `tail` | `tail [-n <lines>] <file>` | Output the last N lines of a file (default: 10). |
| `more` | `more <file>` | Paginated file viewer. |
| `less` | `less <file>` | Paginated file viewer. |
| `touch` | `touch <file...>` | Create new empty files or update timestamps. |
| `mkdir` | `mkdir [-p] <dir...>` | Create directories (use `-p` for parent directories). |
| `rm` | `rm [-r|-f|-rf] <path...>` | Remove files or directories recursively. |
| `rmdir` | `rmdir <dir...>` | Remove empty directories. |
| `cp` | `cp [-r] <src> <dest>` | Copy files or directories recursively. |
| `mv` | `mv <src> <dest>` | Move or rename files and directories. |
| `find` | `find [path] -name <pattern>` | Search for files matching names or wildcard patterns. |
| `grep` | `grep [-i|-n|-v|-E] <pattern> <file>` | Search for regular expression matches in files. |
| `wc` | `wc [-l|-w|-c] <file>` | Word, line, and byte count of files. |
| `stat` | `stat <path>` | Display detailed file status and metadata. |
| `diff` | `diff <file1> <file2>` | Compare two files line by line. |
| `file` | `file <path>` | Determine file type and MIME representation. |
| `basename` | `basename <path> [suffix]` | Strip directory and suffix from filenames. |
| `dirname` | `dirname <path>` | Strip last component from file path. |
| `realpath` | `realpath <path>` | Print resolved absolute canonical path. |
| `du` | `du [-h|-s] [path]` | Estimate file space usage. |
| `df` | `df [-h]` | Report virtual filesystem disk space usage. |

---

## Text and Data Processing

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `echo` | `echo [text]` | Print text or environment variables (`echo $VAR`). |
| `base64` | `base64 [-d] [file]` | Base64 encode or decode data. |
| `md5sum` | `md5sum <file>` | Compute MD5 cryptographic checksum of a file. |
| `sha256sum`| `sha256sum <file>` | Compute SHA-256 cryptographic checksum. |
| `sort` | `sort [-r|-n|-u] <file>` | Sort lines of text files. |
| `uniq` | `uniq [-c|-d] <file>` | Report or omit repeated lines. |
| `rev` | `rev <file>` | Reverse character order of each line. |
| `tr` | `tr <set1> <set2>` | Translate or delete characters. |
| `cut` | `cut -d <delim> -f <fields>` | Extract selected fields from lines. |
| `sed` | `sed 's/find/replace/g' <file>` | Stream editor for basic text transformation. |
| `awk` | `awk '{print $1}' <file>` | Pattern scanning and processing language. |
| `fold` | `fold [-w <width>] <file>` | Wrap input lines to fit specified width. |
| `fmt` | `fmt [-w <width>] <file>` | Reformat paragraph text. |
| `nl` | `nl <file>` | Number lines of files. |
| `seq` | `seq [first] [incr] <last>` | Print a sequence of numbers. |
| `jq` / `json` | `jq <filter> <file.json>` | Slice, filter, and transform JSON data. |
| `calc` / `bc` | `calc "<expression>"` | Evaluate mathematical and algebraic expressions. |
| `expr` | `expr <expression>` | Evaluate arithmetic and comparison expressions. |

---

## System, Shell, and Environment

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `whoami` | `whoami` | Print current active user name. |
| `id` | `id` | Print user and group information. |
| `hostname` | `hostname` | Print virtual machine hostname. |
| `uname` | `uname [-a]` | Print operating system name and kernel info. |
| `date` | `date` | Display current date and time. |
| `cal` | `cal` | Display a calendar for the current month. |
| `uptime` | `uptime` | Tell how long the IDE session has been running. |
| `env` | `env` | Display all environment variables. |
| `printenv` | `printenv [VAR]` | Print specific or all environment variables. |
| `export` | `export KEY=VALUE` | Set an environment variable for the session. |
| `unset` | `unset KEY` | Unset an environment variable. |
| `alias` | `alias name='command'` | Create a command shortcut/alias. |
| `unalias` | `unalias name` | Remove a defined alias. |
| `which` | `which <cmd>` | Locate the binary/handler for a command. |
| `type` | `type <cmd>` | Describe how command name would be interpreted. |
| `ps` | `ps` | Report current active virtual processes. |
| `top` / `htop` | `top` | Display dynamic real-time process monitoring. |
| `kill` | `kill <pid>` | Terminate a running virtual process. |
| `free` | `free [-m|-h]` | Display memory usage statistics. |
| `history` | `history [-c]` | Display or clear command history list. |
| `clear` / `reset` | `clear` | Clear the terminal screen output. |
| `sleep` | `sleep <seconds>` | Delay execution for a specified amount of time. |
| `neofetch` | `neofetch` | Display system summary with ASCII art logo. |
| `exit` | `exit` | Reset current shell context. |

---

## Language Runtimes and Package Managers

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `python` / `py` | `python <file.py> [args]` | Run Python code on-device using Pyodide WASM runtime. |
| `pip` | `pip install <package>` | Install Python packages from PyPI via micropip. |
| `node` / `js` | `node <file.js>` | Execute JavaScript code in an isolated Web Worker sandbox. |
| `npm` / `yarn` / `pnpm` | `npm <install|run|init>` | Node package manager simulation & dependency inspector. |
| `npx` | `npx <package>` | Execute npm package scripts. |
| `sqlite` / `sqlite3` | `sqlite3 [database.db]` | Interactive SQLite 3 WebAssembly REPL. |
| `sql` | `sql "<query>"` | Execute inline SQL query against the active project database. |

---

## Version Control (Git)

PocketCode IDE integrates a complete `isomorphic-git` client for offline and remote source control:

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `git status` | `git status` | Show working tree status and modified files. |
| `git add` | `git add <file...\|.>` | Stage file contents for next commit. |
| `git commit` | `git commit -m "message"` | Record changes to the repository. |
| `git log` | `git log [-n <count>]` | Show commit history logs. |
| `git diff` | `git diff [file]` | Show changes between commits and working tree. |
| `git branch` | `git branch [-a|-d <name>]` | List, create, or delete branches. |
| `git checkout`| `git checkout <branch\|file>` | Switch branches or restore working tree files. |
| `git switch` | `git switch <branch>` | Switch to a specified branch. |
| `git clone` | `git clone <url> [dir]` | Clone a remote Git repository into the workspace. |
| `git remote` | `git remote [-v\|add\|remove]` | Manage set of tracked remote repositories. |
| `git tag` | `git tag [name]` | Create, list, or verify GPG-signed tags. |
| `git stash` | `git stash` | Stash modified tracked files into durable IndexedDB storage. |
| `git stash pop`| `git stash pop` | Apply the most recent stash and remove it from stash list. |
| `git stash list`| `git stash list` | List all stashed changesets. |
| `git stash drop`| `git stash drop [index]` | Remove a single stashed state from the list. |
| `git reset` | `git reset [--hard] [commit]` | Reset current HEAD to specified state. |
| `git push` | `git push [remote] [branch]` | Update remote refs along with associated objects. |
| `git pull` | `git pull [remote] [branch]` | Fetch from and integrate with another repository/branch. |

---

## Networking and Data Transfer

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `curl` | `curl [-X GET\|POST] [-H "header"] [-d data] <url>` | Transfer data to/from network servers. |
| `wget` | `wget [-O <out>] <url>` | Non-interactive network downloader. |
| `http` / `fetch` | `http <GET\|POST> <url>` | User-friendly HTTP client for REST APIs. |
| `ping` | `ping <host>` | Test reachability of network hosts via HTTP probes. |

---

## IDE Integration and Project Runners

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `code` / `open` | `code <file>` | Open a file directly in the Monaco editor. |
| `edit` | `edit <file>` | Alias for `code`. |
| `preview` | `preview [file.html]` | Launch Live Preview modal for the active web/Compose project. |
| `serve` | `serve [port]` | Start the virtual in-memory web server for web preview. |
| `run` | `run [file]` | Automatically detect file type and dispatch to appropriate runtime. |
| `zip` | `zip -r <archive.zip> <dir>` | Package project files into a downloadable ZIP archive. |
| `unzip` | `unzip <archive.zip>` | Extract files from a ZIP archive with traversal protection. |
| `tar` | `tar -czvf <archive.tar.gz> <files>` | Archive files into standard tarballs. |

---

## Termux and Remote Linux Bridge

For workflows requiring full native compilers, GCC/Clang, Go, Rust, or Docker, PocketCode IDE can bridge directly to a local Termux session on Android or a remote Linux VPS:

| Command | Syntax | Description |
| :--- | :--- | :--- |
| `termux connect` | `termux connect [ws://localhost:8080]` | Connect to Termux/Linux WebSocket PTY bridge. |
| `termux disconnect` | `termux disconnect` | Disconnect and return to local virtual shell. |
| `termux status` | `termux status` | Inspect active PTY bridge connection state. |
| `termux guide` | `termux guide` | Display setup instructions for running the PTY bridge in Termux. |

---

## Shell Features and Keyboard Shortcuts

### Command Chaining
- Execute multiple commands sequentially with `&&` or `;`:
  ```bash
  mkdir src && touch src/main.js && code src/main.js
  ```

### Variable Interpolation
- Use `$VAR` anywhere in command arguments:
  ```bash
  export APP_NAME=myapp
  mkdir $APP_NAME && cd $APP_NAME
  ```

### History Recall
- `Up Arrow` / `Down Arrow`: Navigate previously executed commands (persisted across sessions).
- `Ctrl + L`: Clear the terminal screen.
- `Ctrl + C`: Interrupt active virtual process or cancel current input.
- `Tab`: Auto-complete file and directory names.
