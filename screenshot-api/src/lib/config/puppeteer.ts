import { PuppeteerLaunchOptions } from 'puppeteer';
import { SCREENSHOT_CONFIG } from './app-config';

export const puppeteerConfig: PuppeteerLaunchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
  ],
  // Default viewport
  defaultViewport: {
    width: SCREENSHOT_CONFIG.defaultViewportWidth,
    height: SCREENSHOT_CONFIG.defaultViewportHeight,
  },
};

export const navigationOptions = {
  waitUntil: 'networkidle2' as const,
  timeout: SCREENSHOT_CONFIG.navigationTimeout,
};
