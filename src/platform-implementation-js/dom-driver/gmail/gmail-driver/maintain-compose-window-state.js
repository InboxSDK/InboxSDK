const GmailElementGetter = require('../gmail-element-getter');
const Bacon = require('baconjs');
const kefirCast = require('kefir-cast');
const Kefir = require('kefir');

function maintainComposeWindowState(gmailDriver){

	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandalone()){
			return;
		}

		if(_isClaimed()){
			return;
		}

		_setupManagement(gmailDriver);
		_claim();
	});
}

function _setupManagement(gmailDriver){

	kefirCast(Kefir, gmailDriver.getComposeViewDriverStream())
				.flatMap((gmailComposeView) =>
							kefirCast(Kefir, gmailComposeView.getEventStream())
								.filter(({eventName}) => eventName === 'restored')
								.map(() => gmailComposeView)
				)
				.log('flatMap')
				.filterBy(
					kefirCast(Kefir, gmailDriver.getRouteViewDriverStream())
								.flatMapLatest(() => Kefir.constant(true).merge(Kefir.later(250, false)))
								.toProperty(false)
								.log('skipWhileBy')
				)
				.log('before onValue')
				.onValue(gmailComposeView => gmailComposeView.minimize());

}

function _isClaimed(){
	return document.body.getAttribute('data-compose-window-state-managed') === 'true';
}

function _claim(){
	document.body.setAttribute('data-compose-window-state-managed', 'true');
}

module.exports = maintainComposeWindowState;
