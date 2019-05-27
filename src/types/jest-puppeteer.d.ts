import { Page, Browser, BrowserContext } from 'puppeteer';

declare global {
  var jestPuppeteer: {
    debug(): Promise<void>;
  };

  var page: Page;
  var browser: Browser;
  var context: BrowserContext;
}
