/**
 * QuickStart Background Service Worker
 * Handles opening tabs and managing the countdown timer
 */

// Timer state
let timerState = {
  isActive: false,
  isPaused: false,
  isComplete: false,
  modeName: '',
  totalSeconds: 0,
  remainingSeconds: 0,
  startTime: 0,
  pausedAt: 0
};

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startWorkMode':
      openWorkMode(message.mode);
      break;
    case 'getTimerState':
      sendResponse(timerState);
      break;
    case 'togglePause':
      togglePause();
      break;
    case 'stopTimer':
      stopTimer();
      break;
    case 'getStats':
      getStats().then(sendResponse);
      return true; // Keep channel open for async
  }
  return true; // Keep message channel open for async response
});

/**
 * Open all URLs for a work mode in new tabs and start timer
 */
async function openWorkMode(mode) {
  if (!mode || !mode.urls || mode.urls.length === 0) {
    return;
  }

  // Get existing tabs to close later (if closeOtherTabs is enabled)
  let tabsToClose = [];
  if (mode.closeOtherTabs) {
    const existingTabs = await chrome.tabs.query({ currentWindow: true });
    tabsToClose = existingTabs.filter(tab => !tab.pinned).map(tab => tab.id);
  }

  // Open each URL in a new tab
  const openedTabs = [];
  for (const url of mode.urls) {
    try {
      const tab = await chrome.tabs.create({ url, active: false });
      openedTabs.push(tab);
    } catch (error) {
      console.error(`Failed to open ${url}:`, error);
    }
  }

  // Activate the first tab we opened
  if (openedTabs.length > 0) {
    await chrome.tabs.update(openedTabs[0].id, { active: true });
  }

  // Now close the old tabs (after new ones are open, so window stays open)
  if (tabsToClose.length > 0) {
    try {
      await chrome.tabs.remove(tabsToClose);
    } catch (error) {
      console.error('Failed to close old tabs:', error);
    }
  }

  // Start the countdown timer (default 5 minutes for testing, use mode.timer in production)
  const timerMinutes = mode.timer || 5;
  startTimer(mode.name, timerMinutes);

  // Track this session for stats
  trackSession(mode.name, timerMinutes);

  console.log(`Started work mode: ${mode.name} with ${mode.urls.length} tabs and ${timerMinutes} min timer`);
}

/**
 * Close all tabs except pinned tabs in the current window (legacy function, kept for reference)
 */
async function closeOtherTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabsToClose = tabs.filter(tab => !tab.pinned);

    if (tabsToClose.length > 0) {
      const tabIds = tabsToClose.map(tab => tab.id);
      await chrome.tabs.remove(tabIds);
    }
  } catch (error) {
    console.error('Failed to close other tabs:', error);
  }
}

/**
 * Track a work session for stats
 */
async function trackSession(modeName, timerMinutes) {
  const session = {
    modeName,
    timerMinutes,
    timestamp: Date.now()
  };

  const data = await chrome.storage.local.get('sessions');
  const sessions = data.sessions || [];
  sessions.push(session);

  // Keep only last 100 sessions to avoid storage bloat
  const trimmedSessions = sessions.slice(-100);
  await chrome.storage.local.set({ sessions: trimmedSessions });
}

/**
 * Get stats for the popup
 */
async function getStats() {
  const data = await chrome.storage.local.get('sessions');
  const sessions = data.sessions || [];

  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const thisWeek = sessions.filter(s => s.timestamp >= oneWeekAgo);
  const today = sessions.filter(s => s.timestamp >= oneDayAgo);

  // Calculate total focus time this week (in minutes)
  const totalMinutesThisWeek = thisWeek.reduce((sum, s) => sum + (s.timerMinutes || 0), 0);

  return {
    totalSessions: sessions.length,
    sessionsThisWeek: thisWeek.length,
    sessionsToday: today.length,
    totalMinutesThisWeek
  };
}

/**
 * Start the countdown timer
 */
function startTimer(modeName, minutes) {
  const totalSeconds = minutes * 60;

  timerState = {
    isActive: true,
    isPaused: false,
    isComplete: false,
    modeName,
    totalSeconds,
    remainingSeconds: totalSeconds,
    startTime: Date.now(),
    pausedAt: 0
  };

  // Save state to storage for persistence
  chrome.storage.local.set({ timerState });

  // Set up alarm for timer tick (every second)
  chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 });

  // Broadcast to all tabs
  broadcastTimerState('showTimer');
}

/**
 * Handle timer tick
 */
function handleTimerTick() {
  if (!timerState.isActive || timerState.isPaused) return;

  const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
  timerState.remainingSeconds = Math.max(0, timerState.totalSeconds - elapsed);

  if (timerState.remainingSeconds <= 0) {
    timerState.isComplete = true;
    timerState.remainingSeconds = 0;
    chrome.alarms.clear('timerTick');

    // Play completion sound or show notification
    showCompletionNotification();
  }

  // Save and broadcast
  chrome.storage.local.set({ timerState });
  broadcastTimerState('updateTimer');
}

/**
 * Toggle pause/resume
 */
function togglePause() {
  if (!timerState.isActive) return;

  if (timerState.isPaused) {
    // Resume: adjust startTime to account for pause duration
    const pauseDuration = Date.now() - timerState.pausedAt;
    timerState.startTime += pauseDuration;
    timerState.isPaused = false;
    timerState.pausedAt = 0;
    chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 });
  } else {
    // Pause
    timerState.isPaused = true;
    timerState.pausedAt = Date.now();
    chrome.alarms.clear('timerTick');
  }

  chrome.storage.local.set({ timerState });
  broadcastTimerState('updateTimer');
}

/**
 * Stop the timer
 */
function stopTimer() {
  timerState = {
    isActive: false,
    isPaused: false,
    isComplete: false,
    modeName: '',
    totalSeconds: 0,
    remainingSeconds: 0,
    startTime: 0,
    pausedAt: 0
  };

  chrome.alarms.clear('timerTick');
  chrome.storage.local.set({ timerState });
  broadcastTimerState('hideTimer');
}

/**
 * Broadcast timer state to all tabs
 */
async function broadcastTimerState(action) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action,
          state: timerState
        });
      } catch (e) {
        // Tab might not have content script loaded yet
      }
    }
  }
}

/**
 * Show completion notification
 */
function showCompletionNotification() {
  chrome.notifications.create('timerComplete', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'QuickStart Timer Complete!',
    message: `Your ${timerState.modeName} session is complete. Great work!`,
    priority: 2
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timerTick') {
    handleTimerTick();
  }
});

// Restore timer state on service worker startup
chrome.storage.local.get('timerState', (data) => {
  if (data.timerState && data.timerState.isActive) {
    timerState = data.timerState;

    // Recalculate remaining time if not paused
    if (!timerState.isPaused && !timerState.isComplete) {
      const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
      timerState.remainingSeconds = Math.max(0, timerState.totalSeconds - elapsed);

      if (timerState.remainingSeconds > 0) {
        chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 });
      } else {
        timerState.isComplete = true;
      }
    }
  }
});
