import { Page, Browser, BrowserContext } from 'puppeteer';

declare global {
  const jestPuppeteer: {
    debug(): Promise<void>;
  };

  const page: Page;
  const browser: Browser;
  const context: BrowserContext;
}
