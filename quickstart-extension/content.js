/**
 * QuickStart Timer Overlay - Content Script
 * Displays a countdown timer overlay on web pages
 */

let timerOverlay = null;
let timerInterval = null;
let currentTimerState = null;

// SVG Icons
const ICONS = {
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  play: '<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'
};

/**
 * Initialize the timer overlay
 */
function initOverlay() {
  if (timerOverlay) return;

  timerOverlay = document.createElement('div');
  timerOverlay.id = 'quickstart-timer-overlay';
  timerOverlay.innerHTML = `
    <div class="qs-timer-container">
      <svg class="qs-progress-ring" viewBox="0 0 44 44">
        <circle class="qs-progress-ring-circle" cx="22" cy="22" r="18"/>
        <circle class="qs-progress-ring-progress" cx="22" cy="22" r="18"/>
      </svg>
      <div class="qs-timer-info">
        <div class="qs-mode-name"></div>
        <div class="qs-time-display">00:00</div>
      </div>
      <div class="qs-timer-actions">
        <button class="qs-btn qs-btn-pause" title="Pause/Resume">
          ${ICONS.pause}
        </button>
        <button class="qs-btn qs-btn-stop" title="Stop Timer">
          ${ICONS.stop}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(timerOverlay);

  // Set up progress ring
  const progressCircle = timerOverlay.querySelector('.qs-progress-ring-progress');
  const circumference = 2 * Math.PI * 18;
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = 0;

  // Add event listeners
  timerOverlay.querySelector('.qs-btn-pause').addEventListener('click', togglePause);
  timerOverlay.querySelector('.qs-btn-stop').addEventListener('click', stopTimer);

  // Make draggable
  makeDraggable(timerOverlay);
}

/**
 * Update the timer display
 */
function updateDisplay(state) {
  if (!timerOverlay || !state) return;

  currentTimerState = state;

  const { modeName, remainingSeconds, totalSeconds, isPaused, isComplete } = state;

  // Update mode name
  timerOverlay.querySelector('.qs-mode-name').textContent = modeName;

  // Update time display
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timerOverlay.querySelector('.qs-time-display').textContent =
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Update progress ring
  const progressCircle = timerOverlay.querySelector('.qs-progress-ring-progress');
  const circumference = 2 * Math.PI * 18;
  const progress = remainingSeconds / totalSeconds;
  progressCircle.style.strokeDashoffset = circumference * (1 - progress);

  // Update pause button
  const pauseBtn = timerOverlay.querySelector('.qs-btn-pause');
  pauseBtn.innerHTML = isPaused ? ICONS.play : ICONS.pause;
  pauseBtn.classList.toggle('paused', isPaused);
  pauseBtn.title = isPaused ? 'Resume' : 'Pause';

  // Handle completion
  timerOverlay.classList.toggle('complete', isComplete);

  // Show the overlay
  timerOverlay.style.display = 'block';
}

/**
 * Hide the timer overlay
 */
function hideOverlay() {
  if (timerOverlay) {
    timerOverlay.style.display = 'none';
  }
  currentTimerState = null;
}

/**
 * Toggle pause/resume
 */
function togglePause() {
  chrome.runtime.sendMessage({ action: 'togglePause' });
}

/**
 * Stop the timer
 */
function stopTimer() {
  chrome.runtime.sendMessage({ action: 'stopTimer' });
}

/**
 * Make the overlay draggable
 */
function makeDraggable(element) {
  let isDragging = false;
  let startX, startY, initialX, initialY;

  const container = element.querySelector('.qs-timer-container');

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.qs-btn')) return; // Don't drag when clicking buttons

    isDragging = true;
    element.classList.add('dragging');

    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newX = initialX + deltaX;
    let newY = initialY + deltaY;

    // Keep within viewport
    const rect = element.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

    element.style.left = newX + 'px';
    element.style.top = newY + 'px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
    }
  });
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'showTimer':
      initOverlay();
      updateDisplay(message.state);
      break;
    case 'updateTimer':
      updateDisplay(message.state);
      break;
    case 'hideTimer':
      hideOverlay();
      break;
  }
});

/**
 * Request current timer state when page loads
 */
chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
  if (response && response.isActive) {
    initOverlay();
    updateDisplay(response);
  }
});
