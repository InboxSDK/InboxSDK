var _ = require('lodash');
var ToolbarViewDriver = require('../../../driver-interfaces/toolbar-view-driver');

var GmailToolbarView = function(element){
	ToolbarViewDriver.call(this);

	this._element = element;
};

GmailToolbarView.prototype = Object.create(ToolbarViewDriver.prototype);

_.extend(GmailToolbarView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_threadViewDriver', destroy: false, set: true, get: true},
		{name: '_rowListViewDriver', destroy: false, set: true, get: true}
	],

	addButton: function(buttonDescriptor){

	}

});

module.exports = GmailToolbarView;
