# Assets

This MVP uses temporary code-generated visual assets and imported audio assets.

## Generated In Code

- Player, enemy, boss, chest, projectile, slash, AoE, warning, and item card textures are generated in `src/game/scenes/BootScene.ts`.
- WebAudio oscillator sounds remain as a fallback in `src/game/systems/SoundSystem.ts`.

## External Assets

Audio files from `sound_raw/` are copied into `public/assets/audio/` and loaded by `src/game/systems/SoundSystem.ts`.

Current audio usage:

- `ebunny-mystical-fantasy-loop-366827.mp3`: title BGM
- `TownTheme.mp3`: stage select/result BGM
- `battleThemeA.mp3`: stage 1-2 BGM
- `Battle.mp3`: stage 3-4 BGM
- `bosstheme_WO_low.mp3`: stage 5 BGM
- `click1.ogg`, `metalClick.ogg`: UI/equip SFX
- `dropLeather.ogg`: chest SFX
- `knifeSlice.ogg`, `yodguard-fire-magic-3-378640.mp3`, `yodguard-lightning-magic-1-378645.mp3`, `metalPot1.ogg`: weapon SFX
- `dragon-studio-lightning-spell-386163.mp3`, `coghezzi-holy-healing-spell-533279.mp3`, `yodguard-potion-drink-3-540167.mp3`: necklace SFX
- `freesound_community-supernatural-explosion-104295.mp3`: boss/impact SFX

Before final submission, verify and record each audio file's original source URL, author, and license.
