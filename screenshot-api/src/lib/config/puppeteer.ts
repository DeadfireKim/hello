import { PuppeteerLaunchOptions } from 'puppeteer';

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
    width: 1920,
    height: 1080,
  },
};

export const navigationOptions = {
  waitUntil: 'networkidle2' as const,
  timeout: 30000, // 30 seconds
};
