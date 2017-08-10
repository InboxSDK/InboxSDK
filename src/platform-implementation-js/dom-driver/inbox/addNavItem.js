/* @flow */

import Kefir from 'kefir';
import InboxNavItemView from './views/inboxNavItemView';
import insertElementInOrder from '../../lib/dom/insert-element-in-order';
import eventNameFilter from '../../lib/event-name-filter';
import querySelector from '../../lib/dom/querySelectorOrFail';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';

import type LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';

export default function addNavItem(
  navItemDescriptor: Kefir.Observable<Object>,
  leftNavLiveSet: LiveSet<TagTreeNode<HTMLElement>>,
  containerEl: HTMLElement
): InboxNavItemView {
  const inboxNavItemView = new InboxNavItemView(navItemDescriptor, 0);

  toItemWithLifetimeStream(leftNavLiveSet).take(1)
    .map(({el: node}) => node.getValue())
    .onValue((el) => {
      inboxNavItemView.getEventStream()
        .filter(eventNameFilter('orderChanged'))
        .onValue(() => (
          insertElementInOrder(containerEl, inboxNavItemView.getElement())
        ));

      if (!el.contains(containerEl)) {
        const existingCustomSections = el.querySelectorAll('.inboxsdk__navItem_appContainer');
        if (existingCustomSections.length > 0) {
          const lastCustomSection = existingCustomSections[existingCustomSections.length - 1];
          lastCustomSection.insertAdjacentElement('afterend', containerEl);
        } else {
          // Locate <ul> with native folders by finding draft icon image
          const draftsImg = querySelector(el, 'ul > li > img[src*="ic_draft"]');

          const nativeFolderSection = (
            draftsImg.parentElement &&
            draftsImg.parentElement.parentElement
          );

          if (!nativeFolderSection) throw new Error('could not locate insertion point');

          nativeFolderSection.insertAdjacentElement('afterend', containerEl);
        }
      }

      insertElementInOrder(containerEl, inboxNavItemView.getElement());
    });

  return inboxNavItemView;
}
