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

     addContentPanel: function(contentPanelDescriptor){
          var gmailContentPanelView = new GmailContentPanel(contentPanelDescriptor, this);
          this._gmailContentPanelViews.push(gmailContentPanelView);
          this._descriptorToViewMap.set(contentPanelDescriptor, gmailContentPanelView);
          this._viewToDescriptorMap.set(gmailContentPanelView, contentPanelDescriptor);
          this._gmailTabContainerView.addTab(contentPanelDescriptor);

          return gmailContentPanelView;
     },

     remove: function(gmailContentPanelView){
          _.remove(this._gmailContentPanelViews, gmailContentPanelView);
          var contentPanelDescriptor = this._viewToDescriptorMap.get(gmailContentPanelView);

          this._gmailTabContainerView.remove(contentPanelDescriptor);

          this._viewToDescriptorMap.delete(gmailContentPanelView);
          this._descriptorToViewMap.delete(contentPanelDescriptor);
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
               .map('.tabDescriptor')
               .map(this._descriptorToViewMap, '.get')
               .onValue(this._activateContentPanel);

          this._gmailTabContainerView
               .getEventStream()
               .filter(_isEventName.bind(null, 'tabDeactivate'))
               .map('.tabDescriptor')
               .map(this._descriptorToViewMap, '.get')
               .doAction('.deactivate');
     },

     _addContentPanel: function(contentPanelDescriptor, gmailContentPanelView){
          this._gmailTabContainerView.addTab(contentPanelDescriptor);
     },

     _activateContentPanel: function(gmailContentPanelView){
          this._contentContainer.appendChild(gmailContentPanelView.getElement());
          gmailContentPanelView.activate();
     }

 });

function _isEventName(checkEventName, event){
     return event && event.eventName === checkEventName;
}
