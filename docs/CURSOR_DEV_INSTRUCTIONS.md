# 6-Slot Hero — Cursor 개발 지시서 v0.2

> 목적: 이 문서는 Cursor에서 `6-Slot Hero`의 플레이 가능한 웹게임 MVP를 빠르게 구현하기 위한 개발 지시서다.  
> 우선순위는 **리소스 완성도보다 실제 동작하는 게임 흐름**이다.  
> 최종 제출 기한: **2026-06-08 10:00 KST**  
> 최종 제출 필수 항목: **배포 URL, GitHub 저장소 링크, 유튜브 시연 영상 링크**

---

## v0.2에서 보강된 점

이 버전은 기존 v0.1을 기반으로 실개발 전 검토 피드백을 반영한 개선판이다.

주요 보강 내용:

```txt
1. 장비 효과를 설명문이 아니라 optionRolls 기반 구현 명세로 확장
2. Phaser Scene 간 데이터 흐름을 storage.ts 싱글턴 패턴으로 고정
3. localStorage 실패/파손 데이터 처리 코드를 명시
4. BootScene의 역할을 임시 텍스처 생성 + SaveData 로드로 명확화
5. 집중 파밍의 2단계 UI 전체 동안 전투가 정지됨을 명시
6. 보스 5종에 사용할 최소 패턴 타입과 Stage별 배치를 정의
7. 각 Milestone에 전제 조건을 추가
8. Cursor가 그대로 따라갈 수 있는 첫 작업 프롬프트와 단계별 프롬프트 보강
```

---

## 0. 프로젝트 핵심 요약

### 게임 제목

**6-Slot Hero**

### 한 줄 설명

`6-Slot Hero`는 1분 30초 내외의 짧은 스테이지를 반복하며 장비를 파밍하고, 6개 장비 슬롯 조합으로 캐릭터를 성장시켜 Stage 5 최종 보스를 처치하는 웹 기반 파밍 서바이버 RPG다.

### 핵심 플레이 루프

```txt
시작 화면
→ 스테이지 선택
→ 전투 진입
→ 몬스터 처치
→ 보물상자 획득
→ 장비 3택 또는 선택 안 함
→ 3번째 상자마다 집중 파밍
→ 보스 게이지 충전
→ 보스 등장
→ 보스 처치
→ 고급 장비 보상
→ 다음 스테이지 해금
→ 더 높은 스테이지 도전
```

### 가장 중요한 기획 의도

- 조작은 단순하게: **이동만 직접 조작, 공격은 장비에 의해 자동 발동**
- 성장은 명확하게: **레벨업보다 장비 교체가 성장의 중심**
- 파밍은 빠르게: **한 스테이지에서 보스 포함 약 8~10회 보상 선택 기회**
- UI는 단순하게: **인벤토리 없음, 장비 슬롯 6칸만 존재**
- 제출 우선: **완벽한 밸런스보다 처음부터 끝까지 플레이 가능한 완주 흐름 우선**

---

## 1. 권장 기술 스택

### 기본 스택

```txt
Vite
TypeScript
Phaser 3
CSS
localStorage
```

### 피해야 할 것

MVP에서는 아래를 만들지 않는다.

```txt
백엔드 서버
로그인
온라인 랭킹
결제
상점
복잡한 인벤토리
아이템 판매/분해
강화석
제작 시스템
스킬트리
소환수 시스템
멀티플레이
유료 API 의존
```

### 개발 원칙

```txt
1. 먼저 끝까지 플레이 가능한 루프를 만든다.
2. 리소스가 없으면 Phaser Graphics 도형과 텍스트로 대체한다.
3. 새 시스템을 추가하지 말고 기존 루프를 완성한다.
4. npm run build가 계속 성공해야 한다.
5. 밸런스는 임시값으로 시작하고, 플레이 가능 버전 이후 조정한다.
```

---

## 2. 저장소 생성 후 초기 세팅 지시

사용자가 GitHub에 public 저장소를 생성한 뒤, Cursor에서 아래 흐름으로 작업한다.

### 초기 명령 예시

```bash
npm create vite@latest . -- --template vanilla-ts
npm install
npm install phaser
npm run dev
```

### 기본 스크립트

`package.json`에 최소한 아래가 있어야 한다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 배포 기준

- Vercel 또는 Netlify 사용 권장
- Vercel 사용 시:
  - Build Command: `npm run build`
  - Output Directory: `dist`
- 별도 회원가입/결제 없이 브라우저에서 바로 플레이 가능해야 한다.
- 외부 API 의존 없이 정적 사이트로 실행되는 것을 목표로 한다.

---

## 3. 권장 폴더 구조

아래 구조를 우선 목표로 한다.

```txt
/
├─ public/
│  └─ assets/
│     ├─ README.md
│     ├─ sprites/
│     ├─ icons/
│     ├─ sfx/
│     └─ bgm/
├─ src/
│  ├─ main.ts
│  ├─ styles.css
│  ├─ game/
│  │  ├─ config.ts
│  │  ├─ types.ts
│  │  ├─ constants.ts
│  │  ├─ storage.ts
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ TitleScene.ts
│  │  │  ├─ StageSelectScene.ts
│  │  │  ├─ GameScene.ts
│  │  │  └─ ResultScene.ts
│  │  ├─ data/
│  │  │  ├─ equipment.ts
│  │  │  ├─ stages.ts
│  │  │  ├─ enemies.ts
│  │  │  └─ bosses.ts
│  │  ├─ systems/
│  │  │  ├─ InputSystem.ts
│  │  │  ├─ CombatSystem.ts
│  │  │  ├─ EquipmentSystem.ts
│  │  │  ├─ RewardSystem.ts
│  │  │  ├─ SpawnSystem.ts
│  │  │  ├─ BossSystem.ts
│  │  │  ├─ HudSystem.ts
│  │  │  └─ EffectsSystem.ts
│  │  └─ utils/
│  │     ├─ random.ts
│  │     ├─ math.ts
│  │     └─ format.ts
│  └─ vite-env.d.ts
├─ docs/
│  ├─ CURSOR_DEV_INSTRUCTIONS.md
│  ├─ GAME_DESIGN_SUMMARY.md
│  ├─ ASSET_PLAN.md
│  └─ SUBMISSION_CHECKLIST.md
├─ README.md
└─ package.json
```

### 주의

- 실제 파일 수가 많아지는 것이 부담되면 처음에는 `GameScene.ts`에 많이 넣어도 된다.
- 다만 **장비 데이터, 스테이지 데이터, 보스 데이터, 저장 데이터는 반드시 분리**한다.
- 기능 구현이 먼저고, 리팩토링은 1차 플레이 가능 버전 이후에 한다.

---

## 4. 게임 화면 기준

### 화면 비율

- 기본 논리 해상도: **360 x 640**
- 세로형 9:16 모바일 화면을 기준으로 설계한다.
- PC에서는 브라우저 중앙에 세로형 캔버스를 표시한다.
- Phaser Scale 설정은 `FIT` + `CENTER_BOTH` 계열을 사용한다.

### 화면 레이아웃 예시

```txt
┌────────────────────┐
│ HUD                │ Stage / HP / Boss Gauge / Chest 2/3
├────────────────────┤
│                    │
│                    │
│ 전투 영역           │ Player / Enemies / Projectiles / Chests / Boss
│                    │
│                    │
├────────────────────┤
│ 조작 + 장비 영역     │ Mobile drag area + 6 equipment slots
│                    │
└────────────────────┘
```

### 모바일 조작 영역

스마트폰 하단 네비게이션 바 때문에 화면 최하단에만 이동 조작을 두면 불편할 수 있다. 따라서 다음 방식으로 구현한다.

- 모바일에서는 **전투 화면 하단부 + 장비 패널 전체**를 드래그 이동 영역으로 사용한다.
- 장비 아이콘을 짧게 탭하면 장비 정보 팝업을 보여준다.
- 장비 아이콘 위에서 드래그하면 이동으로 처리한다.
- 탭과 드래그를 구분한다.
  - 이동 거리 8px 이하 + 200ms 이하: 탭
  - 그 이상: 드래그 이동
- 전투 중 보상 선택 모달이 열려 있을 때는 이동 입력을 막는다.

### PC 조작

- WASD 이동
- 방향키 이동도 지원하면 좋다.
- 마우스 클릭으로 장비 정보 확인
- 마우스 클릭으로 보상 카드 선택

---

## 5. Scene 구성과 데이터 흐름

### 5.0 Scene 데이터 흐름 원칙

**중요: SaveData는 `Phaser.Registry`나 `scene.start()` data로 넘기지 않는다.**

저장 데이터는 `src/game/storage.ts`에서 전역 싱글턴처럼 관리한다.
모든 Scene은 아래 함수들을 import해서 사용한다.

```ts
import {
  getSaveData,
  setSaveData,
  updateSaveData,
  resetSaveData,
  loadSaveData,
  persistSaveData,
} from '../storage';
```

사용 규칙:

```txt
- BootScene: loadSaveData()를 한 번 호출해 메모리 save cache를 초기화한다.
- TitleScene / StageSelectScene / GameScene / ResultScene: getSaveData()로 현재 저장 상태를 읽는다.
- 장비 장착, Stage 해금, 설정 변경: updateSaveData() 또는 setSaveData()로 저장한다.
- scene.start(data)는 selectedStageId, runResult 같은 일시적인 화면 전환 데이터에만 사용한다.
- Phaser.Registry는 전역 저장 데이터의 원본으로 사용하지 않는다.
```

권장 일시 데이터 예시:

```ts
this.scene.start('GameScene', { stageId: 1 });
this.scene.start('ResultScene', {
  stageId,
  cleared: true,
  survivedMs,
  kills,
  equippedCount,
});
```

---

### 5.1 BootScene

역할:

```txt
1. 기본 설정 초기화
2. Phaser Graphics 기반 임시 텍스처 생성
3. localStorage에서 SaveData 로드
4. TitleScene으로 이동
```

BootScene은 단순 pass-through가 아니다. 최소한 아래 순서를 지킨다.

```txt
BootScene.create()
→ createGeneratedTextures()
→ loadSaveData()
→ this.scene.start('TitleScene')
```

필수 임시 텍스처:

```txt
player_circle
player_hit
crawler_enemy
runner_enemy
brute_enemy
boss_large
chest_box
projectile_orb
slash_arc
aoe_circle
warning_marker
item_card_bg
```

완료 조건:

```txt
임시 텍스처 최소 6종 이상 생성
SaveData 로드 또는 기본값 생성 완료
콘솔 에러 없이 TitleScene 진입
```

---

### 5.2 TitleScene

구성:

```txt
6-Slot Hero
Click / Touch to Start
```

동작:

- 클릭 또는 터치 시 StageSelectScene으로 이동
- 최초 진입이면 Stage 1만 열려 있어야 한다.

---

### 5.3 StageSelectScene

구성:

```txt
Stage 1: Open
Stage 2: Locked or Open
Stage 3: Locked or Open
Stage 4: Locked or Open
Stage 5: Locked or Open

Character Status
Volume
Reset Data
```

동작:

- `getSaveData().unlockedStage` 기준으로 Stage 잠금/해금 표시
- 클리어한 스테이지 다음 스테이지 해금
- 클리어한 스테이지는 재입장 가능
- Character Status 버튼 클릭 시 현재 장비 6슬롯 팝업
- Reset Data 버튼은 확인 후 `resetSaveData()` 호출
- Volume 조절은 간단한 슬라이더 또는 버튼으로 구현

---

### 5.4 GameScene

핵심 전투 씬.

필수 요소:

```txt
플레이어 이동
자동 공격
몬스터 스폰
몬스터 추적
피격/체력
보물상자 드랍
보상 선택 모달
집중 파밍 부위 선택 모달
보스 게이지
보스 등장
보스 패턴
보스 처치
사망/클리어 판정
```

GameScene은 `scene.start('GameScene', { stageId })`로 받은 stageId만 사용하고, 장비/해금 상태는 `getSaveData()`에서 읽는다.

---

### 5.5 ResultScene

사망 또는 클리어 후 결과 표시.

표시 정보:

```txt
결과: 클리어 / 실패
스테이지
생존 시간
처치 수
획득/교체한 장비 수
현재 장비 요약
다시 도전
스테이지 선택으로
```

ResultScene은 일시 결과 데이터만 `scene.start()` data로 받는다. 영구 저장 데이터는 `storage.ts`를 통해 읽는다.

---

## 6. 저장 데이터와 localStorage 처리

### 저장 방식

- localStorage 사용
- 계정/서버 없음
- 저장 실패 시 기본값으로 안전 복구
- 저장 데이터가 파손되어도 게임이 실행되어야 한다.

### 저장 키

```ts
export const SAVE_KEY = 'six_slot_hero_save_v1';
```

### 저장 데이터 타입

```ts
export type EquipmentSlot = 'weapon' | 'necklace' | 'helmet' | 'gloves' | 'armor' | 'belt';

export interface SaveData {
  version: number;
  unlockedStage: number; // 1~5
  clearedStages: number[];
  equipped: Partial<Record<EquipmentSlot, RolledEquipment>>;
  settings: {
    volume: number;
  };
  stats: {
    totalRuns: number;
    totalKills: number;
    bestStage: number;
  };
}
```

### 초기 상태

```ts
export function getDefaultSaveData(): SaveData {
  return {
    version: 1,
    unlockedStage: 1,
    clearedStages: [],
    equipped: {},
    settings: {
      volume: 0.7,
    },
    stats: {
      totalRuns: 0,
      totalKills: 0,
      bestStage: 1,
    },
  };
}
```

무기가 없을 경우 플레이어는 기본 주먹 공격을 사용한다.

### 필수 구현 패턴

`storage.ts`는 메모리 캐시와 localStorage를 모두 관리한다.

```ts
import type { SaveData } from './types';

export const SAVE_KEY = 'six_slot_hero_save_v1';

let cachedSaveData: SaveData = getDefaultSaveData();

export function getDefaultSaveData(): SaveData {
  return {
    version: 1,
    unlockedStage: 1,
    clearedStages: [],
    equipped: {},
    settings: { volume: 0.7 },
    stats: { totalRuns: 0, totalKills: 0, bestStage: 1 },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      cachedSaveData = getDefaultSaveData();
      return cachedSaveData;
    }

    const parsed = JSON.parse(raw) as Partial<SaveData>;
    cachedSaveData = normalizeSaveData(parsed);
    return cachedSaveData;
  } catch (error) {
    console.warn('Failed to load save data. Falling back to defaults.', error);
    cachedSaveData = getDefaultSaveData();
    return cachedSaveData;
  }
}

export function getSaveData(): SaveData {
  return cachedSaveData;
}

export function setSaveData(next: SaveData): void {
  cachedSaveData = normalizeSaveData(next);
  persistSaveData(cachedSaveData);
}

export function updateSaveData(updater: (current: SaveData) => SaveData): SaveData {
  const next = normalizeSaveData(updater(cachedSaveData));
  cachedSaveData = next;
  persistSaveData(next);
  return next;
}

export function persistSaveData(data: SaveData = cachedSaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist save data.', error);
  }
}

export function resetSaveData(): SaveData {
  cachedSaveData = getDefaultSaveData();
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear save data.', error);
  }
  return cachedSaveData;
}

function normalizeSaveData(input: Partial<SaveData>): SaveData {
  const defaults = getDefaultSaveData();
  return {
    version: typeof input.version === 'number' ? input.version : defaults.version,
    unlockedStage: clampStage(input.unlockedStage ?? defaults.unlockedStage),
    clearedStages: Array.isArray(input.clearedStages) ? input.clearedStages.filter(isStageNumber) : [],
    equipped: input.equipped ?? {},
    settings: {
      volume: clamp01(input.settings?.volume ?? defaults.settings.volume),
    },
    stats: {
      totalRuns: input.stats?.totalRuns ?? 0,
      totalKills: input.stats?.totalKills ?? 0,
      bestStage: clampStage(input.stats?.bestStage ?? 1),
    },
  };
}

function clampStage(value: number): number {
  return Math.max(1, Math.min(5, Math.floor(value)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isStageNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 1 && value <= 5;
}
```

---

## 7. 핵심 TypeScript 타입

`src/game/types.ts`에 가까운 형태로 구현한다.

```ts
export type EquipmentSlot = 'weapon' | 'necklace' | 'helmet' | 'gloves' | 'armor' | 'belt';

export type Rarity = 'common' | 'rare' | 'epic' | 'relic' | 'bossUnique';

export type Tag =
  | 'mainAttack'
  | 'supportSkill'
  | 'melee'
  | 'projectile'
  | 'orbit'
  | 'area'
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'defense'
  | 'shield'
  | 'lifesteal';

export type OptionKey =
  | 'baseDamageMin'
  | 'baseDamageMax'
  | 'cooldownMs'
  | 'rangePx'
  | 'radiusPx'
  | 'projectileSpeed'
  | 'pierceCount'
  | 'chainCount'
  | 'dotDamagePerSec'
  | 'dotDurationMs'
  | 'slowPercent'
  | 'slowDurationMs'
  | 'shieldAmount'
  | 'shieldDurationMs'
  | 'maxHpBonus'
  | 'hpRegenPerSec'
  | 'damageReductionPercent'
  | 'lifestealPercent'
  | 'mainDamageMultiplier'
  | 'supportDamageMultiplier'
  | 'fireDamageMultiplier'
  | 'iceDamageMultiplier'
  | 'lightningDamageMultiplier'
  | 'poisonDamageMultiplier'
  | 'physicalDamageMultiplier'
  | 'mainCooldownMultiplier'
  | 'supportCooldownMultiplier'
  | 'areaRadiusMultiplier'
  | 'projectileSpeedMultiplier'
  | 'meleeRangeMultiplier'
  | 'orbitTickRateMultiplier'
  | 'echoChance'
  | 'echoDamageMultiplier'
  | 'critChance'
  | 'critDamageMultiplier'
  | 'armorAmplifyMultiplier'
  | 'bossDamageMultiplier';

export interface EquipmentOptionRoll {
  key: OptionKey;
  min: number;
  max: number;
}

export type SkillKind =
  | 'bareFist'
  | 'slashCone'
  | 'lightningStrike'
  | 'fireProjectileExplosion'
  | 'returningPoisonProjectile'
  | 'thunderAoe'
  | 'shieldPulse'
  | 'frostPulse'
  | 'poisonPool'
  | 'passiveModifier';

export interface EquipmentDef {
  id: string;
  nameKo: string;
  nameEn: string;
  slot: EquipmentSlot;
  tags: Tag[];
  skillKind: SkillKind;
  playerDescription: string;
  developerNote: string;
  basePower: number;
  fixedOptionCount: number;
  optionRolls: EquipmentOptionRoll[];
}

export interface RolledEquipment extends EquipmentDef {
  instanceId: string;
  stageFound: number;
  rarity: Rarity;
  rolledOptions: Record<OptionKey, number>;
}
```

### 수치 롤링 규칙

```txt
- optionRolls의 개수는 장비마다 고정이다.
- 각 optionRoll은 min~max 사이의 수치로 무작위 롤된다.
- 등급/스테이지 보정은 generateEquipmentInstance() 내부에서 적용한다.
- 플레이어에게 모든 내부 수치를 보여줄 필요는 없다.
```

권장 구현:

```ts
export function rollEquipment(def: EquipmentDef, params: { stageId: number; rarity: Rarity }): RolledEquipment {
  const stageMultiplier = getStageStatMultiplier(params.stageId);
  const rarityMultiplier = getRarityStatMultiplier(params.rarity);
  const rolledOptions = {} as Record<OptionKey, number>;

  for (const roll of def.optionRolls) {
    const raw = randomFloat(roll.min, roll.max);
    rolledOptions[roll.key] = normalizeRolledOption(roll.key, raw, stageMultiplier, rarityMultiplier);
  }

  return {
    ...def,
    instanceId: crypto.randomUUID?.() ?? `${def.id}_${Date.now()}_${Math.random()}`,
    stageFound: params.stageId,
    rarity: params.rarity,
    rolledOptions,
  };
}
```

---

## 8. MVP 장비 구현 명세: 26종

아래 데이터는 `src/game/data/equipment.ts`의 초기값으로 사용할 수 있다.  
이름과 설명은 나중에 바꿔도 되지만, **slot / tags / skillKind / optionRolls는 개발 기준으로 우선 고정**한다.

### 8.1 무기 4종

```ts
export const WEAPON_DEFS: EquipmentDef[] = [
  {
    id: 'weapon_rusted_blade',
    nameKo: '녹슨 도살검',
    nameEn: 'Rusted Blade',
    slot: 'weapon',
    tags: ['mainAttack', 'melee', 'physical'],
    skillKind: 'slashCone',
    playerDescription: '짧은 주기로 가까운 적을 부채꼴로 베어냅니다.',
    developerNote: '가장 가까운 적 방향으로 즉시 부채꼴 판정. 초반 기본 무기.',
    basePower: 10,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'baseDamageMin', min: 6, max: 10 },
      { key: 'baseDamageMax', min: 12, max: 18 },
      { key: 'cooldownMs', min: 500, max: 700 },
      { key: 'meleeRangeMultiplier', min: 1.0, max: 1.25 },
    ],
  },
  {
    id: 'weapon_storm_dagger',
    nameKo: '폭풍침 단검',
    nameEn: 'Storm Dagger',
    slot: 'weapon',
    tags: ['mainAttack', 'melee', 'lightning'],
    skillKind: 'lightningStrike',
    playerDescription: '가까운 적에게 빠른 번개 참격을 날리고 주변 적에게 연쇄됩니다.',
    developerNote: '단일 타겟 + chainCount만큼 주변 적에게 낮은 피해 연쇄.',
    basePower: 12,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'baseDamageMin', min: 5, max: 8 },
      { key: 'baseDamageMax', min: 11, max: 16 },
      { key: 'cooldownMs', min: 420, max: 620 },
      { key: 'chainCount', min: 1, max: 2 },
    ],
  },
  {
    id: 'weapon_ember_wand',
    nameKo: '잿불 지팡이',
    nameEn: 'Ember Wand',
    slot: 'weapon',
    tags: ['mainAttack', 'projectile', 'fire', 'area'],
    skillKind: 'fireProjectileExplosion',
    playerDescription: '화염탄을 발사해 명중 지점에 작은 폭발을 일으킵니다.',
    developerNote: '투사체가 적 또는 사거리 끝에 닿으면 원형 AoE 피해.',
    basePower: 13,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'baseDamageMin', min: 8, max: 13 },
      { key: 'baseDamageMax', min: 18, max: 26 },
      { key: 'cooldownMs', min: 780, max: 1050 },
      { key: 'radiusPx', min: 34, max: 48 },
      { key: 'projectileSpeed', min: 210, max: 270 },
    ],
  },
  {
    id: 'weapon_venom_chakram',
    nameKo: '맹독 차크람',
    nameEn: 'Venom Chakram',
    slot: 'weapon',
    tags: ['mainAttack', 'projectile', 'poison'],
    skillKind: 'returningPoisonProjectile',
    playerDescription: '적을 관통하고 되돌아오는 독성 원반을 던집니다.',
    developerNote: '왕복 투사체. pierceCount만큼 관통. 피격 적에게 독 DOT 부여.',
    basePower: 12,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'baseDamageMin', min: 4, max: 7 },
      { key: 'baseDamageMax', min: 10, max: 15 },
      { key: 'cooldownMs', min: 650, max: 880 },
      { key: 'pierceCount', min: 2, max: 4 },
      { key: 'dotDamagePerSec', min: 2, max: 5 },
    ],
  },
];
```

### 8.2 목걸이 4종

```ts
export const NECKLACE_DEFS: EquipmentDef[] = [
  {
    id: 'necklace_thunder_mark',
    nameKo: '천둥의 징표',
    nameEn: 'Thunder Mark',
    slot: 'necklace',
    tags: ['supportSkill', 'lightning', 'area'],
    skillKind: 'thunderAoe',
    playerDescription: '일정 주기마다 적이 몰린 곳에 번개를 떨어뜨립니다.',
    developerNote: '가까운 적 또는 가장 적 밀집도가 높은 위치에 예고 후 AoE 낙뢰.',
    basePower: 16,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'baseDamageMin', min: 18, max: 26 },
      { key: 'baseDamageMax', min: 34, max: 48 },
      { key: 'cooldownMs', min: 4300, max: 5600 },
      { key: 'radiusPx', min: 42, max: 58 },
      { key: 'chainCount', min: 0, max: 1 },
    ],
  },
  {
    id: 'necklace_blood_guardian',
    nameKo: '피의 수호부',
    nameEn: 'Blood Guardian',
    slot: 'necklace',
    tags: ['supportSkill', 'shield', 'defense'],
    skillKind: 'shieldPulse',
    playerDescription: '일정 주기마다 보호막을 얻고, 보호막이 깨질 때 충격파를 냅니다.',
    developerNote: '보호막 부여. 보호막 파괴 시 작은 물리 AoE. 생존 목걸이.',
    basePower: 14,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'shieldAmount', min: 18, max: 34 },
      { key: 'shieldDurationMs', min: 2200, max: 3600 },
      { key: 'cooldownMs', min: 4600, max: 6200 },
      { key: 'baseDamageMin', min: 6, max: 12 },
      { key: 'baseDamageMax', min: 14, max: 24 },
    ],
  },
  {
    id: 'necklace_frost_loop',
    nameKo: '서리 고리 부적',
    nameEn: 'Frost Loop',
    slot: 'necklace',
    tags: ['supportSkill', 'ice', 'area'],
    skillKind: 'frostPulse',
    playerDescription: '일정 주기마다 주변 적에게 냉기 파동을 일으켜 느리게 만듭니다.',
    developerNote: '플레이어 중심 원형 AoE. 피해 + slowPercent/slowDurationMs 적용.',
    basePower: 13,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'baseDamageMin', min: 10, max: 17 },
      { key: 'baseDamageMax', min: 22, max: 32 },
      { key: 'cooldownMs', min: 4300, max: 5900 },
      { key: 'radiusPx', min: 58, max: 78 },
      { key: 'slowPercent', min: 0.25, max: 0.45 },
    ],
  },
  {
    id: 'necklace_plague_heart',
    nameKo: '역병 심장 목걸이',
    nameEn: 'Plague Heart',
    slot: 'necklace',
    tags: ['supportSkill', 'poison', 'area'],
    skillKind: 'poisonPool',
    playerDescription: '일정 주기마다 독 장판을 생성해 안의 적에게 지속 피해를 줍니다.',
    developerNote: '적 밀집 위치 또는 가까운 적 위치에 지속 AoE 장판 생성.',
    basePower: 15,
    fixedOptionCount: 5,
    optionRolls: [
      { key: 'dotDamagePerSec', min: 5, max: 9 },
      { key: 'dotDurationMs', min: 2800, max: 4200 },
      { key: 'cooldownMs', min: 4700, max: 6500 },
      { key: 'radiusPx', min: 44, max: 64 },
      { key: 'slowPercent', min: 0.05, max: 0.16 },
    ],
  },
];
```

### 8.3 투구 4종

```ts
export const HELMET_DEFS: EquipmentDef[] = [
  {
    id: 'helmet_ember_crown',
    nameKo: '잿불투구',
    nameEn: 'Ember Crown',
    slot: 'helmet',
    tags: ['fire', 'area'],
    skillKind: 'passiveModifier',
    playerDescription: '화염 스킬의 피해와 폭발 범위가 증가합니다.',
    developerNote: 'fire 태그 스킬에 fireDamageMultiplier와 areaRadiusMultiplier 적용.',
    basePower: 11,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'fireDamageMultiplier', min: 1.12, max: 1.35 },
      { key: 'areaRadiusMultiplier', min: 1.08, max: 1.28 },
      { key: 'dotDamagePerSec', min: 1, max: 3 },
    ],
  },
  {
    id: 'helmet_storm_crown',
    nameKo: '폭풍관',
    nameEn: 'Storm Crown',
    slot: 'helmet',
    tags: ['lightning'],
    skillKind: 'passiveModifier',
    playerDescription: '번개 스킬의 피해와 연쇄 성능이 증가합니다.',
    developerNote: 'lightning 태그 스킬에 피해 증가. chainCount가 있는 스킬은 +roll 적용.',
    basePower: 11,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'lightningDamageMultiplier', min: 1.10, max: 1.32 },
      { key: 'chainCount', min: 0, max: 1 },
      { key: 'critChance', min: 0.03, max: 0.08 },
    ],
  },
  {
    id: 'helmet_plague_mask',
    nameKo: '역병 가면',
    nameEn: 'Plague Mask',
    slot: 'helmet',
    tags: ['poison'],
    skillKind: 'passiveModifier',
    playerDescription: '독 피해와 독 지속 시간이 증가합니다.',
    developerNote: 'poison 태그 스킬에 DOT 피해/지속시간 증가.',
    basePower: 11,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'poisonDamageMultiplier', min: 1.12, max: 1.34 },
      { key: 'dotDurationMs', min: 300, max: 900 },
      { key: 'areaRadiusMultiplier', min: 1.00, max: 1.18 },
    ],
  },
  {
    id: 'helmet_reach_visor',
    nameKo: '도살자의 시야',
    nameEn: 'Butcher Visor',
    slot: 'helmet',
    tags: ['melee', 'physical'],
    skillKind: 'passiveModifier',
    playerDescription: '근접/물리 공격의 범위와 피해가 증가합니다.',
    developerNote: 'melee 또는 physical 태그 스킬에 범위/피해 보정.',
    basePower: 10,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'physicalDamageMultiplier', min: 1.10, max: 1.28 },
      { key: 'meleeRangeMultiplier', min: 1.08, max: 1.30 },
      { key: 'critDamageMultiplier', min: 1.05, max: 1.20 },
    ],
  },
];
```

### 8.4 장갑 4종

```ts
export const GLOVES_DEFS: EquipmentDef[] = [
  {
    id: 'gloves_swift',
    nameKo: '신속의 장갑',
    nameEn: 'Swift Gloves',
    slot: 'gloves',
    tags: ['mainAttack'],
    skillKind: 'passiveModifier',
    playerDescription: '주 공격이 더 자주 발동합니다.',
    developerNote: 'mainAttack 스킬 cooldownMs에 mainCooldownMultiplier 적용. 1보다 작을수록 빠름.',
    basePower: 10,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'mainCooldownMultiplier', min: 0.72, max: 0.90 },
      { key: 'mainDamageMultiplier', min: 0.92, max: 1.05 },
      { key: 'critChance', min: 0.02, max: 0.06 },
    ],
  },
  {
    id: 'gloves_overcharge',
    nameKo: '과충전 건틀릿',
    nameEn: 'Overcharge Gauntlets',
    slot: 'gloves',
    tags: ['mainAttack'],
    skillKind: 'passiveModifier',
    playerDescription: '주 공격이 느려지지만 훨씬 강해집니다.',
    developerNote: '느린 한 방 빌드. mainCooldownMultiplier > 1, mainDamageMultiplier > 1.',
    basePower: 12,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'mainCooldownMultiplier', min: 1.18, max: 1.45 },
      { key: 'mainDamageMultiplier', min: 1.45, max: 2.05 },
      { key: 'areaRadiusMultiplier', min: 1.00, max: 1.18 },
    ],
  },
  {
    id: 'gloves_echo',
    nameKo: '반향 장갑',
    nameEn: 'Echo Gloves',
    slot: 'gloves',
    tags: ['mainAttack'],
    skillKind: 'passiveModifier',
    playerDescription: '일정 확률로 주 공격이 한 번 더 발동합니다.',
    developerNote: 'mainAttack 발동 후 echoChance 확률로 같은 공격을 echoDamageMultiplier 피해로 반복.',
    basePower: 12,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'echoChance', min: 0.12, max: 0.28 },
      { key: 'echoDamageMultiplier', min: 0.45, max: 0.75 },
      { key: 'mainCooldownMultiplier', min: 0.95, max: 1.08 },
    ],
  },
  {
    id: 'gloves_ritual',
    nameKo: '의식 장갑',
    nameEn: 'Ritual Gloves',
    slot: 'gloves',
    tags: ['supportSkill'],
    skillKind: 'passiveModifier',
    playerDescription: '목걸이 보조 스킬이 더 자주 발동합니다.',
    developerNote: 'supportSkill cooldownMs에 supportCooldownMultiplier 적용.',
    basePower: 10,
    fixedOptionCount: 3,
    optionRolls: [
      { key: 'supportCooldownMultiplier', min: 0.70, max: 0.88 },
      { key: 'supportDamageMultiplier', min: 0.95, max: 1.15 },
      { key: 'shieldAmount', min: 0, max: 8 },
    ],
  },
];
```

### 8.5 갑옷 4종

```ts
export const ARMOR_DEFS: EquipmentDef[] = [
  {
    id: 'armor_iron_shell',
    nameKo: '무쇠 껍질 갑옷',
    nameEn: 'Iron Shell',
    slot: 'armor',
    tags: ['defense'],
    skillKind: 'passiveModifier',
    playerDescription: '최대 체력과 피해 감소가 증가합니다.',
    developerNote: '기본 생존 갑옷. 모든 빌드에 무난.',
    basePower: 12,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'maxHpBonus', min: 20, max: 45 },
      { key: 'damageReductionPercent', min: 0.04, max: 0.12 },
      { key: 'armorAmplifyMultiplier', min: 1.00, max: 1.12 },
      { key: 'bossDamageMultiplier', min: 1.00, max: 1.08 },
    ],
  },
  {
    id: 'armor_regen_hide',
    nameKo: '재생 가죽 갑옷',
    nameEn: 'Regen Hide',
    slot: 'armor',
    tags: ['defense'],
    skillKind: 'passiveModifier',
    playerDescription: '초당 체력을 회복하고 최대 체력이 증가합니다.',
    developerNote: '장기 생존용. HP가 낮을수록 체감이 큼.',
    basePower: 11,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'maxHpBonus', min: 12, max: 30 },
      { key: 'hpRegenPerSec', min: 0.8, max: 2.2 },
      { key: 'damageReductionPercent', min: 0.00, max: 0.06 },
      { key: 'armorAmplifyMultiplier', min: 1.00, max: 1.10 },
    ],
  },
  {
    id: 'armor_blood_plate',
    nameKo: '혈철 갑옷',
    nameEn: 'Blood Plate',
    slot: 'armor',
    tags: ['defense', 'lifesteal'],
    skillKind: 'passiveModifier',
    playerDescription: '피해를 줄 때 체력을 조금 회복합니다.',
    developerNote: '빠른 공격/다단히트 빌드와 궁합. 회복량은 과도하지 않게 제한.',
    basePower: 12,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'maxHpBonus', min: 10, max: 26 },
      { key: 'lifestealPercent', min: 0.015, max: 0.045 },
      { key: 'damageReductionPercent', min: 0.02, max: 0.08 },
      { key: 'armorAmplifyMultiplier', min: 1.02, max: 1.16 },
    ],
  },
  {
    id: 'armor_amplifier_mail',
    nameKo: '증폭 사슬갑옷',
    nameEn: 'Amplifier Mail',
    slot: 'armor',
    tags: ['defense'],
    skillKind: 'passiveModifier',
    playerDescription: '생존력을 얻고 다른 장비 효과 하나를 증폭합니다.',
    developerNote: '가장 단순하게는 모든 passive multiplier에 armorAmplifyMultiplier를 곱한다.',
    basePower: 13,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'maxHpBonus', min: 8, max: 24 },
      { key: 'damageReductionPercent', min: 0.02, max: 0.08 },
      { key: 'armorAmplifyMultiplier', min: 1.15, max: 1.35 },
      { key: 'supportDamageMultiplier', min: 1.00, max: 1.14 },
    ],
  },
];
```

### 8.6 벨트 6종

```ts
export const BELT_DEFS: EquipmentDef[] = [
  {
    id: 'belt_fire_fuse',
    nameKo: '잿불 도화선',
    nameEn: 'Fire Fuse',
    slot: 'belt',
    tags: ['fire', 'area'],
    skillKind: 'passiveModifier',
    playerDescription: '화염 스킬의 폭발과 피해가 강화됩니다.',
    developerNote: 'fire 태그 스킬에 강한 시너지. 처치 폭발은 시간이 남으면 구현.',
    basePower: 14,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'fireDamageMultiplier', min: 1.18, max: 1.45 },
      { key: 'areaRadiusMultiplier', min: 1.10, max: 1.32 },
      { key: 'baseDamageMin', min: 1, max: 4 },
      { key: 'baseDamageMax', min: 4, max: 9 },
    ],
  },
  {
    id: 'belt_storm_chain',
    nameKo: '번개 사슬 허리띠',
    nameEn: 'Storm Chain',
    slot: 'belt',
    tags: ['lightning'],
    skillKind: 'passiveModifier',
    playerDescription: '번개 스킬의 연쇄와 피해가 강화됩니다.',
    developerNote: 'lightning 태그 스킬에 피해 증가와 chainCount 보정.',
    basePower: 14,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'lightningDamageMultiplier', min: 1.18, max: 1.42 },
      { key: 'chainCount', min: 1, max: 2 },
      { key: 'critChance', min: 0.04, max: 0.10 },
      { key: 'baseDamageMax', min: 2, max: 8 },
    ],
  },
  {
    id: 'belt_venom_loop',
    nameKo: '맹독 순환끈',
    nameEn: 'Venom Loop',
    slot: 'belt',
    tags: ['poison'],
    skillKind: 'passiveModifier',
    playerDescription: '독 피해와 독 지속 시간이 강화됩니다.',
    developerNote: 'poison 태그에 DOT 강화. 독 전이 효과는 후순위.',
    basePower: 14,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'poisonDamageMultiplier', min: 1.20, max: 1.50 },
      { key: 'dotDurationMs', min: 500, max: 1500 },
      { key: 'dotDamagePerSec', min: 1, max: 4 },
      { key: 'areaRadiusMultiplier', min: 1.00, max: 1.18 },
    ],
  },
  {
    id: 'belt_frost_clamp',
    nameKo: '서리 고정대',
    nameEn: 'Frost Clamp',
    slot: 'belt',
    tags: ['ice'],
    skillKind: 'passiveModifier',
    playerDescription: '냉기 스킬의 감속과 피해가 강화됩니다.',
    developerNote: 'ice 태그에 slow 강화. 감속된 적에게 피해 증가는 시간이 남으면 구현.',
    basePower: 13,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'iceDamageMultiplier', min: 1.15, max: 1.38 },
      { key: 'slowPercent', min: 0.08, max: 0.20 },
      { key: 'slowDurationMs', min: 500, max: 1200 },
      { key: 'areaRadiusMultiplier', min: 1.05, max: 1.22 },
    ],
  },
  {
    id: 'belt_blade_circuit',
    nameKo: '칼날 순환띠',
    nameEn: 'Blade Circuit',
    slot: 'belt',
    tags: ['melee', 'physical', 'orbit'],
    skillKind: 'passiveModifier',
    playerDescription: '근접/물리 공격의 범위와 타격 리듬이 강화됩니다.',
    developerNote: 'melee/physical 태그에 피해와 범위 보정. orbit 태그가 없어도 melee 빌드용으로 작동.',
    basePower: 13,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'physicalDamageMultiplier', min: 1.15, max: 1.38 },
      { key: 'meleeRangeMultiplier', min: 1.10, max: 1.30 },
      { key: 'orbitTickRateMultiplier', min: 0.82, max: 1.00 },
      { key: 'critDamageMultiplier', min: 1.05, max: 1.25 },
    ],
  },
  {
    id: 'belt_guardian_knot',
    nameKo: '수호자 매듭',
    nameEn: 'Guardian Knot',
    slot: 'belt',
    tags: ['defense', 'shield', 'lifesteal'],
    skillKind: 'passiveModifier',
    playerDescription: '보호막, 피해 감소, 흡혈 계열 생존 효과가 강화됩니다.',
    developerNote: 'shield/defense/lifesteal 태그와 관련된 수치를 강화.',
    basePower: 13,
    fixedOptionCount: 4,
    optionRolls: [
      { key: 'shieldAmount', min: 8, max: 22 },
      { key: 'damageReductionPercent', min: 0.02, max: 0.08 },
      { key: 'lifestealPercent', min: 0.005, max: 0.02 },
      { key: 'maxHpBonus', min: 8, max: 24 },
    ],
  },
];
```

### 8.7 전체 장비 배열

```ts
export const EQUIPMENT_DEFS: EquipmentDef[] = [
  ...WEAPON_DEFS,
  ...NECKLACE_DEFS,
  ...HELMET_DEFS,
  ...GLOVES_DEFS,
  ...ARMOR_DEFS,
  ...BELT_DEFS,
];
```

---

## 9. 장비 수치 적용 규칙

### 9.1 최소/최대 피해

각 공격형 장비는 `baseDamageMin`과 `baseDamageMax`를 가진다.
실제 피해는 공격이 발생할 때마다 다음처럼 계산한다.

```ts
const rawDamage = randomFloat(options.baseDamageMin, options.baseDamageMax);
const finalDamage = rawDamage * damageMultipliers;
```

주의:

```txt
- baseDamageMin이 baseDamageMax보다 커지지 않게 roll 이후 보정한다.
- 장비가 방어형이라 baseDamageMin/baseDamageMax가 없을 수 있다.
- 방어형 목걸이의 충격파처럼 피해가 필요한 경우에만 baseDamageMin/baseDamageMax를 사용한다.
```

### 9.2 옵션 키 적용 우선순위

```txt
1. 무기 또는 목걸이의 기본 skillKind가 공격/보조 효과를 결정한다.
2. 장갑이 main/support cooldown을 보정한다.
3. 투구가 속성/범위/연쇄를 보정한다.
4. 갑옷이 생존과 armorAmplifyMultiplier를 제공한다.
5. 벨트가 태그가 맞는 스킬에 강한 보너스를 더한다.
```

### 9.3 MVP에서 반드시 구현할 옵션 키

시간이 부족하면 아래 키만 먼저 구현한다.

```txt
baseDamageMin
baseDamageMax
cooldownMs
rangePx
radiusPx
chainCount
pierceCount
dotDamagePerSec
dotDurationMs
slowPercent
shieldAmount
maxHpBonus
hpRegenPerSec
damageReductionPercent
lifestealPercent
mainDamageMultiplier
supportDamageMultiplier
fireDamageMultiplier
iceDamageMultiplier
lightningDamageMultiplier
poisonDamageMultiplier
physicalDamageMultiplier
mainCooldownMultiplier
supportCooldownMultiplier
areaRadiusMultiplier
meleeRangeMultiplier
echoChance
echoDamageMultiplier
```

나머지 키는 데이터에 있어도 1차 구현에서는 무시해도 된다. 단, 무시하는 경우 코드 주석으로 남긴다.

---

## 10. 전투 규칙

### 플레이어 기본값

```txt
HP: 100
Move Speed: 130
Radius: 10
기본 공격: Bare Fist
Bare Fist: 0.55초마다 가까운 적에게 근접 피해 5~7
```

### 일반 적

MVP 적은 단순해도 된다.

```txt
Crawler: 느리고 체력 낮음
Runner: 빠르고 체력 낮음
Brute: 느리지만 체력 높음
```

적 AI:

```txt
- 항상 플레이어 방향으로 이동
- 플레이어와 접촉하면 일정 주기로 피해
- 너무 많은 적이 생기면 오래된 적부터 제거하거나 스폰을 제한한다.
```

### 자동 공격

```txt
- 무기 슬롯이 주 공격을 결정한다.
- 목걸이 슬롯은 긴 주기의 보조 능력을 결정한다.
- 나머지 슬롯은 주 공격/보조 능력을 보정한다.
- 무기가 없으면 Bare Fist를 사용한다.
```

### 충돌 방식

MVP에서는 원형 거리 판정으로 충분하다.

```ts
function isCircleOverlap(a: CircleLike, b: CircleLike): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy <= r * r;
}
```

### 성능 제한

```txt
화면 내 일반 적은 80마리 이하
투사체는 오래된 것부터 제거
이펙트는 1초 내 자동 제거
모바일 브라우저에서 프레임이 떨어지면 적 수를 줄임
```

---

## 11. 스테이지 구조

### 공통 규칙

```txt
총 5개 스테이지
Stage 1만 최초 해금
각 스테이지 보스 처치 시 다음 스테이지 해금
클리어한 스테이지는 파밍을 위해 재입장 가능
각 스테이지는 동일한 기본 구조를 공유하고, 수치/색감/보스 패턴/드랍 등급으로 차이를 둔다.
```

### 런 길이

```txt
목표 플레이 시간: 약 1분 30초
보상 선택 모달 중에는 전투 시간이 정지된다.
플레이어가 적극적으로 적을 처치하면 보스 게이지가 더 빨리 찬다.
```

### 보스 게이지

```txt
시간 경과로 천천히 증가
몬스터 처치 시 추가 증가
게이지 100% 도달 시 보스 등장
```

MVP 권장:

```txt
70~90초 사이에는 보스가 등장하도록 튜닝한다.
90초를 넘기면 자동으로 보스 게이지를 빠르게 채워 전투가 늘어지지 않게 한다.
```

### 스테이지별 난이도 방향

| Stage | 역할 | 구현 방향 |
|---|---|---|
| 1 | 튜토리얼/기본 파밍 | 적 느림, 보스 쉬움 |
| 2 | 장비 교체 경험 | 적 수 증가, 보스 AoE 추가 |
| 3 | 시너지 필요 | 빠른 적 추가, 보스 원거리 탄막 |
| 4 | 생존 장비 필요 | 접촉 피해 증가, 복합 보스 패턴 |
| 5 | 최종 도전 | 높은 체력/피해, 복합 패턴, 좋은 장비 요구 |

---

## 12. 보스 구현 명세

### 12.1 보스 패턴 타입

보스는 단순히 HP만 다른 적이 아니어야 한다. 단, MVP이므로 아래 패턴을 재사용한다.

```ts
export type BossPatternType = 'charge' | 'aoePulse' | 'radialShot' | 'lineWave' | 'hazardZone';

export interface BossPatternDef {
  type: BossPatternType;
  cooldownMs: number;
  damage: number;
  telegraphMs: number;
  durationMs?: number;
  radiusPx?: number;
  projectileCount?: number;
  projectileSpeed?: number;
}

export interface BossDef {
  id: string;
  nameKo: string;
  stageId: number;
  hp: number;
  moveSpeed: number;
  contactDamage: number;
  colorHex: number;
  rewardTableId: string;
  patterns: BossPatternDef[];
}
```

### 12.2 패턴 설명

```txt
charge
- 보스가 플레이어 현재 위치 방향으로 돌진한다.
- telegraphMs 동안 경고 선 또는 화살표를 보여준 뒤 이동한다.
- 돌진 중 접촉하면 damage를 준다.

aoePulse
- 보스 중심 원형 범위에 경고 원을 표시한 뒤 피해 판정을 만든다.
- Stage 2부터 사용하기 좋다.

radialShot
- 보스가 여러 방향으로 투사체를 발사한다.
- projectileCount와 projectileSpeed를 사용한다.

lineWave
- 플레이어 방향으로 긴 직선 파동을 발사한다.
- 직선 경고 영역을 보여준 뒤 피해 판정.

hazardZone
- 일정 위치에 잠시 남는 위험 장판을 만든다.
- 소환수나 추가 몬스터가 아니라 단순 장판 오브젝트다.
```

### 12.3 Stage별 보스 데이터

```ts
export const BOSS_DEFS: BossDef[] = [
  {
    id: 'boss_1_bone_butcher',
    nameKo: '뼈 도살자',
    stageId: 1,
    hp: 250,
    moveSpeed: 48,
    contactDamage: 8,
    colorHex: 0x8f7a5a,
    rewardTableId: 'boss_reward_stage_1',
    patterns: [
      { type: 'charge', cooldownMs: 4200, damage: 12, telegraphMs: 650 },
    ],
  },
  {
    id: 'boss_2_ember_ogre',
    nameKo: '잿불 오우거',
    stageId: 2,
    hp: 500,
    moveSpeed: 52,
    contactDamage: 10,
    colorHex: 0xc45b32,
    rewardTableId: 'boss_reward_stage_2',
    patterns: [
      { type: 'charge', cooldownMs: 4500, damage: 14, telegraphMs: 650 },
      { type: 'aoePulse', cooldownMs: 5200, damage: 16, telegraphMs: 800, radiusPx: 58 },
    ],
  },
  {
    id: 'boss_3_storm_horror',
    nameKo: '폭풍 괴수',
    stageId: 3,
    hp: 900,
    moveSpeed: 56,
    contactDamage: 12,
    colorHex: 0x4e83d8,
    rewardTableId: 'boss_reward_stage_3',
    patterns: [
      { type: 'charge', cooldownMs: 4300, damage: 16, telegraphMs: 600 },
      { type: 'radialShot', cooldownMs: 4800, damage: 10, telegraphMs: 500, projectileCount: 8, projectileSpeed: 145 },
    ],
  },
  {
    id: 'boss_4_plague_colossus',
    nameKo: '역병 거상',
    stageId: 4,
    hp: 1400,
    moveSpeed: 50,
    contactDamage: 15,
    colorHex: 0x4f9d55,
    rewardTableId: 'boss_reward_stage_4',
    patterns: [
      { type: 'aoePulse', cooldownMs: 4300, damage: 20, telegraphMs: 750, radiusPx: 72 },
      { type: 'hazardZone', cooldownMs: 5200, damage: 7, telegraphMs: 650, durationMs: 2600, radiusPx: 52 },
      { type: 'lineWave', cooldownMs: 6100, damage: 18, telegraphMs: 700 },
    ],
  },
  {
    id: 'boss_5_six_slot_wraith',
    nameKo: '육슬롯 망령',
    stageId: 5,
    hp: 2200,
    moveSpeed: 60,
    contactDamage: 18,
    colorHex: 0xaa55ff,
    rewardTableId: 'boss_reward_stage_5',
    patterns: [
      { type: 'charge', cooldownMs: 3900, damage: 22, telegraphMs: 550 },
      { type: 'radialShot', cooldownMs: 4500, damage: 14, telegraphMs: 450, projectileCount: 12, projectileSpeed: 165 },
      { type: 'lineWave', cooldownMs: 5200, damage: 24, telegraphMs: 650 },
      { type: 'hazardZone', cooldownMs: 6200, damage: 8, telegraphMs: 550, durationMs: 3200, radiusPx: 58 },
    ],
  },
];
```

### 12.4 보스 구현 우선순위

```txt
1. 보스 등장/HP/처치/보상/클리어 처리
2. charge 패턴
3. aoePulse 패턴
4. radialShot 패턴
5. lineWave 또는 hazardZone 중 하나
6. Stage 5 복합 패턴
```

시간이 부족하면 Stage 4~5에서만 복합 패턴이 보이게 해도 된다.

---

## 13. 보물상자와 파밍 규칙

### 13.1 상자 드랍

```txt
몬스터 처치 시 일정 확률로 보물상자 드랍
한 스테이지에서 보스 보상 포함 약 8~10회 선택지를 보는 것을 목표로 한다.
드랍 운이 너무 나쁘면 일정 시간마다 드랍 확률을 보정한다.
상자를 먹으면 전투가 일시 정지되고 보상 선택 모달이 열린다.
```

### 13.2 HUD 상자 표시

상단 HUD에 집중 파밍까지의 진행도를 표시한다.

```txt
Chest 0/3
Chest 1/3
Chest 2/3
Focused Loot!
```

### 13.3 일반 상자

```txt
상자 획득
→ chestCountInRun + 1
→ 3의 배수가 아니면 일반 보상
→ 장비 3개 제시
→ 하나 선택 또는 선택 안 함
→ 모달 종료 후 전투 재개
```

### 13.4 선택 안 함

보상 선택 화면에는 항상 `선택 안 함` 버튼을 둔다.

```txt
- 아무 장비도 고르지 않고 넘어갈 수 있다.
- 현재 장비를 잃지 않는다.
- 상자 횟수는 이미 증가한 것으로 처리한다.
- 따라서 선택 안 함도 집중 파밍까지의 진행에 기여한다.
```

### 13.5 3번째 상자: 집중 파밍

기존 5번째 상자 규칙은 런 길이에 비해 체감이 약하므로 **3번째 상자마다 집중 파밍**으로 구현한다.

```txt
상자 획득
→ chestCountInRun + 1
→ chestCountInRun % 3 === 0
→ 집중 파밍 발동
→ 전투 정지 유지
→ 플레이어가 원하는 부위를 선택
→ 전투 정지 유지
→ 해당 부위 장비 3개 제시
→ 최소 1개는 해당 스테이지에서 등장 가능한 최고 등급
→ 하나 선택 또는 선택 안 함
→ 모달 종료 후 전투 재개
```

중요:

```txt
집중 파밍은 2단계 UI다.
1단계: 부위 선택 UI
2단계: 장비 3택 UI
두 단계 전체 동안 GameScene의 전투 시간, 스폰, 적 이동, 투사체, 보스 패턴, 자동 공격은 모두 멈춘 상태여야 한다.
```

권장 상태 플래그:

```ts
type RewardPhase = 'none' | 'normalReward' | 'focusSlotSelect' | 'focusReward' | 'bossReward';
let rewardPhase: RewardPhase = 'none';
const isGameplayPaused = () => rewardPhase !== 'none';
```

GameScene update에서는 다음처럼 처리한다.

```ts
update(time: number, delta: number) {
  updateInputOnlyForModalIfNeeded();

  if (isGameplayPaused()) {
    return;
  }

  updatePlayer(delta);
  updateEnemies(delta);
  updateProjectiles(delta);
  updateAutoAttacks(delta);
  updateBoss(delta);
  updateSpawns(delta);
}
```

### 13.6 보스 보상

보스 처치 시:

```txt
보스 처치
→ 전투 정지
→ 고급 보상 3개 제시
→ 해당 스테이지 최고 등급 포함
→ 각 스테이지 보스 전용 유니크 보상 테이블 포함
→ 선택 또는 선택 안 함
→ 스테이지 클리어 처리
→ 다음 스테이지 해금
→ ResultScene 이동
```

보스 유니크는 Stage 5 전용이 아니다.  
**각 스테이지 보스마다 전용 유니크 장비가 몇 개씩 존재한다.**

---

## 14. 보상 생성 로직 설계

### 함수 목표

```ts
function generateRewardOptions(params: {
  stageId: number;
  context: 'normalChest' | 'focusedChest' | 'bossReward';
  focusSlot?: EquipmentSlot;
  bossId?: string;
}): RolledEquipment[]
```

### 일반 상자

```txt
- 3개의 장비 생성
- 슬롯 무작위
- 등급은 stageId 기반
- 같은 슬롯이 여러 개 나와도 허용
```

### 집중 파밍 상자

```txt
- focusSlot 필수
- 3개의 장비 모두 focusSlot
- 최소 1개는 해당 스테이지 최고 등급
- 2단계 UI가 끝날 때까지 gameplay pause 유지
```

### 보스 보상

```txt
- 3개의 장비 생성
- 해당 스테이지 최고 등급 포함
- bossUnique 후보를 1개 이상 섞을 수 있음
- 각 stage boss의 전용 테이블 사용
```

### 등급별 보상 범위

| Stage | 일반 상자 | 집중 파밍 최고 등급 | 보스 보상 |
|---|---|---|---|
| 1 | common / rare | rare | rare + stage1 bossUnique 후보 |
| 2 | common / rare / epic | epic | epic + stage2 bossUnique 후보 |
| 3 | rare / epic | epic | epic + stage3 bossUnique 후보 |
| 4 | rare / epic / relic | relic | relic + stage4 bossUnique 후보 |
| 5 | epic / relic | relic | relic + stage5 bossUnique 후보 |

### 장비 선택 처리

```ts
function equipItem(item: RolledEquipment): void {
  updateSaveData((save) => ({
    ...save,
    equipped: {
      ...save.equipped,
      [item.slot]: item,
    },
  }));
}
```

`선택 안 함`의 경우:

```txt
- equipItem 호출 없음
- 보상 모달 닫기
- 일반/집중 상자라면 전투 재개
- 보스 보상이라면 클리어 처리 후 ResultScene 이동
```

---

## 15. UI 구현 기준

### HUD

필수 표시:

```txt
Stage 1
HP Bar
Boss Gauge
Chest 2/3
```

선택 표시:

```txt
Kills
Time
Current Build Power
```

MVP에서는 필수 표시만 먼저 구현한다.

### 장비 패널

6개 슬롯을 보여준다.

```txt
Weapon / Necklace / Helmet
Gloves / Armor / Belt
```

모바일에서는 이 패널이 드래그 이동 영역과 통합된다.

### 장비 정보 팝업

장비 슬롯 탭/클릭 시 표시.

```txt
아이템 이름
부위 / 등급
효과 1~3줄
태그
닫기
```

### 보상 선택 모달

상자를 먹거나 보스를 처치하면 전투를 정지하고 표시.

```txt
Reward Select
[장비 카드 A]
[장비 카드 B]
[장비 카드 C]
[선택 안 함]
```

집중 파밍일 경우 먼저 부위 선택 모달을 보여준다.

```txt
Choose Slot
Weapon / Necklace / Helmet / Gloves / Armor / Belt
```

---

## 16. 리소스 전략

### MVP 원칙

초기에는 외부 리소스보다 **코드 기반 임시 리소스**를 사용한다.

```txt
플레이어: 단순 픽셀풍 원형/작은 캐릭터
몬스터: 색과 크기가 다른 도형
보스: 큰 도형 + 색상 + 이펙트
보물상자: 사각형 아이콘
투사체: 원/선/파티클
배경: 어두운 타일/격자 패턴
UI: CSS 또는 Phaser 텍스트/사각형 카드
```

### 아트 방향

```txt
픽셀풍
고전 PC 게임풍
다크 판타지/핵앤슬 느낌
스타크래프트1처럼 거칠고 오래된 PC 게임 감성 참고
단, 특정 게임의 실제 리소스나 저작권 있는 이미지는 사용하지 않는다.
```

### 나중에 리소스 보강 시

게임 루프가 완성된 뒤에 아래 순서로 리소스를 교체한다.

```txt
1. 플레이어 캐릭터
2. 일반 몬스터 3종
3. 보스 5종 또는 보스 베이스 2~3종 변형
4. 장비 슬롯 아이콘 6종
5. 주요 장비 아이콘 12~26종
6. 배경 타일 3~5종
7. SFX
8. 로고/썸네일
```

### PixelLab 사용 여부

PixelLab 같은 픽셀아트 생성 도구는 **실제 게임 루프가 완성된 뒤** 검토한다.

예상 사용 목적:

```txt
플레이어/몬스터 픽셀 스프라이트
보스 스프라이트
장비 아이콘
타일셋
시연영상 썸네일
```

주의:

```txt
월 비용이 목표 예산 50달러 미만인지 결제 전 확인
라이선스/상업 사용 가능 여부 확인
생성 결과물은 public/assets/README.md에 출처와 생성 방식을 기록
최종 제출 전 저작권 문제가 생길 수 있는 외부 게임 리소스는 절대 쓰지 않음
```

---

## 17. 사운드 전략

### MVP

사운드는 필수가 아니지만, 있으면 체감이 크게 좋아진다.

우선순위:

```txt
타격음
상자 획득음
장비 선택음
보스 등장음
사망음
클리어음
```

초기에는 WebAudio로 간단한 beep/pulse를 생성하거나, CC0 SFX만 사용한다.

### 주의

```txt
저작권 있는 게임 효과음 사용 금지
외부 무료 에셋 사용 시 라이선스 확인
README에 출처 기록
```

---

## 18. Cursor 작업 순서

Cursor에게 한 번에 전체 게임을 만들라고 시키지 말고, 아래 Milestone 단위로 작업한다.

---

### Milestone 0 — 프로젝트 뼈대

전제 조건:

```txt
GitHub public 저장소가 생성되어 있고, Cursor에서 저장소를 열 수 있어야 한다.
```

목표:

```txt
Vite + TypeScript + Phaser 실행
BootScene에서 임시 텍스처 생성
BootScene에서 SaveData 로드
TitleScene 표시
StageSelectScene 표시
GameScene 진입 가능
ResultScene 진입 가능
npm run build 성공
```

Cursor 프롬프트 예시:

```txt
이 저장소에서 docs/CURSOR_DEV_INSTRUCTIONS.md를 기준으로 6-Slot Hero의 Milestone 0을 구현해줘.
Vite + TypeScript + Phaser 3 구조로 만들고, BootScene, TitleScene, StageSelectScene, GameScene, ResultScene 사이를 이동할 수 있게 해줘.
BootScene은 단순 pass-through가 아니라 createGeneratedTextures()로 최소 6종 이상의 임시 텍스처를 만들고, storage.ts의 loadSaveData()를 호출한 뒤 TitleScene으로 이동해야 해.
storage.ts는 getSaveData, setSaveData, updateSaveData, resetSaveData, loadSaveData, persistSaveData를 제공하고 localStorage 실패 시 기본값으로 복구해야 해.
아직 전투는 임시 화면이면 되고, npm run build가 성공해야 해.
```

완료 기준:

```txt
npm run dev 실행 가능
npm run build 성공
BootScene → TitleScene 진입
시작 화면 → 스테이지 선택 → 전투 → 결과 화면 이동 가능
localStorage가 비어 있거나 파손되어도 앱이 실행됨
```

---

### Milestone 1 — 기본 전투 루프

전제 조건:

```txt
Milestone 0 완료.
BootScene, Scene 전환, storage.ts, 기본 임시 텍스처가 작동해야 한다.
```

목표:

```txt
플레이어 이동
일반 몬스터 스폰
몬스터 추적
자동 기본 공격
체력/피해/사망
결과 화면
```

Cursor 프롬프트 예시:

```txt
Milestone 1을 구현해줘.
GameScene에서 플레이어가 WASD와 방향키로 이동하고, 모바일 포인터 드래그로도 이동하게 해줘.
몬스터가 주기적으로 스폰되어 플레이어를 추적하고, 플레이어는 기본 Bare Fist 자동 공격으로 가까운 적을 공격해야 해.
적과 접촉하면 플레이어가 피해를 입고, HP가 0이면 ResultScene으로 이동하게 해줘.
그래픽은 BootScene에서 만든 Phaser Graphics 임시 텍스처를 사용해.
SaveData는 scene.start()로 넘기지 말고 storage.ts의 getSaveData()로 읽어.
```

완료 기준:

```txt
플레이어 이동 가능
적이 쫓아옴
자동 공격으로 적 처치 가능
피격/사망 가능
사망 시 ResultScene으로 이동
```

---

### Milestone 2 — 장비 데이터와 보물상자

전제 조건:

```txt
Milestone 1 완료.
플레이어/몬스터/기본 자동 공격/사망 흐름이 작동해야 한다.
```

목표:

```txt
6슬롯 장비 데이터
26종 장비 def 또는 최소 12종 우선 구현
optionRolls 기반 수치 롤링
보물상자 드랍
보상 3택
선택 안 함
장비 장착/교체
localStorage 저장
장비 팝업
```

Cursor 프롬프트 예시:

```txt
Milestone 2를 구현해줘.
장비 슬롯 6개 weapon, necklace, helmet, gloves, armor, belt를 만들고, equipment.ts에 docs의 MVP 장비 구현 명세를 반영해줘.
각 장비는 playerDescription만이 아니라 optionRolls 배열의 key/min/max를 가져야 하고, rollEquipment()로 RolledEquipment 인스턴스를 만들어야 해.
몬스터 처치 시 일정 확률로 보물상자를 드랍하고, 플레이어가 상자를 먹으면 전투를 정지한 뒤 장비 3개와 '선택 안 함' 버튼을 보여줘.
장비를 선택하면 해당 슬롯에 즉시 장착되고 storage.ts의 updateSaveData()를 통해 localStorage에 저장되어 새로고침 후에도 유지되어야 해.
선택 안 함은 장비를 바꾸지 않고 모달을 닫아야 해.
```

완료 기준:

```txt
상자를 먹으면 게임 정지
장비 3택 표시
각 장비가 rolledOptions를 가짐
선택하면 해당 슬롯에 장착됨
선택 안 함 가능
새로고침 후 장비 유지
장비 슬롯 클릭/탭 시 정보 팝업 표시
```

---

### Milestone 3 — 집중 파밍과 스테이지 해금

전제 조건:

```txt
Milestone 2 완료.
보물상자, 보상 3택, 선택 안 함, 장비 저장이 작동해야 한다.
```

목표:

```txt
Chest 0/3 HUD
3번째 상자마다 집중 파밍
부위 선택 후 해당 부위 보상 3택
집중 파밍 2단계 UI 동안 전투 정지 유지
Stage 1~5 해금 구조
```

Cursor 프롬프트 예시:

```txt
Milestone 3을 구현해줘.
전투 HUD에 Chest 0/3, 1/3, 2/3 진행도를 표시하고, 3번째 상자마다 집중 파밍을 발동시켜줘.
집중 파밍은 2단계 UI야. 먼저 플레이어가 weapon, necklace, helmet, gloves, armor, belt 중 원하는 부위를 고르고, 그다음 해당 부위 장비 3개를 보상으로 보여줘.
부위 선택 UI와 장비 3택 UI 전체 동안 전투 시간, 적 이동, 스폰, 투사체, 자동 공격, 보스 게이지는 모두 멈춰 있어야 해.
또한 StageSelectScene에서 Stage 1~5를 보여주고, storage.ts의 getSaveData().unlockedStage에 따라 잠금/해금을 표시해줘.
```

완료 기준:

```txt
Chest 카운트 표시
3번째 상자에서 부위 선택 가능
부위 선택 중 전투 멈춤
선택한 부위 장비만 보상으로 나옴
선택 안 함 가능
Stage 잠금/해금 UI 작동
```

---

### Milestone 4 — 보스 패턴과 클리어 흐름

전제 조건:

```txt
Milestone 3 완료.
전투 루프, 보물상자, 집중 파밍, 스테이지 선택 UI가 작동해야 한다.
```

목표:

```txt
보스 게이지
보스 등장
Stage별 보스 데이터
최소 charge + aoePulse + radialShot 패턴
보스 처치
보스 보상
다음 스테이지 해금
클리어 결과 화면
```

Cursor 프롬프트 예시:

```txt
Milestone 4를 구현해줘.
GameScene에 보스 게이지를 추가하고, 시간 경과와 몬스터 처치로 게이지가 차게 해줘.
게이지가 100%가 되면 bosses.ts의 BOSS_DEFS에서 해당 Stage 보스를 찾아 등장시켜줘.
보스는 HP만 다른 적이 아니라 최소 charge, aoePulse, radialShot 패턴 중 Stage별로 지정된 패턴을 사용해야 해.
Stage 1은 charge만, Stage 2는 charge+aoePulse, Stage 3은 charge+radialShot, Stage 4는 aoePulse+hazardZone+lineWave, Stage 5는 복합 패턴을 사용해.
보스를 처치하면 보스 보상 3택을 보여주고, 선택 또는 선택 안 함 이후 스테이지 클리어 처리, 다음 스테이지 해금, ResultScene 이동이 되어야 해.
SaveData 업데이트는 storage.ts의 updateSaveData()로 처리해.
```

완료 기준:

```txt
보스 게이지 표시
보스 등장
최소 2가지 이상의 보스 패턴 구현
Stage 1~5 보스 데이터 존재
보스 처치 가능
보스 보상 표시
Stage 1 클리어 후 Stage 2 해금
클리어 결과 화면 표시
```

---

### Milestone 5 — 모바일 대응과 폴리싱

전제 조건:

```txt
Milestone 4 완료.
시작 → 스테이지 선택 → 전투 → 파밍 → 보스 → 클리어/사망 흐름이 끝까지 작동해야 한다.
```

목표:

```txt
세로형 화면 최적화
모바일 드래그 조작 개선
장비 슬롯 탭/드래그 충돌 해결
이펙트/피드백 추가
사운드 토글
초기 배포
```

Cursor 프롬프트 예시:

```txt
Milestone 5를 구현해줘.
게임을 360x640 세로형 화면 기준으로 정리하고, PC에서는 중앙 정렬, 모바일에서는 화면에 맞게 표시되게 해줘.
모바일 조작은 화면 최하단만 쓰지 말고, 전투 화면 하단부와 장비 패널 전체를 드래그 이동 영역으로 사용해줘.
장비 아이콘은 짧게 탭하면 정보 팝업, 드래그하면 이동으로 처리되게 해줘.
타격 이펙트, 상자 획득 이펙트, 보스 등장 연출, 경고 장판, 간단한 사운드 토글도 추가해줘.
```

완료 기준:

```txt
모바일 브라우저에서 이동 가능
하단 네비게이션 바 때문에 조작이 막히지 않음
장비 팝업과 드래그 이동이 구분됨
기본 이펙트가 있음
보스 패턴 경고가 눈에 보임
```

---

### Milestone 6 — 제출 준비

전제 조건:

```txt
Milestone 5 완료.
배포 가능한 플레이 루프, 모바일 대응, 기본 폴리싱이 완료되어야 한다.
```

목표:

```txt
README 정리
배포 URL 준비
GitHub 저장소 공개 상태 확인
시연영상 촬영 준비
라이선스 정리
최종 빌드 확인
```

Cursor 프롬프트 예시:

```txt
Milestone 6을 구현해줘.
README.md를 대회 제출용으로 정리해줘.
게임 개요, 플레이 방법, 조작법, 핵심 시스템, 배포 URL 자리, 시연영상 링크 자리, 사용 기술, 에셋/라이선스 정보를 포함해줘.
또한 npm run build가 성공하도록 정리하고, public/assets/README.md에 현재 사용한 리소스 출처를 기록해줘.
마지막으로 제출 전 수동 테스트 체크리스트를 README 또는 docs/SUBMISSION_CHECKLIST.md에 정리해줘.
```

완료 기준:

```txt
npm run build 성공
README 완성
public/assets/README.md 존재
배포 가능
시연영상 촬영 체크리스트 완료
GitHub public 저장소에서 실행 방법 확인 가능
```

---

## 19. README에 포함할 내용

최종 `README.md`에는 최소 아래를 포함한다.

```md
# 6-Slot Hero

## Overview
짧은 스테이지를 반복하며 6개 장비 슬롯을 파밍해 성장하는 웹 기반 파밍 서바이버 RPG.

## Play
- Deployment URL: TBD
- YouTube Demo: TBD

## Controls
- PC: WASD / Arrow Keys
- Mobile: Drag in lower combat/control/equipment area

## Core Systems
- 6 equipment slots
- Auto attack
- Chest reward 3-choice
- Skip reward option
- Focused loot every 3 chests
- Stage unlock
- Boss unique rewards
- Stage-specific boss patterns

## Tech Stack
- Vite
- TypeScript
- Phaser 3

## Assets & Licenses
- Temporary code-generated assets are used during MVP.
- External assets, if added, are listed here with license information.
```

---

## 20. 시연영상 체크리스트

최종 제출 영상에는 아래 장면이 들어가야 한다.

```txt
1. 시작 화면
2. 스테이지 선택 화면
3. Stage 1 진입
4. 플레이어 이동
5. 자동 공격으로 몬스터 처치
6. 보물상자 획득
7. 장비 3택 선택
8. 선택 안 함 장면 또는 설명
9. Chest 3번째 집중 파밍 장면
10. 보스 게이지 충전
11. 보스 등장
12. 보스 패턴 시연
13. 보스 처치
14. 보스 보상 선택
15. 다음 스테이지 해금
16. 결과 화면
```

영상은 너무 길 필요 없다. 2~4분 내외로 전체 흐름이 보이면 충분하다.

---

## 21. 수동 테스트 체크리스트

개발 중 각 마일스톤 후 아래를 확인한다.

### 빌드

```txt
npm run build 성공
콘솔 에러 없음
새로고침 후 정상 실행
localStorage에 이상한 값이 있어도 기본값으로 복구
```

### PC

```txt
Chrome에서 실행
Edge 또는 Firefox에서 실행
WASD 이동 가능
보상 카드 클릭 가능
StageSelect 이동 가능
```

### 모바일

```txt
Chrome 모바일 또는 DevTools 모바일 모드에서 실행
세로 화면에서 UI가 잘리지 않음
드래그 이동 가능
장비 탭 팝업 가능
보상 카드 터치 가능
하단 네비게이션 바와 조작 충돌 없음
```

### 저장

```txt
장비 장착 후 새로고침해도 유지
Stage 1 클리어 후 Stage 2 해금 유지
Reset Data가 저장을 초기화
localStorage 파손 시 앱 크래시 없음
```

### 게임 흐름

```txt
사망 시 결과 화면
보스 처치 시 클리어 결과 화면
클리어한 스테이지 재입장 가능
집중 파밍 부위 선택 UI 중 전투 정지
보스 보상 선택 후 클리어 처리
```

---

## 22. 임시 밸런스 기준

### 런 목표

```txt
Stage 1: 초보자도 클리어 가능
Stage 2: 기본 장비 1~2개 있으면 클리어 가능
Stage 3: 장비 조합 필요
Stage 4: 생존 장비 필요
Stage 5: 공격/생존 시너지 필요
```

### 대략적인 수치 예시

```txt
Stage 1 enemy HP: 10~20
Stage 2 enemy HP: 20~35
Stage 3 enemy HP: 35~60
Stage 4 enemy HP: 60~90
Stage 5 enemy HP: 90~140

Stage 1 boss HP: 250
Stage 2 boss HP: 500
Stage 3 boss HP: 900
Stage 4 boss HP: 1400
Stage 5 boss HP: 2200
```

이 수치는 임시값이다. 실제 플레이 후 조정한다.

---

## 23. 개발 중 판단 기준

### 기능 우선순위

항상 아래 순서를 따른다.

```txt
1. 플레이 가능 여부
2. 전투 루프 완성
3. 파밍 루프 완성
4. 스테이지/보스/클리어 완성
5. 모바일 조작 안정성
6. 배포 가능성
7. 리소스 완성도
8. 밸런스 세부 조정
```

### 애매할 때의 결정 규칙

```txt
복잡한 기능보다 단순히 작동하는 기능을 선택한다.
리소스가 없으면 도형과 텍스트로 대체한다.
밸런스가 애매하면 쉽게 시작해서 Stage 4~5만 어렵게 만든다.
새 시스템 추가보다 기존 루프 완성도를 높인다.
제출 전에는 리팩토링보다 버그 수정과 빌드 안정성을 우선한다.
```

### 절대 하지 말 것

```txt
로그인 추가
서버 추가
상점/강화/제작 추가
소환수 추가
온라인 저장 추가
저작권 있는 게임 이미지 사용
유료 API 의존
MVP 전에 대규모 리소스 작업
```

---

## 24. 개발용 첫 Cursor 프롬프트

저장소를 만든 뒤 Cursor에 가장 먼저 아래 프롬프트를 넣는다.

```txt
너는 이 저장소에서 6-Slot Hero라는 웹 기반 파밍 서바이버 RPG를 구현하는 개발 에이전트다.
먼저 docs/CURSOR_DEV_INSTRUCTIONS.md를 읽고, 프로젝트 전체 목표와 MVP 범위를 이해해줘.

지금은 리소스 완성도보다 실제 동작하는 게임 흐름이 중요하다.
Vite + TypeScript + Phaser 3 기반으로 시작하고, 외부 서버나 로그인 없이 정적 웹게임으로 구현해줘.

중요한 구현 원칙:
- SaveData는 Phaser.Registry나 scene.start() data로 넘기지 말고 src/game/storage.ts 싱글턴 모듈로 관리해.
- BootScene은 임시 텍스처를 생성하고 loadSaveData()를 호출한 뒤 TitleScene으로 이동해야 해.
- localStorage 로드/저장 실패는 try/catch로 처리하고, 파손 데이터는 기본값으로 복구해.
- 장비는 playerDescription만 만들지 말고 optionRolls의 key/min/max를 가진 구현 데이터로 만들어.
- 집중 파밍의 부위 선택 UI와 장비 3택 UI 전체 동안 전투는 정지 상태여야 해.
- 보스는 HP만 다른 적이 아니라 최소 charge, aoePulse, radialShot 같은 패턴을 사용해야 해.

우선 Milestone 0부터 구현해줘.
TitleScene, StageSelectScene, GameScene, ResultScene을 만들고, 씬 전환이 가능하며 npm run build가 성공하는 상태를 목표로 해줘.
구현 후 변경한 파일과 실행 방법, 다음 단계에서 해야 할 일을 요약해줘.
```

---

## 25. 최종 제출 전 확인

제출 전 반드시 아래를 확인한다.

```txt
배포 URL 접속 가능
시크릿 모드에서도 플레이 가능
회원가입/결제 필요 없음
GitHub 저장소 public
README에 플레이 방법 있음
YouTube 시연영상 공개 또는 링크 접근 가능
시연영상에 시작/플레이/핵심 시스템/종료 화면 포함
Chrome/Edge/Safari/Firefox 중 최소 주요 브라우저에서 확인
모바일 화면에서 UI가 심각하게 잘리지 않음
저작권 문제 있는 리소스 없음
npm run build 성공
localStorage 파손 테스트 통과
```

---

## 26. 요약

`6-Slot Hero`의 개발 목표는 복잡한 RPG를 완벽히 만드는 것이 아니다.

목표는 다음이다.

```txt
짧은 스테이지
이동 중심 조작
자동 공격
보물상자 3택
선택 안 함
3번째 상자 집중 파밍
6슬롯 장비 성장
보스 패턴
보스 처치
스테이지 해금
브라우저에서 바로 플레이
```

이 흐름이 끝까지 동작하면 대회 제출 가능한 MVP가 된다.
