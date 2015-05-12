var _ = require('lodash');
var Bacon = require('baconjs');

var multiCompareSort = require('../../../../lib/multi-compare-sort');

var BasicClass = require('../../../../lib/basic-class');
var dispatchCustomEvent = require('../../../../lib/dom/dispatch-custom-event');
var getInsertBeforeElement = require('../../../../lib/dom/get-insert-before-element');

var GmailTabView = require('./gmail-tab-view');

var GmailTabContainerView = function(element){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();
     this._gmailTabViewToDescriptorMap = new Map();
     this._descriptorToGmailTabViewMap = new Map();

     if(!element){
          this._setupElement();
     }
     else{
          this._setupExistingElement(element);
     }

};

GmailTabContainerView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailTabContainerView.prototype, {

     __memberVariables: [
        {name: '_element', destroy: true, get: true},
        {name: '_tablistElement', destroy: true},
        {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
        {name: '_activeGmailTabView', destroy: false},
        {name: '_gmailTabViews', destroy: true, defaultValue: []},
        {name: '_visibleGmailTabViews', destroy: false, defaultValue: []},
        {name: '_descriptorToGmailTabViewMap', destroy: false}
     ],

     addTab: function(descriptor, groupOrderHint){
          var gmailTabView = new GmailTabView(descriptor, groupOrderHint);

          this._descriptorToGmailTabViewMap.set(descriptor, gmailTabView);

          this._gmailTabViews.push(gmailTabView);
          descriptor.take(1).onValue(this._addTab.bind(this, gmailTabView, groupOrderHint));
     },

     remove: function(descriptor){
          if(!this._descriptorToGmailTabViewMap){
               return;
          }

          var gmailTabView = this._descriptorToGmailTabViewMap.get(descriptor);

          if(!gmailTabView){
               return;
          }

          var index = this._getTabIndex(gmailTabView);

          _.remove(this._gmailTabViews, gmailTabView);
          _.remove(this._visibleGmailTabViews, gmailTabView);
          gmailTabView.getElement().remove();

          this._descriptorToGmailTabViewMap.delete(gmailTabView.getDescriptor());
          this._resetColorIndexes();

          if(this._activeGmailTabView === gmailTabView){
               this._activeGmailTabView = null;

               if(this._tablistElement.children.length > 1){
                    var newIndex = Math.min(index, this._tablistElement.children.length - 2);
                    dispatchCustomEvent(this._tablistElement.children[newIndex], 'tabActivate');
               }
               else if(this._tablistElement.children.length === 1){
                    dispatchCustomEvent(this._tablistElement.children[0], 'tabActivate');
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

          this._tablistElement = this._element.querySelector('[role=tablist]');
     },

     _setupExistingElement: function(element){
          this._element = element;
          this._tablistElement = this._element.querySelector('[role=tablist]');
     },

     _addTab: function(gmailTabView){
          this._bindToGmailTabViewEventStream(gmailTabView);

          var insertBeforeElement = getInsertBeforeElement(gmailTabView.getElement(), this._tablistElement.children, ['data-group-order-hint', 'data-order-hint']);
          this._tablistElement.insertBefore(gmailTabView.getElement(), insertBeforeElement);


          var index = this._getTabIndex(gmailTabView);
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

     _getTabIndex: function(gmailTabView){
          return  Array.prototype.indexOf.call(this._tablistElement.children, gmailTabView.getElement());
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

          var self = this;
          this._eventStream.plug(
               gmailTabView
                    .getEventStream()
                    .filter(_isEventName.bind(null, 'tabDeactivate'))
                    .map('.view')
                    .doAction(function(gmailTabView){
                         gmailTabView.setInactive();
                         if(self._activeGmailTabView === gmailTabView){
                              self._activeGmailTabView = null;
                         }
                    })
                    .map(function(gmailTabView){
                         return {
                              eventName: 'tabDeactivate',
                              descriptor: gmailTabView.getDescriptor()
                         };
                    })
          );

     },

     _isNotActiveView: function(gmailTabView){
          return this._activeGmailTabView !== gmailTabView;
     },


     _activateGmailTab: function(gmailTabView){
          var activeTabElement = this._element.querySelector('.inboxsdk__tab_selected');

          if(activeTabElement){
               dispatchCustomEvent(activeTabElement, 'tabDeactivate');
          }

          this._activeGmailTabView = gmailTabView;
          this._activeGmailTabView.setActive();
     },

     _resetColorIndexes: function(){
          Array.prototype.forEach.call(this._tablistElement.children, function(childElement, index){
               dispatchCustomEvent(childElement, 'newColorIndex', index);
          });
     }

});

function _isEventName(checkEventName, event){
     return event && event.eventName === checkEventName;
}


module.exports = GmailTabContainerView;
