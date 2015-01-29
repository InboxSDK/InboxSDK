'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var Map = require('es6-unweak-collections').Map;

var memberMap = new Map();

/**
* @class
*/
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

_.extend(KeyboardShortcutHandle.prototype, /** @lends KeyboardShortcutHandle */ {


    /*
     * deactivates the keyboard shortcut
     */
	remove: function(){
		var members = memberMap.get(this);
		if(members){
			members.keyboardShortcutHandleDriver.destroy();
		}

		memberMap.delete(this);
	}

});



module.exports = KeyboardShortcutHandle;
