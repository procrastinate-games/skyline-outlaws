import { STUNTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class StuntSystem {
  constructor(player, city) {
    this.player = player;
    this.city = city;

    this.driftDuration = 0;
    this.airDuration = 0;
    this.flightDuration = 0;
    this.closeCallCooldown = 0;
    this.closeCallConfirmTimer = 0;

    this.onLanded = (data) => this.handleLanding(data);
    eventBus.on(Events.PLAYER_LANDED, this.onLanded);
  }

  reset() {
    this.driftDuration = 0;
    this.airDuration = 0;
    this.flightDuration = 0;
    this.closeCallCooldown = 0;
    this.closeCallConfirmTimer = 0;
    this._awardedCurrentJump = false;
  }

  handleLanding(data = {}) {
    if (!gameState.started || gameState.busted) return;

    if (data.isRooftop) {
      gameState.registerStunt('rooftop_landing', 'ROOFTOP TOUCHDOWN!', STUNTS.POINTS.ROOFTOP_LANDING);
      this.airDuration = 0;
      return;
    }

    if (this.airDuration >= STUNTS.MIN_AIR_TIME) {
      gameState.registerStunt('perfect_landing', 'PERFECT LANDING!', STUNTS.POINTS.PERFECT_LANDING);
    }
    this.airDuration = 0;
  }

  update(dt) {
    if (!gameState.started || gameState.paused || gameState.busted) return;

    gameState.updateComboTimer(dt);

    if (this.closeCallCooldown > 0) {
      this.closeCallCooldown = Math.max(0, this.closeCallCooldown - dt);
    }

    // 1. Drift tracking
    if (this.player.isDrifting && Math.abs(this.player.speed) >= STUNTS.MIN_DRIFT_SPEED) {
      this.driftDuration += dt;
      if (this.driftDuration >= 1.8) {
        gameState.registerStunt('mega_drift', 'MEGA DRIFT!', STUNTS.POINTS.DRIFT * 1.5);
        this.driftDuration = 0.2;
      }
    } else {
      if (this.driftDuration >= STUNTS.MIN_DRIFT_TIME) {
        gameState.registerStunt('nice_drift', 'NICE DRIFT!', STUNTS.POINTS.DRIFT);
      }
      this.driftDuration = 0;
    }

    // 2. Big Air tracking (in Drive Mode)
    if (!this.player.isGrounded && this.player.mode === 'DRIVE') {
      this.airDuration += dt;
      if (this.airDuration >= STUNTS.MIN_AIR_TIME && !this._awardedCurrentJump) {
        this._awardedCurrentJump = true;
        gameState.registerStunt('big_air', 'BIG AIR!', STUNTS.POINTS.BIG_AIR);
      }
    } else {
      this._awardedCurrentJump = false;
      if (this.player.isGrounded) {
        this.airDuration = 0;
      }
    }

    // 3. Skyline Canyon Run: sustained fast flight weaving *between* towers (below their roofs).
    //    Cruising above the skyline earns nothing, and the bonus never extends the combo,
    //    so idling in Flight Mode can't farm points or credits.
    const inSkylineCanyon =
      this.player.closestBuildingDist !== undefined &&
      this.player.closestBuildingDist < STUNTS.CANYON_MAX_BUILDING_DIST;
    if (
      this.player.mode === 'FLIGHT' &&
      this.player.speed > 45 &&
      this.player.position.y > 14 &&
      inSkylineCanyon
    ) {
      this.flightDuration += dt;
      if (this.flightDuration >= STUNTS.MIN_FLIGHT_TIME) {
        gameState.registerStunt('canyon_run', 'SKYLINE CANYON RUN!', STUNTS.POINTS.LONG_FLIGHT, false);
        this.flightDuration = 0;
      }
    } else {
      this.flightDuration = 0;
    }

    // 4. Close Call near buildings at high speed (confirm player actually clears the building without colliding)
    if (this.player.justCollidedTimer > 0) {
      this.closeCallConfirmTimer = 0;
    } else if (this.closeCallConfirmTimer > 0) {
      this.closeCallConfirmTimer -= dt;
      if (this.closeCallConfirmTimer <= 0) {
        this.closeCallCooldown = STUNTS.CLOSE_CALL_COOLDOWN;
        gameState.registerStunt('close_call', 'CLOSE CALL!', STUNTS.POINTS.CLOSE_CALL);
      }
    } else if (
      this.closeCallCooldown === 0 &&
      Math.abs(this.player.speed) > 36 &&
      this.player.closestBuildingDist !== undefined &&
      this.player.closestBuildingDist > 2.3 &&
      this.player.closestBuildingDist < STUNTS.CLOSE_CALL_DIST
    ) {
      this.closeCallConfirmTimer = 0.18;
    }

    // 5. Sky Rings collection
    for (const ring of this.city.skyRings) {
      if (ring.cooldown > 0) continue;
      const dist = this.player.position.distanceTo(ring.position);
      if (dist <= ring.radius) {
        ring.cooldown = 6.0;
        gameState.ringsCollected += 1;
        gameState.boost = Math.min(gameState.maxBoost, gameState.boost + 35);

        if (gameState.activeChallenge && gameState.activeChallenge.targetType === 'rings') {
          gameState.activeChallenge.progress += 1;
        }

        gameState.registerStunt('sky_ring', 'SKY RING!', STUNTS.POINTS.SKY_RING);
        eventBus.emit(Events.RING_COLLECTED, {
          ringId: ring.id,
          position: ring.position.clone(),
        });
      }
    }
  }

  destroy() {
    eventBus.off(Events.PLAYER_LANDED, this.onLanded);
  }
}
