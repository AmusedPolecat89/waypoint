import { render } from 'preact';
import { App } from './App';
import { initTheme } from '@/lib/theme';
import '../styles/global.css';

// Initialize theme before rendering to prevent flash
initTheme().then(() => {
  render(<App />, document.getElementById('app')!);
});
