'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');


var memberMap = new WeakMap();

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


  /**
  * Deactivates the keyboard shortcut
  * @return {void}
  */
	remove: function(){
		var members = memberMap.get(this);
		if(members){
			members.keyboardShortcutHandleDriver.destroy();
		}
	}

});



module.exports = KeyboardShortcutHandle;
