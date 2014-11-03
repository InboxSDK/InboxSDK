var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeView = function(composeViewImplementation){
	BasicClass.call(this);

	this._composeViewImplementation = composeViewImplementation;
};

ComposeView.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeView.prototype, {

	/*
	 * adds button to the compose
	 */
	addButton: function(buttonDescriptor){
		this._composeViewImplementation.addButton(buttonDescriptor);
	},

	/*
	 * inserts link into body
	 */
	insertLinkIntoBody: function(text, href){
		this._composeViewImplementation.insertLinkIntoBody(text, href);
	}

});

module.exports = ComposeView;
