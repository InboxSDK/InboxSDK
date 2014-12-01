var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var ContentPanelView = require('../content-panel-view');

var ThreadView = function(threadViewImplementation, appId){
	BasicClass.call(this);

	this._threadViewImplementation = threadViewImplementation;
	this._appId = appId;
};

ThreadView.prototype = Object.create(BasicClass.prototype);

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
		return new ContentPanelView(contentPanelImplementation);
	},

	enableSelectionMode: function(){},

	disableSelectionMode: function(){}

});

module.exports = ThreadView;
