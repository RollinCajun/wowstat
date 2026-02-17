# WoW Stat v4.0.0 - Multi-Realm Monitor

**A modern World of Warcraft server status monitor for Windows and macOS**

## Overview

WoW Stat is a lightweight system tray application that monitors World of Warcraft realm status across multiple expansions and notifies you when realms come online or go offline. Built with Electron and Puppeteer for real-time Blizzard status page scraping.

**v4.0.0 is a complete modernization** of the original 3.0.5 codebase with support for monitoring up to three different WoW server types simultaneously:
- **Retail Realms** (current expansion)
- **Classic Realms (1x)** (vanilla re-release)
- **Mists of Pandaria Classic** (expansion re-release)

---

## Features

✅ **Multi-Realm Monitoring** - Monitor realms across Retail, Classic 1x, and MoP Classic independently  
✅ **Real-Time Status** - Fetches live realm status directly from Blizzard's official status pages  
✅ **Smart Notifications** - Notifies only when your selected realm(s) change status  
✅ **Custom Actions** - Choose to notify, launch WoW, or do nothing when realms come up/down  
✅ **Settings Persistence** - Your realm selections and preferences are saved automatically  
✅ **Windows Startup Integration** - Optional automatic launch with Windows  
✅ **System Tray** - Minimalist tray icon showing current realm status at a glance  
✅ **Configurable Polling** - Customize check interval (default: every 1-5 minutes)  

---

## What's New in v4.0.0

### Major Changes from v3.0.5

**🔧 Architecture Overhaul**
- Replaced static realm data with dynamic Puppeteer-based web scraping
- Implemented parallel fetching of multiple realm type status pages
- Complete rewrite of main process realm-checking logic

**📊 Multi-Realm Support**
- Added independent monitoring for Retail, Classic 1x, and MoP Classic
- Users can select ANY realm from ANY expansion type and monitor multiple simultaneously
- Separate status tracking for each realm type

**🎨 UI Improvements**
- Reorganized settings form with clearly labeled sections for each realm type
- Optimized window size for cleaner layout
- Removed deprecated help menu and legacy UI elements
- Full option validation and defaulting

**📡 Blizzard Integration**
- Uses Puppeteer headless browser to parse Blizzard's dynamically-rendered status pages
- Automatically handles JavaScript-rendered content (not accessible via plain HTTP)
- No OAuth or authentication required

**🐛 Bug Fixes**
- Fixed notification system reliability
- Fixed settings persistence and autoload
- Fixed file browser dialog for WoW.exe selection
- Suppressed Chromium GPU process spam warnings
- Fixed console logging clarity and accuracy

### Upcoming: TBC Classic Support
When Blizzard launches the official status page for "The Burning Crusade Classic," this app will be updated to support it. The architecture is designed to handle additional realm types with minimal code changes.

---

## Installation

### Windows
Download the latest installer (`.exe`) from [Releases](../../releases) and run it. The app will be installed to Program Files and added to your Start menu.

### macOS
macOS users will have to compile the code themselves to get their respected executable file. I do not own a mac so I can not provide that for you. Sorry.

---

## Usage

1. **Launch** WoW Stat - the settings window opens automatically
2. **Select a realm** from any/all expansion tabs (Retail, Classic, MoP)
3. **Configure actions** - choose what happens when your realm comes up or down:
   - Notify (Windows/macOS notification popup)
   - Launch (automatically start WoW)
   - Nothing (silent monitoring)
4. **Verify WoW path** - set the location of your WoW.exe (usually auto-detected)
5. **Optional: Enable startup** - check "Start with Windows" to launch automatically

**Tray Interaction:**
- **Click tray icon** - Opens the settings window to configure realms
- **Right-click menu** - Shows only a Quit option to close the app
- Icon color indicates status of your selected realm(s):
  - 🟢 **Green** = Selected realm online
  - 🔴 **Red** = Selected realm offline
  - ⚪ **Neutral** = No realm selected

---

## Development

### Requirements
- Node.js 18+ and npm
- Windows or macOS

### Setup

```bash
npm install
```

### Run in Development

**Windows:**
```bash
npm run startwin
```

**macOS:**
```bash
npm start
```

### Build Installer

**Windows (.exe installer):**
```bash
npm run distwin
```

**macOS (.dmg):**
```bash
npm run dist
```

Installers are created in the `dist/` folder.

---

## How It Works

1. **Scraping** - Puppeteer launches a headless browser and navigates to Blizzard's three status pages
2. **Parsing** - JavaScript evaluation extracts realm names and status from the dynamically-rendered tables
3. **Monitoring** - The app periodically checks for status changes on your selected realm(s)
4. **Notifications** - When a monitored realm changes status, it triggers your configured action
5. **Storage** - All settings are automatically saved to your user data directory

---

## Technical Details

**Tech Stack**
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [Puppeteer](https://pptr.dev/) - Headless browser for rendering and scraping
- [AngularJS 1.x](https://angularjs.org/) - UI framework
- [electron-json-storage](https://github.com/jviotti/electron-json-storage) - User settings persistence
- [node-notifier](https://github.com/mikaelbr/node-notifier) - Windows/macOS notifications
- [auto-launch](https://github.com/Teamwork/node-auto-launch) - Windows startup integration

**Data Sources**
- Retail: `https://worldofwarcraft.blizzard.com/en-us/game/status/{region}`
- Classic 1x: `https://worldofwarcraft.blizzard.com/en-us/game/status/classic1x-us`
- MoP Classic: `https://worldofwarcraft.blizzard.com/en-us/game/status/classic-us`

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- v4.0.0 released February 2026 - Major modernization with multi-realm support
- v3.0.5 (original) - Single realm monitoring, legacy architecture

---

## License

See [LICENSE.md](LICENSE.md)

---

## Contributing

This is a community fork of the original project. Feel free to submit issues and improvements!

---

## Future Roadmap

- [ ] TBC Classic realm type (when Blizzard releases status page)
- [ ] Web dashboard for remote monitoring
- [ ] Realm population and language filtering
- [ ] Custom notification sounds
- [ ] Linux support

---