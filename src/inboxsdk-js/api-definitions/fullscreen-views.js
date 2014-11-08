var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var FullscreenViews = function(platformImplementationLoader){
	EventEmitter.call(this);

	this._platformImplementationLoader = platformImplementationLoader;

	this._watchForFullscreenViewChanges();
};

FullscreenViews.prototype = Object.create(EventEmitter.prototype);

_.extend(FullscreenViews.prototype, {

	registerCustom: function(options){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.FullscreenViews.registerCustom(options);

		});
	},

	_watchForFullscreenViewChanges: function(){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.FullscreenViews.on('change', function(event){
				self.emit('change', event);
			});

		});
	}

});

module.exports = FullscreenViews;
