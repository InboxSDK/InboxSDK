var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var ContentPanelView = require('../content-panel-view');

var ThreadView = function(threadViewImplementation, appId){
	EventEmitter.call(this);

	this._threadViewImplementation = threadViewImplementation;
	this._appId = appId;

	this._bindToStreamEvents();
};

ThreadView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadView.prototype, {

	getThread: function(){},

	/*
	* descriptor = {
	*   title: <string>,
	*   iconUrl: <string>,
	*   iconClass: <string>,
	*   orderHint: <int>,
	*   el: element, html string
	* }
	*/
	addSidebarContentPanel: function(descriptor){
		var contentPanelImplementation = this._threadViewImplementation.addSidebarContentPanel(descriptor, this._appId);
		if(contentPanelImplementation){
			return new ContentPanelView(contentPanelImplementation);
		}

		return null;
	},

	enableSelectionMode: function(){},

	disableSelectionMode: function(){},

	_bindToStreamEvents: function(){
		this._threadViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

});

module.exports = ThreadView;
