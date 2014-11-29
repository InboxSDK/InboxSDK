var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../../lib/basic-class');

var TAB_COLOR_CLASSES = [
	"aIf-aLe",
	"aKe-aLe",
	"aJi-aLe",
	"aH2-aLe",
	"aHE-aLe"
];

var GmailTabView = function(tabDescriptor, colorIndex){
     BasicClass.call(this);

     this._setupElement();
     this._eventStream = new Bacon.Bus();

     if(tabDescriptor.onValue){
          this._unsubscribeFunction = tabDescriptor.onValue(this, '_updateValues');
     }
     else{
          this._updateValues(tabDescriptor);
     }
 };

 GmailTabView.prototype = Object.create(BasicClass.prototype);

 _.extend(GmailTabView.prototype, {

     __memberVariables: [
          {name: '_element', destroy: true, get: true},
          {name: '_eventStream', destroy: true, destroyFunction: 'end'},
          {name: '_titleElement', destroy: false},
          {name: '_iconElement', destroy: false},
          {name: '_iconImgElement', destroy: false},
          {name: '_title', destroy: false},
          {name: '_iconClass', destroy: false},
          {name: '_iconUrl', destroy: false},
          {name: '_unsubscribeFunction', destroy: true}
      ],

      _setupElement: function(){
           this._element = document.createElement('td');
           this._element.setAttribute('class', 'aRz J-KU inboxsdk__tab');

           this._element.innerHTML = [
                '<div class="aAy" tabindex="0" role="tab">',
                     '<div class="aKo"></div>',
                     '<div class="aKu aKo aKr" ></div>',
                     '<div class="aKp inboxsdk__tab_icon" ></div>',
                     '<div class="aKw" >',
                          '<div class="aKy" >',
                               '<div class="aKx" >',
                                    '<div class="aKz inboxsdk__tab_title">',
                                    '</div>',
                               '</div>',
                          '</div>',
                     '</div>',
                '</div>'
           ].join('');

           this._titleElement = this._element.querySelector('.inboxsdk__tab_title');
           this._iconElement = this._element.querySelector('.inboxsdk__tab_icon');

           this._bindToDOMEvents();
      },

      _updateValues: function(tabDescriptor){
          this._updateTitle(tabDescriptor.title);
          this._updateIconClass(tabDescriptor.iconClass);
          this._updateIconUrl(tabDescriptor.iconUrl);
      },

      _updateTitle: function(newTitle){
           if(newTitle == this._title){
                return;
           }

           this._titleElement.textContent = newTitle;

           this._title = newTitle;
      },

      _updateIconClass: function(newIconClass){
           if(this._iconClass == newIconClass){
                return;
           }

           var classList = 'aKp inboxsdk__tab_icon ' + (newIconClass || '');
           this._iconElement.setAttribute('class',  classList);

           this._iconClass = newIconClass;
      },

      _updateIconUrl: function(newIconUrl){
           if(this._iconUrl == newIconUrl){
                return;
           }

           if(!newIconUrl){
                if(this._iconImgElement){
                     this._iconImgElement.remove();
                     this._iconImgElement = null;
                }
           }
           else{
                if(!this._iconImgElement){
                     this._iconImgElement = doucment.createElement('img');
                     this._iconElement.appendChild(this._iconImgElement);
                }

                this._iconImgElement.src = newIconUrl;
           }

           this._iconUrl = newIconUrl;
      },

      _bindToDOMEvents: function(){

      }

 });


 module.exports = GmailTabView;
