/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Bacon = require('baconjs');

import multiCompareSort from '../../../../lib/multi-compare-sort';
import dispatchCustomEvent from '../../../../lib/dom/dispatch-custom-event';
import getInsertBeforeElement from '../../../../lib/dom/get-insert-before-element';
import GmailTabView from './gmail-tab-view';

export default class GmailTabContainerView {
  destroyed: boolean;
  _element: HTMLElement;
  _tablistElement: HTMLElement;
  _eventStream: Bacon.Bus;
  _descriptorToGmailTabViewMap: Map<Object, GmailTabView>;
  _gmailTabViews: GmailTabView[];
  _visibleGmailTabViews: GmailTabView[];
  _activeGmailTabView: ?GmailTabView;

  constructor(element: ?HTMLElement) {
    this.destroyed = false;
    this._activeGmailTabView = null;
    this._eventStream = new Bacon.Bus();
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
  getEventStream(): Bacon.Observable {return this._eventStream;}

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
        var newIndex = Math.min(index, this._tablistElement.children.length - 2);
        dispatchCustomEvent(((this._tablistElement.children[newIndex]:any):HTMLElement), 'tabActivate');
      } else if (this._tablistElement.children.length === 1) {
        dispatchCustomEvent(((this._tablistElement.children[0]:any):HTMLElement), 'tabActivate');
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

      this._eventStream.push({
        eventName: 'tabActivate',
        descriptor: gmailTabView.getDescriptor()
      });
    } else {
      this._eventStream.push({
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
      .doAction(x => {this._activateGmailTab(x);})
      .map(x => x.getDescriptor())
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
      .doAction(function(gmailTabView) {
        gmailTabView.setInactive();
        if (self._activeGmailTabView === gmailTabView) {
          self._activeGmailTabView = null;
        }
      })
      .map(function(gmailTabView) {
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
      dispatchCustomEvent(activeTabElement, 'tabDeactivate');
    }

    this._activeGmailTabView = gmailTabView;
    this._activeGmailTabView.setActive();
  }

  _resetColorIndexes() {
    Array.prototype.forEach.call(this._tablistElement.children, function(childElement, index) {
      dispatchCustomEvent(childElement, 'newColorIndex', index);
    });
  }
}

function _isEventName(checkEventName: string, event: ?{eventName: string}) {
  return event && event.eventName === checkEventName;
}
