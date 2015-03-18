import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';
import escapeRegExp from '../../../../common/escape-reg-exp';

let lastNativeHash = null;

const routeIDtoRegExp = _.memoize(routeID =>
	new RegExp('^'+escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'$')
);

function routeIDmatchesHash(routeID, hash) {
	const routeIDre = routeIDtoRegExp(routeID);
	return hash.match(routeIDre);
}

// returns a Kefir stream
export default function setupRouteViewDriverStream(GmailRouteProcessor, driver, customRouteIDs, customListRouteIDs) {
	const eligibleHashChanges = Kefir.fromEvent(window, 'hashchange')
		.filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
		.filter(event => event.newURL === document.location.href) // ignore outdated events
		.map(event => {
			const urlObject = getURLObject(document.location.href);
			const hash = urlObject.hash;
			for (let customRouteID of customRouteIDs) {
				if (routeIDmatchesHash(customRouteID, hash)) {
					return {urlObject, customRouteID};
				}
			}
			for (let customListRouteID of customListRouteIDs) {
				if (routeIDmatchesHash(customListRouteID, hash)) {
					return {urlObject, customListRouteID};
				}
			}
			if (GmailRouteProcessor.isNativeRoute(urlObject.name)) {
				return {urlObject, native: true};
			}
			return {urlObject, otherAppCustomRoute: true};
		});

	const customAndCustomListRouteHashChanges = eligibleHashChanges
		.filter(({native}) => !native);

	// If a user goes from a native route to a custom route, and then back to the
	// same native route, we need to make a new GmailRouteView because
	// getMainContentElementChangedStream() won't be firing.
	const revertNativeHashChanges = eligibleHashChanges
		.filter(({native}) => native)
		.filter(({urlObject}) => {
			const tmp = lastNativeHash;
			lastNativeHash = urlObject.hash;
			return tmp === urlObject.hash;
		});

	return Kefir.merge([
		customAndCustomListRouteHashChanges,
		revertNativeHashChanges,

		//when native gmail changes main view there's a div that takes on role=main
		kefirCast(Kefir, GmailElementGetter.getMainContentElementChangedStream())
			.map(event => ({
				urlObject: getURLObject(document.location.href)
			}))
	]).map(options => _createRouteViewDriver(GmailRouteProcessor, options));
}

function _createRouteViewDriver(GmailRouteProcessor, options) {
	return new GmailRouteView(options, GmailRouteProcessor);
}

/**
 *
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 *
 */
