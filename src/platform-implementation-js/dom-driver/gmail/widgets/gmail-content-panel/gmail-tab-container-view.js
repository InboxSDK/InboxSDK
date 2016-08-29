/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

import multiCompareSort from '../../../../lib/multi-compare-sort';
import getInsertBeforeElement from '../../../../lib/dom/get-insert-before-element';
import GmailTabView from './gmail-tab-view';

export default class GmailTabContainerView {
  destroyed: boolean;
  _element: HTMLElement;
  _tablistElement: HTMLElement;
  _eventStream: Bus<any>;
  _descriptorToGmailTabViewMap: Map<Object, GmailTabView>;
  _gmailTabViews: GmailTabView[];
  _visibleGmailTabViews: GmailTabView[];
  _activeGmailTabView: ?GmailTabView;

  constructor(element: ?HTMLElement) {
    this.destroyed = false;
    this._activeGmailTabView = null;
    this._eventStream = kefirBus();
    this._descriptorToGmailTabViewMap = new Map();
    this._gmailTabViews = [];
    this._visibleGmailTabViews = [];

    if (!element) {
      this._setupElement();
    } else {
      this._setupExistingElement(element);
    }
  }

  destroy() {
    this.destroyed = true;
    (this._element:any).remove();
    (this._tablistElement:any).remove();
    this._eventStream.end();
    this._gmailTabViews.slice().forEach(x => {x.destroy();});
    this._gmailTabViews.length = this._visibleGmailTabViews.length = 0;
  }

  getElement(): HTMLElement {return this._element;}
  getEventStream(): Kefir.Observable<Object> {return this._eventStream;}

  addTab(descriptor: Object, groupOrderHint: any) {
    var gmailTabView = new GmailTabView(descriptor, groupOrderHint);

    this._descriptorToGmailTabViewMap.set(descriptor, gmailTabView);

    this._gmailTabViews.push(gmailTabView);
    descriptor.take(1).onValue(this._addTab.bind(this, gmailTabView, groupOrderHint));
  }

  remove(descriptor: Object) {
    if (this.destroyed) {
      return;
    }

    var gmailTabView = this._descriptorToGmailTabViewMap.get(descriptor);

    if (!gmailTabView) {
      return;
    }

    var index = this._getTabIndex(gmailTabView);

    _.remove(this._gmailTabViews, gmailTabView);
    _.remove(this._visibleGmailTabViews, gmailTabView);
    (gmailTabView.getElement():any).remove();

    this._descriptorToGmailTabViewMap.delete(gmailTabView.getDescriptor());
    this._resetColorIndexes();

    if (this._activeGmailTabView === gmailTabView) {
      this._activeGmailTabView = null;

      if (this._tablistElement.children.length > 1) {
        const newIndex = Math.min(index, this._tablistElement.children.length - 2);
        this._tablistElement.children[newIndex].dispatchEvent(new CustomEvent('tabActivate', {
          bubbles: false, cancelable: false, detail: null
        }));
      } else if (this._tablistElement.children.length === 1) {
        this._tablistElement.children[0].dispatchEvent(new CustomEvent('tabActivate', {
          bubbles: false, cancelable: false, detail: null
        }));
      }
    }

    gmailTabView.destroy();
  }

  _setupElement() {
    this._element = document.createElement('table');
    this._element.classList.add('aKk');
    this._element.innerHTML = [
      '<tbody>',
      '<tr class="aAA J-KU-Jg J-KU-Jg-K9 inboxsdk__contentTabContainer" role="tablist" tabindex="0">',
      '</tr>',
      '</tbody>'
    ].join('');

    this._tablistElement = this._element.querySelector('[role=tablist]');
  }

  _setupExistingElement(element: HTMLElement) {
    this._element = element;
    this._tablistElement = this._element.querySelector('[role=tablist]');
  }

  _addTab(gmailTabView: GmailTabView) {
    this._bindToGmailTabViewEventStream(gmailTabView);

    var insertBeforeElement = getInsertBeforeElement(gmailTabView.getElement(), this._tablistElement.children, ['data-group-order-hint', 'data-order-hint']);
    this._tablistElement.insertBefore(gmailTabView.getElement(), (insertBeforeElement:any));


    var index = this._getTabIndex(gmailTabView);
    if (index === 0) {
      this._activateGmailTab(gmailTabView);

      this._eventStream.emit({
        eventName: 'tabActivate',
        descriptor: gmailTabView.getDescriptor()
      });
    } else {
      this._eventStream.emit({
        eventName: 'tabDeactivate',
        descriptor: gmailTabView.getDescriptor()
      });
    }


    this._resetColorIndexes();
  }

  _getTabIndex(gmailTabView: GmailTabView): number {
    return Array.prototype.indexOf.call(this._tablistElement.children, gmailTabView.getElement());
  }

  _bindToGmailTabViewEventStream(gmailTabView: GmailTabView) {
    this._eventStream.plug(
      gmailTabView
      .getEventStream()
      .filter(_isEventName.bind(null, 'tabActivate'))
      .map(x => x.view)
      .filter(x => this._isNotActiveView(x))
      .map(x => {
        this._activateGmailTab(x);
        return x.getDescriptor();
      })
      .map(function(descriptor) {
        return {
          eventName: 'tabActivate',
          descriptor: descriptor
        };
      })
    );

    var self = this;
    this._eventStream.plug(
      gmailTabView
      .getEventStream()
      .filter(_isEventName.bind(null, 'tabDeactivate'))
      .map(x => x.view)
      .map(function(gmailTabView) {
        gmailTabView.setInactive();
        if (self._activeGmailTabView === gmailTabView) {
          self._activeGmailTabView = null;
        }

        return {
          eventName: 'tabDeactivate',
          descriptor: gmailTabView.getDescriptor()
        };
      })
    );
  }

  _isNotActiveView(gmailTabView: GmailTabView): boolean {
    return this._activeGmailTabView !== gmailTabView;
  }

  _activateGmailTab(gmailTabView: GmailTabView) {
    var activeTabElement = this._element.querySelector('.inboxsdk__tab_selected');

    if (activeTabElement) {
      activeTabElement.dispatchEvent(new CustomEvent('tabDeactivate', {
        bubbles: false, cancelable: false, detail: null
      }));
    }

    this._activeGmailTabView = gmailTabView;
    this._activeGmailTabView.setActive();
  }

  _resetColorIndexes() {
    Array.prototype.forEach.call(this._tablistElement.children, (childElement, index) => {
      childElement.dispatchEvent(new CustomEvent('newColorIndex', {
        bubbles: false, cancelable: false, detail: index
      }));
    });
  }
}

function _isEventName(checkEventName: string, event: ?{eventName: string}) {
  return event && event.eventName === checkEventName;
}
