# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuickStart is a Chrome extension (Manifest V3) that helps users overcome procrastination by launching predefined "Work Modes" - collections of URLs that open together with a focus timer.

## Architecture

### Message-Based Communication

The extension uses Chrome's message passing API for communication between components:

- **popup.js → background.js**: Sends actions like `startWorkMode`, `getStats`
- **background.js → content.js**: Broadcasts timer state with `showTimer`, `updateTimer`, `hideTimer`
- **content.js → background.js**: Sends `togglePause`, `stopTimer`, `getTimerState`

### Data Storage

All data persists in `chrome.storage.local`:
- `workModes`: Array of saved work mode objects
- `timerState`: Current timer state (persists across service worker restarts)
- `sessions`: Array of session records for stats tracking

### Key Components

**background.js** (Service Worker)
- Manages tab operations (open URLs, close other tabs)
- Handles timer logic with `chrome.alarms` for reliability
- Tracks session statistics
- Must handle service worker lifecycle (state restoration on startup)

**content.js** (Injected into all pages)
- Creates and manages the timer overlay DOM element
- Listens for timer updates from background
- Requests current timer state on page load to sync display

**popup.js**
- Handles Work Mode CRUD operations
- Communicates with background for starting modes and fetching stats

### Timer Flow

1. User clicks "Start" → popup sends `startWorkMode` to background
2. Background opens tabs, then closes old tabs (if `closeOtherTabs` enabled)
3. Background starts alarm-based timer, stores state, broadcasts to content scripts
4. Content scripts display overlay, update every tick
5. On completion, background shows notification

## Development

### Testing Changes

1. Make code changes
2. Go to `chrome://extensions`
3. Click refresh icon on QuickStart extension card
4. Test in browser

### Storage Schema

```javascript
// Work Mode
{
  id: string,           // timestamp-based ID
  name: string,
  urls: string[],
  timer: number,        // minutes
  closeOtherTabs: boolean
}

// Session
{
  modeName: string,
  timerMinutes: number,
  timestamp: number     // Date.now()
}
```

## Important Patterns

- When closing tabs and opening new ones, always open new tabs first to prevent Chrome from closing the window
- Timer uses `chrome.alarms` (not setInterval) because service workers can be terminated
- Content script must request timer state on load since it may be injected after timer started
- Use `return true` in message listeners to keep the channel open for async responses
