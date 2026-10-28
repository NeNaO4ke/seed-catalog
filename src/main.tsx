import React from 'react';
// @ts-expect-error CSS is processed by the bundler and has no TypeScript declarations.
import { createRoot } from 'react-dom/client';
import App from './App';
import { parseAppConfig } from './types/appConfig';
// @ts-expect-error CSS is processed by the bundler and has no TypeScript declarations.
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Не знайдено кореневий елемент застосунку.');

const startApp = async () => {
  try {
    const baseUrl = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
    const response = await fetch(`${baseUrl}app-config.json`);
    if (!response.ok) throw new Error(`Сервер відповів зі статусом ${response.status}.`);
    const configValue: unknown = await response.json();
    const config = parseAppConfig(configValue);
    const fontsLink = document.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = config.googleFontsStylesheetUrl;
    document.head.append(fontsLink);

    createRoot(root).render(
      <React.StrictMode><App config={config} /></React.StrictMode>
    );
  } catch (error) {
    console.error('Не вдалося завантажити конфігурацію застосунку.', error);
    root.textContent = `Не вдалося завантажити конфігурацію застосунку: ${error instanceof Error ? error.message : String(error)}`;
  }
};

void startApp();