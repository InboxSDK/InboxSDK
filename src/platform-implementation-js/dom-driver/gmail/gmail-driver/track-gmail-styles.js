/* @flow */

import Logger from '../../../lib/logger';
import waitFor from '../../../lib/wait-for';
import GmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';

const RGB_REGEX = /^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/;

function getDensity(driver: GmailDriver): string {
  // get the padding amount on the left-nav-menu entries to find the active
  // density setting value.
  const navItemOuter = document.querySelector('.TO .TN');
  if (!navItemOuter) {
    Logger.error(new Error("Failed to find nav item outer element"));
    return 'compact';
  }
  const padding = parseInt(getComputedStyle(navItemOuter).getPropertyValue('padding-top'), 10);
  if (padding >= 6) {
    return 'comfortable';
  } else if (padding >= 3) {
    return 'cozy';
  } else {
    return 'compact';
  }
}

function isDarkTheme(driver: GmailDriver): boolean {
  // get the color of the left-nav-menu entries to determine whether Gmail is
  // in dark theme mode.
  const navItem = document.querySelector('.aio');
  if (!navItem) {
    Logger.error(new Error("Failed to find nav item"));
    return false;
  }
  const colorString = getComputedStyle(navItem).getPropertyValue('color');
  const colorMatch = RGB_REGEX.exec(colorString);
  if (!colorMatch) {
    Logger.error(new Error("Failed to read color string"), {colorString});
    return false;
  }
  const r = +colorMatch[1], g = +colorMatch[2], b = +colorMatch[3];
  if (r !== g || r !== b) {
    Logger.error(new Error("Nav item color not grayscale"), {r,g,b});
  }
  return r > 128;
}

export default function trackGmailStyles(driver: GmailDriver) {
  if (
    (document.head:any).hasAttribute('data-inboxsdk-gmail-style-tracker') ||
    GmailElementGetter.isStandalone()
  ) {
    return;
  }
  (document.head:any).setAttribute('data-inboxsdk-gmail-style-tracker', 'true');

  let currentDensity = null;
  let currentDarkTheme = null;

  function checkStyles() {
    const newDensity = getDensity(driver);
    if (currentDensity !== newDensity) {
      if (currentDensity) {
        ((document.body:any):HTMLElement).classList.remove('inboxsdk__gmail_density_' + currentDensity);
      }
      currentDensity = newDensity;
      ((document.body:any):HTMLElement).classList.add('inboxsdk__gmail_density_' + currentDensity);
    }

    const newDarkTheme = isDarkTheme(driver);
    if (currentDarkTheme !== newDarkTheme) {
      currentDarkTheme = newDarkTheme;
      if (currentDarkTheme) {
        ((document.body:any):HTMLElement).classList.add('inboxsdk__gmail_dark_theme');
      } else {
        ((document.body:any):HTMLElement).classList.remove('inboxsdk__gmail_dark_theme');
      }
    }
  }

  waitFor(() => document.querySelector('.TO .TN') && document.querySelector('.aio'))
    .then(() => {
      // Gmail changes an inline <style> sheet when the display density changes.
      // Watch for changes to all <style> elements.
      const observer = new MutationObserver(checkStyles);
      const options = {
        characterData: true,
        childList: true
      };
      Array.from(document.styleSheets).forEach(sheet => {
        if (sheet.ownerNode.tagName == 'STYLE') {
          observer.observe(sheet.ownerNode, options);
        }
      });
      checkStyles();
    })
    .catch(err => {
      Logger.error(err);
    });
}
