import './styles/base.css';
import './styles/game.css';
import { GameApp } from './game/GameApp';
import { preventPageZoom } from './ui/noZoom';

preventPageZoom();

new GameApp(document.getElementById('app')!);
