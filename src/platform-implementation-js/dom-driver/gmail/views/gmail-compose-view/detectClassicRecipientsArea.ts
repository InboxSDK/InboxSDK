import once from 'lodash/once';

export default once(function detectClassicRecipientsArea() {
  const styleSheetWithComposeRules = [...document.styleSheets].find((s) => {
    try {
      if (s.cssRules) {
        // Both classic and new recipients Gmail should have this rule
        return [...s.cssRules].find(
          (rule) =>
            rule instanceof CSSStyleRule &&
            rule.selectorText === '.aoI' &&
            rule.style.fontSize &&
            rule.style.color,
        );
      }
    } catch (e) {
      // Some stylesheets are crossorigin and throw if we try to access
      // their rules. Don't worry about them.
    }
    return false;
  });
  if (styleSheetWithComposeRules) {
    // Check if we don't have any of these specific rules.
    // If so, we're on classic recipients Gmail.
    const hasOverflowYVisibleRule = [
      ...styleSheetWithComposeRules.cssRules,
    ].some(
      (rule) =>
        rule instanceof CSSStyleRule &&
        rule.selectorText === '.aoI' &&
        rule.style.overflowY === 'visible',
    );
    if (hasOverflowYVisibleRule) {
      return;
    }
    const hasOverflowYAutoRule = [...styleSheetWithComposeRules.cssRules].some(
      (rule) =>
        rule instanceof CSSStyleRule &&
        rule.selectorText === '.aaZ > .M9 > .aoI' &&
        rule.style.overflowY === 'auto',
    );
    if (hasOverflowYAutoRule) {
      return;
    }

    document.body.classList.add('inboxsdk__classic_gmail_recipients_area');
  }
});
