var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../../lib/basic-class');

var GmailElementGetter = require('../../gmail-element-getter');

var GmailToolbarView = require('../gmail-toolbar-view');

var ThreadViewToolbarMonitor = function(threadViewStream){
	BasicClass.call(this);

	this._threadViewStream = threadViewStream;
	this._toolbarViewStream = new Bacon.Bus();

	this._bindToThreadViewStream();
};

ThreadViewToolbarMonitor.prototype = Object.create(BasicClass.prototype);

_.extend(ThreadViewToolbarMonitor.prototype, {

	__memberVariables: [
		{name: '_threadViewStream', destroy: false},
		{name: '_toolbarViewStream', destroy: true, get:true, destroyFunction: 'end'}
	],

	_bindToThreadViewStream: function(){
		var self = this;

		this._toolbarViewStream.plug(
			this._threadViewStream.map(function(threadView){
				var toolbarElement = GmailElementGetter.getThreadToolbarElement();

				if(!toolbarElement){
					return null;
				}

				var gmailToolbarView = new GmailToolbarView(toolbarElement);
				gmailToolbarView.setThreadView(threadView);

				return gmailToolbarView;
			})
			.filter(function(gmailToolbarView){
				return !!gmailToolbarView;
			})
		);

	}

});

module.exports = ThreadViewToolbarMonitor;
