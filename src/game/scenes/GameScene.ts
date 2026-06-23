import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SLOT_ICONS, SLOT_LABELS, STAGE_COUNT, s, sf } from '../constants';
import { BOSS_DEFS, type BossDef, type BossPatternDef } from '../data/bosses';
import { ENEMY_DEFS, type EnemyDef } from '../data/enemies';
import { generateRewardOptions, getRarityLabel } from '../data/equipment';
import { getSaveData, updateSaveData } from '../storage';
import { playBgm, playSound, type BgmCue } from '../systems/SoundSystem';
import { FloatingJoystick } from '../systems/FloatingJoystick';
import { KeyboardMenuNavigator, type KeyboardMenuItem } from '../systems/KeyboardMenuNavigator';
import type { EquipmentSlot, RolledEquipment, RunResult, SkillKind, Tag } from '../types';

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
  slowMs: number;
  slowMultiplier: number;
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
  target: 'player' | 'enemies';
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

interface SupportSkillStats {
  minDamage: number;
  maxDamage: number;
  cooldownMs: number;
  radius: number;
  dotDamagePerSec: number;
  dotDurationMs: number;
  slowPercent: number;
  shieldAmount: number;
  skillKind: SkillKind;
  tags: readonly Tag[];
}

type CombatTarget =
  | { kind: 'enemy'; enemy: EnemyState }
  | { kind: 'boss'; boss: BossState };

type RewardPhase = 'none' | 'normalReward' | 'focusSlotSelect' | 'focusReward' | 'bossReward' | 'infoPopup' | 'tutorial';

const EQUIPMENT_SLOTS = Object.keys(SLOT_LABELS) as EquipmentSlot[];
const SLOT_ABBREV: Record<EquipmentSlot, string> = {
  weapon: 'W',
  necklace: 'N',
  helmet: 'H',
  gloves: 'G',
  armor: 'A',
  belt: 'B',
};
const PLAY_AREA_TOP = s(76);
const PLAY_AREA_BOTTOM = s(468);
const CONTROL_PANEL_TOP = s(468);
const CONTROL_PANEL_HEIGHT = s(136);
const JOYSTICK_ZONE_WIDTH = s(128);
const JOYSTICK_MAX_RADIUS = s(40);
const JOYSTICK_DEADZONE = s(10);
const EQUIP_GRID_X = s(132);
const EQUIP_GRID_Y = s(498);
const EQUIP_SYNERGY_Y = s(482);
const SLOT_CELL_W = s(72);
const SLOT_CELL_H = s(30);
const SLOT_GAP = s(4);
const END_TEST_RUN_Y = CONTROL_PANEL_TOP + CONTROL_PANEL_HEIGHT + s(8);
const PLAYER_RADIUS = s(10);
const BASE_PLAYER_MAX_HP = 100;
const PLAYER_MOVE_SPEED = s(130);
const BARE_FIST_COOLDOWN_MS = 420;
const BARE_FIST_RANGE = s(68);
const MAX_ENEMIES = 80;
const CHEST_DROP_CHANCE = 0.072;
const CHEST_PITY_KILLS = 10;
const SKIP_BONUS_MAX_HP = 2;
const SKIP_BONUS_HEAL = 12;
const SKIP_BONUS_BOSS_GAUGE = 3;
const MAX_EQUIPMENT_UPGRADE = 10;
const UPGRADE_POWER_STEP = 0.04;
const BOSS_GAUGE_TIME_PER_SEC = 1.25;
const BOSS_GAUGE_PER_KILL = 2.2;
const TAP_MAX_DISTANCE = s(8);
const TAP_MAX_MS = 200;

const TAG_ICON_CONFIG: Record<Tag, { label: string; color: number; priority: number }> = {
  mainAttack: { label: '⚔ MAIN', color: 0xff7070, priority: 10 },
  supportSkill: { label: '✨ SUP', color: 0x9b8cff, priority: 12 },
  melee: { label: '🗡 MEL', color: 0xffb347, priority: 20 },
  projectile: { label: '🏹 PRJ', color: 0x7ac7ff, priority: 21 },
  orbit: { label: '🌀 ORB', color: 0xd7a3ff, priority: 23 },
  area: { label: '💥 AOE', color: 0xff8a3d, priority: 22 },
  physical: { label: '🪨 PHY', color: 0xd8c6a3, priority: 30 },
  fire: { label: '🔥 FIR', color: 0xff653d, priority: 31 },
  ice: { label: '❄ ICE', color: 0x7ae7ff, priority: 32 },
  lightning: { label: '⚡ LIT', color: 0xffef6a, priority: 33 },
  poison: { label: '☠ PSN', color: 0x74ff83, priority: 34 },
  defense: { label: '🛡 DEF', color: 0x9aa4b8, priority: 40 },
  shield: { label: '🔷 SHD', color: 0x8ed6ff, priority: 41 },
  lifesteal: { label: '🩸 LIF', color: 0xff7aac, priority: 42 },
};

const STAGE_INTRO_STORIES: Record<number, { title: string; lines: string[] }> = {
  1: {
    title: 'Stage 1 · 잿빛 외곽',
    lines: [
      '균열 가장자리에는 오래된 뼈 무더기가 길을 막고 있습니다.',
      '뼈 도살자는 쓰러진 영웅들의 장비를 제단에 걸어두고,',
      '새로운 사냥감이 여섯 슬롯을 채우기도 전에 목을 노립니다.',
    ],
  },
  2: {
    title: 'Stage 2 · 잿불 소굴',
    lines: [
      '불씨가 꺼지지 않는 굴 안에서 잿불 오우거가 망치를 끌고 다닙니다.',
      '그가 밟고 지난 땅은 붉게 갈라지고, 상자 속 금속은 열기로 뒤틀립니다.',
      '뜨거운 숨결을 견디며 다음 장비를 찾아야 합니다.',
    ],
  },
  3: {
    title: 'Stage 3 · 폭풍 폐허',
    lines: [
      '무너진 첨탑 사이로 푸른 번개가 계속해서 되돌아옵니다.',
      '폭풍 괴수는 그 전류를 심장처럼 품고 폐허 전체를 깨웁니다.',
      '움직임을 멈추면 번개가 먼저 당신을 찾아낼 것입니다.',
    ],
  },
  4: {
    title: 'Stage 4 · 역병 구덩이',
    lines: [
      '초록 안개 아래에는 역병 거상이 천천히 숨을 쉽니다.',
      '그가 흘린 독은 발밑에 고이고, 살아남은 장비마저 녹슬게 만듭니다.',
      '오래 머물수록 전장은 당신 편이 아니게 됩니다.',
    ],
  },
  5: {
    title: 'Stage 5 · 육슬롯 균열',
    lines: [
      '균열의 중심에는 여섯 슬롯을 모두 삼키려는 망령이 기다립니다.',
      '육슬롯 망령은 당신이 모은 힘을 비틀어 마지막 시험으로 되돌려 보냅니다.',
      '여기서 승리해야 반복되는 사냥이 끝납니다.',
    ],
  },
};

const ENDING_STORY_LINES = [
  '육슬롯 망령의 형체가 무너지자, 균열에 걸려 있던 장비들이 하나씩 빛을 잃습니다.',
  '당신이 채운 여섯 슬롯은 더 이상 저주가 아니라, 닫히는 문을 붙드는 쐐기가 되었습니다.',
  '마지막 상자의 뚜껑이 조용히 닫히고, 폐허 위로 첫 새벽빛이 들어옵니다.',
  '',
  'Game Clear',
];

export class GameScene extends Phaser.Scene {
  private stageId = 1;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private player?: Phaser.GameObjects.Image;
  private hpText?: Phaser.GameObjects.Text;
  private bossText?: Phaser.GameObjects.Text;
  private killsText?: Phaser.GameObjects.Text;
  private timeText?: Phaser.GameObjects.Text;
  private synergyText?: Phaser.GameObjects.Text;
  private slotLine2Texts = new Map<EquipmentSlot, Phaser.GameObjects.Text>();
  private chestText?: Phaser.GameObjects.Text;
  private playerHpBarBg?: Phaser.GameObjects.Rectangle;
  private playerHpBarFill?: Phaser.GameObjects.Rectangle;
  private playerHpBarVisibleUntilMs = 0;
  private bossHpBarBg?: Phaser.GameObjects.Rectangle;
  private bossHpBarFill?: Phaser.GameObjects.Rectangle;
  private playerHp = BASE_PLAYER_MAX_HP;
  private playerMaxHp = BASE_PLAYER_MAX_HP;
  private enemies: EnemyState[] = [];
  private chests: ChestState[] = [];
  private boss?: BossState;
  private hazards: HazardState[] = [];
  private bossProjectiles: BossProjectileState[] = [];
  private spawnTimerMs = 0;
  private attackTimerMs = 0;
  private supportAttackTimerMs = 800;
  private elapsedMs = 0;
  private bossGauge = 0;
  private shieldHp = 0;
  private shieldMaxHp = 0;
  private shieldRing?: Phaser.GameObjects.Arc;
  private kills = 0;
  private killsSinceLastChest = 0;
  private equippedCount = 0;
  private chestCountInRun = 0;
  private skipBonusCount = 0;
  private runBonusMaxHp = 0;
  private floatingJoystick?: FloatingJoystick;
  private isRunOver = false;
  private rewardPhase: RewardPhase = 'none';
  private modal?: Phaser.GameObjects.Container;
  private readonly keyboardMenu = new KeyboardMenuNavigator(this);
  private equipmentInfoBlockedUntilMs = 0;

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
    this.supportAttackTimerMs = 800;
    this.elapsedMs = 0;
    this.bossGauge = 0;
    this.shieldHp = 0;
    this.shieldMaxHp = 0;
    this.shieldRing = undefined;
    this.kills = 0;
    this.killsSinceLastChest = 0;
    this.equippedCount = Object.keys(getSaveData().equipped).length;
    this.chestCountInRun = 0;
    this.skipBonusCount = 0;
    this.runBonusMaxHp = 0;
    this.playerMaxHp = this.calculatePlayerMaxHp();
    this.playerHp = this.playerMaxHp;
    this.floatingJoystick?.forceRelease();
    this.isRunOver = false;
    this.rewardPhase = 'none';
    this.modal = undefined;
  }

  create(): void {
    playBgm(this, `stage_${this.stageId}` as BgmCue);
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
    this.player = this.add.image(GAME_WIDTH / 2, s(310), 'player_circle').setDepth(5);
    this.createPlayerHpBar();
    this.floatingJoystick?.destroy();
    this.createEquipmentPanel();
    this.setupInput();
    if (!this.sys.game.device.input.touch) {
      this.createButton(GAME_WIDTH / 2, END_TEST_RUN_Y, 'End Test Run', () => {
        this.finishRun(false);
      });
    }
    if (!getSaveData().tutorial.seenStageIntros.includes(this.stageId)) {
      this.showStageIntroModal();
    } else if (this.stageId === 1 && !getSaveData().tutorial.stage1Seen) {
      this.showTutorialModal();
    }
  }

  update(_time: number, delta: number): void {
    if (this.isRunOver || !this.player) {
      return;
    }

    if (this.isGameplayPaused()) {
      this.floatingJoystick?.forceRelease();
      this.floatingJoystick?.setVisible(false);
      return;
    }

    this.floatingJoystick?.setVisible(this.sys.game.device.input.touch);

    this.elapsedMs += delta;
    this.updatePlayer(delta);
    this.updateSpawns(delta);
    this.updateEnemies(delta);
    this.updateBareFist(delta);
    this.updateSupportSkill(delta);
    this.updateBossGauge(delta);
    this.updateBoss(delta);
    this.updateBossProjectiles(delta);
    this.updateHazards(delta);
    this.updateChestPickup();
    this.updateHud();
    this.updateFloatingHealthBars();

    if (this.playerHp <= 0) {
      this.finishRun(false);
    }
  }

  private createHud(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, s(76), 0x17131e).setOrigin(0);
    this.add.text(s(16), s(14), `Stage ${this.stageId}`, {
      fontSize: sf(17),
      color: '#f8ddb0',
    });
    this.hpText = this.add.text(s(16), s(42), '', {
      fontSize: sf(13),
      color: '#d8f4df',
    });
    this.bossText = this.add.text(s(136), s(42), 'Boss Gauge 0%', {
      fontSize: sf(13),
      color: '#d6c1ff',
    });
    this.chestText = this.add.text(s(260), s(42), '', {
      fontSize: sf(13),
      color: '#f6d188',
    });
    this.killsText = this.add.text(s(236), s(14), '', {
      fontSize: sf(13),
      color: '#ffffff',
    });
    this.timeText = this.add.text(s(290), s(14), '', {
      fontSize: sf(13),
      color: '#ffffff',
    });
    this.updateHud();
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(s(1), 0x202735, 0.65);
    for (let x = 0; x <= GAME_WIDTH; x += s(24)) {
      graphics.lineBetween(x, PLAY_AREA_TOP, x, PLAY_AREA_BOTTOM);
    }
    for (let y = PLAY_AREA_TOP; y <= PLAY_AREA_BOTTOM; y += s(24)) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createEquipmentPanel(): void {
    this.slotLine2Texts.clear();
    this.add.rectangle(0, CONTROL_PANEL_TOP, GAME_WIDTH, s(2), 0xf0c85a, 0.35).setOrigin(0).setDepth(10);
    this.add.rectangle(0, CONTROL_PANEL_TOP, GAME_WIDTH, CONTROL_PANEL_HEIGHT, 0x12101a).setOrigin(0).setDepth(10);
    this.add.rectangle(JOYSTICK_ZONE_WIDTH, CONTROL_PANEL_TOP, s(2), CONTROL_PANEL_HEIGHT, 0x3a3348, 0.6)
      .setOrigin(0)
      .setDepth(10);

    this.synergyText = this.add.text(EQUIP_GRID_X + s(4), EQUIP_SYNERGY_Y, this.getSynergyLine(), {
      fontSize: sf(9),
      color: '#a99d8c',
      wordWrap: { width: s(218) },
    }).setDepth(11);

    EQUIPMENT_SLOTS.forEach((slot, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = EQUIP_GRID_X + col * (SLOT_CELL_W + SLOT_GAP) + SLOT_CELL_W / 2;
      const y = EQUIP_GRID_Y + row * (SLOT_CELL_H + SLOT_GAP) + SLOT_CELL_H / 2;
      const button = this.add.rectangle(x, y, SLOT_CELL_W, SLOT_CELL_H, 0x211b2d)
        .setStrokeStyle(s(1), 0x7a6750)
        .setInteractive({ useHandCursor: true })
        .setDepth(11);
      this.add.text(x, y - s(6), `${SLOT_ICONS[slot]} ${SLOT_ABBREV[slot]}`, {
        fontSize: sf(10),
        color: '#f0d8aa',
      }).setOrigin(0.5).setDepth(12);
      const line2 = this.add.text(x, y + s(7), this.getSlotLine2Text(slot), {
        fontSize: sf(9),
        color: '#cfc4b2',
        align: 'center',
        wordWrap: { width: s(68) },
      }).setOrigin(0.5).setDepth(12);
      this.slotLine2Texts.set(slot, line2);
      button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (this.isGameplayPaused() || performance.now() < this.equipmentInfoBlockedUntilMs) {
          return;
        }
        if (this.isTap(pointer)) {
          this.showEquipmentInfo(slot);
        }
      });
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, s(154), s(28), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: sf(13),
      color: '#ffffff',
    }).setOrigin(0.5);
    button.on('pointerdown', onClick);
  }

  private createPlayerHpBar(): void {
    this.playerHpBarBg = this.add.rectangle(0, 0, s(44), s(6), 0x1a1010, 0.92)
      .setOrigin(0, 0.5)
      .setStrokeStyle(s(1), 0x000000, 0.7)
      .setDepth(12)
      .setVisible(false);
    this.playerHpBarFill = this.add.rectangle(0, 0, s(42), s(4), 0x69e37b, 1)
      .setOrigin(0, 0.5)
      .setDepth(13)
      .setVisible(false);
  }

  private createBossHpBar(): void {
    this.bossHpBarBg?.destroy();
    this.bossHpBarFill?.destroy();
    this.bossHpBarBg = this.add.rectangle(0, 0, s(76), s(7), 0x1a1010, 0.95)
      .setOrigin(0, 0.5)
      .setStrokeStyle(s(1), 0x000000, 0.8)
      .setDepth(12);
    this.bossHpBarFill = this.add.rectangle(0, 0, s(74), s(5), 0xff6262, 1)
      .setOrigin(0, 0.5)
      .setDepth(13);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;

    this.floatingJoystick = new FloatingJoystick({
      zoneLeft: 0,
      zoneTop: CONTROL_PANEL_TOP,
      zoneWidth: JOYSTICK_ZONE_WIDTH,
      zoneHeight: CONTROL_PANEL_HEIGHT,
      maxRadius: JOYSTICK_MAX_RADIUS,
      deadzone: JOYSTICK_DEADZONE,
      depth: 15,
    });
    this.floatingJoystick.attach(this);
    this.floatingJoystick.setVisible(this.sys.game.device.input.touch);

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isGameplayPaused() || this.isRunOver) {
      return;
    }
    this.floatingJoystick?.tryActivate(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isGameplayPaused() || this.isRunOver) {
      return;
    }
    this.floatingJoystick?.update(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    this.floatingJoystick?.release(pointer.id);
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
    if (move.lengthSq() === 0 && this.floatingJoystick) {
      const stick = this.floatingJoystick.getMoveVector();
      if (stick.lengthSq() > 0) {
        move.copy(stick);
      }
    }

    if (move.lengthSq() > 0) {
      if (move.length() > 1) {
        move.normalize();
      }
      move.scale((PLAYER_MOVE_SPEED * delta) / 1000);
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
    const x = side === 0 ? s(-16) : side === 1 ? GAME_WIDTH + s(16) : Phaser.Math.Between(0, GAME_WIDTH);
    const y = side === 2 ? PLAY_AREA_TOP - s(16) : side === 3 ? PLAY_AREA_BOTTOM + s(16) : Phaser.Math.Between(PLAY_AREA_TOP, PLAY_AREA_BOTTOM);
    const sprite = this.add.image(x, y, def.textureKey).setDepth(3);
    const stageHpMultiplier = 1 + (this.stageId - 1) * 0.55;
    this.enemies.push({
      id: `${def.id}_${this.elapsedMs}_${Math.random()}`,
      def,
      sprite,
      hp: Math.round(def.hp * stageHpMultiplier),
      radius: sprite.width / 2,
      contactCooldownMs: 0,
      slowMs: 0,
      slowMultiplier: 1,
    });
  }

  private updateEnemies(delta: number): void {
    if (!this.player) {
      return;
    }

    for (const enemy of this.enemies) {
      const direction = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y);
      if (direction.lengthSq() > 0) {
        enemy.slowMs = Math.max(0, enemy.slowMs - delta);
        const speedMultiplier = enemy.slowMs > 0 ? enemy.slowMultiplier : 1;
        direction.normalize().scale((s(enemy.def.moveSpeed) * speedMultiplier * delta) / 1000);
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
      this.drawMeleeSlash(this.player!.x, this.player!.y, x, y, attackStats.range);
      this.damageCombatTarget(target, this.rollMainDamage(attackStats), 0xffe0c2);
    }
    playSound('weapon_melee', this);
    return true;
  }

  private performLightningAttack(attackStats: MainAttackStats): boolean {
    const firstTarget = this.findNearestCombatTarget(attackStats.range + s(48));
    if (!firstTarget) {
      return false;
    }

    const chainedTargets: CombatTarget[] = [firstTarget];
    const chainCount = Math.max(1, Math.floor(attackStats.chainCount));
    for (const candidate of this.findCombatTargetsInRadius(this.getTargetPosition(firstTarget).x, this.getTargetPosition(firstTarget).y, s(96))) {
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
      this.drawLightningSpark(to.x, to.y);
      this.damageCombatTarget(target, this.rollMainDamage(attackStats) * (index === 0 ? 1 : 0.72), 0x82d8ff);
      from = to;
    });
    playSound('weapon_lightning', this);
    return true;
  }

  private performFireProjectileAttack(attackStats: MainAttackStats): boolean {
    const target = this.findNearestCombatTarget(attackStats.range + s(140));
    if (!target || !this.player) {
      return false;
    }

    const destination = this.getTargetPosition(target);
    const projectile = this.add.image(this.player.x, this.player.y, 'projectile_orb')
      .setTint(0xff7a3d)
      .setScale(1.4)
      .setDepth(7);
    playSound('weapon_fire', this);
    this.drawProjectileTrail(projectile, 0xff8a3d);
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
    const firstTarget = this.findNearestCombatTarget(attackStats.range + s(120));
    if (!firstTarget || !this.player) {
      return false;
    }

    const startX = this.player.x;
    const startY = this.player.y;
    const targetPosition = this.getTargetPosition(firstTarget);
    const direction = new Phaser.Math.Vector2(targetPosition.x - startX, targetPosition.y - startY).normalize();
    const destination = {
      x: Phaser.Math.Clamp(startX + direction.x * (attackStats.range + s(120)), 0, GAME_WIDTH),
      y: Phaser.Math.Clamp(startY + direction.y * (attackStats.range + 120), PLAY_AREA_TOP, PLAY_AREA_BOTTOM),
    };
    const hitTargetIds = new Set<string>();
    const maxHits = Math.max(2, Math.floor(attackStats.pierceCount));

    const chakram = this.add.image(startX, startY, 'projectile_orb')
      .setTint(0x60d96f)
      .setScale(1.45)
      .setDepth(7);
    playSound('weapon_orbit', this);
    this.drawPoisonTrail(chakram);
    const hitTimer = this.time.addEvent({
      delay: 28,
      repeat: 14,
      callback: () => {
        if (!chakram.active || hitTargetIds.size >= maxHits) {
          hitTimer.remove();
          return;
        }
        for (const target of this.findCombatTargetsInRadius(chakram.x, chakram.y, s(18))) {
          const targetId = this.getCombatTargetId(target);
          if (hitTargetIds.has(targetId)) {
            continue;
          }
          hitTargetIds.add(targetId);
          const { x, y } = this.getTargetPosition(target);
          this.damageCombatTarget(target, this.rollMainDamage(attackStats) * 0.82, 0x74ff83);
          this.addPoisonTickText(x, y);
          if (hitTargetIds.size >= maxHits) {
            break;
          }
        }
      },
    });

    const outbound = this.tweens.add({
      targets: chakram,
      x: destination.x,
      y: destination.y,
      angle: 360,
      duration: 260,
      onComplete: () => {
        outbound.remove();
        this.tweens.add({
          targets: chakram,
          x: startX,
          y: startY,
          angle: 720,
          duration: 220,
          onComplete: () => {
            hitTimer.remove();
            chakram.destroy();
          },
        });
      },
    });
    return true;
  }

  private updateSupportSkill(delta: number): void {
    const necklace = getSaveData().equipped.necklace;
    if (!necklace || necklace.skillKind === 'passiveModifier') {
      return;
    }

    this.supportAttackTimerMs -= delta;
    if (this.supportAttackTimerMs > 0) {
      return;
    }

    const stats = this.getSupportSkillStats(necklace);
    let didCast = false;
    if (stats.skillKind === 'thunderAoe') {
      didCast = this.castThunderAoe(stats);
    } else if (stats.skillKind === 'shieldPulse') {
      didCast = this.castShieldPulse(stats);
    } else if (stats.skillKind === 'frostPulse') {
      didCast = this.castFrostPulse(stats);
    } else if (stats.skillKind === 'poisonPool') {
      didCast = this.castPoisonPool(stats);
    }

    this.supportAttackTimerMs = didCast ? stats.cooldownMs : 350;
  }

  private castThunderAoe(stats: SupportSkillStats): boolean {
    const target = this.findNearestCombatTarget(s(220));
    if (!target) {
      return false;
    }

    const { x, y } = this.getTargetPosition(target);
    const warning = this.add.circle(x, y, stats.radius, 0xffef6a, 0.18)
      .setStrokeStyle(s(2), 0xffef6a, 0.95)
      .setDepth(8);
    this.time.delayedCall(420, () => {
      warning.destroy();
      if (this.isRunOver || this.isGameplayPaused()) {
        return;
      }
      playSound('necklace_thunder', this);
      this.drawLightningSpark(x, y);
      for (const hitTarget of this.findCombatTargetsInRadius(x, y, stats.radius)) {
        this.damageCombatTarget(hitTarget, this.rollSupportDamage(stats), 0xffef6a);
      }
    });
    return true;
  }

  private castShieldPulse(stats: SupportSkillStats): boolean {
    if (!this.player) {
      return false;
    }

    this.shieldMaxHp = Math.max(this.shieldMaxHp, stats.shieldAmount);
    this.shieldHp = Math.min(this.shieldMaxHp, this.shieldHp + stats.shieldAmount);
    this.shieldRing?.destroy();
    this.shieldRing = this.add.circle(this.player.x, this.player.y, s(22), 0x8ed6ff, 0.14)
      .setStrokeStyle(s(2), 0x8ed6ff, 0.9)
      .setDepth(11);
    playSound('necklace_shield', this);
    this.tweens.add({
      targets: this.shieldRing,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.45,
      duration: 240,
      yoyo: true,
    });
    this.explodeAt(this.player.x, this.player.y, Math.max(s(34), stats.radius * 0.7), this.rollSupportDamage(stats) * 0.45);
    return true;
  }

  private castFrostPulse(stats: SupportSkillStats): boolean {
    if (!this.player) {
      return false;
    }

    const pulse = this.add.circle(this.player.x, this.player.y, stats.radius, 0x7ae7ff, 0.16)
      .setStrokeStyle(s(2), 0x7ae7ff, 0.9)
      .setDepth(8);
    for (const target of this.findCombatTargetsInRadius(this.player.x, this.player.y, stats.radius)) {
      this.damageCombatTarget(target, this.rollSupportDamage(stats) * 0.75, 0x7ae7ff);
      this.applySlow(target, stats.slowPercent, 1200 + this.getEquippedOptionTotal('slowDurationMs'));
    }
    this.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 320,
      onComplete: () => pulse.destroy(),
    });
    return true;
  }

  private castPoisonPool(stats: SupportSkillStats): boolean {
    const target = this.findNearestCombatTarget(s(230));
    if (!target) {
      return false;
    }

    const { x, y } = this.getTargetPosition(target);
    this.addEnemyHazard(x, y, stats.radius, Math.max(1, stats.dotDamagePerSec), stats.dotDurationMs, 0x74ff83);
    this.applySlow(target, stats.slowPercent, Math.min(1200, stats.dotDurationMs));
    playSound('necklace_poison', this);
    return true;
  }

  private applySlow(target: CombatTarget, slowPercent: number, durationMs: number): void {
    if (target.kind !== 'enemy' || slowPercent <= 0) {
      return;
    }

    target.enemy.slowMs = Math.max(target.enemy.slowMs, durationMs);
    target.enemy.slowMultiplier = Phaser.Math.Clamp(1 - slowPercent, 0.35, 1);
    target.enemy.sprite.setTint(0x7ae7ff);
    this.time.delayedCall(Math.min(260, durationMs), () => {
      if (target.enemy.sprite.active) {
        target.enemy.sprite.clearTint();
      }
    });
  }

  private updateBossGauge(delta: number): void {
    if (this.boss) {
      return;
    }
    if (this.bossGauge >= 100) {
      this.spawnBoss();
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
    playSound('boss', this);
    const sprite = this.add.image(GAME_WIDTH / 2, PLAY_AREA_TOP + s(64), 'boss_large')
      .setTint(def.colorHex)
      .setDepth(4);
    this.boss = {
      def,
      sprite,
      hp: def.hp,
      radius: s(28),
      contactCooldownMs: 0,
      patternCooldowns: {},
      chargeVelocity: new Phaser.Math.Vector2(0, 0),
      chargeMs: 0,
    };
    this.createBossHpBar();
    const announce = this.add.text(GAME_WIDTH / 2, s(120), `${def.nameKo} 등장!`, {
      fontSize: sf(20),
      color: '#ffdb9a',
      backgroundColor: '#00000088',
      padding: { x: s(8), y: s(4) },
    }).setOrigin(0.5).setDepth(20).setAlpha(1);
    this.tweens.add({
      targets: announce,
      y: s(96),
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
        direction.normalize().scale((s(boss.def.moveSpeed) * delta) / 1000);
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
    const warning = this.add.rectangle(this.boss.sprite.x, this.boss.sprite.y, s(150), s(8), 0xff3d3d, 0.55)
      .setRotation(direction.angle())
      .setDepth(8);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      if (!this.boss) {
        return;
      }
      this.boss.chargeVelocity = direction.scale(s(280));
      this.boss.chargeMs = 420;
    });
  }

  private telegraphAoe(pattern: BossPatternDef, x: number, y: number): void {
    const radius = s(pattern.radiusPx ?? 62);
    const warning = this.add.circle(x, y, radius, 0xff3d3d, 0.18)
      .setStrokeStyle(s(2), 0xff8a3d, 0.9)
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

    const warning = this.add.circle(this.boss.sprite.x, this.boss.sprite.y, s(36), 0x7ac7ff, 0.2)
      .setStrokeStyle(s(2), 0x7ac7ff)
      .setDepth(7);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      if (!this.boss) {
        return;
      }
      const count = pattern.projectileCount ?? 8;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        this.spawnBossProjectile(this.boss.sprite.x, this.boss.sprite.y, angle, s(pattern.projectileSpeed ?? 145), pattern.damage);
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
    const warning = this.add.rectangle(this.boss.sprite.x, this.boss.sprite.y, s(260), s(22), 0xaa55ff, 0.35)
      .setRotation(direction.angle())
      .setDepth(7);
    this.time.delayedCall(pattern.telegraphMs, () => {
      warning.destroy();
      this.spawnBossProjectile(this.boss?.sprite.x ?? GAME_WIDTH / 2, this.boss?.sprite.y ?? PLAY_AREA_TOP, direction.angle(), s(260), pattern.damage, s(18), 780);
    });
  }

  private spawnBossProjectile(x: number, y: number, angle: number, speed: number, damage: number, radius = s(6), lifeMs = 2800): void {
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

      const outOfBounds = projectile.sprite.x < s(-24) || projectile.sprite.x > GAME_WIDTH + s(24) || projectile.sprite.y < PLAY_AREA_TOP - s(24) || projectile.sprite.y > PLAY_AREA_BOTTOM + s(24);
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
      .setStrokeStyle(s(2), 0xffb347, 0.9)
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
      target: 'player',
    });
  }

  private addEnemyHazard(x: number, y: number, radius: number, damagePerSecond: number, durationMs: number, color: number): void {
    const shape = this.add.circle(x, y, radius, color, 0.2)
      .setStrokeStyle(s(2), color, 0.85)
      .setDepth(6);
    this.hazards.push({
      id: `enemy_hazard_${this.elapsedMs}_${Math.random()}`,
      shape,
      x,
      y,
      radius,
      damage: Math.max(1, damagePerSecond * 0.5),
      durationMs,
      tickMs: 0,
      target: 'enemies',
    });
    this.tweens.add({
      targets: shape,
      alpha: 0.08,
      duration: 420,
      yoyo: true,
      repeat: Math.max(1, Math.floor(durationMs / 840)),
    });
  }

  private updateHazards(delta: number): void {
    if (!this.player) {
      return;
    }

    for (const hazard of [...this.hazards]) {
      hazard.durationMs -= delta;
      hazard.tickMs -= delta;
      if (hazard.tickMs <= 0 && hazard.target === 'player' && this.isCircleOverlap(hazard.x, hazard.y, hazard.radius, this.player.x, this.player.y, PLAYER_RADIUS)) {
        this.damagePlayer(hazard.damage);
        hazard.tickMs = 550;
      }
      if (hazard.tickMs <= 0 && hazard.target === 'enemies') {
        for (const target of this.findCombatTargetsInRadius(hazard.x, hazard.y, hazard.radius)) {
          const position = this.getTargetPosition(target);
          this.damageCombatTarget(target, hazard.damage, 0x74ff83);
          this.addPoisonTickText(position.x, position.y);
        }
        hazard.tickMs = 500;
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

  private damageCombatTarget(target: CombatTarget, damage: number, hitColor = 0xffffff): void {
    const position = this.getTargetPosition(target);
    this.flashCombatTarget(target, hitColor);
    this.punchCombatTarget(target);
    this.cameras.main.shake(45, 0.0018);
    this.showDamageNumber(position.x, position.y, damage, hitColor);
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

  private getCombatTargetId(target: CombatTarget): string {
    return target.kind === 'boss' ? `boss_${target.boss.def.id}` : target.enemy.id;
  }

  private rollMainDamage(attackStats: MainAttackStats): number {
    let damage = Phaser.Math.FloatBetween(attackStats.minDamage, attackStats.maxDamage) * attackStats.damageMultiplier;
    const critChance = Phaser.Math.Clamp(this.getEquippedOptionTotal('critChance'), 0, 0.55);
    if (Math.random() < critChance) {
      damage *= this.getMultiplierProduct('critDamageMultiplier');
    }
    return damage;
  }

  private rollSupportDamage(stats: SupportSkillStats): number {
    return Phaser.Math.FloatBetween(stats.minDamage, stats.maxDamage) * this.getSupportDamageMultiplier(stats.tags);
  }

  private drawMeleeSlash(fromX: number, fromY: number, toX: number, toY: number, range: number): void {
    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    const arc = this.add.ellipse(
      fromX + Math.cos(angle) * range * 0.45,
      fromY + Math.sin(angle) * range * 0.45,
      range * 0.95,
      s(22),
      0xfff0d0,
      0.18,
    )
      .setRotation(angle)
      .setStrokeStyle(s(3), 0xffd08a, 0.95)
      .setDepth(8);
    this.tweens.add({
      targets: arc,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.8,
      duration: 150,
      onComplete: () => arc.destroy(),
    });
  }

  private explodeAt(x: number, y: number, radius: number, damage: number): void {
    const explosion = this.add.circle(x, y, radius, 0xff7a3d, 0.28)
      .setStrokeStyle(s(2), 0xffd08a)
      .setDepth(8);
    for (const target of this.findCombatTargetsInRadius(x, y, radius)) {
      this.damageCombatTarget(target, damage, 0xff8a3d);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const ember = this.add.circle(x, y, s(3), 0xffd08a, 0.9).setDepth(9);
      this.tweens.add({
        targets: ember,
        x: x + Math.cos(angle) * radius * 0.75,
        y: y + Math.sin(angle) * radius * 0.75,
        alpha: 0,
        duration: 260,
        onComplete: () => ember.destroy(),
      });
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
      .setLineWidth(s(3))
      .setDepth(8);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 130,
      onComplete: () => line.destroy(),
    });
  }

  private drawLightningSpark(x: number, y: number): void {
    const ring = this.add.circle(x, y, s(12), 0x82d8ff, 0.22)
      .setStrokeStyle(s(2), 0xd7f3ff, 0.9)
      .setDepth(9);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      duration: 140,
      onComplete: () => ring.destroy(),
    });
  }

  private drawProjectileTrail(projectile: Phaser.GameObjects.Image, color: number): void {
    const timer = this.time.addEvent({
      delay: 35,
      repeat: 12,
      callback: () => {
        if (!projectile.active) {
          timer.remove();
          return;
        }
        const puff = this.add.circle(projectile.x, projectile.y, s(4), color, 0.35).setDepth(6);
        this.tweens.add({
          targets: puff,
          alpha: 0,
          scaleX: 1.6,
          scaleY: 1.6,
          duration: 180,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private drawPoisonTrail(projectile: Phaser.GameObjects.Image): void {
    const timer = this.time.addEvent({
      delay: 30,
      repeat: 10,
      callback: () => {
        if (!projectile.active) {
          timer.remove();
          return;
        }
        const drop = this.add.circle(projectile.x, projectile.y, s(3), 0x74ff83, 0.45).setDepth(6);
        this.tweens.add({
          targets: drop,
          y: drop.y + s(5),
          alpha: 0,
          duration: 220,
          onComplete: () => drop.destroy(),
        });
      },
    });
  }

  private flashCombatTarget(target: CombatTarget, color: number): void {
    const sprite = target.kind === 'boss' ? target.boss.sprite : target.enemy.sprite;
    sprite.setTint(color);
    this.time.delayedCall(70, () => {
      if (sprite.active) {
        sprite.clearTint();
        if (target.kind === 'boss') {
          sprite.setTint(target.boss.def.colorHex);
        }
      }
    });
  }

  private punchCombatTarget(target: CombatTarget): void {
    if (!this.player) {
      return;
    }

    const sprite = target.kind === 'boss' ? target.boss.sprite : target.enemy.sprite;
    const pushDistance = target.kind === 'boss' ? s(3) : s(8);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, sprite.x, sprite.y);
    const targetX = Phaser.Math.Clamp(sprite.x + Math.cos(angle) * pushDistance, s(-20), GAME_WIDTH + s(20));
    const targetY = Phaser.Math.Clamp(sprite.y + Math.sin(angle) * pushDistance, PLAY_AREA_TOP - s(20), PLAY_AREA_BOTTOM + s(20));
    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 55,
      yoyo: true,
    });
  }

  private showDamageNumber(x: number, y: number, damage: number, color: number): void {
    const text = this.add.text(x, y - s(18), Math.max(1, Math.round(damage)).toString(), {
      fontSize: sf(11),
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: s(2),
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: text,
      y: text.y - s(14),
      alpha: 0,
      duration: 420,
      onComplete: () => text.destroy(),
    });
  }

  private addPoisonTickText(x: number, y: number): void {
    const text = this.add.text(x, y - s(18), 'POISON', {
      fontSize: sf(9),
      color: '#74ff83',
    }).setOrigin(0.5).setDepth(9);
    this.tweens.add({
      targets: text,
      y: text.y - s(10),
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
    this.killsSinceLastChest += 1;
    this.bossGauge = Math.min(100, this.bossGauge + BOSS_GAUGE_PER_KILL);
    updateSaveData((save) => ({
      ...save,
      stats: {
        ...save.stats,
        totalKills: save.stats.totalKills + 1,
      },
    }));

    if (this.killsSinceLastChest >= CHEST_PITY_KILLS || Math.random() < CHEST_DROP_CHANCE) {
      this.dropChest(x, y);
      this.killsSinceLastChest = 0;
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
    let incomingDamage = rawDamage * (1 - damageReduction);
    if (this.shieldHp > 0) {
      const absorbedDamage = Math.min(this.shieldHp, incomingDamage);
      this.shieldHp -= absorbedDamage;
      incomingDamage -= absorbedDamage;
      if (this.shieldHp <= 0) {
        this.shieldRing?.destroy();
        this.shieldRing = undefined;
      }
    }
    this.playerHp = Math.max(0, this.playerHp - incomingDamage);
    this.playerHpBarVisibleUntilMs = this.elapsedMs + 1000;
    this.updateFloatingHealthBars();
    this.cameras.main.shake(90, 0.004);
    playSound('hit', this);
    this.flashPlayer();
  }

  private defeatBoss(): void {
    if (!this.boss) {
      return;
    }

    this.boss.sprite.destroy();
    this.boss = undefined;
    this.bossHpBarBg?.destroy();
    this.bossHpBarFill?.destroy();
    this.bossHpBarBg = undefined;
    this.bossHpBarFill = undefined;
    this.bossGauge = 100;
    for (const projectile of this.bossProjectiles) {
      projectile.sprite.destroy();
    }
    this.bossProjectiles = [];
    for (const hazard of this.hazards) {
      hazard.shape.destroy();
    }
    this.hazards = [];
    playSound('clear', this);
    this.openRewardModal(generateRewardOptions({ stageId: this.stageId, context: 'bossReward' }), 'bossReward', 'Boss Reward');
  }

  private dropChest(x: number, y: number): void {
    const sprite = this.add.image(
      Phaser.Math.Clamp(x, s(14), GAME_WIDTH - s(14)),
      Phaser.Math.Clamp(y, PLAY_AREA_TOP + s(14), PLAY_AREA_BOTTOM - s(14)),
      'chest_box',
    ).setDepth(2);
    this.chests.push({
      id: `chest_${this.elapsedMs}_${Math.random()}`,
      sprite,
      radius: s(16),
    });
    this.tweens.add({
      targets: sprite,
      y: sprite.y - s(4),
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
    playSound('chest', this);
    if (this.chestCountInRun % 3 === 0) {
      this.openFocusSlotModal();
      return;
    }
    const isFirstStageFirstChest = this.stageId === 1 && this.chestCountInRun === 1;
    this.openRewardModal(
      generateRewardOptions({
        stageId: this.stageId,
        context: 'normalChest',
        focusSlot: isFirstStageFirstChest ? 'weapon' : undefined,
      }),
      'normalReward',
    );
  }

  private openFocusSlotModal(): void {
    this.rewardPhase = 'focusSlotSelect';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(318), s(372), 0x16111e)
      .setStrokeStyle(s(2), 0xffb347);
    const title = this.add.text(GAME_WIDTH / 2, s(146), 'Focused Loot!', {
      fontSize: sf(25),
      color: '#ffdb9a',
    }).setOrigin(0.5);
    const subtitle = this.add.text(GAME_WIDTH / 2, s(180), 'Choose a slot to farm', {
      fontSize: sf(14),
      color: '#d7cdbd',
    }).setOrigin(0.5);
    container.add([backdrop, panel, title, subtitle]);

    const menuItems: KeyboardMenuItem[] = [];
    EQUIPMENT_SLOTS.forEach((slot, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = s(112) + col * s(136);
      const y = s(236) + row * s(58);
      const button = this.add.rectangle(x, y, s(116), s(38), 0x241b2d)
        .setStrokeStyle(s(2), 0xf0c85a)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, this.getSlotLabel(slot), {
        fontSize: sf(14),
        color: '#ffffff',
      }).setOrigin(0.5);
      const selectSlot = (): void => {
        this.openRewardModal(
          generateRewardOptions({ stageId: this.stageId, context: 'focusedChest', focusSlot: slot }),
          'focusReward',
          `${this.getSlotLabel(slot)} Focus`,
        );
      };
      button.on('pointerdown', selectSlot);
      menuItems.push({
        target: button,
        normalStrokeWidth: s(2),
        normalStrokeColor: 0xf0c85a,
        onSelect: selectSlot,
      });
      container.add([button, label]);
    });

    const skip = this.add.rectangle(GAME_WIDTH / 2, s(432), s(222), s(32), 0x302631)
      .setStrokeStyle(s(1), 0x9a8a78)
      .setInteractive({ useHandCursor: true });
    const skipText = this.add.text(GAME_WIDTH / 2, s(432), this.getSkipRewardLabel('focusReward'), {
      fontSize: sf(12),
      color: '#ffffff',
    }).setOrigin(0.5);
    const skipReward = (): void => this.skipReward();
    skip.on('pointerdown', skipReward);
    menuItems.push({
      target: skip,
      normalStrokeWidth: s(1),
      normalStrokeColor: 0x9a8a78,
      onSelect: skipReward,
    });
    container.add([skip, skipText]);
    container.add(this.add.text(GAME_WIDTH / 2, s(458), 'W/S/A/D · Enter · Click', {
      fontSize: sf(9),
      color: '#7a7468',
    }).setOrigin(0.5));
    this.modal = container;
    this.bindModalMenu(menuItems, 2);
  }

  private openRewardModal(options: RolledEquipment[], phase: 'normalReward' | 'focusReward' | 'bossReward', titleText = 'Reward Select'): void {
    this.rewardPhase = phase;
    this.clearModal();
    const shouldShowFirstRewardHint = phase !== 'bossReward' && !getSaveData().tutorial.firstRewardSeen;
    if (shouldShowFirstRewardHint) {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          firstRewardSeen: true,
        },
      }));
    }

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(336), s(572), 0x16111e)
      .setStrokeStyle(s(2), 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, s(58), titleText, {
      fontSize: sf(22),
      color: phase === 'focusReward' ? '#ffdb9a' : '#f8ddb0',
    }).setOrigin(0.5);
    const hint = shouldShowFirstRewardHint
      ? this.add.text(GAME_WIDTH / 2, s(82), 'Choose 1 gear, skip for a small run bonus, or pick the same gear to enhance it.', {
        fontSize: sf(9),
        color: '#d7cdbd',
        wordWrap: { width: s(292) },
        align: 'center',
      }).setOrigin(0.5)
      : undefined;
    container.add(hint ? [backdrop, panel, title, hint] : [backdrop, panel, title]);

    const menuItems: KeyboardMenuItem[] = [];
    options.forEach((item, index) => {
      const currentItem = getSaveData().equipped[item.slot];
      const isSameItem = currentItem?.id === item.id;
      const y = s(148) + index * s(132);
      const card = this.add.rectangle(GAME_WIDTH / 2, y, s(306), s(124), isSameItem ? 0x2e2a19 : 0x241b2d)
        .setStrokeStyle(isSameItem ? s(3) : s(2), isSameItem ? 0x9dff7a : this.getRarityColor(item.rarity))
        .setInteractive({ useHandCursor: true });
      const synergyBadge = this.getCoreSynergyKinds(item)
        .flatMap((kind, badgeIndex) => this.createSynergyBadge(kind, s(268), y - s(50) + badgeIndex * s(18)));
      const name = this.add.text(s(30), y - s(55), this.truncateText(`${this.getEquipmentDisplayName(item)} [${getRarityLabel(item.rarity)}]`, 31), {
        fontSize: sf(13),
        color: '#ffffff',
      });
      this.addTagIcons(container, item, s(30), y - s(34));
      const replaceText = this.add.text(s(30), y - s(17), this.truncateText(this.getReplacementText(item), 41), {
        fontSize: sf(10),
        color: this.getReplacementTextColor(item),
      });
      const desc = this.add.text(s(30), y + s(1), `${this.getSlotLabel(item.slot)} · ${item.playerDescription}`, {
        fontSize: sf(9),
        color: '#d7cdbd',
        wordWrap: { width: s(284) },
        maxLines: 2,
        lineSpacing: s(1),
      });
      const optionsText = this.add.text(s(30), y + s(35), this.truncateText(this.formatOptions(item, 3), 48), {
        fontSize: sf(10),
        color: '#f0d8aa',
      });
      const cardHint = this.add.text(s(30), y + s(52), isSameItem ? 'Tap: upgrade existing gear' : 'Tap: equip and replace slot', {
        fontSize: sf(9),
        color: '#9a8a78',
      });
      const selectItem = (): void => this.equipReward(item);
      card.on('pointerdown', selectItem);
      menuItems.push({
        target: card,
        normalStrokeWidth: isSameItem ? s(3) : s(2),
        normalStrokeColor: isSameItem ? 0x9dff7a : this.getRarityColor(item.rarity),
        onSelect: selectItem,
      });
      container.add([card, ...synergyBadge, name, replaceText, desc, optionsText, cardHint]);
    });

    const skip = this.add.rectangle(GAME_WIDTH / 2, s(558), s(278), s(34), 0x302631)
      .setStrokeStyle(s(1), 0x9a8a78)
      .setInteractive({ useHandCursor: true });
    const skipText = this.add.text(GAME_WIDTH / 2, s(558), this.getSkipRewardLabel(phase), {
      fontSize: sf(10),
      color: '#ffffff',
    }).setOrigin(0.5);
    const skipReward = (): void => this.skipReward();
    skip.on('pointerdown', skipReward);
    menuItems.push({
      target: skip,
      normalStrokeWidth: s(1),
      normalStrokeColor: 0x9a8a78,
      onSelect: skipReward,
    });
    container.add([skip, skipText]);
    container.add(this.add.text(GAME_WIDTH / 2, s(592), 'W/S · Enter · Click', {
      fontSize: sf(9),
      color: '#7a7468',
    }).setOrigin(0.5));
    this.modal = container;
    this.bindModalMenu(menuItems, 1);
  }

  private equipReward(item: RolledEquipment): void {
    const shouldClearStage = this.rewardPhase === 'bossReward';
    const currentItem = getSaveData().equipped[item.slot];
    const isUpgrade = currentItem?.id === item.id;
    const shouldShowFirstEquipHint = !shouldClearStage && !getSaveData().tutorial.firstEquipSeen;
    updateSaveData((save) => {
      const currentItem = save.equipped[item.slot];
      const nextItem = currentItem?.id === item.id ? this.upgradeEquipment(currentItem) : item;
      return {
        ...save,
        equipped: {
          ...save.equipped,
          [item.slot]: nextItem,
        },
      };
    });
    this.equippedCount = Object.keys(getSaveData().equipped).length;
    this.playerMaxHp = this.calculatePlayerMaxHp();
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + this.getEquippedOptionTotal('maxHpBonus'));
    playSound('equip', this);
    this.refreshEquipmentPanel();
    if (shouldClearStage) {
      this.completeStage();
      return;
    }
    if (shouldShowFirstEquipHint) {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          firstEquipSeen: true,
        },
      }));
      this.showFirstEquipModal(item, isUpgrade);
      return;
    }
    this.closeRewardModal();
  }

  private skipReward(): void {
    if (this.rewardPhase === 'bossReward') {
      this.completeStage();
      return;
    }

    this.skipBonusCount += 1;
    this.runBonusMaxHp += SKIP_BONUS_MAX_HP;
    this.playerMaxHp = this.calculatePlayerMaxHp();
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + SKIP_BONUS_HEAL);
    this.bossGauge = Math.min(100, this.bossGauge + SKIP_BONUS_BOSS_GAUGE);
    playSound('equip', this);
    this.refreshEquipmentPanel();
    this.closeRewardModal();
  }

  private closeRewardModal(): void {
    if (this.rewardPhase === 'bossReward') {
      this.completeStage();
      return;
    }
    this.equipmentInfoBlockedUntilMs = performance.now() + 240;
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
    if (this.stageId === STAGE_COUNT && !getSaveData().tutorial.endingSeen) {
      this.showEndingStoryModal();
      return;
    }
    this.finishRun(true);
  }

  private showStageIntroModal(): void {
    this.rewardPhase = 'tutorial';
    this.clearModal();
    const story = STAGE_INTRO_STORIES[this.stageId] ?? STAGE_INTRO_STORIES[1];

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(318), s(376), 0x16111e)
      .setStrokeStyle(s(2), 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, s(154), story.title, {
      fontSize: sf(20),
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(s(42), s(198), story.lines.join('\n\n'), {
      fontSize: sf(13),
      color: '#ffffff',
      lineSpacing: s(7),
      wordWrap: { width: s(278) },
    });
    const nextButton = this.add.rectangle(GAME_WIDTH / 2, s(450), s(154), s(36), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const nextText = this.add.text(GAME_WIDTH / 2, s(450), 'Continue', {
      fontSize: sf(16),
      color: '#ffffff',
    }).setOrigin(0.5);

    const continueIntro = (): void => {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          introSeen: this.stageId === 1 ? true : save.tutorial.introSeen,
          seenStageIntros: [...new Set([...save.tutorial.seenStageIntros, this.stageId])],
        },
      }));
      if (this.stageId === 1 && !getSaveData().tutorial.stage1Seen) {
        this.showTutorialModal();
        return;
      }
      this.closeRewardModal();
    };
    nextButton.on('pointerdown', continueIntro);
    this.bindModalSingleButton(nextButton, s(2), 0xf0c85a, continueIntro);

    container.add([backdrop, panel, title, body, nextButton, nextText]);
    this.modal = container;
  }

  private showEndingStoryModal(): void {
    this.rewardPhase = 'tutorial';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(318), s(410), 0x16111e)
      .setStrokeStyle(s(2), 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, s(150), 'Ending · 균열의 새벽', {
      fontSize: sf(21),
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(s(42), s(190), ENDING_STORY_LINES.join('\n\n'), {
      fontSize: sf(13),
      color: '#ffffff',
      lineSpacing: s(7),
      wordWrap: { width: s(278) },
      align: 'center',
    });
    const nextButton = this.add.rectangle(GAME_WIDTH / 2, s(506), s(178), s(36), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const nextText = this.add.text(GAME_WIDTH / 2, s(506), 'Back to Title', {
      fontSize: sf(16),
      color: '#ffffff',
    }).setOrigin(0.5);

    const goToTitle = (): void => {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          endingSeen: true,
        },
      }));
      this.clearModal();
      this.rewardPhase = 'none';
      playSound('ui_click', this);
      this.scene.start('TitleScene');
    };
    nextButton.on('pointerdown', goToTitle);
    this.bindModalSingleButton(nextButton, s(2), 0xf0c85a, goToTitle);

    container.add([backdrop, panel, title, body, nextButton, nextText]);
    this.modal = container;
  }

  private showTutorialModal(): void {
    this.rewardPhase = 'tutorial';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(318), s(394), 0x16111e)
      .setStrokeStyle(s(2), 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, s(150), 'How to Play', {
      fontSize: sf(22),
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(s(42), s(186), [
      '1. 이동만 직접 조작합니다.',
      '   PC: WASD / 방향키',
      '   모바일: 하단 왼쪽 조이스틱 드래그',
      '',
      '2. 공격은 자동으로 발동합니다.',
      '   무기를 바꾸면 공격 방식도 바뀝니다.',
      '',
      '3. 상자를 먹으면 장비 3택이 열립니다.',
      '   PC: W/S 선택 · Enter/Space 확인',
      '   3번째 상자는 원하는 부위 집중 파밍입니다.',
      '',
      '4. 보스 게이지가 차면 보스가 등장합니다.',
      '   보스를 잡으면 다음 스테이지가 열립니다.',
    ].join('\n'), {
      fontSize: sf(13),
      color: '#ffffff',
      lineSpacing: s(5),
      wordWrap: { width: s(278) },
    });
    const startButton = this.add.rectangle(GAME_WIDTH / 2, s(470), s(154), s(36), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const startText = this.add.text(GAME_WIDTH / 2, s(470), 'Start', {
      fontSize: sf(16),
      color: '#ffffff',
    }).setOrigin(0.5);

    const startRun = (): void => {
      updateSaveData((save) => ({
        ...save,
        tutorial: {
          ...save.tutorial,
          stage1Seen: true,
        },
      }));
      this.closeRewardModal();
    };
    startButton.on('pointerdown', startRun);
    this.bindModalSingleButton(startButton, s(2), 0xf0c85a, startRun);

    container.add([backdrop, panel, title, body, startButton, startText]);
    this.modal = container;
  }

  private showFirstEquipModal(item: RolledEquipment, isUpgrade: boolean): void {
    this.rewardPhase = 'tutorial';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.66)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(306), s(286), 0x16111e)
      .setStrokeStyle(s(2), 0xf0c85a);
    const title = this.add.text(GAME_WIDTH / 2, s(202), 'Reward Equipped', {
      fontSize: sf(22),
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(s(48), s(244), [
      `${this.getEquipmentDisplayName(item)} 장비가 적용되었습니다.`,
      '',
      isUpgrade
        ? '같은 장비라 기존 장비가 +강화되었습니다.'
        : '같은 슬롯의 기존 장비가 있었다면 새 장비로 교체됩니다.',
      '',
      '효과는 즉시 공격, 생존력, 시너지에 반영됩니다.',
    ].join('\n'), {
      fontSize: sf(12),
      color: '#ffffff',
      lineSpacing: s(5),
      wordWrap: { width: s(264) },
    });
    const okButton = this.add.rectangle(GAME_WIDTH / 2, s(430), s(132), s(34), 0x26314a)
      .setStrokeStyle(s(2), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const okText = this.add.text(GAME_WIDTH / 2, s(430), 'OK', {
      fontSize: sf(15),
      color: '#ffffff',
    }).setOrigin(0.5);

    const closeFirstEquip = (): void => this.closeRewardModal();
    okButton.on('pointerdown', closeFirstEquip);
    this.bindModalSingleButton(okButton, s(2), 0xf0c85a, closeFirstEquip);
    container.add([backdrop, panel, title, body, okButton, okText]);
    this.modal = container;
  }

  private showEquipmentInfo(slot: EquipmentSlot): void {
    const item = getSaveData().equipped[slot];
    this.rewardPhase = 'infoPopup';
    this.clearModal();

    const container = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, s(308), s(292), 0x16111e)
      .setStrokeStyle(s(2), 0x9a8a78);
    const title = this.add.text(GAME_WIDTH / 2, s(208), item ? this.getEquipmentDisplayName(item) : `${SLOT_LABELS[slot]} Empty`, {
      fontSize: sf(20),
      color: '#f8ddb0',
    }).setOrigin(0.5);
    const body = this.add.text(s(50), s(244), item ? this.formatEquipmentInfo(item) : '아직 장착된 장비가 없습니다.', {
      fontSize: sf(13),
      color: '#ffffff',
      lineSpacing: s(6),
      wordWrap: { width: s(262) },
    });
    const close = this.add.rectangle(GAME_WIDTH / 2, s(412), s(116), s(32), 0x26314a)
      .setStrokeStyle(s(1), 0xf0c85a)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add.text(GAME_WIDTH / 2, s(412), '닫기', {
      fontSize: sf(14),
      color: '#ffffff',
    }).setOrigin(0.5);
    const closeInfo = (): void => this.closeRewardModal();
    close.on('pointerdown', closeInfo);
    this.bindModalSingleButton(close, s(1), 0xf0c85a, closeInfo);
    container.add([backdrop, panel, title, body, close, closeText]);
    this.modal = container;
  }

  private bindModalMenu(items: KeyboardMenuItem[], columns = 1): void {
    this.keyboardMenu.bind(items, columns);
  }

  private bindModalSingleButton(
    button: Phaser.GameObjects.Rectangle,
    normalStrokeWidth: number,
    normalStrokeColor: number,
    onSelect: () => void,
  ): void {
    this.bindModalMenu([{
      target: button,
      normalStrokeWidth,
      normalStrokeColor,
      onSelect,
    }], 1);
  }

  private clearModal(): void {
    this.keyboardMenu.unbind();
    this.modal?.destroy(true);
    this.modal = undefined;
  }

  private isGameplayPaused(): boolean {
    return this.rewardPhase !== 'none';
  }

  private flashPlayer(): void {
    if (!this.player) {
      return;
    }

    this.player.setTexture('player_hit');
    this.tweens.add({
      targets: this.player,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 55,
      yoyo: true,
    });
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

  private updateFloatingHealthBars(): void {
    if (this.player && this.playerHpBarBg && this.playerHpBarFill) {
      const visible = this.elapsedMs <= this.playerHpBarVisibleUntilMs && this.playerHp < this.playerMaxHp;
      const x = Phaser.Math.Clamp(this.player.x - s(22), s(4), GAME_WIDTH - s(48));
      const y = this.player.y - s(22);
      const ratio = Phaser.Math.Clamp(this.playerHp / this.playerMaxHp, 0, 1);
      this.playerHpBarBg.setPosition(x, y).setVisible(visible);
      this.playerHpBarFill.setPosition(x + s(1), y).setSize(s(42) * ratio, s(4)).setVisible(visible);
    }
    if (this.player && this.shieldRing) {
      this.shieldRing.setPosition(this.player.x, this.player.y);
      this.shieldRing.setAlpha(Phaser.Math.Clamp(this.shieldHp / Math.max(1, this.shieldMaxHp), 0.18, 0.75));
    }

    if (this.boss && this.bossHpBarBg && this.bossHpBarFill) {
      const x = Phaser.Math.Clamp(this.boss.sprite.x - s(38), s(4), GAME_WIDTH - s(80));
      const y = this.boss.sprite.y - this.boss.radius - s(14);
      const ratio = Phaser.Math.Clamp(this.boss.hp / this.boss.def.hp, 0, 1);
      this.bossHpBarBg.setPosition(x, y);
      this.bossHpBarFill.setPosition(x + s(1), y).setSize(s(74) * ratio, s(5));
    }
  }

  private refreshEquipmentPanel(): void {
    for (const slot of EQUIPMENT_SLOTS) {
      this.slotLine2Texts.get(slot)?.setText(this.getSlotLine2Text(slot));
    }
    this.synergyText?.setText(this.getSynergyLine());
  }

  private getSlotLine2Text(slot: EquipmentSlot): string {
    const item = getSaveData().equipped[slot];
    if (!item) {
      return 'Empty';
    }
    const name = this.getEquipmentDisplayName(item);
    return this.truncateText(name, 7);
  }

  private getSynergyLine(): string {
    return this.truncateText(this.getSynergySummary(), 42);
  }

  private upgradeEquipment(item: RolledEquipment): RolledEquipment {
    const currentLevel = item.upgradeLevel ?? 0;
    const nextLevel = Math.min(MAX_EQUIPMENT_UPGRADE, currentLevel + 1);
    if (nextLevel === currentLevel) {
      return item;
    }

    const multiplier = 1 + UPGRADE_POWER_STEP;
    const rolledOptions: RolledEquipment['rolledOptions'] = {};
    for (const [key, value] of Object.entries(item.rolledOptions)) {
      rolledOptions[key as keyof RolledEquipment['rolledOptions']] = typeof value === 'number' ? Math.round(value * multiplier * 100) / 100 : value;
    }

    return {
      ...item,
      upgradeLevel: nextLevel,
      rolledOptions,
    };
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
    const radius = s(weapon?.rolledOptions.radiusPx ?? 44) * this.getMultiplierProduct('areaRadiusMultiplier');
    const chainCount = Math.max(1, this.getEquippedOptionTotal('chainCount'));
    const pierceCount = weapon?.rolledOptions.pierceCount ?? 2;
    const projectileSpeed = s(weapon?.rolledOptions.projectileSpeed ?? 280);

    return {
      minDamage,
      maxDamage,
      cooldownMs: Phaser.Math.Clamp(cooldown, 160, 2500),
      range: Phaser.Math.Clamp(range, s(52), s(260)),
      damageMultiplier,
      radius: Phaser.Math.Clamp(radius, s(32), s(120)),
      chainCount,
      pierceCount,
      projectileSpeed,
      skillKind,
    };
  }

  private getSupportSkillStats(necklace: RolledEquipment): SupportSkillStats {
    const radius = s(necklace.rolledOptions.radiusPx ?? 48) * this.getMultiplierProduct('areaRadiusMultiplier');
    const cooldown = (necklace.rolledOptions.cooldownMs ?? 5200) * this.getMultiplierProduct('supportCooldownMultiplier');
    const dotDurationBonus = this.getEquippedOptionTotal('dotDurationMs') - (necklace.rolledOptions.dotDurationMs ?? 0);
    const slowBonus = this.getEquippedOptionTotal('slowPercent') - (necklace.rolledOptions.slowPercent ?? 0);
    const shieldBonus = this.getEquippedOptionTotal('shieldAmount') - (necklace.rolledOptions.shieldAmount ?? 0);
    const dotDuration = (necklace.rolledOptions.dotDurationMs ?? 2800) + dotDurationBonus;
    return {
      minDamage: necklace.rolledOptions.baseDamageMin ?? 6,
      maxDamage: necklace.rolledOptions.baseDamageMax ?? 12,
      cooldownMs: Phaser.Math.Clamp(cooldown, 900, 9000),
      radius: Phaser.Math.Clamp(radius, s(28), s(130)),
      dotDamagePerSec: (necklace.rolledOptions.dotDamagePerSec ?? 2) * this.getSupportDamageMultiplier(necklace.tags),
      dotDurationMs: Phaser.Math.Clamp(dotDuration, 600, 9000),
      slowPercent: Phaser.Math.Clamp((necklace.rolledOptions.slowPercent ?? 0) + slowBonus, 0, 0.75),
      shieldAmount: Math.max(0, (necklace.rolledOptions.shieldAmount ?? 0) + shieldBonus),
      skillKind: necklace.skillKind,
      tags: necklace.tags,
    };
  }

  private getBaseRangeForSkill(skillKind: SkillKind): number {
    if (skillKind === 'fireProjectileExplosion' || skillKind === 'returningPoisonProjectile') {
      return s(170);
    }
    if (skillKind === 'lightningStrike') {
      return s(145);
    }
    if (skillKind === 'slashCone') {
      return s(92);
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

  private getSupportDamageMultiplier(tags: readonly string[]): number {
    let multiplier = this.getMultiplierProduct('supportDamageMultiplier');
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
    return Math.round(BASE_PLAYER_MAX_HP + this.runBonusMaxHp + this.getEquippedOptionTotal('maxHpBonus'));
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

  private getEquipmentDisplayName(item: RolledEquipment): string {
    const level = item.upgradeLevel ?? 0;
    return level > 0 ? `${item.nameKo} +${level}` : item.nameKo;
  }

  private addTagIcons(container: Phaser.GameObjects.Container, item: RolledEquipment, x: number, y: number): void {
    const tags = this.getDisplayTags(item);
    let cursorX = x;
    tags.forEach((tag) => {
      const config = TAG_ICON_CONFIG[tag];
      const width = s(50);
      const pill = this.add.rectangle(cursorX, y, width, s(15), config.color, 0.24)
        .setOrigin(0, 0.5)
        .setStrokeStyle(s(1), config.color, 0.95);
      const label = this.add.text(cursorX + width / 2, y, config.label, {
        fontSize: sf(8),
        color: '#ffffff',
      }).setOrigin(0.5);
      container.add([pill, label]);
      cursorX += width + s(4);
    });
  }

  private createSynergyBadge(kind: 'weapon' | 'necklace', x: number, y: number): Phaser.GameObjects.GameObject[] {
    const bg = this.add.rectangle(x, y, s(64), s(16), 0x3b2d13, 0.92)
      .setOrigin(0.5)
      .setStrokeStyle(s(1), 0xffd36a, 0.95);
    const label = this.add.text(x, y, kind === 'weapon' ? '⚔ SYN' : '📿 SYN', {
      fontSize: sf(8),
      color: '#ffe7a3',
    }).setOrigin(0.5);
    return [bg, label];
  }

  private getCoreSynergyKinds(item: RolledEquipment): Array<'weapon' | 'necklace'> {
    const save = getSaveData();
    const ignoredTags = new Set<Tag>(['mainAttack', 'supportSkill', 'defense']);
    const itemTags = new Set(item.tags.filter((tag) => !ignoredTags.has(tag)));
    const hasSynergyWith = (coreItem: RolledEquipment | undefined) => {
      if (!coreItem || coreItem.instanceId === item.instanceId) {
        return false;
      }
      return coreItem.tags.some((tag) => itemTags.has(tag));
    };
    return [
      ...(hasSynergyWith(save.equipped.weapon) ? ['weapon' as const] : []),
      ...(hasSynergyWith(save.equipped.necklace) ? ['necklace' as const] : []),
    ];
  }

  private getDisplayTags(item: RolledEquipment): Tag[] {
    return [...item.tags]
      .sort((a, b) => TAG_ICON_CONFIG[a].priority - TAG_ICON_CONFIG[b].priority)
      .slice(0, 5);
  }

  private getSlotLabel(slot: EquipmentSlot): string {
    return `${SLOT_ICONS[slot]} ${SLOT_LABELS[slot]}`;
  }

  private getReplacementText(item: RolledEquipment): string {
    const currentItem = getSaveData().equipped[item.slot];
    if (!currentItem) {
      return `New ${SLOT_LABELS[item.slot]} slot`;
    }
    if (currentItem.id === item.id) {
      const nextLevel = Math.min(MAX_EQUIPMENT_UPGRADE, (currentItem.upgradeLevel ?? 0) + 1);
      return (currentItem.upgradeLevel ?? 0) >= MAX_EQUIPMENT_UPGRADE
        ? `Same gear · already +${MAX_EQUIPMENT_UPGRADE}`
        : `Same gear · upgrade ${this.getEquipmentDisplayName(currentItem)} → +${nextLevel}`;
    }
    return `Replaces ${this.getEquipmentDisplayName(currentItem)}`;
  }

  private getReplacementTextColor(item: RolledEquipment): string {
    const currentItem = getSaveData().equipped[item.slot];
    if (!currentItem) {
      return '#ffdb9a';
    }
    if (currentItem.id === item.id) {
      return '#9dff7a';
    }
    return '#ff8585';
  }

  private getSkipRewardLabel(phase: 'normalReward' | 'focusReward' | 'bossReward'): string {
    if (phase === 'bossReward') {
      return '선택 안 함 · Stage Clear';
    }
    return `선택 안 함: HP+${SKIP_BONUS_MAX_HP} / Heal+${SKIP_BONUS_HEAL} / Boss+${SKIP_BONUS_BOSS_GAUGE}%`;
  }

  private truncateText(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
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
      `Tags: ${this.getDisplayTags(item).map((tag) => TAG_ICON_CONFIG[tag].label).join(' / ')}`,
      this.formatOptions(item, 8),
    ].join('\n');
  }

  private formatOptions(item: RolledEquipment, limit: number): string {
    return Object.entries(item.rolledOptions)
      .slice(0, limit)
      .map(([key, value]) => `${this.formatOptionKey(key)} ${value}`)
      .join(' · ');
  }

  private formatOptionKey(key: string): string {
    const labels: Record<string, string> = {
      baseDamageMin: 'DMG-',
      baseDamageMax: 'DMG+',
      cooldownMs: 'CD',
      rangePx: 'RNG',
      radiusPx: 'AOE',
      projectileSpeed: 'SPD',
      pierceCount: 'PIR',
      chainCount: 'CHN',
      dotDamagePerSec: 'DOT',
      dotDurationMs: 'DOT-T',
      slowPercent: 'SLOW',
      slowDurationMs: 'SLOW-T',
      shieldAmount: 'SHD',
      shieldDurationMs: 'SHD-T',
      maxHpBonus: 'HP',
      hpRegenPerSec: 'REG',
      damageReductionPercent: 'DR',
      lifestealPercent: 'LIFE',
      mainDamageMultiplier: 'MAIN DMG',
      supportDamageMultiplier: 'SUP DMG',
      fireDamageMultiplier: 'FIR DMG',
      iceDamageMultiplier: 'ICE DMG',
      lightningDamageMultiplier: 'LIT DMG',
      poisonDamageMultiplier: 'PSN DMG',
      physicalDamageMultiplier: 'PHY DMG',
      mainCooldownMultiplier: 'MAIN CD',
      supportCooldownMultiplier: 'SUP CD',
      areaRadiusMultiplier: 'AOE+',
      projectileSpeedMultiplier: 'PRJ SPD',
      meleeRangeMultiplier: 'MEL RNG',
      orbitTickRateMultiplier: 'ORB SPD',
      echoChance: 'ECHO',
      echoDamageMultiplier: 'ECHO DMG',
      critChance: 'CRIT',
      critDamageMultiplier: 'CRIT DMG',
      armorAmplifyMultiplier: 'AMP',
      bossDamageMultiplier: 'BOSS',
    };
    return labels[key] ?? key;
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
