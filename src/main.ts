import Phaser from 'phaser';
import './styles.css';
import { applyUiTextFactoryPatch } from './game/uiText';
import { gameConfig } from './game/config';

applyUiTextFactoryPatch();
new Phaser.Game(gameConfig);
