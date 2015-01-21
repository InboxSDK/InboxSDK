var _ = require('lodash');
var Bacon = require('baconjs');

var Map = require('es6-unweak-collections').Map;

var GmailTabContainerView = require('./gmail-tab-container-view');
var GmailContentPanelView = require('./gmail-content-panel-view');

var BasicClass = require('../../../../lib/basic-class');

var GmailContentPanelContainerView = function(element){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();
     this._descriptorToViewMap = new Map();
     this._viewToDescriptorMap = new Map();

     if(!element){
          this._setupElement();
     }
     else{
          this._setupExistingElement(element);
     }

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
          this._gmailTabContainerView.addTab(descriptor, appId);

          return gmailContentPanelView;
     },

     remove: function(gmailContentPanelView){
          _.remove(this._gmailContentPanelViews, gmailContentPanelView);
          var descriptor = this._viewToDescriptorMap.get(gmailContentPanelView);

          if(this._gmailTabContainerView){
               this._gmailTabContainerView.remove(descriptor);
          }

          if(this._viewToDescriptorMap){
               this._viewToDescriptorMap.delete(gmailContentPanelView);
          }

          if(this._descriptorToViewMap){
               this._descriptorToViewMap.delete(descriptor);
          }
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

     _setupExistingElement: function(element){
          this._element = element;
          this._tabContainer = element.querySelector('.inboxsdk__contentPanelContainer_tabContainer');
          this._contentContainer = element.querySelector('.inboxsdk__contentPanelContainer_contentContainer');
     },

     _setupGmailTabContainerView: function(){
          var existingTabContainerElement = this._tabContainer.children[0];
          this._gmailTabContainerView = new GmailTabContainerView(existingTabContainerElement);

          if(!existingTabContainerElement){
               this._tabContainer.appendChild(this._gmailTabContainerView.getElement());
          }

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
