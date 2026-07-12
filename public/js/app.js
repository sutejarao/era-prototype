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
    { id: 'green-detail',               title: 'Select Journey',      noNav: false, noBack: false },
    { id: 'green-journey-confirmed',    title: 'Risk Assessed',       noNav: false, noBack: false },
    { id: 'green-current-journey',      title: 'Your Journey',        noNav: false, noBack: false },
    { id: 'green-preparation',          title: 'Preparation',         noNav: false, noBack: false },
    { id: 'green-ready',                title: 'Ready',               noNav: false, noBack: false },

    // ── Flow 2 — Surprise Me / Quiz ─────────────────────────────
    { id: 'quiz-q1',                    title: 'Surprise Me',         noNav: false, noBack: false },
    { id: 'quiz-q2',                    title: 'Surprise Me',         noNav: false, noBack: false },
    { id: 'quiz-q3',                    title: 'Surprise Me',         noNav: false, noBack: false },
    { id: 'explore-results-surprise',  title: 'Results',             noNav: false, noBack: false },
    { id: 'explore-entry-return',      title: 'Explore',             noNav: false, noBack: true  },

    // ── Flow C — Precision Search / Amber (Great Fire of London) ─
    { id: 'precision-search-c',        title: 'Precision Search',    noNav: false, noBack: false },
    { id: 'explore-results-c',         title: 'Results',             noNav: false, noBack: false },

    // ── Flow C — Surprise Me (legacy) ───────────────────────────
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
    const meta      = SCREEN_MAP[screenId];
    const navBar    = getNavBar();
    const bottomNav = document.getElementById('bottom-nav');
    const title     = getNavTitle();
    const backBtn   = getBackBtn();

    if (!navBar) return;

    if (meta.noNav) {
      navBar.hidden = true;
      navBar.setAttribute('aria-hidden', 'true');
      if (bottomNav) {
        bottomNav.hidden = true;
        bottomNav.setAttribute('aria-hidden', 'true');
      }
      return;
    }

    navBar.hidden = false;
    navBar.removeAttribute('aria-hidden');
    if (bottomNav) {
      bottomNav.hidden = false;
      bottomNav.removeAttribute('aria-hidden');
    }

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

    // Clean up after the transition completes.
    // IMPORTANT: filter to e.target === toEl to ignore transitionend events
    // that bubble up from child elements (e.g. result-card, option-card)
    // which have their own shorter CSS transitions. Without this filter,
    // { once: true } would fire on the first child event (~120ms) and
    // consume the listener before the screen's own transform (~350ms).
    let cleaned = false;
    const safeCleanup = () => {
      if (cleaned) return;
      cleaned = true;
      fromEl.classList.remove('active', exitClass);
      toEl.classList.remove(enterClass);
      transitioning = false;
      console.log(`[Era] transition complete: ${fromId} → ${toId} | stack:`, [...history]);
    };

    const onTransitionEnd = (e) => {
      // Only respond to the screen element's own transform transition,
      // not bubbled events from child elements.
      if (e.target !== toEl) return;
      toEl.removeEventListener('transitionend', onTransitionEnd);
      safeCleanup();
    };

    toEl.addEventListener('transitionend', onTransitionEnd);
    setTimeout(safeCleanup, DURATION + 50); // fallback if transitionend never fires
  }

  // ─── Quiz Summary Populate ────────────────────────────────────
  function populateQuizSummary() {
    const q1Labels = {
      'world-changing':    'Something that changed the world',
      'beauty-spectacle':  'Beauty & spectacle',
      'conflict-survival': 'Conflict & survival',
      'everyday-life':     'Everyday life',
    };
    const q2Labels = {
      'ancient':  'Ancient (before 500 CE)',
      'medieval': 'Medieval (500\u20131500)',
      'modern':   'Modern (1500\u20131950)',
      'any-era':  'Any era',
    };
    const list = document.getElementById('quiz-summary-list');
    if (!list) return;
    const answers = window.quizAnswers || {};
    const items = [];
    if (answers.q1) items.push(q1Labels[answers.q1] || answers.q1);
    if (answers.q2) items.push(q2Labels[answers.q2] || answers.q2);
    list.innerHTML = items.map(t => `<li>${t}</li>`).join('');
  }

  // ─── Navigate Forward ─────────────────────────────────────────
  function navigateTo(toId) {
    transition(toId, 'forward');
    history.push(toId);
    updateNavBar(toId);
    if (toId === 'quiz-q3') populateQuizSummary();
  }

  // ─── Navigate Back ────────────────────────────────────────────
  function navigateBack() {
    if (history.length <= 1 || transitioning) return;

    // Determine destination BEFORE modifying history so transition()
    // can still read history[last] as the correct fromId (current screen).
    const toId = history[history.length - 2];

    transition(toId, 'back'); // reads history[last] = current screen as fromId ✓
    history.pop();            // then discard current screen, matching navigateTo's push-after pattern
    updateNavBar(toId);
  }

  // ─── Event Delegation ─────────────────────────────────────────
  function handleClick(e) {
    // ① Back button — checked FIRST, highest priority.
    //   pointer-events: none on the inner SVG (see CSS) ensures e.target
    //   is always the <button> itself, never a child SVG path.
    const backBtn = e.target.closest('#nav-back');
    if (backBtn) {
      console.log('[Era] back tap | stack before:', [...history], '| transitioning:', transitioning);
      navigateBack();
      return;
    }

    // ② Option card — flash selection, then navigate
    const optionCard = e.target.closest('[data-option][data-goto]');
    if (optionCard) {
      if (transitioning) return;
      const targetId = optionCard.dataset.goto;
      const siblings = optionCard.closest('.option-stack')
        ? optionCard.closest('.option-stack').querySelectorAll('[data-option]')
        : [];
      siblings.forEach(s => s.classList.remove('selected'));
      optionCard.classList.add('selected');
      setTimeout(() => {
        optionCard.classList.remove('selected');
        navigateTo(targetId);
      }, 180);
      return;
    }

    // ③ Any other [data-goto] element
    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) {
      console.log('[Era] goto tap →', gotoBtn.dataset.goto, '| transitioning:', transitioning);
      if (gotoBtn.dataset.selectEvent) {
        window.quizAnswers = window.quizAnswers || {};
        window.quizAnswers.selected = gotoBtn.dataset.selectEvent;
      }
      navigateTo(gotoBtn.dataset.goto);
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

    // Tab toggle — delegated on document
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab-target]');
      if (!tab) return;

      const panelId      = tab.dataset.tabTarget;
      const tabsContainer = tab.closest('.prep-tabs');
      if (!tabsContainer) return;

      tabsContainer.querySelectorAll('[data-tab-target]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const screen = tab.closest('.screen');
      if (!screen) return;
      screen.querySelectorAll('[data-tab-panel]').forEach(p => p.classList.add('hidden'));
      const panel = screen.querySelector(`[data-tab-panel="${panelId}"]`);
      if (panel) panel.classList.remove('hidden');
    });

    // Quiz answer store — keyed by question id
    window.quizAnswers = window.quizAnswers || {};

    // Option card selection — delegated on document
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card[data-answer]');
      if (!card) return;
      const group = card.dataset.answer;
      const value = card.dataset.value;
      // Deselect siblings in same group
      document.querySelectorAll(`.option-card[data-answer="${group}"]`).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      window.quizAnswers[group] = value;
      // Enable the Next button in the same screen
      const screen = card.closest('.screen');
      if (!screen) return;
      const nextBtn = screen.querySelector('.quiz-next');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
      }
    });

    // Demo unavailable toast — for non-wired buttons
    function showToast(msg) {
      let toast = document.getElementById('proto-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'proto-toast';
        toast.style.cssText = [
          'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
          'background:#2a2a2a', 'color:#fff', 'font-family:var(--font-body)',
          'font-size:13px', 'padding:10px 18px', 'border-radius:100px',
          'pointer-events:none', 'opacity:0', 'transition:opacity 0.2s ease',
          'z-index:9999', 'white-space:nowrap',
        ].join(';');
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.opacity = '1';
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-demo-unavailable]');
      if (!btn) return;
      showToast('Not available in this demo');
    });

    // Demo mode toggle
    let demoActive = false;
    const demoToggle = document.getElementById('demo-toggle');
    if (demoToggle) {
      demoToggle.addEventListener('click', () => {
        demoActive = !demoActive;
        document.body.classList.toggle('demo-mode', demoActive);
        demoToggle.setAttribute('aria-pressed', String(demoActive));
      });
    }

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
