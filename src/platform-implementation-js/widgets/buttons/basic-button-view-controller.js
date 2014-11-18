var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var BasicButtonViewController = function(options){
	BasicClass.call(this);

	this._activateFunction = options.activateFunction;
	this._view = options.buttonView;

	this._bindToViewEvents();
};

BasicButtonViewController.prototype = Object.create(BasicClass.prototype);

_.extend(BasicButtonViewController.prototype, {

	__memberVariables: [
		{name: '_view', destroy: true, get: true},
		{name: '_activateFunction', destroy: false, set: true}
	],

	activate: function(){		
		if(this._activateFunction){
			this._activateFunction();
		}
	},

	_bindToViewEvents: function(){
		this._view
			.getEventStream()
			.filter(function(event){
				return event.eventName === 'click';
			})
			.onValue(this, 'activate');
	}

});

module.exports = BasicButtonViewController;
