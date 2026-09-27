import './styles/base.css';
import './styles/game.css';
import './styles/editor.css';
import './styles/creator.css';
import { SecretCreatorApp } from './creator/SecretCreatorApp';
import { loadBuiltinLevels } from './game/levels/registry';

// the creator needs the built-in list (numbering, "Edit built-in")
void loadBuiltinLevels().then(() => new SecretCreatorApp(document.getElementById('app')!));
