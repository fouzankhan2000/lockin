// DOM Elements
const createForm = document.getElementById('create-form');
const modeNameInput = document.getElementById('mode-name');
const modeUrlsInput = document.getElementById('mode-urls');
const modeTimerInput = document.getElementById('mode-timer');
const modeCloseTabsInput = document.getElementById('mode-close-tabs');
const modesList = document.getElementById('modes-list');
const emptyMessage = document.getElementById('empty-message');
const statsBanner = document.getElementById('stats-banner');
const statsText = document.getElementById('stats-text');

// Load and display saved modes and stats when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadModes();
  loadStats();
});

// Handle form submission
createForm.addEventListener('submit', handleCreateMode);

/**
 * Load all saved work modes from storage and display them
 */
async function loadModes() {
  const data = await chrome.storage.local.get('workModes');
  const modes = data.workModes || [];
  renderModes(modes);
}

/**
 * Render work modes to the UI
 */
function renderModes(modes) {
  modesList.innerHTML = '';

  if (modes.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');

  modes.forEach((mode, index) => {
    const card = createModeCard(mode, index);
    modesList.appendChild(card);
  });
}

/**
 * Create a work mode card element
 */
function createModeCard(mode, index) {
  const card = document.createElement('div');
  card.className = 'mode-card';

  const timerText = mode.timer ? `${mode.timer} min` : '25 min';
  const urlsPreview = mode.urls.slice(0, 3).map(url => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  });

  const moreCount = mode.urls.length - 3;
  const closeTabsBadge = mode.closeOtherTabs ? `
    <span class="mode-badge" title="Closes other tabs when started">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
      Focus
    </span>
  ` : '';

  card.innerHTML = `
    <div class="mode-header">
      <span class="mode-name">${escapeHtml(mode.name)}${closeTabsBadge}</span>
      <span class="mode-timer">${timerText}</span>
    </div>
    <div class="mode-urls">
      ${urlsPreview.map(u => `<span class="url-tag">${escapeHtml(u)}</span>`).join('')}
      ${moreCount > 0 ? `<span class="url-more">+${moreCount} more</span>` : ''}
    </div>
    <div class="mode-actions">
      <button class="btn btn-start" data-index="${index}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
        Start
      </button>
      <button class="btn btn-delete" data-index="${index}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
        </svg>
      </button>
    </div>
  `;

  // Add event listeners
  card.querySelector('.btn-start').addEventListener('click', () => startMode(index));
  card.querySelector('.btn-delete').addEventListener('click', () => deleteMode(index));

  return card;
}

/**
 * Handle creating a new work mode
 */
async function handleCreateMode(e) {
  e.preventDefault();

  const name = modeNameInput.value.trim();
  const urlsText = modeUrlsInput.value.trim();
  const timer = parseInt(modeTimerInput.value) || 25;
  const closeOtherTabs = modeCloseTabsInput.checked;

  // Parse URLs (one per line)
  const urls = urlsText
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0)
    .map(url => {
      // Add https:// if no protocol specified
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }
      return url;
    });

  if (urls.length === 0) {
    alert('Please enter at least one URL');
    return;
  }

  // Create the work mode object
  const newMode = {
    id: Date.now().toString(),
    name,
    urls,
    timer,
    closeOtherTabs
  };

  // Save to storage
  const data = await chrome.storage.local.get('workModes');
  const modes = data.workModes || [];
  modes.push(newMode);
  await chrome.storage.local.set({ workModes: modes });

  // Clear form and reload modes
  createForm.reset();
  loadModes();
}

/**
 * Start a work mode - send message to background script to open tabs
 */
async function startMode(index) {
  const data = await chrome.storage.local.get('workModes');
  const modes = data.workModes || [];
  const mode = modes[index];

  if (!mode) return;

  // Send message to background script to open tabs
  chrome.runtime.sendMessage({
    action: 'startWorkMode',
    mode: mode
  });

  // Close the popup
  window.close();
}

/**
 * Delete a work mode
 */
async function deleteMode(index) {
  const data = await chrome.storage.local.get('workModes');
  const modes = data.workModes || [];

  if (confirm(`Delete "${modes[index].name}"?`)) {
    modes.splice(index, 1);
    await chrome.storage.local.set({ workModes: modes });
    loadModes();
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load and display stats
 */
async function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (!stats || stats.sessionsThisWeek === 0) {
      statsBanner.classList.add('hidden');
      return;
    }

    // Build the stats message
    const weekCount = stats.sessionsThisWeek;
    const weekText = weekCount === 1 ? 'time' : 'times';

    let message = `You started work ${weekCount} ${weekText} this week`;

    // Add focus time if substantial
    if (stats.totalMinutesThisWeek >= 60) {
      const hours = Math.floor(stats.totalMinutesThisWeek / 60);
      const hourText = hours === 1 ? 'hour' : 'hours';
      message += ` (${hours} ${hourText} of focus)`;
    }

    statsText.textContent = message;
    statsBanner.classList.remove('hidden');
  });
}
