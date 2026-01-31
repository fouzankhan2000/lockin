# QuickStart

A Chrome extension that helps you overcome procrastination by reducing the friction to start work. Launch your entire work environment with a single click.

![Chrome Extension](https://img.shields.io/badge/Platform-Chrome-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## Features

- **Work Modes** - Create custom modes for different tasks (Writing, Coding, Study, etc.)
- **One-Click Launch** - Open all your work URLs instantly
- **Focus Timer** - Built-in countdown timer with pause/resume
- **Focus Mode** - Optionally close distracting tabs when starting (keeps pinned tabs)
- **Session Tracking** - See how many times you've started work this week
- **Clean UI** - Notion-inspired minimal design

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/quickstart-extension.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select the `quickstart-extension` folder

6. The extension icon will appear in your toolbar

## Usage

### Creating a Work Mode

1. Click the QuickStart extension icon
2. Fill in the form:
   - **Name**: Give your mode a name (e.g., "Deep Work")
   - **URLs**: Add URLs you want to open (one per line)
   - **Timer**: Set a focus duration in minutes (default: 25)
   - **Close other tabs**: Toggle to close distracting tabs when starting
3. Click **Create Mode**

### Starting a Work Mode

1. Click the QuickStart extension icon
2. Find your saved mode
3. Click **Start**
4. All your URLs open and the timer begins

### Timer Controls

When a Work Mode is active, a timer overlay appears in the bottom-right corner:
- **Pause/Resume**: Blue button to pause or resume the timer
- **Stop**: Red button to end the session early
- **Draggable**: Click and drag to reposition the overlay

## Screenshots

*Coming soon*

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- chrome.storage.local for data persistence
- chrome.alarms for reliable timer

## File Structure

```
quickstart-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Popup UI structure
├── popup.js           # Popup interactions
├── background.js      # Service worker (tabs, timer, stats)
├── content.js         # Timer overlay injection
├── styles.css         # Popup styles
├── timer.css          # Timer overlay styles
└── icons/             # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `storage` - Save work modes and session data
- `tabs` - Open and close browser tabs
- `alarms` - Reliable timer functionality
- `scripting` - Inject timer overlay
- `notifications` - Alert when timer completes

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

Built with Claude Code by Anthropic
