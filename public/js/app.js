/**
 * Era Prototype — Navigation Engine
 * Manages screen transitions, history stack, and nav bar state.
 */

(() => {
  'use strict';

  // ─── Screen Registry ──────────────────────────────────────────
  const SCREENS = [
    // ── Shared ──────────────────────────────────────────────────
    { id: 'sign-in',                    title: null,                  noNav: true,  noBack: true  },
    { id: 'explore-entry',              title: 'Explore',             noNav: false, noBack: true  },

    // ── Flow A — Precision Search / Amber ───────────────────────
    { id: 'precision-search',           title: 'Precision Search',    noNav: false, noBack: false },
    { id: 'explore-results',            title: 'Results',             noNav: false, noBack: false },
    { id: 'amber-risk',                 title: 'Risk Assessment',     noNav: false, noBack: false },
    { id: 'journey-updated',            title: 'Your Journey',        noNav: false, noBack: false },
    { id: 'preparation',                title: 'Preparation',         noNav: false, noBack: false },
    { id: 'ready',                      title: 'Ready',               noNav: false, noBack: false },

    // ── Flow B — Start from Here / Green (Moon Landing) ─────────
    { id: 'green-current-location',     title: 'Your Location',       noNav: false, noBack: false },
    { id: 'green-results',              title: 'Nearby Eras',         noNav: false, noBack: false },
    { id: 'green-detail',               title: 'Era Detail',          noNav: false, noBack: false },
    { id: 'green-journey-confirmed',    title: 'Journey Confirmed',   noNav: false, noBack: false },
    { id: 'green-preparation',          title: 'Preparation',         noNav: false, noBack: false },
    { id: 'green-ready',                title: 'Ready',               noNav: false, noBack: false },

    // ── Flow C — Surprise Me ────────────────────────────────────
    { id: 'surprise-intent-1',          title: 'Tell Us More',        noNav: false, noBack: false },
    { id: 'surprise-intent-2',          title: 'Almost There',        noNav: false, noBack: false },
    { id: 'surprise-curated-results',   title: 'Picked for You',      noNav: false, noBack: false },
    { id: 'surprise-detail',            title: 'Era Detail',          noNav: false, noBack: false },
    { id: 'surprise-journey-confirmed', title: 'Journey Confirmed',   noNav: false, noBack: false },
    { id: 'surprise-preparation',       title: 'Preparation',         noNav: false, noBack: false },
    { id: 'surprise-ready',             title: 'Ready',               noNav: false, noBack: false },

    // ── Flow D — Precision Search / Red (Pompeii) ───────────────
    { id: 'pompeii-search',             title: 'Precision Search',    noNav: false, noBack: false },
    { id: 'pompeii-results',            title: 'Results',             noNav: false, noBack: false },
    { id: 'red-blocked',                title: 'Access Blocked',      noNav: false, noBack: false },
    { id: 'red-alternatives',           title: 'Alternatives',        noNav: false, noBack: false },
    { id: 'alt-preparation',            title: 'Preparation',         noNav: false, noBack: false },
    { id: 'alt-ready',                  title: 'Ready',               noNav: false, noBack: false },
  ];

  const SCREEN_MAP = Object.fromEntries(SCREENS.map(s => [s.id, s]));

  // ─── State ────────────────────────────────────────────────────
  let history = ['sign-in'];   // stack of visited screen ids
  let transitioning = false;   // guard against overlapping transitions

  const DURATION = 350; // ms — must match CSS if overriding

  // ─── DOM Helpers ──────────────────────────────────────────────
  function getScreenEl(id) {
    return document.getElementById(`screen-${id}`);
  }

  function getNavBar() {
    return document.getElementById('nav-bar');
  }

  function getNavTitle() {
    return document.getElementById('nav-title');
  }

  function getBackBtn() {
    return document.getElementById('nav-back');
  }

  // ─── Nav Bar Update ───────────────────────────────────────────
  function updateNavBar(screenId) {
    const meta    = SCREEN_MAP[screenId];
    const navBar  = getNavBar();
    const title   = getNavTitle();
    const backBtn = getBackBtn();

    if (!navBar) return;

    if (meta.noNav) {
      navBar.hidden = true;
      navBar.setAttribute('aria-hidden', 'true');
      return;
    }

    navBar.hidden = false;
    navBar.removeAttribute('aria-hidden');

    if (title) title.textContent = meta.title || '';

    // Show back button unless this screen explicitly suppresses it
    if (backBtn) {
      const canGoBack = history.length > 1 && !meta.noBack;
      backBtn.hidden = !canGoBack;
      backBtn.setAttribute('aria-hidden', String(!canGoBack));
    }
  }

  // ─── Core Transition ──────────────────────────────────────────
  /**
   * @param {string} toId      - target screen id
   * @param {'forward'|'back'} direction
   */
  function transition(toId, direction) {
    if (transitioning) return;
    if (!SCREEN_MAP[toId]) {
      console.warn(`[Era] Unknown screen: "${toId}"`);
      return;
    }

    const fromId  = history[history.length - 1];
    if (fromId === toId) return;

    const fromEl  = getScreenEl(fromId);
    const toEl    = getScreenEl(toId);

    if (!fromEl || !toEl) {
      console.warn(`[Era] Screen element missing for "${fromId}" or "${toId}"`);
      return;
    }

    transitioning = true;

    // Class names for the two directions
    const exitClass   = direction === 'forward' ? 'slide-out-left'  : 'slide-out-right';
    const enterClass  = direction === 'forward' ? 'slide-from-right' : 'slide-from-left';

    // Position the incoming screen off-screen before making it visible
    toEl.classList.add(enterClass);
    toEl.classList.add('active');

    // Force a reflow so the browser registers the start position
    // before the transition begins.
    // eslint-disable-next-line no-unused-expressions
    toEl.offsetWidth;

    // Kick off both slides simultaneously
    fromEl.classList.add(exitClass);
    toEl.classList.remove(enterClass);

    // Clean up after the transition completes
    const cleanup = () => {
      fromEl.classList.remove('active', exitClass);
      toEl.classList.remove(enterClass);
      transitioning = false;
    };

    // Use transitionend on the incoming screen as the authoritative signal,
    // with a setTimeout fallback in case the event fires on a child element.
    let cleaned = false;
    const safeCleanup = () => {
      if (cleaned) return;
      cleaned = true;
      cleanup();
    };

    toEl.addEventListener('transitionend', safeCleanup, { once: true });
    setTimeout(safeCleanup, DURATION + 50);
  }

  // ─── Navigate Forward ─────────────────────────────────────────
  function navigateTo(toId) {
    transition(toId, 'forward');
    history.push(toId);
    updateNavBar(toId);
  }

  // ─── Navigate Back ────────────────────────────────────────────
  function navigateBack() {
    if (history.length <= 1) return;

    const fromId = history.pop();
    const toId   = history[history.length - 1];

    transition(toId, 'back');
    updateNavBar(toId);

    // Suppress unused-variable lint — fromId kept for clarity
    void fromId;
  }

  // ─── Event Delegation ─────────────────────────────────────────
  function handleClick(e) {
    // [data-option] — selectable option card: flash selection, then navigate
    const optionCard = e.target.closest('[data-option][data-goto]');
    if (optionCard) {
      if (transitioning) return;
      const targetId = optionCard.dataset.goto;
      // Deselect siblings, select tapped card
      const siblings = optionCard.closest('.option-stack')
        ? optionCard.closest('.option-stack').querySelectorAll('[data-option]')
        : [];
      siblings.forEach(s => s.classList.remove('selected'));
      optionCard.classList.add('selected');
      // Brief pause so the selection is visible before transition
      setTimeout(() => {
        optionCard.classList.remove('selected');
        navigateTo(targetId);
      }, 180);
      return;
    }

    // [data-goto] — navigate to a named screen
    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) {
      const targetId = gotoBtn.dataset.goto;
      navigateTo(targetId);
      return;
    }

    // Back button
    const backBtn = e.target.closest('#nav-back');
    if (backBtn) {
      navigateBack();
      return;
    }
  }

  // ─── CSS Transition Support ───────────────────────────────────
  // Inject the slide-out-right and slide-from-right classes if atlas.css
  // doesn't define them (atlas.css ships slide-out-left / slide-from-left).
  function injectBackTransitionStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .screen {
        transition: transform ${DURATION}ms cubic-bezier(0, 0, 0.2, 1);
      }
      /* Forward: enter from right */
      .screen.slide-from-right {
        transform: translateX(100%);
      }
      /* Forward: exit to left */
      .screen.slide-out-left {
        transform: translateX(-100%);
      }
      /* Back: enter from left */
      .screen.slide-from-left {
        transform: translateX(-100%);
      }
      /* Back: exit to right */
      .screen.slide-out-right {
        transform: translateX(100%);
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Boot ─────────────────────────────────────────────────────
  function init() {
    injectBackTransitionStyles();

    // Ensure the first screen is visible, all others hidden
    SCREENS.forEach(({ id }) => {
      const el = getScreenEl(id);
      if (!el) return;
      if (id === history[0]) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Set initial nav bar state
    updateNavBar(history[0]);

    // Single delegated listener on the document
    document.addEventListener('click', handleClick);

    // Keyboard activation for role="button" elements
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const btn = e.target.closest('[role="button"][data-goto]');
        if (btn) { e.preventDefault(); handleClick(e); }
      }
    });

    // Checklist toggle — delegated on document
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.check-item[data-check]');
      if (!item) return;

      item.classList.toggle('done');

      // Find the parent checklist's screen and update any progress bar in it
      const screen = item.closest('.screen');
      if (!screen) return;

      const allItems  = screen.querySelectorAll('.check-item[data-check]');
      const doneItems = screen.querySelectorAll('.check-item[data-check].done');
      const total     = allItems.length;
      const done      = doneItems.length;
      const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

      const fill  = screen.querySelector('.progress-fill');
      const count = screen.querySelector('.progress-wrap__labels .text-caption');

      if (fill)  fill.style.width = pct + '%';
      if (count) count.textContent = `${done} of ${total} complete`;
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ─── Public API (optional — for console debugging) ────────────
  window.Era = { navigateTo, navigateBack, history: () => [...history] };

})();
