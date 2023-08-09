import kefirBus from 'kefir-bus';
import Logger from '../../../lib/logger';
import waitFor, { WaitForError } from '../../../lib/wait-for';
import GmailElementGetter from '../gmail-element-getter';

const RGB_REGEX = /^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/;

function getDensity(): 'compact' | 'default' {
  const navItemElement = document.querySelector('.aim');
  if (!navItemElement) {
    Logger.error(new Error('Failed to find a nav item element'));
    return 'default';
  }

  const rect = navItemElement.getBoundingClientRect();
  return rect?.height === 24 ? 'compact' : 'default';
}

const navItemSelector = '.aio' as const;

function getNavItem() {
  return document.querySelector(navItemSelector);
}

/**
 * @returns true if Gmail is in dark theme mode, false if not, or null if it can't be determined
 */
export async function checkForDarkThemeSafe() {
  try {
    await waitFor(() => getNavItem());
  } catch (e: unknown) {
    if (e instanceof WaitForError) {
      return null;
    }

    throw e;
  }

  return isDarkTheme();
}

function isDarkTheme(): boolean {
  // get the color of the left-nav-menu entries to determine whether Gmail is
  // in dark theme mode.
  const navItem = getNavItem();
  if (!navItem) {
    Logger.error(new Error('Failed to find nav item'));
    return false;
  }
  const colorString = getComputedStyle(navItem).getPropertyValue('color');
  const colorMatch = RGB_REGEX.exec(colorString);
  if (!colorMatch) {
    Logger.error(new Error('Failed to read color string'), { colorString });
    return false;
  }
  const r = +colorMatch[1],
    g = +colorMatch[2],
    b = +colorMatch[3];
  // rgb(32, 33, 36) is the default color of nav items in Material Gmail
  if (r === 32 && g === 33 && b === 36) {
    return false;
  }
  if (r !== g || r !== b) {
    Logger.error(new Error('Nav item color not grayscale'), { r, g, b });
  }
  return r > 128;
}

export const stylesStream = kefirBus<
  { type: 'theme'; isDarkMode: boolean },
  unknown
>();

export default async function trackGmailStyles() {
  if (
    document.head.hasAttribute('data-inboxsdk-gmail-style-tracker') ||
    GmailElementGetter.isStandalone()
  ) {
    return;
  }
  document.head.setAttribute('data-inboxsdk-gmail-style-tracker', 'true');

  let currentDensity: string | null = null;
  let currentDarkTheme: boolean | null = null;

  function checkStyles() {
    const newDensity = getDensity();
    if (currentDensity !== newDensity) {
      if (currentDensity) {
        document.body.classList.remove(
          'inboxsdk__gmail_density_' + currentDensity
        );
      }
      currentDensity = newDensity;
      document.body.classList.add('inboxsdk__gmail_density_' + currentDensity);
    }

    const newDarkTheme = isDarkTheme();
    if (currentDarkTheme !== newDarkTheme) {
      currentDarkTheme = newDarkTheme;
      if (currentDarkTheme) {
        document.body.classList.add('inboxsdk__gmail_dark_theme');
      } else {
        document.body.classList.remove('inboxsdk__gmail_dark_theme');
      }

      stylesStream.emit({
        type: 'theme',
        isDarkMode: newDarkTheme,
      });
    }
  }

  try {
    await waitFor(
      () =>
        document.querySelector('.TO .TN') &&
        document.querySelector(navItemSelector)
    );
  } catch (err) {
    Logger.error(err);
    return;
  }

  // Gmail changes an inline <style> sheet when the display density changes.
  // Watch for changes to all <style> elements.
  const observer = new MutationObserver(checkStyles);
  const options = {
    characterData: true,
    childList: true,
  };
  for (const sheet of document.styleSheets) {
    if (!(sheet.ownerNode instanceof Element)) {
      continue;
    }
    if (sheet.ownerNode.tagName == 'STYLE') {
      observer.observe(sheet.ownerNode!, options);
    }
  }
  checkStyles();
}
