'use strict';

var _ = require('lodash');
var BasicClass = require('../../../lib/basic-class');

var GmailKeyboardShortcutHandle = function(chord, removeCallback){
	BasicClass.call(this);

	this._chord = chord;
	this._removeCallback = removeCallback;
};

GmailKeyboardShortcutHandle.prototype = Object.create(BasicClass.prototype);

_.extend(GmailKeyboardShortcutHandle.prototype, {

	__memberVariables: [
		{name: '_chord', destroy: false, get: true},
		{name: '_removeCallback', destroy: true}
	]

});

module.exports = GmailKeyboardShortcutHandle;
