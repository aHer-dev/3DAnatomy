// js/ui/ui-controls.js
let isBound = false;
let isOpen = false;
let panelEl, toggleBtn;
const MOBILE_BREAKPOINT = 768;
const SWIPE_HANDLE_HEIGHT = 72;
const SWIPE_CLOSE_DISTANCE = 90;
const SWIPE_CLOSE_VELOCITY = 0.45;
const SWIPE_DIRECTION_BUFFER = 8;

export function setupControlsUI() {
  if (isBound) return; // idempotent
  isBound = true;

  panelEl = document.getElementById('controls');
  toggleBtn = document.getElementById('menu-icon');

  if (!panelEl || !toggleBtn) {
    console.warn('ui-controls: Panel oder Toggle-Button fehlt.');
    return;
  }

  // Startzustand: zu
  panelEl.classList.remove('visible');
  initSwipeToClose();

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) closePanel(); else openPanel();
  });
} // <-- diese Klammer hat gefehlt

function openPanel() {
  if (isOpen) return;
  resetPanelDragState();
  panelEl.classList.add('visible');
  isOpen = true;
}

function closePanel() {
  if (!isOpen) return;
  resetPanelDragState();
  panelEl.classList.remove('visible');
  isOpen = false;
}

function resetPanelDragState() {
  if (!panelEl) return;
  panelEl.style.removeProperty('transition');
  panelEl.style.removeProperty('transform');
}

function initSwipeToClose() {
  if (!panelEl || panelEl.dataset.swipeToCloseBound === 'true') return;
  panelEl.dataset.swipeToCloseBound = 'true';

  let isGestureCandidate = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const cancelGesture = () => {
    isGestureCandidate = false;
    isDragging = false;
    resetPanelDragState();
  };

  panelEl.addEventListener('touchstart', (e) => {
    if (!isOpen || window.innerWidth > MOBILE_BREAKPOINT || e.touches.length !== 1) {
      return;
    }

    if (panelEl.scrollTop > 4) {
      return;
    }

    const touch = e.touches[0];
    const panelTop = panelEl.getBoundingClientRect().top;
    const distanceFromTop = touch.clientY - panelTop;

    if (distanceFromTop < 0 || distanceFromTop > SWIPE_HANDLE_HEIGHT) {
      return;
    }

    isGestureCandidate = true;
    isDragging = false;
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    panelEl.style.transition = 'none';
  }, { passive: true });

  panelEl.addEventListener('touchmove', (e) => {
    if (!isGestureCandidate || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!isDragging) {
      if (dy <= 0) {
        cancelGesture();
        return;
      }

      if (Math.abs(dy) < 6) {
        return;
      }

      if (Math.abs(dy) <= Math.abs(dx) + SWIPE_DIRECTION_BUFFER) {
        cancelGesture();
        return;
      }

      isDragging = true;
    }

    e.preventDefault();
    panelEl.style.transform = `translateY(${Math.min(dy, 240)}px)`;
  }, { passive: false });

  panelEl.addEventListener('touchend', (e) => {
    if (!isGestureCandidate) {
      return;
    }

    const touch = e.changedTouches[0];
    const dy = touch ? touch.clientY - startY : 0;
    const dt = Math.max(Date.now() - startTime, 1);
    const shouldClose = isDragging && (
      dy >= SWIPE_CLOSE_DISTANCE ||
      (dy >= 35 && dy / dt >= SWIPE_CLOSE_VELOCITY)
    );

    resetPanelDragState();
    isGestureCandidate = false;
    isDragging = false;

    if (shouldClose) {
      closePanel();
    }
  }, { passive: true });

  panelEl.addEventListener('touchcancel', cancelGesture, { passive: true });
}

export function isControlsPanelOpen() { return isOpen; }
export function showControlsPanel() { openPanel(); }
export function hideControlsPanel() { closePanel(); }
