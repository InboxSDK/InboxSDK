'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var Map = require('es6-unweak-collections').Map;

var memberMap = new Map();

/**
* @class
*/
var Keyboard = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
};

_.extend(Keyboard.prototype, /** @lends Keyboard */ {

  createKeyboardShortcutHandle: function(chord){

  }

});



module.exports = Keyboard;
