var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var FullscreenView = function(fullscreenViewImplementation, fullscreenViewDescriptor){
	EventEmitter.call(this);

	this._fullscreenViewImplementation = fullscreenViewImplementation;
	this._fullscreenViewDescriptor = fullscreenViewDescriptor;

	this._bindToEventStream();
};

FullscreenView.prototype = Object.create(EventEmitter.prototype);

_.extend(FullscreenView.prototype, {

	__memberVariables: [
		{name: '_fullscreenViewDescriptor', destroy: false},
		{name: '_fullscreenViewImplementation', destroy: true}
	],

	getParams: function(){
		return this._fullscreenViewImplementation.getParams();
	},

	getDescriptor: function(){
		return this._fullscreenViewDescriptor;
	},

	getElement: function(){
		return this._fullscreenViewImplementation.getCustomViewElement();
	},

	_bindToEventStream: function(){
		this._fullscreenViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

});

module.exports = FullscreenView;
