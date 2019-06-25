declare var jestPuppeteer: {
  debug(): Promise<void>;
};

import {Page as __Page, Browser as __Browser, BrowserContext as __BrowserContext} from 'puppeteer';

declare var page: __Page;
declare var browser: __Browser;
declare var context: __BrowserContext;
