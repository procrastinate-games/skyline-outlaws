import { CHALLENGES, PAINTS, UPGRADE_CONFIG, VEHICLES } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class HUD {
  constructor(rootEl, game) {
    this.rootEl = rootEl;
    this.game = game;
    this.stuntTimeout = null;
    this.currentModal = null;

    this.buildDOM();
    this.bindEvents();
    this.refreshAll();
  }

  buildDOM() {
    this.container = document.createElement('div');
    this.container.className = 'hud-layer';
    this.container.innerHTML = `
      <div class="hud-top">
        <div class="hud-card score-cluster">
          <div class="score-row">
            <span class="score-label">SCORE</span>
            <span class="score-value" id="hud-score">0</span>
          </div>
          <div class="sub-stats">
            <span>BEST: <strong id="hud-best">0</strong></span>
            <span>CREDITS: <strong id="hud-credits">$250</strong></span>
          </div>
          <div class="combo-pill" id="hud-combo">COMBO x1</div>
        </div>

        <div class="hud-center-top">
          <div class="pursuit-banner" id="hud-pursuit-banner">
            <div class="pursuit-header">
              <span id="hud-pursuit-title">METRO PATROL: STANDBY</span>
              <span id="hud-pursuit-sub">SPEED OR STUNT TO ENGAGE</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="hud-pursuit-bar"></div>
            </div>
            <div class="capture-meter-wrap" id="hud-capture-wrap">
              <div class="capture-header">
                <span id="hud-capture-label">ARREST METER</span>
                <span id="hud-capture-pct">0%</span>
              </div>
              <div class="progress-track capture-track">
                <div class="progress-fill capture-fill" id="hud-capture-bar"></div>
              </div>
            </div>
          </div>

          <div class="context-prompt" id="hud-context-prompt">
            HIT THE RAMP AHEAD & PRESS [F] FOR JET FLIGHT!
          </div>

          <div class="stunt-feed" id="hud-stunt-feed"></div>
        </div>

        <div class="hud-actions">
          <button class="hud-btn accent" id="btn-pursuit" title="Trigger Police Chase">CHASE (V)</button>
          <button class="hud-btn" id="btn-challenges" title="60s Blitz Challenges">CHALLENGES (C)</button>
          <button class="hud-btn" id="btn-garage" title="Garage & Upgrades">GARAGE (G)</button>
          <button class="hud-btn" id="btn-mute" title="Toggle Audio">SOUND: ON (M)</button>
          <button class="hud-btn" id="btn-pause" title="Pause Game">PAUSE (P)</button>
          <button class="hud-btn" id="btn-restart" title="Restart Run">RESTART (R)</button>
        </div>
      </div>

      <div style="flex: 1;"></div>

      <div class="touch-controls" id="hud-touch-controls">
        <div class="touch-stick-zone" id="touch-stick-zone">
          <div class="touch-stick-nub" id="touch-stick-nub"></div>
        </div>
        <div class="touch-action-grid">
          <button class="touch-btn flight-btn" id="touch-flight">FLIGHT MODE</button>
          <button class="touch-btn" id="touch-boost">BOOST</button>
          <button class="touch-btn" id="touch-drift">DRIFT / AIR BRAKE</button>
          <button class="touch-btn" id="touch-gas">GAS / UP</button>
          <button class="touch-btn" id="touch-brake">BRAKE / DN</button>
        </div>
      </div>

      <div class="hud-bottom">
        <div class="hud-card controls-card">
          <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Arrows</kbd> Drive & Flight Pitch/Bank</div>
          <div><kbd>F</kbd> or <kbd>Tab</kbd> Transform Drive ↔ Jet Flight · <kbd>Space</kbd> Drift / Air brake · <kbd>Shift</kbd>/<kbd>E</kbd> Boost</div>
        </div>

        <div class="hud-card telemetry-card">
          <div class="speed-display">
            <span class="speed-number" id="hud-speed">0</span>
            <span class="speed-unit">KM/H</span>
          </div>
          <div class="sub-stats" style="justify-content: flex-end;">
            <span>ALTITUDE: <strong id="hud-alt">0m</strong></span>
          </div>
          <button class="mode-badge-btn" id="btn-mode-toggle">DRIVE MODE [F]</button>
          <div class="meter-row">
            <span>BOOST</span>
            <div class="meter-bar"><div class="meter-fill boost" id="hud-boost-bar"></div></div>
          </div>
          <div class="meter-row">
            <span>HULL</span>
            <div class="meter-bar"><div class="meter-fill hull" id="hud-hull-bar"></div></div>
          </div>
        </div>
      </div>
    `;
    this.rootEl.appendChild(this.container);

    // Main Menu / Modal Overlay
    this.modalBackdrop = document.createElement('div');
    this.modalBackdrop.className = 'modal-backdrop';
    this.modalPanel = document.createElement('div');
    this.modalPanel.className = 'modal-panel';
    this.modalBackdrop.appendChild(this.modalPanel);
    this.rootEl.appendChild(this.modalBackdrop);

    this.bindButtonsAndTouch();
    this.showMainMenu();
  }

  bindButtonsAndTouch() {
    const byId = (id) => this.container.querySelector(`#${id}`);

    byId('btn-mode-toggle').addEventListener('click', () => {
      this.game.input.triggerFlightToggle();
    });

    byId('btn-pursuit').addEventListener('click', () => {
      if (!gameState.started) this.game.startPlay();
      const nextHeat = Math.min(3, (gameState.pursuit.heat || 0) + 1);
      this.game.police.startPursuit(nextHeat);
    });

    byId('btn-garage').addEventListener('click', () => this.showGarageModal());
    byId('btn-challenges').addEventListener('click', () => this.showChallengesModal());
    byId('btn-pause').addEventListener('click', () => this.togglePauseModal());
    byId('btn-restart').addEventListener('click', () => this.game.restartRun());

    byId('btn-mute').addEventListener('click', () => {
      eventBus.emit(Events.AUDIO_TOGGLE_MUTE);
      this.refreshMuteButton();
    });

    // Global keyboard shortcuts for menus
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR') {
          this.hideModal();
          this.game.restartRun();
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
          this.togglePauseModal();
        } else if (e.code === 'KeyG') {
          this.showGarageModal();
        } else if (e.code === 'KeyC') {
          this.showChallengesModal();
        } else if (e.code === 'KeyV') {
          if (!gameState.started) this.game.startPlay();
          this.game.police.startPursuit(Math.min(3, (gameState.pursuit.heat || 0) + 1));
        } else if (gameState.busted && this.currentModal === 'busted' && ['Enter', 'Space'].includes(e.code)) {
          this.game.restartRun();
        } else if (
          !gameState.started &&
          ['Enter', 'Space', 'KeyW', 'ArrowUp'].includes(e.code)
        ) {
          this.hideModal();
          this.game.startPlay();
        }
      });
    }

    // Touch controls binding
    const stickZone = byId('touch-stick-zone');
    const stickNub = byId('touch-stick-nub');
    let stickTouchId = null;

    const updateStick = (clientX, clientY) => {
      const rect = stickZone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = rect.width * 0.38;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      stickNub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const normX = dx / maxR;
      const normY = -dy / maxR;
      this.game.input.setTouchControl('steer', normX);
      this.game.input.setTouchControl('pitch', normY);
      this.game.input.setTouchControl('throttle', normY > 0.15 ? normY : 0);
      this.game.input.setTouchControl('brake', normY < -0.2 ? -normY : 0);
    };

    const resetStick = () => {
      stickTouchId = null;
      stickNub.style.transform = 'translate(-50%, -50%)';
      this.game.input.setTouchControl('steer', 0);
      this.game.input.setTouchControl('pitch', 0);
      this.game.input.setTouchControl('throttle', 0);
      this.game.input.setTouchControl('brake', 0);
    };

    stickZone.addEventListener('pointerdown', (e) => {
      if (!gameState.started) {
        this.hideModal();
        this.game.startPlay();
      }
      stickTouchId = e.pointerId;
      stickZone.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    });
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId === stickTouchId) updateStick(e.clientX, e.clientY);
    });
    stickZone.addEventListener('pointerup', resetStick);
    stickZone.addEventListener('pointercancel', resetStick);

    byId('touch-flight').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!gameState.started) {
        this.hideModal();
        this.game.startPlay();
      }
      this.game.input.triggerFlightToggle();
    });

    const bindHold = (id, key, val = true) => {
      const btn = byId(id);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!gameState.started) {
          this.hideModal();
          this.game.startPlay();
        }
        this.game.input.setTouchControl(key, val);
      });
      const release = () => this.game.input.setTouchControl(key, typeof val === 'number' ? 0 : false);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    };

    bindHold('touch-boost', 'boost', true);
    bindHold('touch-drift', 'drift', true);
    bindHold('touch-gas', 'throttle', 1);
    bindHold('touch-brake', 'brake', 1);
  }

  bindEvents() {
    eventBus.on(Events.STUNT_PERFORMED, (entry) => {
      this.showStuntPopup(entry);
      this.refreshAll();
    });
    eventBus.on(Events.SCORE_CHANGED, () => this.refreshAll());
    eventBus.on(Events.MODE_CHANGED, () => this.refreshAll());
    eventBus.on(Events.PLAYER_BUSTED, () => this.showBustedModal());
    eventBus.on(Events.AUDIO_TOGGLE_MUTE, () => this.refreshMuteButton());
    eventBus.on(Events.CHALLENGE_COMPLETED, (data) => {
      this.showStuntPopup({
        label: 'BLITZ COMPLETE!',
        detail: `+$${data.reward} CREDITS`,
      });
    });
    eventBus.on(Events.CHALLENGE_FAILED, () => {
      this.showStuntPopup({
        label: 'BLITZ FAILED',
        detail: 'TIME UP — PRESS [C] TO RETRY',
        failed: true,
      });
    });
    eventBus.on(Events.GAME_RESTART, () => this.clearStuntPopup());
  }

  showStuntPopup(entry) {
    const feed = this.container.querySelector('#hud-stunt-feed');
    if (!feed) return;
    const detail = entry.detail ?? `+${entry.points} (x${entry.combo})`;
    feed.innerHTML = `
      <div class="stunt-popup ${entry.failed ? 'failed' : ''}">
        ${entry.label} <span style="font-size:14px;">${detail}</span>
      </div>
    `;
    clearTimeout(this.stuntTimeout);
    this.stuntTimeout = setTimeout(() => this.clearStuntPopup(), entry.failed ? 2800 : 1800);
  }

  clearStuntPopup() {
    clearTimeout(this.stuntTimeout);
    this.stuntTimeout = null;
    const feed = this.container.querySelector('#hud-stunt-feed');
    if (feed) feed.innerHTML = '';
  }

  refreshMuteButton() {
    const btn = this.container.querySelector('#btn-mute');
    if (btn) {
      btn.textContent = gameState.muted ? 'SOUND: OFF (M)' : 'SOUND: ON (M)';
    }
  }

  refreshAll() {
    const byId = (id) => this.container.querySelector(`#${id}`);
    byId('hud-score').textContent = gameState.score.toLocaleString('en-US');
    byId('hud-best').textContent = gameState.bestScore.toLocaleString('en-US');
    byId('hud-credits').textContent = `$${gameState.credits.toLocaleString('en-US')}`;
    byId('hud-combo').textContent = `COMBO x${gameState.combo}`;
    byId('hud-speed').textContent = String(gameState.speedKmh);
    byId('hud-alt').textContent = `${gameState.altitude}m`;

    const modeBtn = byId('btn-mode-toggle');
    if (gameState.mode === 'FLIGHT') {
      modeBtn.textContent = 'JET FLIGHT MODE [F]';
      modeBtn.classList.add('flight');
    } else {
      modeBtn.textContent = 'DRIVE MODE [F]';
      modeBtn.classList.remove('flight');
    }

    byId('hud-boost-bar').style.width = `${Math.round((gameState.boost / gameState.maxBoost) * 100)}%`;
    byId('hud-hull-bar').style.width = `${Math.round((gameState.integrity / gameState.maxIntegrity) * 100)}%`;

    // Pursuit & Challenge banner
    const pBanner = byId('hud-pursuit-banner');
    const pTitle = byId('hud-pursuit-title');
    const pSub = byId('hud-pursuit-sub');
    const pBar = byId('hud-pursuit-bar');
    const cWrap = byId('hud-capture-wrap');
    const cLabel = byId('hud-capture-label');
    const cPct = byId('hud-capture-pct');
    const cBar = byId('hud-capture-bar');

    const capturePct = Math.min(100, Math.round((gameState.pursuit.captureProgress || 0) * 100));
    if (cPct) cPct.textContent = `${capturePct}%`;
    if (cBar) cBar.style.width = `${capturePct}%`;
    if (cWrap) {
      cWrap.classList.toggle('hidden', !gameState.pursuit.active && capturePct === 0);
    }
    if (pBanner) {
      pBanner.classList.toggle('danger-pulse', gameState.pursuit.active && capturePct >= 45);
    }

    if (gameState.activeChallenge) {
      const ch = gameState.activeChallenge;
      pTitle.textContent = `BLITZ: ${ch.title.toUpperCase()}`;
      pSub.textContent = `${ch.progress}/${ch.targetValue} · ${Math.ceil(ch.timeLeft)}s`;
      pBar.style.width = `${Math.min(100, Math.round((ch.progress / ch.targetValue) * 100))}%`;
      if (cLabel) {
        cLabel.textContent =
          capturePct > 0 ? 'ARREST RISK — SPEED UP OR FLY!' : 'ARREST METER';
      }
    } else if (gameState.pursuit.active) {
      const stars = '★'.repeat(gameState.pursuit.heat);
      pTitle.textContent = `POLICE PURSUIT ${stars}`;
      pSub.textContent = gameState.pursuit.inSight
        ? `ESCAPE: 0% (BREAK LINE OF SIGHT)`
        : `ESCAPING... ${Math.round(gameState.pursuit.escapeProgress * 100)}%`;
      pBar.style.width = `${Math.round(gameState.pursuit.escapeProgress * 100)}%`;
      if (cLabel) {
        cLabel.textContent =
          capturePct > 0
            ? 'ARRESTING — BOOST [SHIFT] OR FLY [F]!'
            : 'ARREST METER (OUTRUNNING)';
      }
    } else {
      pTitle.textContent = 'METRO PATROL: CLEAR';
      pSub.textContent = 'PERFORM STUNTS OR PRESS [V] FOR CHASE';
      pBar.style.width = `${Math.min(100, Math.round((gameState.score / 450) * 100))}%`;
      if (cLabel) {
        cLabel.textContent = 'ARREST METER';
      }
    }

    // Dynamic First-60-Seconds Contextual Guidance
    const promptEl = byId('hud-context-prompt');
    const player = this.game.player;
    if (player && promptEl) {
      if (player.mode === 'DRIVE' && !player.isGrounded) {
        promptEl.textContent = 'AIRBORNE! PRESS [F] NOW TO IGNITE JET WINGS!';
      } else if (player.mode === 'FLIGHT') {
        promptEl.textContent = 'JET FLIGHT — W/S CLIMB/DIVE · [SPACE] AIR BRAKE TO THREAD THE SKY RINGS!';
      } else if (gameState.pursuit.active) {
        promptEl.textContent = 'POLICE ON YOUR TAIL — BOOST [SHIFT] OR LOSE THEM BEHIND BUILDINGS!';
      } else {
        promptEl.textContent = 'ACCELERATE [W] TOWARD THE NEON RAMP · [SPACE] DRIFT · [F] JET FLIGHT';
      }
    }

    this.refreshMuteButton();
  }

  hideModal() {
    this.modalBackdrop.classList.add('hidden');
    this.currentModal = null;
    gameState.paused = false;
  }

  /** Close Garage/Challenges: return to the Busted screen if the run is over, else resume. */
  closeOverlay() {
    if (gameState.busted) {
      this.showBustedModal();
      return;
    }
    this.hideModal();
    if (!gameState.started) this.game.startPlay();
  }

  showMainMenu() {
    this.currentModal = 'menu';
    gameState.paused = false;
    this.modalBackdrop.classList.remove('hidden');
    const currentCar = VEHICLES[gameState.selectedVehicle] || VEHICLES.apex;
    this.modalPanel.innerHTML = `
      <span class="title-badge">3D FLYING CAR CHASE PLAYGROUND</span>
      <h1 class="modal-title">SKYLINE OUTLAWS: JET CHASE</h1>
      <p class="modal-subtitle">
        Tear down Neon Boulevard, launch off mega-ramps, deploy retractable aero-wings to fly between skyscrapers, chain high-altitude stunts, and outrun Metro Police interceptors.
      </p>
      <div class="grid-list" style="margin-bottom: 16px;">
        <div class="item-card selected">
          <div class="item-title">Active Outlaw Machine: ${currentCar.name}</div>
          <div class="item-desc">${currentCar.tagline}</div>
        </div>
        <div class="item-card">
          <div class="item-title">First 60 Seconds</div>
          <div class="item-desc">Hit the ramp ahead → Press <strong>F</strong> mid-air → Fly through the Twin Tower Sky Rings → Evade the Police!</div>
        </div>
      </div>
      <button class="primary-cta" id="modal-play-btn">PLAY NOW (ENTER / W)</button>
      <div style="display:flex; gap:8px; margin-top: 10px;">
        <button class="hud-btn" style="flex:1;" id="modal-open-garage">GARAGE & UPGRADES ($${gameState.credits})</button>
        <button class="hud-btn" style="flex:1;" id="modal-open-challenges">60s BLITZ CHALLENGES</button>
      </div>
    `;

    this.modalPanel.querySelector('#modal-play-btn').addEventListener('click', () => {
      this.hideModal();
      this.game.startPlay();
    });
    this.modalPanel.querySelector('#modal-open-garage').addEventListener('click', () => {
      this.showGarageModal();
    });
    this.modalPanel.querySelector('#modal-open-challenges').addEventListener('click', () => {
      this.showChallengesModal();
    });
  }

  togglePauseModal() {
    if (gameState.busted) {
      if (this.currentModal !== 'busted') this.closeOverlay();
      return;
    }
    if (!gameState.started) return;
    if (!this.modalBackdrop.classList.contains('hidden')) {
      this.hideModal();
      return;
    }
    gameState.paused = true;
    this.currentModal = 'pause';
    this.modalBackdrop.classList.remove('hidden');
    this.modalPanel.innerHTML = `
      <span class="title-badge">GAME PAUSED</span>
      <h2 class="modal-title">OUTLAW TELEMETRY PAUSED</h2>
      <p class="modal-subtitle">Current Score: <strong>${gameState.score.toLocaleString('en-US')}</strong> · Best: <strong>${gameState.bestScore.toLocaleString('en-US')}</strong> · Credits: <strong>$${gameState.credits}</strong></p>
      <button class="primary-cta" id="modal-resume-btn">RESUME DRIVE</button>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="hud-btn" style="flex:1;" id="modal-restart-btn">RESTART RUN (R)</button>
        <button class="hud-btn" style="flex:1;" id="modal-garage-btn">OPEN GARAGE (G)</button>
      </div>
    `;
    this.modalPanel.querySelector('#modal-resume-btn').addEventListener('click', () => this.hideModal());
    this.modalPanel.querySelector('#modal-restart-btn').addEventListener('click', () => {
      this.hideModal();
      this.game.restartRun();
    });
    this.modalPanel.querySelector('#modal-garage-btn').addEventListener('click', () => this.showGarageModal());
  }

  showBustedModal() {
    this.currentModal = 'busted';
    this.modalBackdrop.classList.remove('hidden');
    this.modalPanel.innerHTML = `
      <span class="title-badge">INTERCEPTED BY METRO POLICE</span>
      <h2 class="modal-title">BUSTED!</h2>
      <p class="modal-subtitle">
        Police interceptors boxed in your vehicle. Keep your speed up, <strong>Boost [Shift]</strong> to open a gap, and duck behind buildings to break line-of-sight — they can fly too!
      </p>
      <div class="grid-list" style="margin-bottom:16px;">
        <div class="item-card">
          <div class="item-title">Run Score: ${gameState.score.toLocaleString('en-US')}</div>
          <div class="item-desc">Best Score: ${gameState.bestScore.toLocaleString('en-US')}</div>
        </div>
        <div class="item-card">
          <div class="item-title">Stunts Landed: ${gameState.stuntsLanded}</div>
          <div class="item-desc">Max Combo: x${gameState.maxCombo} · Escapes: ${gameState.escapes}</div>
        </div>
      </div>
      <button class="primary-cta" id="modal-retry-btn">PLAY AGAIN (R / ENTER)</button>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="hud-btn" style="flex:1;" id="modal-busted-garage">UPGRADE CAR ($${gameState.credits})</button>
      </div>
    `;
    this.modalPanel.querySelector('#modal-retry-btn').addEventListener('click', () => {
      this.hideModal();
      this.game.restartRun();
    });
    this.modalPanel.querySelector('#modal-busted-garage').addEventListener('click', () => {
      this.showGarageModal();
    });
  }

  showGarageModal() {
    gameState.paused = true;
    this.currentModal = 'garage';
    this.modalBackdrop.classList.remove('hidden');

    const vehicleCards = Object.values(VEHICLES)
      .map((v) => {
        const unlocked = gameState.unlockedVehicles.includes(v.id);
        const selected = gameState.selectedVehicle === v.id;
        const btnLabel = selected ? 'EQUIPPED' : unlocked ? 'SELECT' : `UNLOCK ($${v.cost})`;
        return `
          <div class="item-card ${selected ? 'selected' : ''}">
            <div>
              <div class="item-title">${v.name}</div>
              <div class="item-desc">${v.tagline}</div>
            </div>
            <button class="hud-btn" data-car="${v.id}">${btnLabel}</button>
          </div>
        `;
      })
      .join('');

    const upgradeCards = Object.values(UPGRADE_CONFIG)
      .map((u) => {
        const lvl = gameState.upgrades[u.id] || 0;
        const cost = gameState.getUpgradeCost(u.id);
        const btnLabel = lvl >= u.maxLevel ? 'MAXED' : `UPGRADE ($${cost})`;
        return `
          <div class="item-card">
            <div>
              <div class="item-title">${u.label} (Lv.${lvl}/${u.maxLevel})</div>
              <div class="item-desc">+${Math.round(u.perLevelBonus * 100)}% per level</div>
            </div>
            <button class="hud-btn" data-upgrade="${u.id}" ${lvl >= u.maxLevel ? 'disabled' : ''}>${btnLabel}</button>
          </div>
        `;
      })
      .join('');

    const paintCards = Object.values(PAINTS)
      .map((p) => {
        const selected = gameState.selectedPaint === p.id;
        return `
          <button class="hud-btn ${selected ? 'accent' : ''}" data-paint="${p.id}">${p.name}</button>
        `;
      })
      .join('');

    this.modalPanel.innerHTML = `
      <span class="title-badge">OUTLAW WORKSHOP · CREDITS: $${gameState.credits}</span>
      <h2 class="modal-title">GARAGE & TUNING</h2>
      <div class="score-label" style="margin-top:6px;">VEHICLES</div>
      <div class="grid-list">${vehicleCards}</div>
      <div class="score-label" style="margin-top:10px;">PERFORMANCE UPGRADES</div>
      <div class="grid-list">${upgradeCards}</div>
      <div class="score-label" style="margin-top:10px;">CHASSIS & THRUSTER LIVERY</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 16px;">${paintCards}</div>
      <button class="primary-cta" id="garage-close-btn">${gameState.busted ? 'BACK' : 'BACK TO STREETS'}</button>
    `;

    this.modalPanel.querySelectorAll('[data-car]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (gameState.selectVehicle(btn.dataset.car)) {
          this.game.player.refreshAppearance();
          this.showGarageModal();
          this.refreshAll();
        }
      });
    });

    this.modalPanel.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (gameState.upgradeStat(btn.dataset.upgrade)) {
          this.showGarageModal();
          this.refreshAll();
        }
      });
    });

    this.modalPanel.querySelectorAll('[data-paint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (gameState.selectPaint(btn.dataset.paint)) {
          this.game.player.refreshAppearance();
          this.showGarageModal();
        }
      });
    });

    this.modalPanel.querySelector('#garage-close-btn').addEventListener('click', () => this.closeOverlay());
  }

  showChallengesModal() {
    gameState.paused = true;
    this.currentModal = 'challenges';
    this.modalBackdrop.classList.remove('hidden');

    const cards = CHALLENGES.map((ch) => {
      const done = gameState.completedChallenges.includes(ch.id);
      return `
        <div class="item-card ${done ? 'selected' : ''}">
          <div>
            <div class="item-title">${ch.title} ${done ? '✓' : ''}</div>
            <div class="item-desc">${ch.description}</div>
            <div class="item-desc" style="margin-top:4px; color:#46e0e8;">Reward: +$${ch.rewardCredits} CR (${ch.duration}s)</div>
          </div>
          <button class="hud-btn accent" data-challenge="${ch.id}">START BLITZ</button>
        </div>
      `;
    }).join('');

    this.modalPanel.innerHTML = `
      <span class="title-badge">OPTIONAL 60-SECOND EVENTS</span>
      <h2 class="modal-title">OUTLAW BLITZ CHALLENGES</h2>
      <p class="modal-subtitle">Test your driving and flight skills in rapid high-reward city challenges, or close to continue free-roam exploration.</p>
      <div class="grid-list" style="margin-bottom:16px;">${cards}</div>
      <button class="primary-cta" id="challenges-close-btn">${gameState.busted ? 'BACK' : 'FREE ROAM PLAYGROUND'}</button>
    `;

    this.modalPanel.querySelectorAll('[data-challenge]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hideModal();
        this.game.startChallenge(btn.dataset.challenge);
      });
    });

    this.modalPanel.querySelector('#challenges-close-btn').addEventListener('click', () => this.closeOverlay());
  }
}
