var _ = require('lodash');
var Bacon = require('baconjs');

var Map = require('es6-unweak-collections').Map;

var GmailTabContainerView = require('./gmail-tab-container-view');
var GmailContentPanelView = require('./gmail-content-panel-view');

var BasicClass = require('../../../../lib/basic-class');

var GmailContentPanelContainerView = function(){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();
     this._descriptorToViewMap = new Map();
     this._viewToDescriptorMap = new Map();

     this._setupElement();
     this._setupGmailTabContainerView();
};

GmailContentPanelContainerView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailContentPanelContainerView.prototype, {

     __memberVariables: [
          {name: '_element', destroy: true, get: true},
          {name: '_tabContainer', destroy: false},
          {name: '_contentContainer', destroy: false},
          {name: '_gmailTabContainerView', destroy: true},
          {name: '_gmailContentPanelViews', destroy: true, defaultValue: []},
          {name: '_descriptorToViewMap', destroy: false},
          {name: '_viewToDescriptorMap', destroy: false}
     ],

     addContentPanel: function(descriptor, appId){
          var gmailContentPanelView = new GmailContentPanelView(descriptor, this, appId);
          this._gmailContentPanelViews.push(gmailContentPanelView);
          this._descriptorToViewMap.set(descriptor, gmailContentPanelView);
          this._viewToDescriptorMap.set(gmailContentPanelView, descriptor);
          this._gmailTabContainerView.addTab(descriptor);

          return gmailContentPanelView;
     },

     remove: function(gmailContentPanelView){
          _.remove(this._gmailContentPanelViews, gmailContentPanelView);
          var descriptor = this._viewToDescriptorMap.get(gmailContentPanelView);

          this._gmailTabContainerView.remove(descriptor);

          this._viewToDescriptorMap.delete(gmailContentPanelView);
          this._descriptorToViewMap.delete(descriptor);
     },

     _setupElement: function(){
          this._element = document.createElement('div');
          this._element.classList.add('inboxsdk__contentPanelContainer');

          this._tabContainer = document.createElement('div');
          this._tabContainer.classList.add('inboxsdk__contentPanelContainer_tabContainer');

          this._contentContainer = document.createElement('div');
          this._contentContainer.classList.add('inboxsdk__contentPanelContainer_contentContainer');

          this._element.appendChild(this._tabContainer);
          this._element.appendChild(this._contentContainer);
     },

     _setupGmailTabContainerView: function(){
          this._gmailTabContainerView = new GmailTabContainerView();
          this._tabContainer.appendChild(this._gmailTabContainerView.getElement());

          this._gmailTabContainerView
               .getEventStream()
               .filter(_isEventName.bind(null, 'tabActivate'))
               .map('.descriptor')
               .map(this._descriptorToViewMap, 'get')
               .doAction('.activate')
               .map('.getElement')
               .onValue(this._contentContainer, 'appendChild');

          this._gmailTabContainerView
               .getEventStream()
               .filter(_isEventName.bind(null, 'tabDeactivate'))
               .map('.descriptor')
               .map(this._descriptorToViewMap, 'get')
               .onValue('.deactivate');
     }

 });

function _isEventName(checkEventName, event){
     return event && event.eventName === checkEventName;
}


module.exports = GmailContentPanelContainerView;
