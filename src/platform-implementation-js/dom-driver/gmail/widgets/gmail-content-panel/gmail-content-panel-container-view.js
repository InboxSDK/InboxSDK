/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

import GmailTabContainerView from './gmail-tab-container-view';
import GmailContentPanelView from './gmail-content-panel-view';
import get from '../../../../../common/get-or-fail';

export default class GmailContentPanelContainerView {
  _eventStream: Kefir.Bus<any>;
  _descriptorToViewMap: Map<Object, GmailContentPanelView>;
  _viewToDescriptorMap: Map<GmailContentPanelView, Object>;
  _element: HTMLElement;
  _gmailTabContainerView: GmailTabContainerView;
  _gmailContentPanelViews: any[];
  _tabContainer: HTMLElement;
  _contentContainer: HTMLElement;

  constructor(element: ?HTMLElement) {
    this._eventStream = kefirBus();
    this._descriptorToViewMap = new Map();
    this._viewToDescriptorMap = new Map();
    this._gmailContentPanelViews = [];

    if (!element) {
      this._setupElement();
    } else {
      this._setupExistingElement(element);
    }

    this._setupGmailTabContainerView();
  }

  destroy() {
    (this._element:any).remove();
    this._gmailTabContainerView.destroy();
    this._gmailContentPanelViews.slice().forEach(x => {x.destroy();});
    this._gmailContentPanelViews.length = 0;
  }

  getElement(): HTMLElement {return this._element;}

  addContentPanel(descriptor: Object, appId: string): GmailContentPanelView {
    var gmailContentPanelView = new GmailContentPanelView(descriptor, this, appId);
    this._gmailContentPanelViews.push(gmailContentPanelView);
    this._descriptorToViewMap.set(descriptor, gmailContentPanelView);
    this._viewToDescriptorMap.set(gmailContentPanelView, descriptor);
    this._gmailTabContainerView.addTab(descriptor, appId);

    return gmailContentPanelView;
  }

  remove(gmailContentPanelView: GmailContentPanelView) {
    _.remove(this._gmailContentPanelViews, gmailContentPanelView);
    var descriptor = this._viewToDescriptorMap.get(gmailContentPanelView);
    if (!descriptor) {
      return;
    }

    if (this._gmailTabContainerView) {
      this._gmailTabContainerView.remove(descriptor);
    }

    if (this._viewToDescriptorMap) {
      this._viewToDescriptorMap.delete(gmailContentPanelView);
    }

    if (this._descriptorToViewMap) {
      this._descriptorToViewMap.delete(descriptor);
    }
  }

  _setupElement() {
    this._element = document.createElement('div');
    this._element.classList.add('inboxsdk__contentPanelContainer');

    this._tabContainer = document.createElement('div');
    this._tabContainer.classList.add('inboxsdk__contentPanelContainer_tabContainer');

    this._contentContainer = document.createElement('div');
    this._contentContainer.classList.add('inboxsdk__contentPanelContainer_contentContainer');

    this._element.appendChild(this._tabContainer);
    this._element.appendChild(this._contentContainer);
  }

  _setupExistingElement(element: HTMLElement) {
    this._element = element;
    this._tabContainer = element.querySelector('.inboxsdk__contentPanelContainer_tabContainer');
    this._contentContainer = element.querySelector('.inboxsdk__contentPanelContainer_contentContainer');
  }

  _setupGmailTabContainerView() {
    var existingTabContainerElement: HTMLElement = (this._tabContainer.children[0]:any);
    this._gmailTabContainerView = new GmailTabContainerView(existingTabContainerElement);

    if (!existingTabContainerElement) {
      this._tabContainer.appendChild(this._gmailTabContainerView.getElement());
    }

    this._gmailTabContainerView
      .getEventStream()
      .filter(_isEventName.bind(null, 'tabActivate'))
      .map(x => x.descriptor)
      .map(x => get(this._descriptorToViewMap, x))      
      .map(x => {
        x.activate();
        return x.getElement();
      })
      .onValue(el => {this._contentContainer.appendChild(el);});

    this._gmailTabContainerView
      .getEventStream()
      .filter(_isEventName.bind(null, 'tabDeactivate'))
      .map(x => x.descriptor)
      .map(x => get(this._descriptorToViewMap, x))
      .onValue(x => {x.deactivate(x);});
  }
}

function _isEventName(checkEventName: string, event: ?{eventName: string}): boolean {
  return Boolean(event && event.eventName === checkEventName);
}
