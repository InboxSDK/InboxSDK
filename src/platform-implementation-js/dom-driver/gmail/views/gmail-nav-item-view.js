var _ = require('lodash');
var Bacon = require('baconjs');

var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');
var eventNameFilter = require('../../../lib/event-name-filter');

var NavItemViewDriver = require('../../../driver-interfaces/nav-item-view-driver');

var ButtonView = require('../widgets/buttons/button-view');
var LabelDropdownButtonView = require('../widgets/buttons/label-dropdown-button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');

var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED = 0;

var GmailNavItemView = function(orderGroup,  navItemDescriptor, nativeElement){
	NavItemViewDriver.call(this);

	this._orderGroup = orderGroup;
	this._eventStream = new Bacon.Bus();

	this._navItemNumber = ++NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED;


	if(nativeElement){
		this._element = nativeElement;
		this._isNative = true;
	}
	else{
		this._setupElement();

		if(navItemDescriptor.onValue){
			navItemDescriptor.onValue(this, '_updateValues');
		}
		else{
			this._updateValues(navItemDescriptor);
		}
	}
};

GmailNavItemView.prototype = Object.create(NavItemViewDriver.prototype);

_.extend(GmailNavItemView.prototype, {

	__memberVariables: [
		{name: '_navItemDescriptor', destroy: false, get: true},
		{name: '_element', destroy: false, get: true},
		{name: '_isNative', destroy: false, defaultValue: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_iconElement', destroy: true},
		{name: '_iconImgElement', destroy: true},
		{name: '_itemContainerElement', destroy: true},
		{name: '_expandoElement', destroy: true},
		{name: '_isCollapsed', destroy: false, defaultValue: false},
		{name: '_orderGroup', destroy: false, get: true},
		{name: '_orderHint', destroy: false, get: true},
		{name: '_name', destroy: false, get: true, defaultValue: ''},
		{name: '_iconUrl', destroy: false},
		{name: '_iconClass', destroy: false},
		{name: '_accessory', destroy: false},
		{name: '_accessoryViewController', destroy: true}
	],

	addNavItem: function(orderGroup, navItemDescriptor){
		var gmailNavItemView = new GmailNavItemView(orderGroup, navItemDescriptor);

		//this._addNavItemElement(gmailNavItemView);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(this, '_addNavItemElement', gmailNavItemView);

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
			this._element.querySelector('.TO').classList.add('aiq');
		}
		else{
			this._element.classList.remove('ain');
			this._element.querySelector('.TO').classList.remove('nZ');
			this._element.querySelector('.TO').classList.remove('aiq');
		}
	},

	toggleCollapse: function(){
		this._toggleCollapse();
	},

	setCollapsed: function(value){
		this._isCollapsed = value;

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

	remove: function(){
		this.destroy();
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

		this._updateAccessory(navItemDescriptor.accessory);
		this._updateOrder(navItemDescriptor);
	},

	_updateName: function(name){
		if(this._name === name){
			return;
		}

		this._element.querySelector('.inboxsdk__navItem_name').textContent = name;
		this._name = name;
	},

	_updateAccessory: function(accessory){
		if(this._accessory === accessory){
			return;
		}

		if(this._accessoryViewController){
			this._accessoryViewController.destroy();
			this._accessoryViewController = null;
		}

		if(accessory){
			this._createAccessory(accessory);
		}

		this._accessory = accessory;
	},

	_createAccessory: function(accessoryDescriptor){
		switch(accessoryDescriptor.type){
			case 'CREATE':
				this._createCreateAccessory(accessoryDescriptor);
			break;
			case 'ICON_BUTTON':
				this._createIconButtonAccessory(accessoryDescriptor);
			break;
			case 'DROPDOWN_BUTTON':
				this._createDropdownButtonAccessory(accessoryDescriptor);
			break;
		}

		this._accessoryCreated = true;
	},

	_createCreateAccessory: function(accessoryDescriptor){
		accessoryDescriptor.name = '+ New';
		this._createLinkButtonAccessory(accessoryDescriptor);
	},

	_createLinkButtonAccessory: function(accessoryDescriptor){
		var linkDiv = document.createElement('div');
		linkDiv.setAttribute('class', 'CL inboxsdk__navItem_link');


		var anchor = document.createElement('a');
		anchor.classList.add('CK');
		anchor.textContent = accessoryDescriptor.name;

		linkDiv.appendChild(anchor);

		anchor.href = '#';

		anchor.addEventListener('click', function(e){
			e.stopPropagation();
			e.preventDefault();

			accessoryDescriptor.onClick();
		});

		this._element.querySelector('.aio').appendChild(linkDiv);
	},

	_createIconButtonAccessory: function(accessoryDescriptor){
		var buttonOptions = _.clone(accessoryDescriptor);
		buttonOptions.buttonColor = 'pureIcon';
		buttonOptions.buttonView  = new ButtonView(buttonOptions);


		this._accessoryViewController = new BasicButtonViewController(buttonOptions);

		this._element.querySelector('.aio').appendChild(buttonOptions.buttonView.getElement());
	},

	_createDropdownButtonAccessory: function(accessoryDescriptor){
		var buttonOptions = _.clone(accessoryDescriptor);
		buttonOptions.buttonView  = new LabelDropdownButtonView(buttonOptions);
		buttonOptions.dropdownShowFunction = buttonOptions.onClick;
		buttonOptions.dropdownViewDriverClass = GmailDropdownView;

		this._accessoryViewController = new DropdownButtonViewController(buttonOptions);

		var innerElement = this._element.querySelector('.TO');
		innerElement.addEventListener('mouseenter', function(){
			innerElement.classList.add('inboxsdk__navItem_hover');
		});

		innerElement.addEventListener('mouseleave', function(){
			innerElement.classList.remove('inboxsdk__navItem_hover');
		});

		this._element.querySelector('.aio').appendChild(buttonOptions.buttonView.getElement());
	},

	_updateOrder: function(navItemDescriptor){
		this._element.setAttribute('data-group-order-hint', this._orderGroup);
		this._element.setAttribute('data-insertion-order-hint', this._navItemNumber);

		if(navItemDescriptor.orderHint !== this._orderHint){
			navItemDescriptor.orderHint = navItemDescriptor.orderHint || navItemDescriptor.orderHint === 0 ? navItemDescriptor.orderHint : Number.MAX_SAFE_INTEGER;
			this._element.setAttribute('data-order-hint', navItemDescriptor.orderHint);

			this._eventStream.push({
				eventName: 'orderChanged'
			});
		}

		this._orderHint = navItemDescriptor.orderHint;
	},

	_addNavItemElement: function(gmailNavItemView){
		var itemContainerElement = this._getItemContainerElement();

		var insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);
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

		if(this._isCollapsed){
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	_toggleCollapse: function(){
		if(!this._expandoElement){
			this._isCollapsed = !this._isCollapsed;
			return;
		}

		if(this._isCollapsed){
			this._expand();
		}
		else{
			this._collapse();
		}
	},

	_collapse: function(){
		this._expandoElement.classList.remove('aih');
		this._expandoElement.classList.add('aii');

		this._itemContainerElement.style.display = 'none';

		this._isCollapsed = true;

		this._eventStream.push({
			eventName: 'collapsed'
		});
	},

	_expand: function(){
		this._expandoElement.classList.add('aih');
		this._expandoElement.classList.remove('aii');

		this._itemContainerElement.style.display = '';

		this._isCollapsed = false;

		this._eventStream.push({
			eventName: 'expanded'
		});
	},

	_isExpanded: function(){
		return  this._expandoElement.classList.contains('aih');
	},

	destroy: function(){
		if(!this._isNative && this._element){
			this._element.remove();
		}

		NavItemViewDriver.prototype.destroy.call(this);
	}

});


module.exports = GmailNavItemView;

