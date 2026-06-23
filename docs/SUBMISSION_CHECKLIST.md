# Submission Checklist

## Build

- [ ] `npm install` completes successfully
- [ ] `npm run build` succeeds
- [ ] `npm run preview` serves the built game
- [ ] Browser console has no blocking runtime errors
- [ ] Refreshing the page keeps save data
- [ ] Corrupted localStorage data falls back safely after reload

## PC Test

- [ ] Title screen opens
- [ ] Stage select screen opens
- [ ] Stage 1 starts
- [ ] WASD movement works
- [ ] Arrow key movement works
- [ ] Player automatically attacks nearby enemies
- [ ] Enemies chase and damage the player
- [ ] Player death opens Result screen
- [ ] Chest pickup pauses combat and opens reward cards
- [ ] Reward card equips item
- [ ] `선택 안 함` closes reward without replacing gear
- [ ] Equipment slot click opens item info popup
- [ ] Every third chest opens Focused Loot slot selection
- [ ] Boss gauge fills
- [ ] Boss appears and uses visible warning patterns
- [ ] Boss defeat opens boss reward
- [ ] Boss reward clears the stage
- [ ] Stage 1 clear unlocks Stage 2

## Mobile Test

- [ ] Game fits a 1080x1920 (9:16) portrait viewport via Scale.FIT
- [ ] Dragging in the lower combat/control/equipment area moves the player
- [ ] Equipment slot short tap opens item info
- [ ] Dragging over equipment slots does not accidentally open item info
- [ ] Reward cards can be tapped
- [ ] Focused Loot slot buttons can be tapped
- [ ] Bottom browser navigation does not block core controls

## Save Data

- [ ] Equipped gear persists after refresh
- [ ] Cleared stages persist after refresh
- [ ] Unlocked stage persists after refresh
- [ ] Reset Data clears equipped gear and unlock progress
- [ ] Volume toggle persists after refresh

## Submission Links

- [ ] Deployment URL is live
- [ ] GitHub repository is public
- [ ] YouTube demo link is accessible
- [ ] README contains deployment URL
- [ ] README contains YouTube demo link
- [ ] Demo video shows title, stage select, combat, chest reward, focused loot, boss, boss reward, unlock, and result screen
