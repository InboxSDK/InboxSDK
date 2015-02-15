'use strict';

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var GmailElementGetter = require('../gmail-element-getter');

var GmailAppToolbarButtonView = require('../views/gmail-app-toolbar-button-view');

module.exports = function(gmailDriver, buttonDescriptor){
	return GmailElementGetter.waitForGmailModeToSettle().then(function(){

		if(GmailElementGetter.isStandalone()){
			return new Promise(function(resolve, reject){
				//never complete
			});
		}
		else{
			return new GmailAppToolbarButtonView(buttonDescriptor);
		}

	});

};
