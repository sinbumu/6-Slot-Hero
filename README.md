# 6-Slot Hero

짧은 스테이지를 반복하며 6개 장비 슬롯을 파밍해 성장하는 웹 기반 파밍 서바이버 RPG입니다.

## Play

- Deployment URL: TBD
- YouTube Demo: TBD

## Controls

- PC movement: WASD / Arrow Keys
- PC menus & modals: W/S (or Arrow Up/Down) to focus · Enter / Space to confirm · A/D in 2-column grids
- Mobile: Floating joystick (bottom-left) · Tap gear slots (bottom-right) for details
- Equipment: Tap an equipment slot to view item details
- Rewards: Focus a card with W/S, confirm with Enter/Space, or click · `선택 안 함` to skip
- Reward moments: Brief slow-mo + vignette on chest/boss pickup; ~200ms safety pause + ~250ms ease-out after you choose

## Core Systems

- 6 equipment slots: Weapon, Necklace, Helmet, Gloves, Armor, Belt
- Automatic attacks driven by equipped gear
- Monster spawning, chasing, contact damage, and death flow
- Chest reward 3-choice with skip option
- Focused loot every 3 chests with slot selection
- Stage unlock and cleared stage persistence
- Stage-specific bosses with charge, AoE, projectile, line, and hazard patterns
- Boss reward selection and clear result flow
- localStorage save data with reset support
- Code-generated temporary art and WebAudio sound cues

## Tech Stack

- Vite
- TypeScript
- Phaser 3
- CSS
- localStorage

Logical resolution: **1080×1920** (9:16 portrait, scaled from a 360×640 design base via `RENDER_SCALE=3`).

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Assets & Licenses

The current MVP uses temporary code-generated Phaser textures and WebAudio-generated sound cues. No external copyrighted game assets are included.

External assets, if added later, must be documented in `public/assets/README.md` with source and license information.

## Audio Credits

- Main title BGM: Mystical Fantasy Loop by Ebunny, Pixabay Content License
- Stage select BGM: Town Theme RPG by cynicmusic, CC0, OpenGameArt
- Battle BGM: Battle Theme A by cynicmusic, CC0, OpenGameArt
- Battle BGM: Battle Theme by Wolfgang_, CC0, OpenGameArt
- Boss BGM: Boss Battle Music by SubspaceAudio, CC0, OpenGameArt
- UI / RPG / Impact SFX: Kenney Audio Packs, CC0
- Elemental SFX candidates: Pixabay Sound Effects, Pixabay Content License