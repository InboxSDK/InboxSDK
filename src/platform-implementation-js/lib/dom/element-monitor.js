var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../basic-class');

/*
 * options = {
 * 		observedNode: node, the dom node to attach the mutation observer to
 * 		membershipTest: function(node), function that needs to return true/false whether a found node is relevat to this monitor
 * 		viewCreationFunction: function(node), the factory function to call when an applicable node is found
 * }
 *
 */

var ElementMonitor = function(options){
	BasicClass.call(this);
	this._domMutationObserver = null;
	this._eventStreamBus = new Bacon.Bus();

	this._elementMembershipTest = options.elementMembershipTest;
	this._viewCreationFunction = options.viewCreationFunction;
};

ElementMonitor.prototype = Object.create(BasicClass.prototype);

_.extend(ElementMonitor.prototype, {

	__memberVariables: [
		{name: '_domMutationObserver', destroy: false, destroyFunction: 'disconnect'},
		{name: '_eventStreamBus', destroy: false, destroyFunction: 'end'},
		{name: '_views', destroy: true, get: true, defaultValue: []},
		{name: '_observedElement', destroy: false},
		{name: '_viewCreationFunction', destroy: false},
		{name: '_elementMembershipTest', destroy: false}
	],

	setObservedElement: function(element){
		this._observedElement = element;
		this._addDOMMutationObserver();
		this._processExistingChildren();
	},

	getEventStream: function(){
		return this._eventStreamBus;
	},

	getViewAddedEventStream: function(){
		return this._eventStreamBus
					.filter(function(event){
						return event.eventName === 'viewAdded';
					})
					.map(function(event){
						return event.view;
					});
	},

	getViewRemovedEventStream: function(){
		return this._eventStreamBus
					.filter(function(event){
						return event.eventName === 'viewRemoved';
					})
					.map(function(event){
						return event.view;
					});
	},

	_addDOMMutationObserver: function(){
		if(!this._domMutationObserver){
			this._domMutationObserver = new MutationObserver(this._handleMutations.bind(this));
		}

		this._domMutationObserver.observe(
			this._observedElement,
			{
				childList: true
			}
		);
	},

	_handleMutations: function(mutations){
		var self = this;

		mutations.forEach(function(mutation){
			Array.prototype.forEach.call(mutation.addedNodes, function(addedNode){
				self._handleNewElement(addedNode);
			});

			Array.prototype.forEach.call(mutation.removedNodes, function(removedNode){
				self._handleRemovedElement(removedNode);
			});
		});
	},

	_processExistingChildren: function(){
		var self = this;

		var children = self._observedElement.children;
		Array.prototype.forEach.call(children, function(childElement){
			self._handleNewElement(childElement);
		});
	},

	_handleNewElement: function(element){
		if(!this._elementMembershipTest(element)){
			return;
		}

		var view = this._viewCreationFunction(element);
		this._views.push(view);

		this._eventStreamBus.push({
			eventName: 'viewAdded',
			view: view
		});
	},

	_handleRemovedElement: function(element){
		if(!this._elementMembershipTest(element)){
			return;
		}

		var view = this._findViewForElement(element);

		this._eventStreamBus.push({
			eventName: 'viewRemoved',
			view: view
		});

		view.destroy();

		var index = this._views.indexOf(view);
		this._views.splice(index, 1);
	},

	_findViewForElement: function(element){
		for(var ii=0; ii<this._views.length; ii++){
			if(this._views[ii].getElement() === element){
				return this._views[ii];
			}
		}

		return null;
	}

});


module.exports = ElementMonitor;
