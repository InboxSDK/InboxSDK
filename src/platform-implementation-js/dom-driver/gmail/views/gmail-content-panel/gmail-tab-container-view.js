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
        {name: '_eventStream', destroy: true, destroyFunction: 'end'},
        {name: '_activeGmailTabView', destroy: false},
        {name: '_gmailTabViews', destroy: true, defaultValue: []},
        {name: '_visibleGmailTabViews', destroy: false, defaultValue: []},
        {name: '_gmailTabViewToDescriptorMap', destroy: false},
        {name: '_descriptorToGmailTabViewMap', destroy: false}
     ],

     addTab: function(tabDescriptor){
          var gmailTabView = new GmailTabView(tabDescriptor);
          this._gmailTabViewToDescriptorMap.set(gmailTabView, tabDescriptor);
          this._descriptorToGmailTabViewMap.set(tabDescriptor, gmailTabView);

          this._gmailTabViews.push(gmailTabView);

          if(tabDescriptor.onValue){
               tabDescriptor.onValue(this._addTabToDOM.bind(this, gmailTabView));
          }
          else{
               this._addTabToDOM(gmailTabView);
          }
     },

     remove: function(tabDescriptor){
          var gmailTabView = this._gmailTabViewToDescriptorMap(tabDescriptor);

          if(!gmailTabView){
               return;
          }

          var index = this._visibleGmailTabViews.indexOf(gmailTabView);

          _.remove(this._gmailTabViews, gmailTabView);
          _.remove(this._visibleGmailTabViews, gmailTabView);

          this._gmailTabViewToDescriptorMap.delete(gmailTabView);
          this._descriptorToGmailTabViewMap.delete(tabDescriptor);

          if(this._visibleGmailTabViews.length < 2){
               this._element.style.display = 'none';
          }
          else if(index > -1){
               this._resetColorIndexes();
               if(this._activeGmailTabView === gmailTabView){
                    this._activateGmailTab(this._visibleGmailTabViews[index]);
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

     _addTabToDOM: function(gmailTabView){
          this._element.querySelector('[role=tablist]').appendChild(gmailTabView.getElement());
          this._visibleGmailTabViews.push(gmailTabView);

          if(this._visibleGmailTabViews.length > 2){
               this._element.style.display = '';
               this._resetColorIndexes();
          }

          if(this._visibleGmailTabViews.length === 1){
               this._activateGmailTab(gmailTabView);
          }

          this._eventStream.plug(
               gmailTabView
                    .getEventStream()
                    .filter(_isTabActivateEvent)
                    .doAction(this, '_activateGmailTab')
                    .map(this._gmailTabViewToDescriptorMap, '.get')
                    .map(function(tabDescriptor){
                         return {
                              eventName: 'tabActivate',
                              tabDescriptor: tabDescriptor
                         };
                    })
          );

     },


     _activateGmailTab: function(gmailTabView){
          if(this._activeGmailTabView){
               this._activateGmailTab.setInactive();
               this._eventStream.push({
                    eventName: 'tabDeactivate',
                    tabDescriptor: this._gmailTabViewToDescriptorMap.get(this._activeGmailTabView)
               });
          }

          this._activeGmailTabView = gmailTabView;
          this._activeGmailTabView.setActive();
     }

});

function _isTabActivateEvent(event){
     return event && event.eventName === 'tabActivate';
}


module.exorts = GmailTabContainerView;
