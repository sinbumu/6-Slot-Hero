import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_LABELS } from '../constants';
import { BOSS_DEFS, type BossDef, type BossPatternDef } from '../data/bosses';
import { ENEMY_DEFS, type EnemyDef } from '../data/enemies';
import { generateRewardOptions, getRarityLabel } from '../data/equipment';
import { getSaveData, updateSaveData } from '../storage';
import { playSound } from '../systems/SoundSystem';
import type { EquipmentSlot, RolledEquipment, RunResult, SkillKind } from '../types';

interface GameSceneData {
  stageId?: number;
}

interface EnemyState {
  id: string;
  def: EnemyDef;
  sprite: Phaser.GameObjects.Image;
  hp: number;
  radius: number;
  contactCooldownMs: number;
}

interface ChestState {
  id: string;
  sprite: Phaser.GameObjects.Image;
  radius: number;
}

interface BossState {
  def: BossDef;
  sprite: Phaser.GameObjects.Image;
  hp: number;
  radius: number;
  contactCooldownMs: number;
  patternCooldowns: Partial<Record<BossPatternDef['type'], number>>;
  chargeVelocity: Phaser.Math.Vector2;
  chargeMs: number;
}

interface HazardState {
  id: string;
  shape: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  radius: number;
  damage: number;
  durationMs: number;
  tickMs: number;
}

interface BossProjectileState {
  id: string;
  sprite: Phaser.GameObjects.Image;
  velocity: Phaser.Math.Vector2;
  damage: number;
  radius: number;
  lifeMs: number;
}

interface MainAttackStats {
  minDamage: number;
  maxDamage: number;
  cooldownMs: number;
  range: number;
  damageMultiplier: number;
  radius: number;
  chainCount: number;
  pierceCount: number;
  projectileSpeed: number;
  skillKind: SkillKind;
}

type CombatTarget =
  | { kind: 'enemy'; enemy: EnemyState }
  | { kind: 'boss'; boss: BossState };

type RewardPhase = 'none' | 'normalReward' | 'focusSlotSelect' | 'focusReward' | 'bossReward' | 'infoPopup' | 'tutorial';

const EQUIPMENT_SLOTS = Object.keys(SLOT_LABELS) as EquipmentSlot[];
const PLAY_AREA_TOP = 76;
const PLAY_AREA_BOTTOM = 474;
const PLAYER_RADIUS = 10;
const BASE_PLAYER_MAX_HP = 100;
const PLAYER_MOVE_SPEED = 130;
const BARE_FIST_COOLDOWN_MS = 420;
const BARE_FIST_RANGE = 68;
const MAX_ENEMIES = 80;
const CHEST_DROP_CHANCE = 0.18;
const BOSS_GAUGE_TIME_PER_SEC = 1.25;
const BOSS_GAUGE_PER_KILL = 2.2;
const TAP_MAX_DISTANCE = 8;
const TAP_MAX_MS = 200;

export class GameScene extends Phaser.Scene {
  private stageId = 1;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private player?: Phaser.GameObjects.Image;
  private hpText?: Phaser.GameObjects.Text;
  private bossText?: Phaser.GameObjects.Text;
  private killsText?: Phaser.GameObjects.Text;
  private timeText?: Phaser.GameObjects.Text;
  private equipmentText?: Phaser.GameObjects.Text;
  private chestText?: Phaser.GameObjects.Text;
  private playerHp = BASE_PLAYER_MAX_HP;
  private playerMaxHp = BASE_PLAYER_MAX_HP;
  private enemies: EnemyState[] = [];
  private chests: ChestState[] = [];
  private boss?: BossState;
  private hazards: HazardState[] = [];
  private bossProjectiles: BossProjectileState[] = [];
  private spawnTimerMs = 0;
  private attackTimerMs = 0;
  private elapsedMs = 0;
  private bossGauge = 0;
  private kills = 0;
  private equippedCount = 0;
  private chestCountInRun = 0;
  private pointerMoveVector = new Phaser.Math.Vector2(0, 0);
  private isPointerMoving = false;
  private isRunOver = false;
  private rewardPhase: RewardPhase = 'none';
  private modal?: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.stageId = data.stageId ?? 1;
    this.enemies = [];
    this.chests = [];
    this.boss = undefined;
    this.hazards = [];
    this.bossProjectiles = [];
    this.spawnTimerMs = 0;
    this.attackTimerMs = 0;
    this.elapsedMs = 0;
    this.bossGauge = 0;
    this.kills = 0;
    this.equippedCount = Object.keys(getSaveData().equipped).length;
    this.chestCountInRun = 0;
    this.playerMaxHp = this.calculatePlayerMaxHp();
    this.playerHp = this.playerMaxHp;
    this.pointerMoveVector.set(0, 0);
    this.isPointerMoving = false;
    this.isRunOver = false;
    this.rewardPhase = 'none';
    this.modal = undefined;
  }

  create(): void {
    updateSaveData((current) => ({
      ...current,
      stats: {
        ...current.stats,
        totalRuns: current.stats.totalRuns + 1,
        bestStage: Math.max(current.stats.bestStage, this.stageId),
      },
    }));

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1014).setOrigin(0);
    this.drawGrid();
    this.createHud();
    this.player = this.add.image(GAME_WIDTH / 2, 310, 'player_circle').setDepth(5);
    this.setupInput();
    this.createEquipmentPanel();
    this.createButton(GAME_WIDTH / 2, 614, 'End Test Run', () => {
      this.finishRun(false);
    });
    if (this.stageId === 1 && !getSaveData().tutorial.stage1Seen) {
      this.showTutorialModal();
    }
  }

  update(_time: number, delta: number): void {
    if (this.isRunOver || !this.player || this.isGameplayPaused()) {
      return;
    }

    this.elapsedMs += delta;
    this.updatePlayer(delta);
    this.updateSpawns(delta);
    this.updateEnemies(delta);
    this.updateBareFist(delta);
    this.updateBossGauge(delta);
    this.updateBoss(delta);
    this.updateBossProjectiles(delta);
    this.updateHazards(delta);
    this.updateChestPickup();
    this.updateHud();

    if (this.playerHp <= 0) {
      this.finishRun(false);
    }
  }

  private createHud(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 76, 0x17131e).setOrigin(0);
    this.add.text(16, 14, `Stage ${this.stageId}`, {
      fontSize: '17px',
      color: '#f8ddb0',
    });
    this.hpText = this.add.text(16, 42, '', {
      fontSize: '13px',
      color: '#d8f4df',
    });
    this.bossText = this.add.text(136, 42, 'Boss Gauge 0%', {
      fontSize: '13px',
      color: '#d6c1ff',
    });
    this.chestText = this.add.text(260, 42, '', {
      fontSize: '13px',
      color: '#f6d188',
    });
    this.killsText = this.add.text(236, 14, '', {
      fontSize: '13px',
      color: '#ffffff',
    });
    this.timeText = this.add.text(290, 14, '', {
      fontSize: '13px',
      color: '#ffffff',
    });
    this.updateHud();
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x202735, 0.65);
    for (let x = 0; x <= GAME_WIDTH; x += 24) {
      graphics.lineBetween(x, PLAY_AREA_TOP, x, PLAY_AREA_BOTTOM);
    }
    for (let y = PLAY_AREA_TOP; y <= PLAY_AREA_BOTTOM; y += 24) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createEquipmentPanel(): void {
    this.add.rectangle(0, 476, GAME_WIDTH, 96, 0x12101a).setOrigin(0);
    this.add.rectangle(GAME_WIDTH / 2, 476, GAME_WIDTH, 2, 0xf0c85a, 0.35);
    this.add.text(GAME_WIDTH / 2, 474, 'Drag lower area to move · Tap slot for info', {
      fontSize: '10px',
      color: '#a99d8c',
    }).setOrigin(0.5, 1);
    this.equipmentText = this.add.text(GAME_WIDTH / 2, 486, this.getEquippedSummary(), {
      fontSize: '11px',
      color: '#d7cdbd',
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5, 0);

    EQUIPMENT_SLOTS.forEach((slot, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 64 + col * 116;
      const y = 542 + row * 24;
      const button = this.add.rectangle(x, y, 102, 20, 0x211b2d)
        .setStrokeStyle(1, 0x7a6750)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y, SLOT_LABELS[slot], {
        fontSize: '10px',
        color: '#f0d8aa',
      }).setOrigin(0.5);
      button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (this.isTap(pointer)) {
          this.showEquipmentInfo(slot);
        }
      });
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 154, 28, 0x26314a)
      .setStrokeStyle(2, 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);
    button.on('pointerdown', onClick);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;

    this.input.on('pointerdown', this.handlePointerMove, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', () => {
      this.isPointerMoving = false;
      this.pointerMoveVector.set(0, 0);
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isGameplayPaused() || !pointer.isDown || !this.player || pointer.y < 260) {
      return;
    }

    const dx = pointer.x - this.player.x;
    const dy = pointer.y - this.player.y;
    this.pointerMoveVector.set(dx, dy);
    this.isPointerMoving = this.pointerMoveVector.lengthSq() > 64;
    if (this.isPointerMoving) {
      this.pointerMoveVector.normalize();
    }
  }

  private isTap(pointer: Phaser.Input.Pointer): boolean {
    const distance = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
    const durationMs = pointer.upTime - pointer.downTime;
    return distance <= TAP_MAX_DISTANCE && durationMs <= TAP_MAX_MS;
  }

  private updatePlayer(delta: number): void {
    if (!this.player) {
      return;
    }

    const move = new Phaser.Math.Vector2(0, 0);
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
      move.x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
      move.x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
      move.y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
      move.y += 1;
    }
    if (move.lengthSq() === 0 && this.isPointerMoving) {
      move.copy(this.pointerMoveVector);
    }

    if (move.lengthSq() > 0) {
      move.normalize().scale((PLAYER_MOVE_SPEED * delta) / 1000);
      this.player.setPosition(
        Phaser.Math.Clamp(this.player.x + move.x, PLAYER_RADIUS, GAME_WIDTH - PLAYER_RADIUS),
        Phaser.Math.Clamp(this.player.y + move.y, PLAY_AREA_TOP + PLAYER_RADIUS, PLAY_AREA_BOTTOM - PLAYER_RADIUS),
      );
    }
  }

  private updateSpawns(delta: number): void {
    if (this.boss) {
      return;
    }

    this.spawnTimerMs -= delta;
    if (this.spawnTimerMs > 0 || this.enemies.length >= MAX_ENEMIES) {
      return;
    }

    this.spawnEnemy();
    this.spawnTimerMs = Math.max(280, 950 - this.stageId * 90 - this.elapsedMs / 500);
  }

  private spawnEnemy(): void {
    const def = Phaser.Utils.Array.GetRandom(ENEMY_DEFS);
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? -16 : side === 1 ? GAME_WIDTH + 16 : Phaser.Math.Between(0, GAME_WIDTH);
    const y = side === 2 ? PLAY_AREA_TOP - 16 : side === 3 ? PLAY_AREA_BOTTOM + 16 : Phaser.Math.Between(PLAY_AREA_TOP, PLAY_AREA_BOTTOM);
    const sprite = this.add.image(x, y, def.textureKey).setDepth(3);
    const stageHpMultiplier = 1 + (this.stageId - 1) * 0.55;
    this.enemies.push({
      id: `${def.id}_${this.elapsedMs}_${Math.random()}`,
      def,
      sprite,
      hp: Math.round(def.hp * stageHpMultiplier),
      radius: sprite.width / 2,
      contactCooldownMs: 0,
    });
  }

  private updateEnemies(delta: number): void {
    if (!this.player) {
      return;
    }

    for (const enemy of this.enemies) {
      const direction = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y);
      if (direction.lengthSq() > 0) {
        direction.normalize().scale((enemy.def.moveSpeed * delta) / 1000);
        enemy.sprite.setPosition(enemy.sprite.x + direction.x, enemy.sprite.y + direction.y);
      }

      enemy.contactCooldownMs = Math.max(0, enemy.contactCooldownMs - delta);
      if (enemy.contactCooldownMs <= 0 && this.isCircleOverlap(enemy.sprite.x, enemy.sprite.y, enemy.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
        const stageDamageBonus = Math.max(0, (this.stageId - 1) * 0.5);
        this.damagePlayer(enemy.def.contactDamage + stageDamageBonus);
        enemy.contactCooldownMs = 700;
      }
    }
  }

  private updateBareFist(delta: number): void {
    this.attackTimerMs -= delta;
    const attackStats = this.getMainAttackStats();
    if (this.attackTimerMs > 0 || !this.player || (this.enemies.length === 0 && !this.boss)) {
      return;
    }

    const didAttack = this.performMainAttack(attackStats);
    if (!didAttack) {
      return;
    }
    this.attackTimerMs = attackStats.cooldownMs;
  }

  private performMainAttack(attackStats: MainAttackStats): boolean {
    if (attackStats.skillKind === 'lightningStrike') {
      return this.performLightningAttack(attackStats);
    }
    if (attackStats.skillKind === 'fireProjectileExplosion') {
      return this.performFireProjectileAttack(attackStats);
    }
    if (attackStats.skillKind === 'returningPoisonProjectile') {
      return this.performPoisonChakramAttack(attackStats);
    }
    return this.performMeleeAttack(attackStats);
  }

  private performMeleeAttack(attackStats: MainAttackStats): boolean {
    const targets = this.findCombatTargetsInRadius(this.player!.x, this.player!.y, attackStats.range)
      .slice(0, attackStats.skillKind === 'slashCone' ? 3 : 1);
    if (targets.length === 0) {
      return false;
    }

    for (const target of targets) {
      const { x, y } = this.getTargetPosition(target);
      this.damageCombatTarget(target, this.rollMainDamage(attackStats));
      this.showHitEffect(x, y);
    }
    return true;
  }

  private performLightningAttack(attackStats: MainAttackStats): boolean {
    const firstTarget = this.findNearestCombatTarget(attackStats.range + 48);
    if (!firstTarget) {
      return false;
    }

    const chainedTargets: CombatTarget[] = [firstTarget];
    const chainCount = Math.max(1, Math.floor(attackStats.chainCount));
    for (const candidate of this.findCombatTargetsInRadius(this.getTargetPosition(firstTarget).x, this.getTargetPosition(firstTarget).y, 96)) {
      if (chainedTargets.length > chainCount) {
        break;
      }
      if (!this.isSameTarget(candidate, firstTarget)) {
        chainedTargets.push(candidate);
      }
    }

    let from = { x: this.player!.x, y: this.player!.y };
    chainedTargets.forEach((target, index) => {
      const to = this.getTargetPosition(target);
      this.drawLightningLine(from.x, from.y, to.x, to.y);
      this.damageCombatTarget(target, this.rollMainDamage(attackStats) * (index === 0 ? 1 : 0.72));
      from = to;
    });
    return true;
  }

  private performFireProjectileAttack(attackStats: MainAttackStats): boolean {
    const target = this.findNearestCombatTarget(attackStats.range + 140);
    if (!target || !this.player) {
      return false;
    }

    const destination = this.getTargetPosition(target);
    const projectile = this.add.image(this.player.x, this.player.y, 'projectile_orb')
      .setTint(0xff7a3d)
      .setDepth(7);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, destination.x, destination.y);
    const duration = Phaser.Math.Clamp((distance / attackStats.projectileSpeed) * 1000, 120, 650);
    this.tweens.add({
      targets: projectile,
      x: destination.x,
      y: destination.y,
      duration,
      onComplete: () => {
        projectile.destroy();
        this.explodeAt(destination.x, destination.y, attackStats.radius, this.rollMainDamage(attackStats));
      },
    });
    return true;
  }

  private performPoisonChakramAttack(attackStats: MainAttackStats): boolean {
    const targets = this.findCombatTargetsInRadius(this.player!.x, this.player!.y, attackStats.range + 120)
      .slice(0, Math.max(2, Math.floor(attackStats.pierceCount)));
    if (targets.length === 0) {
      return false;
    }

    const chakram = this.add.image(this.player!.x, this.player!.y, 'projectile_orb')
      .setTint(0x60d96f)
      .setDepth(7);
    const finalTarget = this.getTargetPosition(targets[targets.length - 1]);
    this.tweens.add({
      targets: chakram,
      x: finalTarget.x,
      y: finalTarget.y,
      angle: 360,
      duration: 220,
      yoyo: true,
      onComplete: () => chakram.destroy(),
    });

    for (const target of targets) {
      const { x, y } = this.getTargetPosition(target);
      this.damageCombatTarget(target, this.rollMainDamage(attackStats) * 0.82);
      this.addPoisonTickText(x, y);
    }
    return true;
  }

  private updateBossGauge(delta: number): void {
    if (this.boss || this.bossGauge >= 100) {
      return;
    }

    this.bossGauge = Math.min(100, this.bossGauge + (BOSS_GAUGE_TIME_PER_SEC * delta) / 1000);
    if (this.elapsedMs > 90000) {
      this.bossGauge = Math.min(100, this.bossGauge + (4 * delta) / 1000);
    }
    if (this.bossGauge >= 100) {
      this.spawnBoss();
    }
  }

  private spawnBoss(): void {
    const def = BOSS_DEFS.find((candidate) => candidate.stageId === this.stageId) ?? BOSS_DEFS[0];
    playSound('boss');
    const sprite = this.add.image(GAME_WIDTH / 2, PLAY_AREA_TOP + 64, 'boss_large')
      .setTint(def.colorHex)
      .setDepth(4);
    this.boss = {
      def,
      sprite,
      hp: def.hp,
      radius: 28,
      contactCooldownMs: 0,
      patternCooldowns: {},
      chargeVelocity: new Phaser.Math.Vector2(0, 0),
      chargeMs: 0,
    };
    const announce = this.add.text(GAME_WIDTH / 2, 120, `${def.nameKo} 등장!`, {
      fontSize: '20px',
      color: '#ffdb9a',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20).setAlpha(1);
    this.tweens.add({
      targets: announce,
      y: 96,
      alpha: 0,
      duration: 1400,
      onComplete: () => announce.destroy(),
    });
  }

  private updateBoss(delta: number): void {
    if (!this.boss || !this.player) {
      return;
    }

    const boss = this.boss;
    if (boss.chargeMs > 0) {
      boss.chargeMs -= delta;
      boss.sprite.setPosition(
        Phaser.Math.Clamp(boss.sprite.x + (boss.chargeVelocity.x * delta) / 1000, boss.radius, GAME_WIDTH - boss.radius),
        Phaser.Math.Clamp(boss.sprite.y + (boss.chargeVelocity.y * delta) / 1000, PLAY_AREA_TOP + boss.radius, PLAY_AREA_BOTTOM - boss.radius),
      );
    } else {
      const direction = new Phaser.Math.Vector2(this.player.x - boss.sprite.x, this.player.y - boss.sprite.y);
      if (direction.lengthSq() > 0) {
        direction.normalize().scale((boss.def.moveSpeed * delta) / 1000);
        boss.sprite.setPosition(boss.sprite.x + direction.x, boss.sprite.y + direction.y);
      }
    }

    boss.contactCooldownMs = Math.max(0, boss.contactCooldownMs - delta);
    if (boss.contactCooldownMs <= 0 && this.isCircleOverlap(boss.sprite.x, boss.sprite.y, boss.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
      this.damagePlayer(boss.def.contactDamage);
      boss.contactCooldownMs = 700;
    }

    for (const pattern of boss.def.patterns) {
      const currentCooldown = boss.patternCooldowns[pattern.type] ?? pattern.cooldownMs * 0.45;
      boss.patternCooldowns[pattern.type] = currentCooldown - delta;
      if ((boss.patternCooldowns[pattern.type] ?? 0) <= 0) {
        this.triggerBossPattern(pattern);
        boss.patternCooldowns[pattern.type] = pattern.cooldownMs;
      }
    }
  }

  private triggerBossPattern(pattern: BossPatternDef): void {
    if (!this.boss || !this.player) {
      return;
    }

    if (pattern.type === 'charge') {
      this.telegraphCharge(pattern);
      return;
    }
    if (pattern.type === 'aoePulse') {
      this.telegraphAoe(pattern, this.boss.sprite.x, this.boss.sprite.y);
      return;
    }
    if (pattern.type === 'radialShot') {
      this.telegraphRadialShot(pattern);
      return;
    }
    if (pattern.type === 'hazardZone') {
      this.telegraphHazardZone(pattern);
      return;
    }
    this.telegraphLineWave(pattern);
  }

  private telegraphCharge(pattern: BossPatternDef): void {
    if (!this.boss || !this.player) {
      return;
    }

    const direction = new Phaser.Math.Vector2(this.player.x - this.boss.sprite.x, this.player.y - this.boss.sprite.y).normalize();
    const warning = this.add.rectangle(this.boss.sprite.x, this.boss.sprite.y, 150, 8, 0xff3d3d, 0.55)
      .setRotation(direction.angle())
      .setDepth(8);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      if (!this.boss) {
        return;
      }
      this.boss.chargeVelocity = direction.scale(280);
      this.boss.chargeMs = 420;
    });
  }

  private telegraphAoe(pattern: BossPatternDef, x: number, y: number): void {
    const radius = pattern.radiusPx ?? 62;
    const warning = this.add.circle(x, y, radius, 0xff3d3d, 0.18)
      .setStrokeStyle(2, 0xff8a3d, 0.9)
      .setDepth(7);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      this.addHazard(x, y, radius, pattern.damage, 260);
    });
  }

  private telegraphRadialShot(pattern: BossPatternDef): void {
    if (!this.boss) {
      return;
    }

    const warning = this.add.circle(this.boss.sprite.x, this.boss.sprite.y, 36, 0x7ac7ff, 0.2)
      .setStrokeStyle(2, 0x7ac7ff)
      .setDepth(7);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      if (!this.boss) {
        return;
      }
      const count = pattern.projectileCount ?? 8;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        this.spawnBossProjectile(this.boss.sprite.x, this.boss.sprite.y, angle, pattern.projectileSpeed ?? 145, pattern.damage);
      }
    });
  }

  private telegraphHazardZone(pattern: BossPatternDef): void {
    if (!this.player) {
      return;
    }
    this.telegraphAoe(pattern, this.player.x, this.player.y);
  }

  private telegraphLineWave(pattern: BossPatternDef): void {
    if (!this.boss || !this.player) {
      return;
    }

    const direction = new Phaser.Math.Vector2(this.player.x - this.boss.sprite.x, this.player.y - this.boss.sprite.y).normalize();
    const warning = this.add.rectangle(this.boss.sprite.x, this.boss.sprite.y, 260, 22, 0xaa55ff, 0.35)
      .setRotation(direction.angle())
      .setDepth(7);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      this.spawnBossProjectile(this.boss?.sprite.x ?? GAME_WIDTH / 2, this.boss?.sprite.y ?? PLAY_AREA_TOP, direction.angle(), 260, pattern.damage, 18, 780);
    });
  }

  private spawnBossProjectile(x: number, y: number, angle: number, speed: number, damage: number, radius = 6, lifeMs = 2800): void {
    const sprite = this.add.image(x, y, 'projectile_orb').setDepth(6).setTint(0xff7a3d);
    this.bossProjectiles.push({
      id: `boss_projectile_${this.elapsedMs}_${Math.random()}`,
      sprite,
      velocity: new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(speed),
      damage,
      radius,
      lifeMs,
    });
  }

  private updateBossProjectiles(delta: number): void {
    if (!this.player) {
      return;
    }

    for (const projectile of [...this.bossProjectiles]) {
      projectile.lifeMs -= delta;
      projectile.sprite.setPosition(
        projectile.sprite.x + (projectile.velocity.x * delta) / 1000,
        projectile.sprite.y + (projectile.velocity.y * delta) / 1000,
      );

      const outOfBounds = projectile.sprite.x < -24 || projectile.sprite.x > GAME_WIDTH + 24 || projectile.sprite.y < PLAY_AREA_TOP - 24 || projectile.sprite.y > PLAY_AREA_BOTTOM + 24;
      if (projectile.lifeMs <= 0 || outOfBounds) {
        this.removeBossProjectile(projectile);
        continue;
      }

      if (this.isCircleOverlap(projectile.sprite.x, projectile.sprite.y, projectile.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
        this.damagePlayer(projectile.damage);
        this.removeBossProjectile(projectile);
      }
    }
  }

  private removeBossProjectile(projectile: BossProjectileState): void {
    projectile.sprite.destroy();
    this.bossProjectiles = this.bossProjectiles.filter((candidate) => candidate.id !== projectile.id);
  }

  private addHazard(x: number, y: number, radius: number, damage: number, durationMs: number): void {
    const shape = this.add.circle(x, y, radius, 0xff653d, 0.24)
      .setStrokeStyle(2, 0xffb347, 0.9)
      .setDepth(6);
    this.hazards.push({
      id: `hazard_${this.elapsedMs}_${Math.random()}`,
      shape,
      x,
      y,
      radius,
      damage,
      durationMs,
      tickMs: 0,
    });
  }

  private updateHazards(delta: number): void {
    if (!this.player) {
      return;
    }

    for (const hazard of [...this.hazards]) {
      hazard.durationMs -= delta;
      hazard.tickMs -= delta;
      if (hazard.tickMs <= 0 && this.isCircleOverlap(hazard.x, hazard.y, hazard.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
        this.damagePlayer(hazard.damage);
        hazard.tickMs = 550;
      }
      if (hazard.durationMs <= 0) {
        hazard.shape.destroy();
        this.hazards = this.hazards.filter((candidate) => candidate.id !== hazard.id);
      }
    }
  }

  private findNearestCombatTarget(maxRange: number): CombatTarget | undefined {
    let nearest: CombatTarget | undefined;
    let nearestDistanceSq = maxRange * maxRange;
    for (const target of this.getCombatTargets()) {
      const position = this.getTargetPosition(target);
      const distanceSq = Phaser.Math.Distance.Squared(this.player!.x, this.player!.y, position.x, position.y);
      if (distanceSq <= nearestDistanceSq) {
        nearest = target;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest;
  }

  private findCombatTargetsInRadius(x: number, y: number, radius: number): CombatTarget[] {
    return this.getCombatTargets()
      .filter((target) => {
        const position = this.getTargetPosition(target);
        const targetRadius = target.kind === 'boss' ? target.boss.radius : target.enemy.radius;
        return this.isCircleOverlap(x, y, radius, position.x, position.y, targetRadius);
      })
      .sort((a, b) => {
        const aPosition = this.getTargetPosition(a);
        const bPosition = this.getTargetPosition(b);
        return Phaser.Math.Distance.Squared(x, y, aPosition.x, aPosition.y) - Phaser.Math.Distance.Squared(x, y, bPosition.x, bPosition.y);
      });
  }

  private getCombatTargets(): CombatTarget[] {
    const targets: CombatTarget[] = this.enemies.map((enemy) => ({ kind: 'enemy', enemy }));
    if (this.boss) {
      targets.push({ kind: 'boss', boss: this.boss });
    }
    return targets;
  }

  private getTargetPosition(target: CombatTarget): { x: number; y: number } {
    const sprite = target.kind === 'boss' ? target.boss.sprite : target.enemy.sprite;
    return { x: sprite.x, y: sprite.y };
  }

  private damageCombatTarget(target: CombatTarget, damage: number): void {
    if (target.kind === 'boss') {
      this.damageBoss(damage);
      return;
    }
    this.damageEnemy(target.enemy, damage);
  }

  private isSameTarget(a: CombatTarget, b: CombatTarget): boolean {
    if (a.kind !== b.kind) {
      return false;
    }
    return a.kind === 'boss' ? a.boss.def.id === (b as { kind: 'boss'; boss: BossState }).boss.def.id : a.enemy.id === (b as { kind: 'enemy'; enemy: EnemyState }).enemy.id;
  }

  private rollMainDamage(attackStats: MainAttackStats): number {
    let damage = Phaser.Math.FloatBetween(attackStats.minDamage, attackStats.maxDamage) * attackStats.damageMultiplier;
    const critChance = Phaser.Math.Clamp(this.getEquippedOptionTotal('critChance'), 0, 0.55);
    if (Math.random() < critChance) {
      damage *= this.getMultiplierProduct('critDamageMultiplier');
    }
    return damage;
  }

  private explodeAt(x: number, y: number, radius: number, damage: number): void {
    const explosion = this.add.circle(x, y, radius, 0xff7a3d, 0.28)
      .setStrokeStyle(2, 0xffd08a)
      .setDepth(8);
    for (const target of this.findCombatTargetsInRadius(x, y, radius)) {
      this.damageCombatTarget(target, damage);
    }
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 220,
      onComplete: () => explosion.destroy(),
    });
  }

  private drawLightningLine(fromX: number, fromY: number, toX: number, toY: number): void {
    const line = this.add.line(0, 0, fromX, fromY, toX, toY, 0x82d8ff, 0.95)
      .setOrigin(0)
      .setLineWidth(3)
      .setDepth(8);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 130,
      onComplete: () => line.destroy(),
    });
  }

  private addPoisonTickText(x: number, y: number): void {
    const text = this.add.text(x, y - 18, 'POISON', {
      fontSize: '9px',
      color: '#74ff83',
    }).setOrigin(0.5).setDepth(9);
    this.tweens.add({
      targets: text,
      y: text.y - 10,
      alpha: 0,
      duration: 360,
      onComplete: () => text.destroy(),
    });
  }

  private damageEnemy(enemy: EnemyState, damage: number): void {
    enemy.hp -= damage;
    const lifesteal = this.getEquippedOptionTotal('lifestealPercent');
    if (lifesteal > 0) {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + damage * lifesteal);
    }

    if (enemy.hp > 0) {
      return;
    }

    const { x, y } = enemy.sprite;
    enemy.sprite.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.kills += 1;
    this.bossGauge = Math.min(100, this.bossGauge + BOSS_GAUGE_PER_KILL);
    updateSaveData((save) => ({
      ...save,
      stats: {
        ...save.stats,
        totalKills: save.stats.totalKills + 1,
      },
    }));

    if (this.kills % 5 === 0 || Math.random() < CHEST_DROP_CHANCE) {
      this.dropChest(x, y);
    }
  }

  private damageBoss(damage: number): void {
    if (!this.boss) {
      return;
    }

    const finalDamage = damage * this.getMultiplierProduct('bossDamageMultiplier');
    this.boss.hp -= finalDamage;
    const lifesteal = this.getEquippedOptionTotal('lifestealPercent');
    if (lifesteal > 0) {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + finalDamage * lifesteal);
    }
    if (this.boss.hp <= 0) {
      this.defeatBoss();
    }
  }

  private damagePlayer(rawDamage: number): void {
    const damageReduction = Phaser.Math.Clamp(this.getEquippedOptionTotal('damageReductionPercent'), 0, 0.6);
    this.playerHp = Math.max(0, this.playerHp - rawDamage * (1 - damageReduction));
    playSound('hit');
    this.flashPlayer();
  }

  private defeatBoss(): void {
    if (!this.boss) {
      return;
    }

    this.boss.sprite.destroy();
    this.boss = undefined;
    this.bossGauge = 100;
    for (const projectile of this.bossProjectiles) {
      projectile.sprite.destroy();
    }
    this.bossProjectiles = [];
    for (const hazard of this.hazards) {
      hazard.shape.destroy();
    }
    this.hazards = [];
    playSound('clear');
    this.openRewardModal(generateRewardOptions({ stageId: this.stageId, context: 'bossReward' }), 'bossReward', 'Boss Reward');
  }

  private dropChest(x: number, y: number): void {
    const sprite = this.add.image(
      Phaser.Math.Clamp(x, 14, GAME_WIDTH - 14),
      Phaser.Math.Clamp(y, PLAY_AREA_TOP + 14, PLAY_AREA_BOTTOM - 14),
      'chest_box',
    ).setDepth(2);
    this.chests.push({
      id: `chest_${this.elapsedMs}_${Math.random()}`,
      sprite,
      radius: 16,
    });
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 4,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });
  }

  private updateChestPickup(): void {
    if (!this.player) {
      return;
    }

    const chest = this.chests.find((candidate) => (
      this.isCircleOverlap(candidate.sprite.x, candidate.sprite.y, candidate.radius, this.player!.x, this.player!.y, PLAYER_RADIUS)
    ));
    if (!chest) {
      return;
    }

    chest.sprite.destroy();
    this.chests = this.chests.filter((candidate) => candidate.id !== chest.id);
    this.chestCountInRun += 1;
    playSound('chest');
    if (this.chestCountInRun % 3 === 0) {
      this.openFocusSlotModal();
      return;
    }
    this.openRewardModal(generateRewardOptions({ stageId: this.stageId, context: 'normalChest' }), 'normalReward');
  }

  private openFocusSlotModal(): void {
    this.rewardPhase = 'focusSlotSelect';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 318, 372, 0x16111e)
      .setStrokeStyle(2, 0xffb347);
    const title = this.add.text(GAME_WIDTH / 2, 146, 'Focused Loot!', {
      fontSize: '25px',
      color: '#ffdb9a',
    }).setOrigin(0.5);
    const subtitle = this.add.text(GAME_WIDTH / 2, 180, 'Choose a slot to farm', {
      fontSize: '14px',
      color: '#d7cdbd',
    }).setOrigin(0.5);
    container.add([backdrop, panel, title, subtitle]);

    EQUIPMENT_SLOTS.forEach((slot, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 112 + col * 136;
      const y = 236 + row * 58;
      const button = this.add.rectangle(x, y, 116, 38, 0x241b2d)
        .setStrokeStyle(2, 0xf0c85a)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, SLOT_LABELS[slot], {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5);
      button.on('pointerdown', () => {
        this.openRewardModal(
          generateRewardOptions({ stageId: this.stageId, context: 'focusedChest', focusSlot: slot }),
          'focusReward',
          `${SLOT_LABELS[slot]} Focus`,
        );
      });
      container.add([button, label]);
    });

    const skip = this.add.rectangle(GAME_WIDTH / 2, 432, 140, 32, 0x302631)
      .setStrokeStyle(1, 0x9a8a78)
      .setInteractive({ useHandCursor: true });
    const skipText = this.add.text(GAME_WIDTH / 2, 432, '선택 안 함', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    skip.on('pointerdown', () => this.closeRewardModal());
    container.add([skip, skipText]);
    this.modal = container;
  }

  private openRewardModal(options: RolledEquipment[], phase: 'normalReward' | 'focusReward' | 'bossReward', titleText = 'Reward Select'): void {
    this.rewardPhase = phase;
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 328, 482, 0x16111e)
      .setStrokeStyle(2, 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, 98, titleText, {
      fontSize: '24px',
      color: phase === 'focusReward' ? '#ffdb9a' : '#f8ddb0',
    }).setOrigin(0.5);
    container.add([backdrop, panel, title]);

    options.forEach((item, index) => {
      const y = 160 + index * 92;
      const card = this.add.rectangle(GAME_WIDTH / 2, y, 292, 76, 0x241b2d)
        .setStrokeStyle(2, this.getRarityColor(item.rarity))
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(34, y - 28, `${item.nameKo} [${getRarityLabel(item.rarity)}]`, {
        fontSize: '15px',
        color: '#ffffff',
      });
      const desc = this.add.text(34, y - 5, `${SLOT_LABELS[item.slot]} · ${item.playerDescription}`, {
        fontSize: '11px',
        color: '#d7cdbd',
        wordWrap: { width: 270 },
      });
      const optionsText = this.add.text(34, y + 22, this.formatOptions(item, 2), {
        fontSize: '10px',
        color: '#f0d8aa',
      });
      card.on('pointerdown', () => this.equipReward(item));
      container.add([card, name, desc, optionsText]);
    });

    const skip = this.add.rectangle(GAME_WIDTH / 2, 464, 140, 34, 0x302631)
      .setStrokeStyle(1, 0x9a8a78)
      .setInteractive({ useHandCursor: true });
    const skipText = this.add.text(GAME_WIDTH / 2, 464, '선택 안 함', {
      fontSize: '15px',
      color: '#ffffff',
    }).setOrigin(0.5);
    skip.on('pointerdown', () => this.closeRewardModal());
    container.add([skip, skipText]);
    this.modal = container;
  }

  private equipReward(item: RolledEquipment): void {
    const shouldClearStage = this.rewardPhase === 'bossReward';
    updateSaveData((save) => ({
      ...save,
      equipped: {
        ...save.equipped,
        [item.slot]: item,
      },
    }));
    this.equippedCount = Object.keys(getSaveData().equipped).length;
    this.playerMaxHp = this.calculatePlayerMaxHp();
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + this.getEquippedOptionTotal('maxHpBonus'));
    playSound('equip');
    this.refreshEquipmentPanel();
    if (shouldClearStage) {
      this.completeStage();
      return;
    }
    this.closeRewardModal();
  }

  private closeRewardModal(): void {
    if (this.rewardPhase === 'bossReward') {
      this.completeStage();
      return;
    }
    this.clearModal();
    this.rewardPhase = 'none';
    this.updateHud();
  }

  private completeStage(): void {
    updateSaveData((save) => {
      const clearedStages = save.clearedStages.includes(this.stageId)
        ? save.clearedStages
        : [...save.clearedStages, this.stageId];
      return {
        ...save,
        unlockedStage: Math.max(save.unlockedStage, Math.min(5, this.stageId + 1)),
        clearedStages,
      };
    });
    this.clearModal();
    this.rewardPhase = 'none';
    this.finishRun(true);
  }

  private showTutorialModal(): void {
    this.rewardPhase = 'tutorial';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 318, 394, 0x16111e)
      .setStrokeStyle(2, 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, 134, 'How to Play', {
      fontSize: '25px',
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(42, 176, [
      '1. 이동만 직접 조작합니다.',
      '   PC: WASD / 방향키',
      '   모바일: 하단 영역 드래그',
      '',
      '2. 공격은 자동으로 발동합니다.',
      '   무기를 바꾸면 공격 방식도 바뀝니다.',
      '',
      '3. 상자를 먹으면 장비 3택이 열립니다.',
      '   3번째 상자는 원하는 부위 집중 파밍입니다.',
      '',
      '4. 보스 게이지가 차면 보스가 등장합니다.',
      '   보스를 잡으면 다음 스테이지가 열립니다.',
    ].join('\n'), {
      fontSize: '13px',
      color: '#ffffff',
      lineSpacing: 5,
      wordWrap: { width: 278 },
    });
    const startButton = this.add.rectangle(GAME_WIDTH / 2, 470, 154, 36, 0x26314a)
      .setStrokeStyle(2, 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const startText = this.add.text(GAME_WIDTH / 2, 470, 'Start', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    startButton.on('pointerdown', () => {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          stage1Seen: true,
        },
      }));
      this.closeRewardModal();
    });

    container.add([backdrop, panel, title, body, startButton, startText]);
    this.modal = container;
  }

  private showEquipmentInfo(slot: EquipmentSlot): void {
    const item = getSaveData().equipped[slot];
    this.rewardPhase = 'infoPopup';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 308, 292, 0x16111e)
      .setStrokeStyle(2, 0x9a8a78);
    const title = this.add.text(GAME_WIDTH / 2, 208, item?.nameKo ?? `${SLOT_LABELS[slot]} Empty`, {
      fontSize: '20px',
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(50, 244, item ? this.formatEquipmentInfo(item) : '아직 장착된 장비가 없습니다.', {
      fontSize: '13px',
      color: '#ffffff',
      lineSpacing: 6,
      wordWrap: { width: 262 },
    });
    const close = this.add.rectangle(GAME_WIDTH / 2, 412, 116, 32, 0x26314a)
      .setStrokeStyle(1, 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add.text(GAME_WIDTH / 2, 412, '닫기', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    close.on('pointerdown', () => this.closeRewardModal());
    container.add([backdrop, panel, title, body, close, closeText]);
    this.modal = container;
  }

  private clearModal(): void {
    this.modal?.destroy(true);
    this.modal = undefined;
  }

  private isGameplayPaused(): boolean {
    return this.rewardPhase !== 'none';
  }

  private showHitEffect(x: number, y: number): void {
    const slash = this.add.image(x, y, 'slash_arc').setDepth(6).setRotation(Phaser.Math.FloatBetween(-0.8, 0.8));
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 160,
      onComplete: () => slash.destroy(),
    });
  }

  private flashPlayer(): void {
    if (!this.player) {
      return;
    }

    this.player.setTexture('player_hit');
    this.time.delayedCall(90, () => {
      this.player?.setTexture('player_circle');
    });
  }

  private updateHud(): void {
    this.hpText?.setText(`HP ${Math.ceil(this.playerHp)}/${this.playerMaxHp}`);
    this.bossText?.setText(this.boss ? `Boss HP ${Math.max(0, Math.ceil(this.boss.hp))}/${this.boss.def.hp}` : `Boss Gauge ${Math.floor(this.bossGauge)}%`);
    this.killsText?.setText(`Kills ${this.kills}`);
    this.timeText?.setText(`${Math.floor(this.elapsedMs / 1000)}s`);
    this.chestText?.setText(this.chestCountInRun % 3 === 2 ? 'Focused Loot!' : `Chest ${this.chestCountInRun % 3}/3`);
  }

  private refreshEquipmentPanel(): void {
    this.equipmentText?.setText(this.getEquippedSummary());
  }

  private finishRun(cleared: boolean): void {
    if (this.isRunOver) {
      return;
    }

    this.isRunOver = true;
    const result: RunResult = {
      stageId: this.stageId,
      cleared,
      survivedMs: this.elapsedMs,
      kills: this.kills,
      equippedCount: this.equippedCount,
    };
    this.scene.start('ResultScene', result);
  }

  private getMainAttackStats(): MainAttackStats {
    const save = getSaveData();
    const weapon = save.equipped.weapon;
    const skillKind = weapon?.skillKind ?? 'bareFist';
    const minDamage = weapon?.rolledOptions.baseDamageMin ?? 6;
    const maxDamage = weapon?.rolledOptions.baseDamageMax ?? 9;
    const baseCooldown = weapon?.rolledOptions.cooldownMs ?? BARE_FIST_COOLDOWN_MS;
    const baseRange = this.getBaseRangeForSkill(skillKind);
    const range = baseRange * this.getMultiplierProduct('meleeRangeMultiplier');
    const cooldown = baseCooldown * this.getMultiplierProduct('mainCooldownMultiplier');
    const damageMultiplier = this.getTaggedDamageMultiplier(weapon?.tags ?? ['mainAttack', 'melee', 'physical']);
    const radius = (weapon?.rolledOptions.radiusPx ?? 44) * this.getMultiplierProduct('areaRadiusMultiplier');
    const chainCount = Math.max(1, this.getEquippedOptionTotal('chainCount'));
    const pierceCount = weapon?.rolledOptions.pierceCount ?? 2;
    const projectileSpeed = weapon?.rolledOptions.projectileSpeed ?? 280;

    return {
      minDamage,
      maxDamage,
      cooldownMs: Phaser.Math.Clamp(cooldown, 160, 2500),
      range: Phaser.Math.Clamp(range, 52, 260),
      damageMultiplier,
      radius: Phaser.Math.Clamp(radius, 32, 120),
      chainCount,
      pierceCount,
      projectileSpeed,
      skillKind,
    };
  }

  private getBaseRangeForSkill(skillKind: SkillKind): number {
    if (skillKind === 'fireProjectileExplosion' || skillKind === 'returningPoisonProjectile') {
      return 170;
    }
    if (skillKind === 'lightningStrike') {
      return 145;
    }
    if (skillKind === 'slashCone') {
      return 92;
    }
    return BARE_FIST_RANGE;
  }

  private getTaggedDamageMultiplier(tags: readonly string[]): number {
    let multiplier = this.getMultiplierProduct('mainDamageMultiplier');
    if (tags.includes('fire')) {
      multiplier *= this.getMultiplierProduct('fireDamageMultiplier');
    }
    if (tags.includes('ice')) {
      multiplier *= this.getMultiplierProduct('iceDamageMultiplier');
    }
    if (tags.includes('lightning')) {
      multiplier *= this.getMultiplierProduct('lightningDamageMultiplier');
    }
    if (tags.includes('poison')) {
      multiplier *= this.getMultiplierProduct('poisonDamageMultiplier');
    }
    if (tags.includes('physical')) {
      multiplier *= this.getMultiplierProduct('physicalDamageMultiplier');
    }
    return multiplier;
  }

  private calculatePlayerMaxHp(): number {
    return Math.round(BASE_PLAYER_MAX_HP + this.getEquippedOptionTotal('maxHpBonus'));
  }

  private getMultiplierProduct(key: keyof RolledEquipment['rolledOptions']): number {
    let product = 1;
    for (const item of Object.values(getSaveData().equipped)) {
      const value = item?.rolledOptions[key];
      if (typeof value === 'number') {
        product *= value;
      }
    }
    return product;
  }

  private getEquippedOptionTotal(key: keyof RolledEquipment['rolledOptions']): number {
    let total = 0;
    for (const item of Object.values(getSaveData().equipped)) {
      const value = item?.rolledOptions[key];
      if (typeof value === 'number') {
        total += value;
      }
    }
    return total;
  }

  private getEquippedSummary(): string {
    const save = getSaveData();
    const short = (slot: EquipmentSlot) => save.equipped[slot]?.nameKo.slice(0, 6) ?? 'Empty';
    return [
      `W ${short('weapon')} / N ${short('necklace')} / H ${short('helmet')}`,
      `G ${short('gloves')} / A ${short('armor')} / B ${short('belt')}`,
      this.getSynergySummary(),
    ].join('\n');
  }

  private getSynergySummary(): string {
    const equipped = Object.values(getSaveData().equipped).filter((item): item is RolledEquipment => Boolean(item));
    const tagCounts = new Map<string, number>();
    for (const item of equipped) {
      for (const tag of item.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const activeTags = [...tagCounts.entries()]
      .filter(([tag, count]) => count >= 2 && tag !== 'mainAttack' && tag !== 'supportSkill' && tag !== 'defense')
      .map(([tag]) => tag)
      .slice(0, 4);

    return `Synergy: ${activeTags.length > 0 ? activeTags.join(', ') : 'None yet'}`;
  }

  private formatEquipmentInfo(item: RolledEquipment): string {
    return [
      `${SLOT_LABELS[item.slot]} / ${getRarityLabel(item.rarity)}`,
      item.playerDescription,
      `Tags: ${item.tags.join(', ')}`,
      this.formatOptions(item, 8),
    ].join('\n');
  }

  private formatOptions(item: RolledEquipment, limit: number): string {
    return Object.entries(item.rolledOptions)
      .slice(0, limit)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
  }

  private getRarityColor(rarity: RolledEquipment['rarity']): number {
    const colors: Record<RolledEquipment['rarity'], number> = {
      common: 0xc8c8c8,
      rare: 0x5ea7ff,
      epic: 0xb66dff,
      relic: 0xffb347,
      bossUnique: 0xff6262,
    };
    return colors[rarity];
  }

  private isCircleOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
    const dx = ax - bx;
    const dy = ay - by;
    const radius = ar + br;
    return dx * dx + dy * dy <= radius * radius;
  }
}
