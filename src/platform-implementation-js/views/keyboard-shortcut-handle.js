'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');


var memberMap = new WeakMap();

// documented in src/docs/
var KeyboardShortcutHandle = function(keyboardShortcutHandleDriver){
    var members = {};
    memberMap.set(this, members);

    members.keyboardShortcutHandleDriver = keyboardShortcutHandleDriver;

    Object.defineProperties(this, {
    	'chord': {
    		value: keyboardShortcutHandleDriver.getChord(),
    		writable: false
    	}
    });
};

_.extend(KeyboardShortcutHandle.prototype, {

	remove(){
		var members = memberMap.get(this);
		if(members){
			members.keyboardShortcutHandleDriver.destroy();
		}
	}

});

module.exports = KeyboardShortcutHandle;
