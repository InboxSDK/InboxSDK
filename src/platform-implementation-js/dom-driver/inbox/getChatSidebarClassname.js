/* @flow */

import _ from 'lodash';
import cssParser from 'postcss-selector-parser';
import Logger from '../../lib/logger';

const cssProcessor = cssParser();

const getChatSidebarClassname: () => string = _.once(() => {
  const classRegexes: RegExp[] = Array.from((document.querySelector('[role=application]').classList: any))
    .map(x => new RegExp('\\.'+x+'\\b'));
  if (classRegexes.length === 0) throw new Error('no class names on element');

  function rulesToStyleRules(rule: CSSRule): Object[] {
    if (rule instanceof window.CSSMediaRule) {
      if (_.some(rule.media, m => window.matchMedia(m).matches)) {
        return _.flatMap(rule.cssRules, rulesToStyleRules);
      }
    } else if (rule instanceof window.CSSStyleRule) {
      return [rule];
    }
    return [];
  }

  const rules = _.chain(document.styleSheets)
    .flatMap(sheet => Array.from(sheet.cssRules))
    .flatMap(rulesToStyleRules)
    .filter(rule => classRegexes.some(r => r.test(rule.selectorText)))
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
      onlyNavSidebarRuleCount: onlyNavSidebarRule.length,
      onlyChatSidebarRuleCount: onlyChatSidebarRule.length
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

  const onlyNavSidebarClassNames = getMentionedClassNames(
    cssProcessor.process(onlyNavSidebarRule.selectorText).res
  );
  const onlyChatSidebarClassNames = getMentionedClassNames(
    cssProcessor.process(onlyChatSidebarRule.selectorText).res
  );

  const chatSidebarClassNames = _.difference(
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
