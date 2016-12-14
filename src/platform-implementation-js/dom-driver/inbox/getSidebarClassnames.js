/* @flow */

import _ from 'lodash';
import cssParser from 'postcss-selector-parser';
import Logger from '../../lib/logger';
import querySelector from '../../lib/dom/querySelectorOrFail';

const cssProcessor = cssParser();

// There are specific classnames which are added when the chat or nav sidebars
// are open which affect the layout of the page. We need to be able to activate
// that chat sidebar layout ourselves, and we don't want to hardcode this
// classname because Inbox is prone to changing their classnames.

// We also get the classname for the center list element which has margins
// applied to it depending on the current page width and sidebar settings to
// keep it lined up with the search bar.

const getSidebarClassnames: () => {
  chat: ?string, nav: ?string, centerList: ?string
} = _.once(() => {
  // We know that the page has a CSS rule which looks like
  //   .blah.chat .foo { margin-right: bigger number; margin-left: smaller number; }
  // where .chat is the chat sidebar classname that we want to know, and .foo
  // is one of the classnames that's on the [role=application] element.

  // We could search the rules for this rule, but then we don't know which part
  // of the selector string is the chat sidebar classname!

  // There's also another similar rule for when only the nav sidebar is open:
  //   .blah.nav .foo { margin-right: smaller number; margin-left: bigger number; }
  // If we find both of thse rules, then we can find the classname which is
  // mentioned in the chat sidebar rule which is not mentioned in the nav
  // sidebar rule.

  // So first we find all the classnames on the [role=application] and make a
  // regex for each one.
  const classRegexes: RegExp[] = Array.from((querySelector(document, '[role=application]').classList: any))
    .map(x => new RegExp('\\.'+x+'\\b'));
  if (classRegexes.length === 0) throw new Error('no class names on element');

  function rulesToStyleRules(rule: CSSRule): Object[] {
    if (rule instanceof window.CSSMediaRule) {
      return _.flatMap(rule.cssRules, rulesToStyleRules);
    } else if (rule instanceof window.CSSStyleRule) {
      return [rule];
    }
    return [];
  }

  // rules will contain both the chat and nav sidebar rules.
  const rules = _.chain(document.styleSheets)
    .flatMap(sheet => Array.from(sheet.cssRules || []))
    .flatMap(rulesToStyleRules)
    // We have all page rules. Filter it down to just rules mentioning one of
    // [role=application]'s classnames.
    .filter(rule => classRegexes.some(r => r.test(rule.selectorText)))
    // Now just the rules that contain both margin-left and -right rules.
    .filter(rule => rule.style['margin-left'] && rule.style['margin-right'])
    .value();

  const onlyNavSidebarRule = _.chain(rules)
    .filter(rule =>
      parseFloat(rule.style['margin-left']) > parseFloat(rule.style['margin-right'])
    ).head().value();
  const onlyChatSidebarRule = _.chain(rules)
    .filter(rule =>
      parseFloat(rule.style['margin-left']) < parseFloat(rule.style['margin-right'])
    ).head().value();
  if (!onlyNavSidebarRule || !onlyChatSidebarRule) {
    const err = new Error('Failed to parse element CSS rules');
    Logger.error(err, {
      rulesCount: rules.length,
      hasOnlyNavSidebarRule: !!onlyNavSidebarRule,
      hasOnlyChatSidebarRule: !!onlyChatSidebarRule
    });
    throw err;
  }

  function getMentionedClassNames(node): string[] {
    switch (node.type) {
      case 'root':
      case 'selector':
        return _.flatMap(node.nodes, getMentionedClassNames);
      case 'class':
        return [node.value];
      default:
        return [];
    }
  }

  const onlyNavSidebarRuleClassNames: string[] = getMentionedClassNames(
    cssProcessor.process(onlyNavSidebarRule.selectorText).res
  );
  const onlyChatSidebarRuleClassNames: string[] = getMentionedClassNames(
    cssProcessor.process(onlyChatSidebarRule.selectorText).res
  );

  const chatSidebarClassNames: string[] = _.difference(
    onlyChatSidebarRuleClassNames,
    onlyNavSidebarRuleClassNames
  );

  const navSidebarClassNames: string[] = _.difference(
    onlyNavSidebarRuleClassNames,
    onlyChatSidebarRuleClassNames
  );

  const centerListClassName: ?string = _.last(onlyNavSidebarRuleClassNames) === _.last(onlyChatSidebarRuleClassNames) ?
    _.last(onlyNavSidebarRuleClassNames) : null;

  if (chatSidebarClassNames.length !== 1 || navSidebarClassNames.length !== 1 || !centerListClassName) {
    Logger.error(new Error('Failed to find sidebar classnames'), {
      onlyNavSidebarRuleClassNames,
      onlyChatSidebarRuleClassNames,
      chatSidebarClassNames,
      navSidebarClassNames,
      centerListClassName
    });
  }

  return {
    chat: chatSidebarClassNames[0],
    nav: navSidebarClassNames[0],
    centerList: centerListClassName
  };
});

export default getSidebarClassnames;
