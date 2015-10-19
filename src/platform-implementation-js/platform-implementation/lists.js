'use strict';

var _ = require('lodash');

var HandlerRegistry = require('../lib/handler-registry');
var ThreadRowView = require('../views/thread-row-view');

var memberMap = new WeakMap();

// documented in src/docs/
var Lists = function(appId, driver, membraneMap){

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.membraneMap = membraneMap;

	members.threadRowViewRegistry = new HandlerRegistry();
	driver.getStopper().onValue(function() {
		members.threadRowViewRegistry.dumpHandlers();
	});

	members.driver.getThreadRowViewDriverKefirStream().onValue(function(viewDriver){
		var view = membraneMap.get(viewDriver);
		if(!view){
			view = new ThreadRowView(viewDriver);
			membraneMap.set(viewDriver, view);
		}

		members.threadRowViewRegistry.addTarget(view);
	});

};

_.extend(Lists.prototype, {

	registerThreadRowViewHandler(handler) {
		return memberMap.get(this).threadRowViewRegistry.registerHandler(handler);
	}

});

module.exports = Lists;
