function isGmailRuleForTitlebarWideIcons(): boolean {
  return !![...document.styleSheets].find((s) => {
    try {
      if (s.cssRules) {
        return [...s.cssRules].find(
          (rule) =>
            rule instanceof CSSStyleRule &&
            rule.selectorText === '.Hl' &&
            rule.style.width === '24px'
        );
      }
    } catch (e) {
      // Some stylesheets are crossorigin and throw if we try to access
      // their rules. Don't worry about them.
    }
    return false;
  });
}

export default function isComposeTitleBarLightColor(): boolean {
  return !isGmailRuleForTitlebarWideIcons();
}
