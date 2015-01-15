'use strict';

var _ = require('lodash');
var Map = require('es6-unweak-collections').Map;


var HandlerRegistry = require('../lib/handler-registry');
var ThreadRowView = require('../views/thread-row-view');

var memberMap = new Map();

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

_.extend(Mailbox.prototype, {

	registerThreadRowViewHandler: function(handler) {
		return memberMap.get(this).threadRowViewRegistry.registerHandler(handler);
	}

});

module.exports = Mailbox;
