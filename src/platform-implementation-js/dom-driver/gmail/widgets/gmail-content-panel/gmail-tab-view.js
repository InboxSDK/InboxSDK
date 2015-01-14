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

var GmailTabView = function(descriptorStream, groupOrderHint){
		BasicClass.call(this);

		this._descriptor = descriptorStream;
		this._groupOrderHint = groupOrderHint;

		this._eventStream = new Bacon.Bus();

		this._setupElement();
		this._unsubscribeFunction = descriptorStream.onValue(this, '_updateValues');
 };

 GmailTabView.prototype = Object.create(BasicClass.prototype);

 _.extend(GmailTabView.prototype, {

		 __memberVariables: [
					{name: '_descriptor', destroy: false, get: true},
					{name: '_lastDescriptorValue', destroy: false},
					{name: '_groupOrderHint', destroy: false, get: true},
					{name: '_element', destroy: true, get: true},
					{name: '_innerElement', destroy: false},
					{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
					{name: '_titleElement', destroy: false},
					{name: '_iconElement', destroy: false},
					{name: '_iconImgElement', destroy: false},
					{name: '_isActive', destroy: false, defaultValue: false},
					{name: '_unsubscribeFunction', destroy: true}
			],

			setInactive: function(){
				this._element.classList.remove('inboxsdk__tab_selected');
				this._innerElement.classList.remove('J-KU-KO');
				this._isActive = false;
			},

			setActive: function(){
				this._element.classList.add('inboxsdk__tab_selected');
				this._innerElement.classList.add('J-KU-KO');
				this._isActive = true;
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

					 this._element.setAttribute('data-group-order-hint', this._groupOrderHint);

					 this._bindToDOMEvents();
			},

			_updateValues: function(descriptor){
					this._updateTitle(descriptor.title);
					this._updateOrderHint(descriptor.orderHint);
					this._updateIconClass(descriptor.iconClass);
					this._updateIconUrl(descriptor.iconUrl);

					this._lastDescriptorValue = descriptor;
			},

			_updateTitle: function(newTitle){
					 if(this._lastDescriptorValue && this._lastDescriptorValue.title === newTitle){
								return;
					 }

					 this._titleElement.textContent = newTitle;
			},

			_updateOrderHint: function(orderHint){
						if(this._lastDescriptorValue && this._lastDescriptorValue.orderHint === orderHint){
							return;
						}

						this._element.setAttribute('data-order-hint', orderHint);
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

					Bacon.fromEventTarget(this._element, 'newColorIndex')
							 .map('.detail')
							 .onValue(this, '_setColorIndex');

					this._eventStream.plug(
							 Bacon.fromEventTarget(this._element, 'click').map({eventName: 'tabActivate', view: this})
					);

					this._eventStream.plug(
							Bacon.fromEventTarget(this._element, 'tabActivate').map({eventName: 'tabActivate', view: this})
					);

					this._eventStream.plug(
							Bacon.fromEventTarget(this._element, 'tabDeactivate').map({eventName: 'tabDeactivate', view: this})
					);

			},

			_setColorIndex: function(colorIndex){
					this._innerElement.setAttribute('class', 'aAy ' + TAB_COLOR_CLASSES[colorIndex % TAB_COLOR_CLASSES.length] + ' ' + (this._isActive ? 'J-KU-KO' : ''));
			},

 });


 module.exports = GmailTabView;
