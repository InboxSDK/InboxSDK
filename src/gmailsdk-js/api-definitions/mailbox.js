var EventEmitter = require('events').EventEmitter;

var Mailbox = function(platformImplementationLoader){
	EventEmitter.call(this);

	this._platformImplementationLoader = platformImplementationLoader;

	var self = this;
	this._platformImplementationLoader.load().then(function(){
		self.emit('example', 'implementation loaded');
	});
};

Mailbox.prototype = Object.create(EventEmitter.prototype);


module.exports = Mailbox;
