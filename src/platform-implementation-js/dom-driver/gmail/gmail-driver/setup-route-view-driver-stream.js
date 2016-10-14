/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import get from '../../../../common/get-or-fail';

import type GmailDriver from '../gmail-driver';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';
import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';

const routeIDtoRegExp: (routeID: string) => RegExp = _.memoize(routeID =>
	new RegExp('^'+_.escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'/?$')
);

function routeIDmatchesHash(routeID: string|Array<string>, hash: string): ?string {
	const routeIDs = Array.isArray(routeID) ? routeID : [routeID];
	return _.find(routeIDs, routeID => hash.match(routeIDtoRegExp(routeID)));
}

export default function setupRouteViewDriverStream(gmailRouteProcessor: GmailRouteProcessor, driver: GmailDriver): Kefir.Observable<GmailRouteView> {
	const customRouteIDs = driver.getCustomRouteIDs();
	const customListRouteIDs = driver.getCustomListRouteIDs();
	const customListSearchStringsToRouteIds = driver.getCustomListSearchStringsToRouteIds();

	let lastNativeHash = getURLObject(document.location.href).hash;
	let latestGmailRouteView = null;

	driver.getStopper()
		.onValue(() => {
			if (latestGmailRouteView) {
				latestGmailRouteView.destroy();
			}
		});

	let lastHash = lastNativeHash;

	const eligibleHashChanges = Kefir.fromEvents(window, 'hashchange')
		.filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
		.map(event => ({new: getURLObject(event.newURL), old: getURLObject(event.oldURL)}))
		.filter(event => event.new.hash !== event.old.hash)
		.map(event => event.new)
		.map(urlObject => {
			const hash = urlObject.hash;
			for (let routeIDs of customRouteIDs) {
				let routeID = routeIDmatchesHash(routeIDs, hash);
				if (routeID) {
					return {urlObject, type: 'CUSTOM', routeID};
				}
			}
			for (let [routeIDs] of customListRouteIDs) {
				let routeID = routeIDmatchesHash(routeIDs, hash);
				if (routeID) {
					return {urlObject, type: 'CUSTOM_LIST_TRIGGER', routeID};
				}
			}
			if (gmailRouteProcessor.isNativeRoute(urlObject.name)) {
				return {urlObject, type: 'NATIVE'};
			}
			return {urlObject, type: 'OTHER_APP_CUSTOM'};
		});

	const customAndCustomListRouteHashChanges = eligibleHashChanges
		.filter(({type}) => type !== 'NATIVE');

	// If a user goes from a native route to a custom route, and then back to the
	// same native route, we need to make a new GmailRouteView because
	// getMainContentElementChangedStream() won't be firing, except when going from thread->custom->thread
	const revertNativeHashChanges = eligibleHashChanges
		.filter(({type}) => type === 'NATIVE')
		.filter(({urlObject}) => {
			const tmp = lastNativeHash;
			lastNativeHash = urlObject.hash;
			return tmp === urlObject.hash;
		})
		.filter(({urlObject}) => {
			return urlObject.hash !== lastHash;
		});

	// Merge everything that can trigger a new RouteView
	return Kefir.merge([
		customAndCustomListRouteHashChanges,
		revertNativeHashChanges,

		//when native gmail changes main view there's a div that takes on role=main
		GmailElementGetter.getMainContentElementChangedStream()
			.map(event => ({
				urlObject: getURLObject(document.location.href),
				type: 'NATIVE'
			}))
	])
	.map(options => {
		const {type, urlObject} = options;
		if (type === 'NATIVE' && urlObject.name === 'search') {
			const customListRouteId = customListSearchStringsToRouteIds.get(urlObject.params[0]);
			if (customListRouteId) {
				const searchInput = GmailElementGetter.getSearchInput();
				searchInput.value = '';

				if (urlObject.params.length === 1) {
					driver.hashChangeNoViewChange('#'+customListRouteId);
					return {
						type: 'CUSTOM_LIST', urlObject, routeID: customListRouteId
					};
				}
			}
		}
		return options;
	})
	.map(options => {
		if (options.type === 'NATIVE' || options.type === 'CUSTOM_LIST') {
			driver.showNativeRouteView();
		} else if (options.type === 'CUSTOM_LIST_TRIGGER') {
			driver.showCustomThreadList(options.routeID, get(customListRouteIDs, options.routeID));
			return;
		}
		return new GmailRouteView(options, gmailRouteProcessor, driver);
	})
	.filter(Boolean)
	.map((gmailRouteView) => {
		if(latestGmailRouteView){
			latestGmailRouteView.destroy();
		}
		latestGmailRouteView = gmailRouteView;
		lastHash = getURLObject(document.location.href).hash;

		return gmailRouteView;
	});
}

/*
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 */
