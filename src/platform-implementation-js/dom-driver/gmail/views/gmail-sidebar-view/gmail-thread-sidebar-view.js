var _ = require('lodash');

var ThreadSidebarViewDriver = require('../../../../driver-interfaces/thread-sidebar-view-driver');
var GmailContentPanelView = require('./gmail-content-panel-view');



 var GmailThreadSidebarView = function(element, thread){
     ThreadSidebarViewDriver.call(this);

     this._element = element;
     this._thread = thread;



     this._eventStreamBus = new Bacon.Bus();
};

 GmailThreadSidebarView.prototype = Object.create(ThreadSidebarViewDriver.prototype);

 _.extend(GmailThreadSidebarView.prototype, {

     __memberVariables: [
          {name: '_element', destroy: false, get: true},
          {name: '_thread', destroy: false, get: true},
          {name: '_eventStreamBus', destroy: true, destroyFunction: 'end'},
          {name: '_gmailSidebarContentPanelViews', destroy: true, defaultValue: []},
          {name: '_activeContentPanel', destroy: false, defaultValue: null},
          {name: '_gmailSidebarTabView', destroy: true}
     ],

     addContentPanel: function(options){
          var gmailSidebarContentPanelView = new GmailContentPanelView(options, this);

          this._gmailSidebarContentPanelViews.push(gmailContentPanelView);

          this._addToTabZone(gmailContentPanelView, options);
     },

     removeContentPanel: function(gmailSidebarContentPanelView){
          this._removeFromTabZone(gmailSidebarContentPanelView);
     },

     _addToTabZone: function(gmailSidebarContentPanelView, options){

     },

     _removeFromTabZone: function(gmailSidebarContentPanelView){

     }

 });
