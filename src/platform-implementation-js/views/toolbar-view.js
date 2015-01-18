/****
 *
 * This class only serves for internal bookkeeping purposes and isn't exposed to the apps right now
 *
 */

'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var ToolbarView = function(toolbarViewDriver){
	EventEmitter.call(this);

	var self = this;
	toolbarViewDriver.getEventStream().onEnd(function(){
		self.emit('destroy');
		self.removeAllListeners();
		self._toolbarViewDriver = null;
	});

	this._toolbarViewDriver = toolbarViewDriver;
};

ToolbarView.prototype = Object.create(EventEmitter.prototype);

_.extend(ToolbarView.prototype, {

	getToolbarViewDriver: function(){
		return this._toolbarViewDriver;
	}

});

module.exports = ToolbarView;
