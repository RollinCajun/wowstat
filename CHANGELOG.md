# Changelog

All notable changes to WoW Stat are documented in this file.

## [4.0.0] - February 17, 2026

### 🎉 Major Release - Complete Modernization

This is a comprehensive rewrite of the WoW Stat application from the ground up. The v3.0.5 codebase was largely unmaintained for 10 years. v4.0.0 brings it into the modern era with full support for contemporary World of Warcraft realm types.

### ✨ New Features

- **Multi-Realm Type Support** - Monitor Retail, Classic 1x, and MoP Classic realms simultaneously
  - Each expansion has its own independent realm selection dropdown
  - Status tracking and notifications work independently for each type
  - Users can enable monitoring for any combination of realm types

- **Dynamic Realm Scraping** - Replaced static JSON realm lists with live Blizzard status page scraping
  - Uses Puppeteer headless browser to fetch and parse Blizzard's dynamic status pages
  - Automatically handles JavaScript-rendered content
  - Always shows current realm lists without need for app updates

- **Parallel Status Fetching** - All three realm type status pages are fetched in parallel for speed
  - Single Puppeteer browser instance reused across all three fetches
  - Significantly faster than sequential fetching
  - Minimal resource overhead

- **Smart Notifications** - Only notifies when a *selected* realm changes status
  - Monitoring multiple realms across different types doesn't spam notifications
  - Each realm type tracked independently

- **Settings Persistence** - User selections automatically saved and restored
  - Realm selections across all three types saved
  - Autoload preference stored
  - Custom WoW.exe path remembered
  - Notification preferences retained

- **Windows Startup Integration** - Optional automatic launch with Windows boot
  - Checkbox in UI to enable/disable
  - Console logging now correctly reflects state

### 🔧 Architecture Changes

- **Puppeteer Web Scraping** - Replaced static `realms.json` with Puppeteer-based dynamic fetching
  - Main process (`main.js`) now handles all scraping and status checking
  - Puppeteer configured with headless browser in no-sandbox mode for Electron compatibility
  - Page evaluation extracts realm data from dynamically-rendered HTML tables

- **IPC Restructuring** - Refactored inter-process communication
  - Server status now sent as object: `{ retail: [], classic: [], mop: [] }`
  - Autoload checkbox properly passes state through IPC
  - Better separation of concerns between main and renderer processes

- **AngularJS UI Modernization** - Updated Angular controllers and bindings
  - Three separate realm array bindings (`$scope.realms`, `$scope.realmsClassic`, `$scope.realmsClassicMoP`)
  - Proper watch handlers with correct parameter order
  - Better error handling and fallbacks

- **Storage Layer** - Using `electron-json-storage` for persistent settings
  - Automatic save on every options change
  - Proper initialization on app startup
  - Settings loaded before UI first render

### 🎨 UI/UX Improvements

- **Window Resizing** - Optimized for content
  - Width: 500px (Windows), 450px (macOS)
  - Height: 520px (Windows), 650px (macOS) - reduced from 750px to eliminate excess whitespace
  - Responsive layout with proper table spacing

- **Cleaner Settings Form** - Reorganized for clarity
  - Region selector at top
  - Three labeled sections: "Retail Realms", "Classic Realms (1x)", "Mists of Pandaria Classic"
  - All realm dropdowns optional (default to "-- None --")
  - Clear separation between sections with spacing

- **Removed Legacy UI Elements**
  - Removed deprecated test notification buttons
  - Removed non-functional help menu items
  - Removed macOS "Learn More" menu (broken 10-year-old link)
  - Cleaned up console logging

### 🐛 Bug Fixes

- **Notification System** - Fixed broken notification delivery
  - Windows notifications now properly display when realms change status
  - `node-notifier` configured correctly for Windows
  - Test notifications removed from UI (internal-only function)

- **Settings Loading** - Fixed settings not persisting or loading
  - Options now properly saved with `storage.set()`
  - Settings loaded on app startup before UI render
  - Three realm selections properly stored and restored

- **File Dialog** - Fixed WoW.exe path selection
  - Changed from directory-only picker to file picker
  - Filters for `.exe` files on Windows
  - Properly returns selected path to UI

- **Console Logging** - Fixed misleading autoload messages
  - Now correctly shows `true` when checkbox is checked (autoload enabled)
  - Now correctly shows `false` when checkbox is unchecked (autoload disabled)
  - Fixed Angular `$watch` parameter order (was backwards)
  - Suppressed verbose GPU process warnings

- **Chromium GPU Warnings** - Suppressed harmless GPU process errors
  - Added error handlers to Puppeteer pages
  - Filtered console messages to hide false-positive GPU errors
  - App continues to function normally

### 🔄 Version Numbering

- Bumped from v3.0.5 to v4.0.0 (major version bump)
- Justified by: complete architectural rewrite, new features, breaking changes from original
- Follows Semantic Versioning principles
- Updated in `package.json`, `app/package.json`, and build scripts

### 📦 Build & Distribution

- Configured for NSIS Windows installer (`.exe`)
- macOS DMG distribution support maintained
- Clean build process using electron-builder
- Development mode still supports unpacked folder for testing

### 📝 Technical Changes

**Files Modified:**
- `app/main.js` - Complete rewrite of realm checking logic, IPC handlers, state management
- `app/app.js` - Updated AngularJS controller, fixed watch handlers, updated IPC listeners
- `app/index.html` - Added three realm dropdown sections, proper ng-models, removed test buttons
- `package.json` - Updated version to 4.0.0, updated build scripts
- `app/package.json` - Updated version to 4.0.0
- `README.md` - Complete documentation rewrite
- `CHANGELOG.md` - This file (new)

**New Dependencies (already in package.json):**
- `puppeteer@^24.37.3` - Web scraping and rendering

**Removed Dependencies:**
- Old/unused static data handling

### 🚀 Known Issues

- GPU process error messages still appear in console (harmless - Chromium internals)
- Puppeteer adds ~5-10 seconds to first status check (subsequent checks faster due to browser reuse)

### 📋 Future Roadmap

- **TBC Classic Support** - Waiting for Blizzard to publish official status page
  - Architecture designed to handle 4th realm type easily
  - Will require: 4th URL, 4th status variable, 4th UI section, 4th status check
  - Expected minor version bump to 4.1.0 when implemented

- **Additional Enhancements** (beyond scope of 4.0.0)
  - Population/language filtering
  - Web-based dashboard
  - Custom notification sounds
  - Linux support

### 🙏 Attribution

- Original WoW Stat by tobi-wan-kenobi (unmaintained since ~2016)
- v4.0.0 modernization (2026) - Complete rewrite for contemporary WoW realm ecosystem

---

## [3.0.5] - ~2016 (Original)

### Legacy Features
- Single realm monitoring (Retail only)
- Static realm list from JSON file
- Basic Electron framework integration
- Windows/macOS build support
- Simple tray icon implementation

### Known Issues in v3.0.5
- Help menu link broken (wowst.at domain)
- No longer compatible with modern Blizzard status pages (JavaScript-rendered)
- Static realm list became outdated quickly
- Notification system unreliable
- Settings persistence problematic
- Console filled with Chromium warnings

---

## Migration Guide (v3.0.5 → v4.0.0)

If you're updating from v3.0.5:

1. **Backup your WoW.exe path** - UI will ask for it again if not found
2. **Re-select your realm(s)** - Syntax hasn't changed, just need to use new dropdowns
3. **Check notification preferences** - Re-enable if desired
4. **Enable autostart if needed** - Checkbox in UI

All settings should migrate automatically if you have the old settings file, but plan to spend 30 seconds reconfiguring if needed.

---

