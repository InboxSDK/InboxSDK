var _ = require('lodash');
var Bacon = require('baconjs');

var GmailTabView = require('./gmail-tab-view');

var BasicClass = require('../../../../lib/basic-class');

var GmailContentPanelContainerView = function(){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();

     this._setupElement();
};

GmailContentPanelContainerView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailContentPanelContainerView.prototype, {

     __memberVariables: [
          {name: '_element', destroy: true, get: true},
          {name: '_tabContainer', destroy: false},
          {name: '_contentContainer', destroy: false},
          {name: '_gmailTabView', destroy: true}
     ],

     _setupElement: function(){
          this._element = document.createElement('div');
          this._element.classList.add('inboxsdk__contentPanelContainer');

          this._tabContainer = document.createElement('div');
          this._tabContainer.classList.add('inboxsdk__contentPanelContainer_tabContainer');
          this._tabContainer.style.display = 'none';

          this._contentContainer = document.createElement('div');
          this._contentContainer.classList.add('inboxsdk__contentPanelContainer_contentContainer');

          this._element.appendChild(this._tabContainer);
          this._element.appendChild(this._contentContainer);

          this._gmailTabView = new GmailTabView();
          this._tabContainer.appendChild(this._gmailTabView.getElement());
          
     }

 });
