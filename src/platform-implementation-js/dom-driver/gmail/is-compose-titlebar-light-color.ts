const WIDE_ICONS = '24px';

function isGmailRuleForTitlebarWideIcons(): boolean {
  const styleSheetsWithHlRuleWithWideIcons = [...document.styleSheets].find(
    (s) => {
      try {
        if (s.cssRules) {
          return [...s.cssRules].find(
            (rule) =>
              rule instanceof CSSStyleRule &&
              rule.selectorText === '.Hl' &&
              rule.cssText.indexOf(WIDE_ICONS) > 0
          );
        }
      } catch (e) {
        // Some stylesheets are crossorigin and throw if we try to access
        // their rules. Don't worry about them.
      }
      return false;
    }
  );

  return typeof styleSheetsWithHlRuleWithWideIcons !== 'undefined';
}

export default function isComposeTitleBarLightColor(): boolean {
  return !isGmailRuleForTitlebarWideIcons();
}
