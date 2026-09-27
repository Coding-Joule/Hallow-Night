import './styles/base.css';
import './styles/game.css';
import './styles/editor.css';
import './styles/creator.css';
import { SecretCreatorApp } from './creator/SecretCreatorApp';

new SecretCreatorApp(document.getElementById('app')!);
