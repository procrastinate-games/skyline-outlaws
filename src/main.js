import './style.css';
import { Game } from './core/Game.js';
import { gameState } from './core/GameState.js';
import { eventBus, Events } from './core/EventBus.js';

const root = document.getElementById('app');
const game = new Game(root);

// Expose globals required by Game Creator QA & live-iterate skills
window.__GAME__ = game;
window.__GAME_STATE__ = gameState;
window.__EVENT_BUS__ = eventBus;
window.__EVENTS__ = Events;

window.render_game_to_text = () => {
  const p = game.player;
  return JSON.stringify({
    coords: 'origin:center x:east y:up z:south (driving north is -Z)',
    started: gameState.started,
    paused: gameState.paused,
    busted: gameState.busted,
    mode: gameState.mode,
    score: gameState.score,
    bestScore: gameState.bestScore,
    combo: gameState.combo,
    credits: gameState.credits,
    speedKmh: gameState.speedKmh,
    altitude: gameState.altitude,
    boost: Math.round(gameState.boost),
    integrity: Math.round(gameState.integrity),
    player: {
      x: Math.round(p.position.x * 10) / 10,
      y: Math.round(p.position.y * 10) / 10,
      z: Math.round(p.position.z * 10) / 10,
      heading: Math.round(p.heading * 100) / 100,
      isGrounded: p.isGrounded,
      isDrifting: p.isDrifting,
      isBoosting: p.isBoosting,
      wingDeploy: Math.round(p.wingDeploy * 100) / 100,
    },
    pursuit: {
      active: gameState.pursuit.active,
      heat: gameState.pursuit.heat,
      inSight: gameState.pursuit.inSight,
      escapeProgress: Math.round(gameState.pursuit.escapeProgress * 100) / 100,
      units: game.police.units.length,
    },
    activeChallenge: gameState.activeChallenge
      ? {
          id: gameState.activeChallenge.id,
          progress: gameState.activeChallenge.progress,
          targetValue: gameState.activeChallenge.targetValue,
          timeLeft: Math.round(gameState.activeChallenge.timeLeft),
        }
      : null,
  });
};

window.advanceTime = (ms = 100) => {
  const steps = Math.max(1, Math.round(ms / 16.67));
  const dt = ms / 1000 / steps;
  for (let i = 0; i < steps; i++) {
    game.stepSimulation(Math.min(dt, 0.05));
  }
  game.renderer.render(game.scene, game.camera);
  return Promise.resolve();
};
