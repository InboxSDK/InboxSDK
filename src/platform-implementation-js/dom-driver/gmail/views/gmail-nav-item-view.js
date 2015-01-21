var _ = require('lodash');
var Bacon = require('baconjs');
var $ = require('jquery');

var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');
var eventNameFilter = require('../../../lib/event-name-filter');

var NavItemViewDriver = require('../../../driver-interfaces/nav-item-view-driver');

var ButtonView = require('../widgets/buttons/button-view');
var LabelDropdownButtonView = require('../widgets/buttons/label-dropdown-button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');

var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED = 0;
var LEFT_INDENTATION_PADDING = 14;

var GmailNavItemView = function(orderGroup, level){
	NavItemViewDriver.call(this);

	this._orderGroup = orderGroup;
	this._eventStream = new Bacon.Bus();
	this._level = level || 0;

	this._navItemNumber = ++NUMBER_OF_GMAIL_NAV_ITEM_VIEWS_CREATED;


	this._setupElement();
};

GmailNavItemView.prototype = Object.create(NavItemViewDriver.prototype);

_.extend(GmailNavItemView.prototype, {

	__memberVariables: [
		{name: '_navItemDescriptor', destroy: false, get: true},
		{name: '_element', destroy: true, get: true},
		{name: '_activeMarkerElement', destroy: true},
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

	setNavItemDescriptor: function(navItemDescriptorPropertyStream){
		navItemDescriptorPropertyStream.onValue(this, '_updateValues');
	},

	addNavItem: function(orderGroup, navItemDescriptor){
		var gmailNavItemView = new GmailNavItemView(orderGroup, this._level + 1);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(this, '_addNavItemElement', gmailNavItemView);

		gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

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
		var toElement = this._element.querySelector('.TO');

		if(value){
			this._element.classList.add('ain');
			toElement.classList.add('nZ');
			toElement.classList.add('aiq');
		}
		else{
			this._element.classList.remove('ain');
			toElement.classList.remove('nZ');
			toElement.classList.remove('aiq');
		}

		this._setHeights();
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
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	remove: function(){
		this.destroy();
	},

	_setupElement: function(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'aim inboxsdk__navItem');

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
				domEvent: domEvent
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

		var accessoryViewController = new DropdownButtonViewController(buttonOptions);
		this._accessoryViewController = accessoryViewController;

		var innerElement = this._element.querySelector('.TO');
		innerElement.addEventListener('mouseenter', function(){
			innerElement.classList.add('inboxsdk__navItem_hover');
		});

		innerElement.addEventListener('mouseleave', function(){
			innerElement.classList.remove('inboxsdk__navItem_hover');
		});

		this._element.querySelector('.aio').appendChild(buttonOptions.buttonView.getElement());

		var self = this;

		Bacon
			.fromEventTarget(this._element, 'contextmenu')
			.takeWhile(function(){
				return self._accessoryViewController === accessoryViewController;
			})
			.filter(function(domEvent){
				if(domEvent.target === self._element){
					return true;
				}

				var navItems = _.filter(domEvent.path, function(el){return el.classList && el.classList.contains('inboxsdk__navItem');});
				return navItems[0] === self._element;
			})
			.onValue(function(domEvent){
				domEvent.preventDefault();

				accessoryViewController.showDropdown();
			});
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

		var element = gmailNavItemView.getElement();
		element.querySelector('.TO').style.paddingLeft = (LEFT_INDENTATION_PADDING * this._level) + 'px';

		this._setHeights();
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
		this._expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
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

		this._setHeights();

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

		this._setHeights();
	},

	_isExpanded: function(){
		return  this._expandoElement.classList.contains('aih');
	},

	_setHeights: function(){
		var toElement = this._element.querySelector('.TO');

		if(this._element.classList.contains('ain') && this._itemContainerElement){
			this._element.style.height = '';

			var totalHeight = this._element.clientHeight;
			var itemHeight = toElement.clientHeight;

			this._element.style.height = itemHeight + 'px';
			this._element.style.overflow = 'visible';
			this._element.style.marginBottom = (totalHeight - itemHeight) + 'px';
		}
		else{
			this._element.style.height = '';
			this._element.style.overflow = '';
			this._element.style.marginBottom = '';
		}

		if(!$(this._element).closest('.inboxsdk__navMenu')){
			return;
		}

		var navigation = $(this._element).closest('[role=navigation]')[0];
		var realHeight = $(this._element).closest('.inboxsdk__navMenu')[0].parentElement.clientHeight;
		navigation.style.minHeight = realHeight + 'px';
	},

	_createActiveMarkerElement: function(){
		if(this._activeMarkerElement){
			this._activeMarkerElement.remove();
		}

		this._activeMarkerElement = document.createElement('div');
		this._activeMarkerElement.classList.add('inboxsdk__navItem_marker');
		this._activeMarkerElement.classList.add('ain');
		this._activeMarkerElement.innerHTML = '&nbsp;';

		var position = $(this._element).position();
		this._activeMarkerElement.style.top = position.top + 'px';

		this._element.insertBefore(this._activeMarkerElement, this._element.firstElementChild);
	}

});


module.exports = GmailNavItemView;

