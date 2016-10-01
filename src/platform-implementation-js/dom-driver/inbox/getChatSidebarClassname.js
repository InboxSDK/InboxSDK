/* @flow */

import _ from 'lodash';
import cssParser from 'postcss-selector-parser';
import Logger from '../../lib/logger';

const cssProcessor = cssParser();

// There's a specific classname when put on an element which switches the page
// into the chat sidebar layout. We need to be able to activate that chat
// sidebar layout ourselves, and we don't want to hardcode this classname
// because Inbox is prone to changing their classnames.

const getChatSidebarClassname: () => string = _.once(() => {
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
  const classRegexes: RegExp[] = Array.from((document.querySelector('[role=application]').classList: any))
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
    .filter(rule => rule.style.marginLeft && rule.style.marginRight)
    .value();

  const onlyNavSidebarRule = _.chain(rules)
    .filter(rule =>
      parseFloat(rule.style.marginLeft) > parseFloat(rule.style.marginRight)
    ).head().value();
  const onlyChatSidebarRule = _.chain(rules)
    .filter(rule =>
      parseFloat(rule.style.marginLeft) < parseFloat(rule.style.marginRight)
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

  const onlyNavSidebarClassNames: string[] = getMentionedClassNames(
    cssProcessor.process(onlyNavSidebarRule.selectorText).res
  );
  const onlyChatSidebarClassNames: string[] = getMentionedClassNames(
    cssProcessor.process(onlyChatSidebarRule.selectorText).res
  );

  const chatSidebarClassNames: string[] = _.difference(
    onlyChatSidebarClassNames,
    onlyNavSidebarClassNames
  );

  if (chatSidebarClassNames.length !== 1) {
    const err = new Error('Failed to find single chat sidebar classname');
    Logger.error(err, {
      onlyNavSidebarClassNames,
      onlyChatSidebarClassNames,
      chatSidebarClassNames
    });
    throw err;
  }

  return chatSidebarClassNames[0];
});

export default getChatSidebarClassname;
