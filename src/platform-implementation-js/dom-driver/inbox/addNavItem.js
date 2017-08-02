/* @flow */

import Kefir from 'kefir';
import InboxNavItemView from './views/inboxNavItemView';
import Logger from '../../lib/logger';
import insertElementInOrder from '../../lib/dom/insert-element-in-order';
import eventNameFilter from '../../lib/event-name-filter';
import querySelector from '../../lib/dom/querySelectorOrFail';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';

import type LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';

const containerEl = document.createElement('div');
containerEl.classList.add('inboxsdk__navItem_appContainer');

export default function addNavItem(
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<Object>,
  leftNavLiveSet: LiveSet<TagTreeNode<HTMLElement>>
): InboxNavItemView {
  const inboxNavItemView = new InboxNavItemView(orderGroup, 0);

  toItemWithLifetimeStream(leftNavLiveSet).take(1)
    .map(({el: node}) => node.getValue())
    .onValue((el) => {
      inboxNavItemView.getEventStream()
        .filter(eventNameFilter('orderChanged'))
        .onValue(() => (
          insertElementInOrder(containerEl, inboxNavItemView.getElement())
        ));

      if (el.contains(containerEl)) {
        // This app has already added its nav container to Inbox's UI
        insertElementInOrder(containerEl, inboxNavItemView.getElement());
        return;
      }

      // Locate <ul> with native folders by finding draft icon image
      const draftsImg = querySelector(el, 'ul > li > img[src*="ic_draft"]');

      const nativeFolderSection = (
        draftsImg.parentElement &&
        draftsImg.parentElement.parentElement
      );

      if (!nativeFolderSection) throw new Error('could not locate insertion point');

      nativeFolderSection.insertAdjacentElement('afterend', containerEl);

      insertElementInOrder(containerEl, inboxNavItemView.getElement());
    });

    inboxNavItemView.setNavItemDescriptor(navItemDescriptor);

  return inboxNavItemView;
}
