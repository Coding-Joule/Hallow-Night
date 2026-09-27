import './styles/base.css';
import './styles/game.css';
import './styles/editor.css';
import { PublicEditorApp } from './editor/PublicEditorApp';

new PublicEditorApp(document.getElementById('app')!);
