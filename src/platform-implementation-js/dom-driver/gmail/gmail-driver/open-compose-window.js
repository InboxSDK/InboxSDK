var simulateClick = require('../../../lib/dom/simulate-click');
var GmailElementGetter = require('../gmail-element-getter');

var waitFor = require('../../../lib/wait-for');

module.exports = function(gmailDriver){

	GmailElementGetter.waitForGmailModeToSettle().then(function(){

		if(GmailElementGetter.isStandaloneComposeWindow() || GmailElementGetter.isStandaloneThreadWindow()){
			//do nothing
			return;
		}

		waitFor(function(){
			return !!GmailElementGetter.getComposeButton();
		}).then(function(){
			simulateClick(GmailElementGetter.getComposeButton());
		});

	});

};
