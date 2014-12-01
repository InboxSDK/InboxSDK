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

var GmailTabView = function(descriptor){
     BasicClass.call(this);

     this._eventStream = new Bacon.Bus();

     this._setupElement();

     if(descriptor.onValue){
          this._unsubscribeFunction = descriptor.onValue(this, '_updateValues');
     }
     else{
          this._updateValues(descriptor);
     }
 };

 GmailTabView.prototype = Object.create(BasicClass.prototype);

 _.extend(GmailTabView.prototype, {

     __memberVariables: [
          {name: '_element', destroy: true, get: true},
		{name: '_innerElement', destroy: false},
          {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
          {name: '_titleElement', destroy: false},
          {name: '_iconElement', destroy: false},
          {name: '_iconImgElement', destroy: false},
          {name: '_title', destroy: false},
          {name: '_iconClass', destroy: false},
          {name: '_iconUrl', destroy: false},
          {name: '_isActive', destroy: false, defaultValue: false},
          {name: '_unsubscribeFunction', destroy: true}
      ],

      setColorIndex: function(colorIndex){
          this._innerElement.setAttribute('class', 'aAy ' + TAB_COLOR_CLASSES[colorIndex % TAB_COLOR_CLASSES.length] + ' ' + (this._isActive ? 'J-KU-KO' : ''));
      },

      setInactive: function(){
           this._innerElement.classList.remove('J-KU-KO');
      },

      setActive: function(){
          this._innerElement.classList.add('J-KU-KO');
      },

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

		 this._innerElement = this._element.querySelector('[role=tab]');
           this._titleElement = this._element.querySelector('.inboxsdk__tab_title');
           this._iconElement = this._element.querySelector('.inboxsdk__tab_icon');

           this._bindToDOMEvents();
      },

      _updateValues: function(descriptor){
          this._updateTitle(descriptor.title);
          this._updateIconClass(descriptor.iconClass);
          this._updateIconUrl(descriptor.iconUrl);
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
                     this._iconImgElement = document.createElement('img');
                     this._iconElement.appendChild(this._iconImgElement);
                }

                this._iconImgElement.src = newIconUrl;
           }

           this._iconUrl = newIconUrl;
      },

      _bindToDOMEvents: function(){
           var self = this;

           Bacon.fromEventTarget(this._element, 'mouseenter')
                .onValue(function(){
                     self._innerElement.classList.add('J-KU-Je');
                     self._innerElement.classList.add('J-KU-JW');
                });

          Bacon.fromEventTarget(this._element, 'mouseleave')
               .onValue(function(){
                    self._innerElement.classList.remove('J-KU-Je');
                    self._innerElement.classList.remove('J-KU-JW');
               });

          this._eventStream.plug(
               Bacon.fromEventTarget(this._element, 'click').map({eventName: 'tabActivate', view: this})
          );

      }

 });


 module.exports = GmailTabView;
