<div align="center">
  <img src="public/app-icon.png" alt="Easy Project Logo" width="120" height="120" style="border-radius: 24px;" />

  # Easy Project

  **A modern, lightweight, and high-performance desktop project planning and scheduling tool.**

  <p>
    <b>English</b> •
    <a href="README.es.md">Español</a>
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/version-0.1.0-emerald.svg)](https://github.com/formatocd/easy-project/releases)
  [![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
  [![Rust](https://img.shields.io/badge/Rust-2024-black?logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

  [Features](#-key-features) •
  [Downloads](#-downloads--installation) •
  [Keyboard Shortcuts](#-keyboard-shortcuts) •
  [Build Instructions](#-building-from-source) •
  [License](#-license)
</div>

---

## 📌 About Easy Project

**Easy Project** is a desktop application designed for project managers, engineers, and teams who need robust project scheduling capabilities without the sluggish performance, bloat, or subscription traps of legacy enterprise software.

By combining the raw compute performance and memory safety of a **Rust** backend with a responsive, modern interface built in **React 19**, Easy Project delivers instant (sub-millisecond) Critical Path calculations, smooth Gantt visualization, and full offline privacy.

---

## ✨ Key Features

### 📊 Interactive Gantt Chart
- **Visual Editing:** Drag tasks horizontally to reschedule start dates, or drag task edges to adjust durations.
- **Dynamic Dependency Linking:** Connect predecessors and successors directly by dragging link handles between tasks.
- **Critical Path Method (CPM):** Instant automated calculation of earliest/latest start and finish times, total float, and free float powered by the high-performance Rust scheduling engine.
- **Baselines:** Capture and compare project baselines to track schedule variance over time.
- **Non-Working Days & Holidays:** Non-working days (weekends, custom non-working weekday hours, and calendar exceptions) are softly shaded with an elegant diffused red overlay.

### 🌳 Work Breakdown Structure (WBS / EDT)
- **Multi-Level Hierarchy:** Unlimited indentation depth with automatic renumbering of hierarchical WBS codes (`1`, `1.1`, `1.1.1`).
- **Dynamic Summary Tasks:** Roll-up duration, start/finish dates, and percentage complete. Summary tasks automatically convert back to standard tasks when all child tasks are removed or relocated.
- **Smart Task Reordering:** Move tasks up and down while preserving their indentation level or navigating between parent groupings seamlessly.
- **Rapid Grid Entry:** Quickly append tasks via the inline entry row, paste task lists directly (`Ctrl+V`), and perform batch indenting or deletions.

### 📅 Working Calendars & Exceptions
- Configurable standard working hours for each day of the week.
- Project-level calendar exceptions for holidays and custom non-working periods.

### 🔄 Data Exchange & Reporting
- **Microsoft Project XML Import:** Open `.xml` schedule files created in Microsoft Project or other compatible tools.
- **Spreadsheet Export:** Export task data and schedules directly to Excel (`.xlsx`) and CSV (`.csv`).
- **Print & PDF Export Assistant:** Export publication-ready documents in portrait or landscape orientations (supporting A4 and other standard paper sizes) for the task table, the Gantt chart, or both combined.

### 🎨 Modern User Experience
- **Safe Transactional Storage:** Projects are saved in single, compact `.epr` files backed by SQLite with transactional integrity and unsaved-change indicators.
- **Full History:** Complete multi-step Undo and Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Themes:** First-class Dark and Light mode support with automatic system detection.
- **Internationalization (i18n):** Fully localized in 6 languages: English, Spanish, French, German, Italian, and Portuguese.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + N` | New project |
| `Ctrl + O` | Open project file (`.epr`) |
| `Ctrl + S` | Save project |
| `Ctrl + Shift + S` | Save As... |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Alt + ↑` | Move task up |
| `Alt + ↓` | Move task down |
| `Alt + →` | Indent task (increase depth) |
| `Alt + ←` | Outdent task (decrease depth) |
| `Delete` | Delete selected task(s) |
| `Enter` | Commit cell edit or create task in quick-add row |

---

## 🚀 Downloads & Installation

Pre-built Windows installers are available on the [GitHub Releases](https://github.com/formatocd/easy-project/releases/latest) page.

### System Requirements
- **Operating System:** Windows 10 / 11 (64-bit).
- **Disk Space:** ~30 MB.

---

## 🛠️ Building from Source

To compile Easy Project from source, ensure you have the following prerequisites installed:

- [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain) and Cargo
- C++ build tools (Visual Studio C++ Build Tools on Windows)

### 1. Clone the repository
```bash
git clone https://github.com/formatocd/easy-project.git
cd easy-project
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Run in development mode
```bash
pnpm tauri dev
```

### 4. Build production installer
```bash
pnpm tauri build
```

The resulting standalone setup executable will be located at:
`src-tauri/target/release/bundle/nsis/Easy Project_0.1.0_x64-setup.exe`

---

## 👤 Author & Contact

- **Author:** Carlos Durán
- **Organization:** [Formato CD](https://formatocd.es)
- **Email:** [carlos.duran@formatocd.es](mailto:carlos.duran@formatocd.es)
- **Repository:** [github.com/formatocd/easy-project](https://github.com/formatocd/easy-project)

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
