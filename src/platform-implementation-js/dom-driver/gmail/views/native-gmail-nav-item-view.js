var _ = require('lodash');
var Bacon = require('baconjs');

var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');
var eventNameFilter = require('../../../lib/event-name-filter');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');

var GmailElementGetter = require('../gmail-element-getter');

var NavItemViewDriver = require('../../../driver-interfaces/nav-item-view-driver');


var NativeGmailNavItemView = function(nativeElement){
	NavItemViewDriver.call(this);

	this._element = nativeElement;
	this._element.classList.add('inboxsdk__navItem_claimed');
	this._eventStream = new Bacon.Bus();

	this._monitorElementForActiveChanges();
};

NativeGmailNavItemView.prototype = Object.create(NavItemViewDriver.prototype);

_.extend(NativeGmailNavItemView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_activeMarkerElement', destroy: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_itemContainerElement', destroy: true},
		{name: '_expandoElement', destroy: true},
		{name: '_isCollapsed', destroy: false, defaultValue: false}
	],

	addNavItem: function(orderGroup, navItemDescriptor){
		var gmailNavItemView = new GmailNavItemView(orderGroup, navItemDescriptor);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(this, '_addNavItemElement', gmailNavItemView);

		return gmailNavItemView;
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
		//do nothing
	},

	_monitorElementForActiveChanges: function(){
		var element = this._element;
		var classChangeStream = makeMutationObserverStream(element, {attributes: true, attributeFilter: ['class']});

		classChangeStream
			.filter(function(mutation){
				return mutation.target.classList.contains('ain');
			})
			.takeUntil(this._eventStream.filter(false).mapEnd())
			.onValue(this, '_createActiveMarkerElement');

		classChangeStream
			.filter(function(mutation){
				return !mutation.target.classList.contains('ain');
			})
			.takeUntil(this._eventStream.filter(false).mapEnd())
			.onValue(this, '_removeActiveMarkerElement');


		makeMutationObserverStream(element.parentElement, {childList: true})
					.takeUntil(this._eventStream.filter(false).mapEnd())
					.flatMap(function(mutations){
						return Bacon.fromArray(mutations);
					})
					.flatMap(function(mutation){
						return Bacon.fromArray(_.toArray(mutation.removedNodes));
					})
					.filter(function(removedNode){
						return removedNode === element;
					})
					.onValue(this._eventStream, 'push', {eventName: 'invalidated'});
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

	_createActiveMarkerElement: function(){
		this._removeActiveMarkerElement();

		this._activeMarkerElement = document.createElement('div');
		this._activeMarkerElement.classList.add('inboxsdk__navItem_marker');
		this._activeMarkerElement.classList.add('ain');
		this._activeMarkerElement.innerHTML = '&nbsp;';

		this._element.insertBefore(this._activeMarkerElement, this._element.firstElementChild);
	},

	_removeActiveMarkerElement: function(){
		if(this._activeMarkerElement){
			this._activeMarkerElement.remove();
			this._activeMarkerElement = null;
		}
	},

	destroy: function(){
		this._element.classList.remove('inboxsdk__navItem_claimed');
		NavItemViewDriver.prototype.destroy.call(this);
	}

});


module.exports = NativeGmailNavItemView;

