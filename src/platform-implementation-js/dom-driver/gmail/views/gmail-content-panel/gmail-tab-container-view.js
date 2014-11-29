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
        {name: '_gmailTabViews', destroy: true, defaultValue: []},
        {name: '_gmailTabViewToDescriptorMap', destroy: false},
        {name: '_descriptorToGmailTabViewMap', destroy: false}
     ],

     addTab: function(tabDescriptor){

     },

     removeTab: function(tabDescriptor){
          var gmailTabView = this._gmailTabViewToDescriptorMap(tabDescriptor);

          if(!gmailTabView){
               return;
          }

          _.remove(this._gmailTabViews, gmailTabView);
          gmailTabView.destroy();

          if(this._gmailTabViews.length === 0){
               this._element.style.display = 'none';
          }
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
     }

});


module.exorts = GmailTabContainerView;
