var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var BasicClass = require('../../../../lib/basic-class');

var GmailTabView = require('./gmail-tab-view');

var GmailTabContainerView = function(){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();
     this._gmailTabViewToDescriptorMap = new Map();
     this._descriptorToGmailTabViewMap = new Map();

     this._setupElement();
};

GmailTabContainerView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailTabContainerView.prototype, {

     __memberVariables: [
        {name: '_element', destroy: true, get: true},
        {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
        {name: '_activeGmailTabView', destroy: false},
        {name: '_gmailTabViews', destroy: true, defaultValue: []},
        {name: '_visibleGmailTabViews', destroy: false, defaultValue: []},
        {name: '_gmailTabViewToDescriptorMap', destroy: false},
        {name: '_descriptorToGmailTabViewMap', destroy: false}
     ],

     addTab: function(descriptor){
          var gmailTabView = new GmailTabView(descriptor);
          this._gmailTabViewToDescriptorMap.set(gmailTabView, descriptor);
          this._descriptorToGmailTabViewMap.set(descriptor, gmailTabView);

          this._gmailTabViews.push(gmailTabView);

          if(descriptor.onValue){
               descriptor.take(1).onValue(this._addTab.bind(this, gmailTabView));
          }
          else{
               this._addTab(gmailTabView, descriptor);
          }
     },

     remove: function(descriptor){
          if(!this._gmailTabViewToDescriptorMap){
               return;
          }

          var gmailTabView = this._descriptorToGmailTabViewMap.get(descriptor);

          if(!gmailTabView){
               return;
          }

          var index = this._visibleGmailTabViews.indexOf(gmailTabView);

          _.remove(this._gmailTabViews, gmailTabView);
          _.remove(this._visibleGmailTabViews, gmailTabView);

          this._gmailTabViewToDescriptorMap.delete(gmailTabView);
          this._descriptorToGmailTabViewMap.delete(descriptor);

          if(this._visibleGmailTabViews.length < 2){
               this._element.style.display = 'none';
          }
          else{
               this._resetColorIndexes();
          }

          if(index > -1){
               if(this._activeGmailTabView === gmailTabView){
                    this._activateGmailTab(this._visibleGmailTabViews[index]);

                    this._eventStream.push({
                         eventName: 'tabActivate',
                         descriptor: this._gmailTabViewToDescriptorMap.get(this._activeGmailTabView)
                    });
               }
          }

          gmailTabView.destroy();
     },

     _setupElement: function(){
          this._element = document.createElement('table');
          this._element.classList.add('aKk');
          this._element.innerHTML = [
               '<tbody>',
                    '<tr class="aAA J-KU-Jg J-KU-Jg-K9 inboxsdk__contentTabContainer" role="tablist" tabindex="0">',
                    '</tr>',
               '</tbody>'
          ].join('');

          this._element.style.display = 'none';
     },

     _addTab: function(gmailTabView, descriptor){
          this._addTabToDOM(gmailTabView);
          this._bindToGmailTabViewEventStream(gmailTabView);

          if(this._visibleGmailTabViews.length === 1){
               this._activateGmailTab(gmailTabView);

               this._eventStream.push({
                    eventName: 'tabActivate',
                    descriptor: descriptor
               });
          }

          if(this._visibleGmailTabViews.length > 1){
               this._element.style.display = '';
               this._resetColorIndexes();
          }
     },

     _addTabToDOM: function(gmailTabView){
          this._element.querySelector('[role=tablist]').appendChild(gmailTabView.getElement());
          this._visibleGmailTabViews.push(gmailTabView);
     },

     _bindToGmailTabViewEventStream: function(gmailTabView){
          this._eventStream.plug(
               gmailTabView
                    .getEventStream()
                    .filter(_isEventName.bind(null, 'tabActivate'))
                    .map('.view')
                    .filter(this, '_isNotActiveView')
                    .doAction(this, '_activateGmailTab')
                    .map(this._gmailTabViewToDescriptorMap, 'get')
                    .map(function(descriptor){
                         return {
                              eventName: 'tabActivate',
                              descriptor: descriptor
                         };
                    })
          );
     },

     _isNotActiveView: function(gmailTabView){
          return this._activeGmailTabView !== gmailTabView;
     },


     _activateGmailTab: function(gmailTabView){
          if(this._activeGmailTabView){
               this._activeGmailTabView.setInactive();
               this._eventStream.push({
                    eventName: 'tabDeactivate',
                    descriptor: this._gmailTabViewToDescriptorMap.get(this._activeGmailTabView)
               });
          }

          this._activeGmailTabView = gmailTabView;
          this._activeGmailTabView.setActive();
     },

     _resetColorIndexes: function(){
          //do nothing for now
     }

});

function _isEventName(checkEventName, event){
     return event && event.eventName === checkEventName;
}


module.exports = GmailTabContainerView;
