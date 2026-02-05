/**
 * Application Entry Point
 *
 * Initializes React application with strict mode and renders the App.
 *
 * @module main
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Import global styles
import './styles/themes.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
