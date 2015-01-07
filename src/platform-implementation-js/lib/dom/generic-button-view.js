var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../basic-class');

var GenericButtonView = function(element){
	BasicClass.call(this);

	this._eventStream = new Bacon.Bus();
	this._element = element;

	this._setupEventStream();
};

GenericButtonView.prototype = Object.create(BasicClass.prototype);

_.extend(GenericButtonView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	activate: function(){/* do nothing */},

	deactivate: function(){/* do nothing */},

	_setupEventStream: function(){
		var clickEventStream = Bacon.fromEventTarget(this._element, 'click');

		clickEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream.plug(
			clickEventStream.map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
		);
	}

});

module.exports = GenericButtonView;
