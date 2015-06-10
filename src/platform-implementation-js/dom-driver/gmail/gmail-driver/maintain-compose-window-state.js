import _ from 'lodash';
import GmailElementGetter from '../gmail-element-getter';
import Bacon from 'baconjs';
import kefirCast from 'kefir-cast';
import Kefir from 'kefir';

export default function maintainComposeWindowState(gmailDriver){

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
				.filterBy(
					Kefir.fromEvents(window, 'hashchange')
								.flatMapLatest(() => Kefir.constant(true).merge(Kefir.later(250, false)))
								.toProperty(() => false)
				)
				.onValue(gmailComposeView => gmailComposeView.minimize());

}

function _isClaimed(){
	return document.body.getAttribute('data-compose-window-state-managed') === 'true';
}

function _claim(){
	document.body.setAttribute('data-compose-window-state-managed', 'true');
}
