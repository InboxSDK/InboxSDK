import kefirBus from 'kefir-bus';
import Logger from '../../../lib/logger';
import waitFor, { WaitForError } from '../../../lib/wait-for';
import GmailElementGetter from '../gmail-element-getter';

/** should handle rgb and rgba */
const RGB_REGEX = /^rgba?\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(,\s*(0\.)?\d+)?\)/;

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

  return isFrameDarkTheme();
}

function extractRgbColor(colorString: string) {
  const match = RGB_REGEX.exec(colorString);
  if (!match) {
    Logger.error(new Error('Failed to read color string'), { colorString });
    return;
  }

  return {
    r: +match[1],
    g: +match[2],
    b: +match[3],
  };
}

function isFrameDarkTheme(): boolean {
  // get the color of the left-nav-menu entries to determine whether Gmail is
  // in dark theme mode.
  const navItem = getNavItem();
  if (!navItem) {
    Logger.error(new Error('Failed to find nav item'));
    return false;
  }
  const colorString = getComputedStyle(navItem).getPropertyValue('color');
  const { r } = extractRgbColor(colorString) ?? {};

  if (r === undefined) {
    return false;
  }

  return r > 128;
}

function isBodyDarkTheme() {
  const bodyEl = document.querySelector('.bkK > .nH');

  if (!bodyEl) {
    return false;
  }

  const bgColor = getComputedStyle(bodyEl).backgroundColor;
  const { r } = extractRgbColor(bgColor) ?? {};

  if (r != null) {
    return r < 128;
  }

  return false;
}

export const stylesStream = kefirBus<
  { type: 'theme'; isDarkMode: { frame: boolean; body: boolean } },
  unknown
>();

const enum ClassName {
  /** Applied if Gmail's frame is a dark theme. Useful for styling nav items. */
  darkFrameTheme = 'inboxsdk__gmail_dark_theme',
  /** Applied if Gmail's body is a light theme. Useful for styling inbox and search adjacent items. */
  darkBodyTheme = 'inboxsdk__gmail_dark_body_theme',
}

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
          'inboxsdk__gmail_density_' + currentDensity,
        );
      }
      currentDensity = newDensity;
      document.body.classList.add('inboxsdk__gmail_density_' + currentDensity);
    }

    const newDarkTheme = isFrameDarkTheme();
    if (currentDarkTheme !== newDarkTheme) {
      currentDarkTheme = newDarkTheme;

      if (currentDarkTheme) {
        document.body.classList.add(ClassName.darkFrameTheme);
      } else {
        document.body.classList.remove(ClassName.darkFrameTheme);
      }
    }

    const newBodyDarkTheme = isBodyDarkTheme();

    if (newBodyDarkTheme) {
      document.body.classList.add(ClassName.darkBodyTheme);
    } else {
      document.body.classList.remove(ClassName.darkBodyTheme);
    }

    stylesStream.emit({
      type: 'theme',
      isDarkMode: { frame: currentDarkTheme, body: newBodyDarkTheme },
    });
  }

  try {
    await waitFor(
      () =>
        document.querySelector('.TO .TN') &&
        document.querySelector(navItemSelector),
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
