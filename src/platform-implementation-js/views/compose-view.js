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
		var buttonOptions = _.clone(buttonDescriptor);
		if(buttonDescriptor.hasDropdown){
			buttonOptions.preMenuShowFunction = function(menuView){
				buttonDescriptor.onClick({
					dropdown: {
						el: menuView.getElement()
					}
				});
			};
		}
		else{
			buttonOptions.activateFunction = buttonDescriptor.onClick;
		}

		this._composeViewImplementation.addButton(buttonOptions);
	},

	/*
	 * inserts link into body
	 * returns a promise for when the insert actually happens
	 */
	insertLinkIntoBody: function(text, href){
		this._composeViewImplementation.insertLinkIntoBody(text, href);
	},

	isReply: function(){
		return this._composeViewImplementation.isReply();
	}


});

module.exports = ComposeView;
