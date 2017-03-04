/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import get from '../../../../common/get-or-fail';

import type GmailDriver from '../gmail-driver';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';
import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';

import routeIDmatchesHash from '../../../lib/routeIDmatchesHash';

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
			const {hash, name} = urlObject;
			for (let routeIDs of customRouteIDs) {
				let routeID = routeIDmatchesHash(routeIDs, hash);
				if (routeID) {
					return {urlObject, type: 'CUSTOM', routeID};
				}
			}
			for (let [routeIDs] of customListRouteIDs) {
				let routeID = routeIDmatchesHash(routeIDs, name);
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
				if (!searchInput) throw new Error('Should not happen');
				searchInput.value = '';

				// Only rewrite the url if it's a search query with no further
				// parameters or it has a page parameter. Don't write URLs with thread
				// id parameters because currently other parts of the code depend on
				// being able to parse the URL as a normal thread URL.

				// Additionally, we don't want to treat threads as the CUSTOM_LIST type
				// since they're not lists.
				if (
					urlObject.params.length === 1 ||
					(urlObject.params.length === 2 && urlObject.params[1][0] === 'p')
				) {
					driver.hashChangeNoViewChange('#' + customListRouteId + (urlObject.params[1] ? '/' + urlObject.params[1] : ''));
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
			driver.showCustomThreadList(options.routeID, get(customListRouteIDs, options.routeID), options.urlObject.params);
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
