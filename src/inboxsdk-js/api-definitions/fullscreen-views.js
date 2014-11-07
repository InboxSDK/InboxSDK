var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var FullscreenViews = function(platformImplementationLoader){
	EventEmitter.call(this);

	this._platformImplementationLoader = platformImplementationLoader;

	this._watchForFullscreenViewChanges();
};

FullscreenViews.prototype = Object.create(FullscreenViews.prototype);

_.extend(FullscreenViews.prototype, {

	_watchForFullscreenViewChanges: function(){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.FullscreenViews.on('change', function(event){
				self.emit('change', event);
			});

		});
	}

});
