var _ = require('lodash');
var Bacon = require('baconjs');

var NavItemViewDriver = require('../../../driver-interfaces/nav-item-view-driver');


var GmailNavItemView = function(orderGroup, navItemDescriptor){
	NavItemViewDriver.call(this);

	this._orderGroup = orderGroup;
	this._eventStream = new Bacon.Bus();

	this._setupElement();

	if(navItemDescriptor.onValue){
		navItemDescriptor.onValue(this, '_updateValues');
	}
	else{
		this._updateValues(navItemDescriptor);
	}
};

GmailNavItemView.prototype = Object.create(NavItemViewDriver.prototype);

_.extend(GmailNavItemView.prototype, {

	__memberVariables: [
		{name: '_navItemDescriptor', destroy: false, get: true},
		{name: '_element', destroy: true, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_iconElement', destroy: true},
		{name: '_iconImgElement', destroy: true},
		{name: '_itemContainerElement', destroy: true},
		{name: '_expandoElement', destroy: true},
		{name: '_orderGroup', destroy: false, get: true},
		{name: '_name', destroy: false, get: true, defaultValue: ''},
		{name: '_iconUrl', destroy: false},
		{name: '_iconClass', destroy: false},
		{name: '_accessoryCreated', destroy: false, defaultValue: false}
	],

	addNavItem: function(orderGroup, navItemDescriptor){
		var gmailNavItemView = new GmailNavItemView(orderGroup, navItemDescriptor);

		this._addNavItemElement(gmailNavItemView);

		return gmailNavItemView;
	},

	setHighlight: function(value){
		if(value){
			this._element.querySelector('.TO').classList.add('NQ');
		}
		else{
			this._element.querySelector('.TO').classList.remove('NQ');
		}
	},

	setActive: function(value){
		if(value){
			this._element.classList.add('ain');
			this._element.querySelector('.TO').classList.add('nZ');
		}
		else{
			this._element.classList.remove('ain');
			this._element.querySelector('.TO').classList.remove('nZ');
		}
	},

	toggleCollapse: function(){
		this._toggleCollapse();
	},

	setCollapsed: function(value){
		if(!this._expandoElement){
			return;
		}

		if(value){
			this._expand();
		}
		else{
			this._collapse();
		}
	},

	_setupElement: function(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'aim');

		this._element.innerHTML = [
			'<div class="TO">',
				'<div class="TN aik">',
					'<div class="aio aip">',
						'<span class="nU n1 inboxsdk__navItem_name"></span>',
					'</div>',
				'</div>',
			'</div>'
		].join('');

		var innerElement = this._element.querySelector('.TO');

		this._eventStream.plug(Bacon.fromEventTarget(innerElement, 'mouseenter').map(this._makeEventMapper('mouseenter')));
		this._eventStream.plug(Bacon.fromEventTarget(innerElement, 'mouseleave').map(this._makeEventMapper('mouseleave')));
		this._eventStream.plug(Bacon.fromEventTarget(innerElement, 'click').map(this._makeEventMapper('click')));
	},

	_makeEventMapper: function(eventName){
		var self = this;
		return function(domEvent){
			domEvent.stopPropagation();

			return {
				eventName: eventName,
				domEvent: domEvent,
				navItemDescriptor: self._navItemDescriptor
			};
		};
	},

	_updateValues: function(navItemDescriptor){
		this._navItemDescriptor = navItemDescriptor;

		this._updateName(navItemDescriptor.name);

		require('../lib/update-icon/update-icon-class').apply(this, [this._element.querySelector('.aio'), true, navItemDescriptor.iconClass]);
		require('../lib/update-icon/update-icon-url').apply(this, [this._element.querySelector('.aio'), true, navItemDescriptor.iconUrl]);

		if(navItemDescriptor.accessory && !this._accessoryCreated){
			this._createAccessory(navItemDescriptor.accessory);
		}
	},

	_updateName: function(name){
		if(this._name === name){
			return;
		}

		this._element.querySelector('.inboxsdk__navItem_name').textContent = name;
		this._name = name;

		this._element.setAttribute('data-group-order-hint', this._orderGroup);
		this._element.setAttribute('data-order-hint', name || '');
	},

	_createAccessory: function(accessoryDescriptor){

	},

	_addNavItemElement: function(gmailNavItemView){
		var itemContainerElement = this._getItemContainerElement();
		itemContainerElement.appendChild(gmailNavItemView.getElement());
	},

	_getItemContainerElement: function(){
		if(!this._itemContainerElement){
			this._createItemContainerElement();
			this._createExpando();
		}

		return this._itemContainerElement;
	},

	_createItemContainerElement: function(){
		this._itemContainerElement = document.createElement('div');
		this._itemContainerElement.classList.add('inboxsdk__navItem_container');

		this._element.appendChild(this._itemContainerElement);
	},

	_createExpando: function(){
		this._expandoElement = document.createElement('div');
		this._expandoElement.setAttribute('class', 'TH aih J-J5-Ji expando');
		this._expandoElement.setAttribute('role', 'link');

		var self = this;
		this._expandoElement.addEventListener('click', function(e){
			self._toggleCollapse();
			e.stopPropagation();
		});

		this._element.querySelector('.inboxsdk__navItem_name').insertAdjacentElement('beforebegin', this._expandoElement);
	},

	_toggleCollapse: function(){
		if(this._isExpanded()){
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	_collapse: function(){
		if(!this._isExpanded()){
			return;
		}

		this._expandoElement.classList.remove('aih');
		this._expandoElement.classList.add('aii');

		this._itemContainerElement.style.display = 'none';

		this._eventStream.push({
			eventName: 'collapsed'
		});
	},

	_expand: function(){
		if(this._isExpanded()){
			return;
		}

		this._expandoElement.classList.add('aih');
		this._expandoElement.classList.remove('aii');

		this._itemContainerElement.style.display = '';

		this._eventStream.push({
			eventName: 'expanded'
		});
	},

	_isExpanded: function(){
		return this._expandoElement.classList.contains('aih');
	}

});


module.exports = GmailNavItemView;

/*

16, 06, 68, 88, _, 98

16066888_98

*/


