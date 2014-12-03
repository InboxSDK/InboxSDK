var _ = require('lodash');
var Bacon = require('baconjs');

var ContentPanelViewDriver = require('../../../../driver-interfaces/content-panel-view-driver');

var GmailContentPanelView = function(contentPanelDescriptor, gmailContentPanelContainerView){
     ContentPanelViewDriver.call(this);

     this._eventStream = new Bacon.Bus();
     this._element = document.createElement('div');

     this._gmailContentPanelContainerView = gmailContentPanelContainerView;

     if(contentPanelDescriptor.onValue){
          contentPanelDescriptor.map('.el').onValue(this._element, 'appendChild');
     }
     else{
          this._element.appendChild(contentPanelDescriptor.el);
     }
};

GmailContentPanelView.prototype = Object.create(ContentPanelViewDriver.prototype);

_.extend(GmailContentPanelView.prototype, {

     __memberVariables: [
          {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
          {name: '_element', destroy: true, get: true},
          {name: '_gmailContentPanelContainerView', destroy: false}
     ],

     activate: function(){
          this._eventStream.push({eventName: 'activate'});
     },

     deactivate: function(){
          this._eventStream.push({eventName: 'deactivate'});
          this._element.remove();
     },

     remove: function(){
          this.destroy();
     },

     destroy: function(){
          if(this._gmailContentPanelContainerView){
               this._gmailContentPanelContainerView.remove(this);
          }
          
          ContentPanelViewDriver.prototype.destroy.call(this);
     }

});


module.exports = GmailContentPanelView;
