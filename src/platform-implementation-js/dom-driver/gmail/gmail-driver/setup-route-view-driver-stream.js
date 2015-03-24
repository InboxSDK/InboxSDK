import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';
import escapeRegExp from '../../../../common/escape-reg-exp';

const routeIDtoRegExp = _.memoize(routeID =>
	new RegExp('^'+escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'/?$')
);

function routeIDmatchesHash(routeID, hash) {
	const routeIDs = Array.isArray(routeID) ? routeID : [routeID];
	return _.find(routeIDs, routeID => hash.match(routeIDtoRegExp(routeID)));
}

// returns a Kefir stream
export default function setupRouteViewDriverStream(GmailRouteProcessor, driver) {
	const customRouteIDs = driver.getCustomRouteIDs();
	const customListRouteIDs = driver.getCustomListRouteIDs();
	const customListSearchStringsToRouteIds = driver.getCustomListSearchStringsToRouteIds();

	let lastNativeHash = null;

	const eligibleHashChanges = Kefir.fromEvent(window, 'hashchange')
		.filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
		.filter(event => event.newURL === document.location.href) // ignore outdated events
		.map(event => {
			const urlObject = getURLObject(document.location.href);
			const hash = urlObject.hash;
			for (let routeIDs of customRouteIDs.keys()) {
				let routeID = routeIDmatchesHash(routeIDs, hash);
				if (routeID) {
					return {urlObject, type: 'CUSTOM', routeID};
				}
			}
			for (let routeIDs of customListRouteIDs.keys()) {
				let routeID = routeIDmatchesHash(routeIDs, hash);
				if (routeID) {
					return {urlObject, type: 'CUSTOM_LIST_TRIGGER', routeID};
				}
			}
			if (GmailRouteProcessor.isNativeRoute(urlObject.name)) {
				return {urlObject, type: 'NATIVE'};
			}
			return {urlObject, type: 'OTHER_APP_CUSTOM'};
		});

	const customAndCustomListRouteHashChanges = eligibleHashChanges
		.filter(({type}) => type !== 'NATIVE');

	// If a user goes from a native route to a custom route, and then back to the
	// same native route, we need to make a new GmailRouteView because
	// getMainContentElementChangedStream() won't be firing.
	const revertNativeHashChanges = eligibleHashChanges
		.filter(({type}) => type === 'NATIVE')
		.toProperty({urlObject: getURLObject(document.location.href)})
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
				urlObject: getURLObject(document.location.href),
				type: 'NATIVE'
			}))
	]).map(options => {
		const {type, urlObject} = options;
		if (type === 'NATIVE' && urlObject.name === 'search') {
			const customListRouteId = customListSearchStringsToRouteIds.get(urlObject.params[0]);
			if (customListRouteId) {
				return {
					type: 'CUSTOM_LIST', urlObject, routeID: customListRouteId
				};
			}
		}
		return options;
	}).map(options => {
		if (options.type === 'NATIVE' || options.type === 'CUSTOM_LIST') {
			driver.showNativeRouteView();
		} else if (options.type === 'OTHER_APP_CUSTOM') {
			// Apps don't see the custom views belonging to other apps. We might
			// change this later.
			return null;
		} else if (options.type === 'CUSTOM_LIST_TRIGGER') {
			driver.showCustomThreadList(options.routeID, customListRouteIDs.get(options.routeID));
			return;
		}
		return new GmailRouteView(options, GmailRouteProcessor);
	}).filter(Boolean);
}

/**
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 */
