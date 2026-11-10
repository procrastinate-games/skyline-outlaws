import * as THREE from 'three';
import { CHALLENGES, GAME } from './Constants.js';
import { eventBus, Events } from './EventBus.js';
import { gameState } from './GameState.js';
import { CityBuilder } from '../level/CityBuilder.js';
import { PlayerVehicle } from '../gameplay/PlayerVehicle.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { StuntSystem } from '../systems/StuntSystem.js';
import { PoliceSystem } from '../systems/PoliceSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { initAudioBridge } from '../audio/AudioBridge.js';
import { sfx } from '../audio/sfx.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor(rootEl) {
    this.rootEl = rootEl || document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;

    // WebGLRenderer with DPR capped at 2
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GAME.MAX_DPR));
    this.rootEl.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      GAME.FOV_BASE,
      window.innerWidth / window.innerHeight,
      GAME.NEAR,
      GAME.FAR
    );

    // World & Gameplay Entities
    this.city = new CityBuilder(this.scene);
    this.player = new PlayerVehicle(this.scene, this.city);
    this.input = new InputSystem();
    this.cameraSystem = new CameraSystem(this.camera, this.player, this.city);
    this.stunts = new StuntSystem(this.player, this.city);
    this.police = new PoliceSystem(this.scene, this.player, this.city);
    this.particles = new ParticleSystem(this.scene, this.player);

    initAudioBridge();
    this.cameraSystem.reset();

    eventBus.on(Events.PLAYER_COLLISION, ({ impactSpeed }) => {
      this.cameraSystem.triggerShake(Math.min(0.9, (impactSpeed || 30) * 0.015));
    });

    this.hud = new HUD(this.rootEl, this);

    window.addEventListener('resize', () => this.onResize());

    this.renderer.setAnimationLoop(() => this.animate());
  }

  startPlay() {
    if (!gameState.started) {
      gameState.started = true;
      gameState.paused = false;
      gameState.busted = false;
      eventBus.emit(Events.AUDIO_INIT);
      eventBus.emit(Events.GAME_START, { vehicle: gameState.selectedVehicle });
    }
  }

  restartRun() {
    gameState.reset();
    gameState.started = true;
    this.player.reset();
    this.stunts.reset();
    this.police.reset();
    this.cameraSystem.reset();
    this.hud.refreshAll();
    eventBus.emit(Events.GAME_RESTART, {});
  }

  startChallenge(challengeId) {
    const template = CHALLENGES.find((c) => c.id === challengeId);
    if (!template) return;

    this.restartRun();
    gameState.activeChallenge = {
      ...template,
      progress: 0,
      timeLeft: template.duration,
    };

    if (template.forceHeat) {
      this.police.startPursuit(template.forceHeat);
    }

    eventBus.emit(Events.CHALLENGE_STARTED, { id: challengeId });
    this.hud.refreshAll();
  }

  updateChallenge(dt) {
    const ch = gameState.activeChallenge;
    if (!ch) return;

    if (ch.progress >= ch.targetValue) {
      gameState.credits += ch.rewardCredits;
      if (!gameState.completedChallenges.includes(ch.id)) {
        gameState.completedChallenges.push(ch.id);
      }
      gameState.save();
      gameState.activeChallenge = null;
      eventBus.emit(Events.CHALLENGE_COMPLETED, {
        id: ch.id,
        reward: ch.rewardCredits,
      });
      return;
    }

    ch.timeLeft -= dt;
    if (ch.timeLeft <= 0) {
      gameState.activeChallenge = null;
      eventBus.emit(Events.CHALLENGE_FAILED, { id: ch.id });
    }
  }

  stepSimulation(dt) {
    this.elapsedTime += dt;
    this.city.update(dt, this.elapsedTime);

    if (gameState.started && !gameState.paused && !gameState.busted) {
      const snap = this.input.getSnapshot(this.player.mode);
      this.player.update(dt, snap);
      this.stunts.update(dt);
      this.police.update(dt);
      this.particles.update(dt);
      this.updateChallenge(dt);
    }

    this.cameraSystem.update(dt);
    sfx.updateContinuous(dt, this.player, gameState);
    this.hud.refreshAll();
  }

  animate() {
    const dt = Math.min(this.clock.getDelta(), GAME.MAX_DELTA);
    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
