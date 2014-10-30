var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeView = function(composeViewImplementation){
	BasicClass.call(this);

	this._composeViewImplementation = composeViewImplementation;
};

ComposeView.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeView.prototype, {

	/*
	 * inserts link into body
	 */
	insertLinkIntoBody: function(text, href){
		this._composeViewImplementation.insertLinkIntoBody(text, href);
	}

});

module.exports = ComposeView;
