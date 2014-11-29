var _ = require('lodash');
var Bacon = require('baconjs');

var ContentPanelViewDriver = require('../../../../driver-interfaces/content-panel-view-driver');

var GmailContentPanelView = function(options, gmailSidebarContainerView){
     SidebarContentPanelViewDriver.call(this);

     this._eventStream = new Bacon.Bus();
     this._element = document.createElement('div');
     this._element.appendChild(options.el);
     this._gmailSidebarContainerView = gmailSidebarContainerView;
};

GmailContentPanelView.prototype = Object.create(SidebarContentPanelViewDriver.prototype);

_.extend(GmailContentPanelView.prototype, {

     __memberVariables: [
          {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
          {name: '_element', destroy: true, get: true},
          {name: '_gmailSidebarContainerView', destroy: false}
     ],

     activate: function(){
          this._eventStream.push({eventName: 'activate'});
     },

     deactivate: function(){
          this._eventStream.push({eventName: 'deactivate'});
     },

     remove: function(){
          this._gmailSidebarContainerView.remove(this);
          this.destroy();
     }

});
