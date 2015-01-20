'use strict';

var _ = require('lodash');
var Map = require('es6-unweak-collections').Map;


var HandlerRegistry = require('../lib/handler-registry');
var ThreadRowView = require('../views/thread-row-view');

var memberMap = new Map();

/**
* @class
* This namespace allows you to interact with Lists of emails. They typically appear in
* various views like Inbox, Search or Labels. The interaction primarily lets you view
* and modify data in each row of the list.
* @name Lists
*/
var Mailbox = function(appId, driver, membraneMap){

	var members = {};
	memberMap.set(this, memberMap);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;

	members.threadRowViewRegistry = new HandlerRegistry();

	members.driver.getThreadRowViewDriverStream().onValue(function(viewDriver){
		var view = membraneMap.get(viewDriver);
		if(!view){
			view = new ThreadRowView(viewDriver);
			membraneMap.set(viewDriver, view);
		}

		members.threadRowViewRegistry.addTarget(view);
	});

};

_.extend(Mailbox.prototype, /** @lends Lists */{

	/**
	* Registers a handler that gets called whenever a new ThreadRowView becomes visible on screen.
	* Your handler is guranteed to be called exactly once per thread.
	* @param {function(handler)} handler - the function to call on each new visible ThreadRowView
	* @return {void}
	*/
	registerThreadRowViewHandler: function(handler) {
		return memberMap.get(this).threadRowViewRegistry.registerHandler(handler);
	}

});

module.exports = Mailbox;
