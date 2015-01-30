'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var Map = require('es6-unweak-collections').Map;

var memberMap = new Map();

/**
* @class
* This class registers a keyboard shortcut. It just defines the key combination itself but not what to
* when that shortcut is executed. In order to actually do something when this handle is executed, you need
* to pass this handle to other functions that accept <code>KeyboardShortcutHandle</code> like the toolbar
* button registration functions
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
  * Deactivates the keyboard shortcut
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
