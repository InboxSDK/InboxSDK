var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var multiCompareSort = require('../../../../lib/multi-compare-sort');

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
        {name: '_descriptorToGmailTabViewMap', destroy: false}
     ],

     addTab: function(descriptor, appId){
          var gmailTabView = new GmailTabView(descriptor, appId);

          this._descriptorToGmailTabViewMap.set(descriptor, gmailTabView);

          this._gmailTabViews.push(gmailTabView);

          if(descriptor.onValue){
               descriptor.take(1).onValue(this._addTab.bind(this, gmailTabView));
          }
          else{
               this._addTab(gmailTabView);
          }
     },

     remove: function(descriptor){
          if(!this._descriptorToGmailTabViewMap){
               return;
          }

          var gmailTabView = this._descriptorToGmailTabViewMap.get(descriptor);

          if(!gmailTabView){
               return;
          }

          var index = this._visibleGmailTabViews.indexOf(gmailTabView);

          _.remove(this._gmailTabViews, gmailTabView);
          _.remove(this._visibleGmailTabViews, gmailTabView);

          this._descriptorToGmailTabViewMap.delete(gmailTabView.getDescriptor());
          this._resetColorIndexes();

          if(this._activeGmailTabView === gmailTabView){
               this._activeGmailTabView = null;

               if(index > -1 && this._visibleGmailTabViews.length > 0){
                    this._activateGmailTab(this._visibleGmailTabViews[index]);

                    this._eventStream.push({
                         eventName: 'tabActivate',
                         descriptor: this._activeGmailTabView.getDescriptor()
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
     },

     _addTab: function(gmailTabView){
          this._addTabToDOM(gmailTabView);
          this._bindToGmailTabViewEventStream(gmailTabView);

          var index = this._visibleGmailTabViews.indexOf(gmailTabView);
          if(index === 0){
               this._activateGmailTab(gmailTabView);

               this._eventStream.push({
                    eventName: 'tabActivate',
                    descriptor: gmailTabView.getDescriptor()
               });
          }
          else{
               this._eventStream.push({
                    eventName: 'tabDeactivate',
                    descriptor: gmailTabView.getDescriptor()
               });
          }


          this._resetColorIndexes();
     },

     _addTabToDOM: function(gmailTabView){
          this._visibleGmailTabViews.push(gmailTabView);

          if(this._visibleGmailTabViews.length === 1){
               this._element.querySelector('[role=tablist]').appendChild(gmailTabView.getElement());
          }
          else{
               multiCompareSort(
                    this._visibleGmailTabViews,
                    [
                         'getAppId',
                         function(aGmailTabView){
                              return aGmailTabView.getDescriptor().orderHint || 0;
                         }
                    ]
               );

               var index = this._visibleGmailTabViews.indexOf(gmailTabView);
               if(index === this._visibleGmailTabViews.length - 1){
                    this._element.querySelector('[role=tablist]').appendChild(gmailTabView.getElement());
               }
               else{
                    this._element.querySelector('[role=tablist]').insertBefore(gmailTabView.getElement(), this._visibleGmailTabViews[index + 1].getElement());
               }
          }
     },

     _bindToGmailTabViewEventStream: function(gmailTabView){
          this._eventStream.plug(
               gmailTabView
                    .getEventStream()
                    .filter(_isEventName.bind(null, 'tabActivate'))
                    .map('.view')
                    .filter(this, '_isNotActiveView')
                    .doAction(this, '_activateGmailTab')
                    .map('.getDescriptor')
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
                    descriptor: this._activeGmailTabView.getDescriptor()
               });
          }

          this._activeGmailTabView = gmailTabView;
          this._activeGmailTabView.setActive();
     },

     _resetColorIndexes: function(){
          for(var ii=0; ii<this._visibleGmailTabViews.length; ii++){
               this._visibleGmailTabViews[ii].setColorIndex(ii);
          }
     }

});

function _isEventName(checkEventName, event){
     return event && event.eventName === checkEventName;
}


module.exports = GmailTabContainerView;
