'use strict';

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';
import escapeRegExp from '../../../../common/escape-reg-exp';

import Logger from '../../../lib/logger';

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

	let lastNativeHash = getURLObject(document.location.href).hash;
	let latestGmailRouteView = null;

	const eligibleHashChanges = Kefir.fromEvent(window, 'hashchange')
		.filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
		.filter(event => event.newURL === document.location.href) // ignore outdated events
		.map(() => getURLObject(document.location.href))
		.skipDuplicates((a, b) => a.hash === b.hash)
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
			if (GmailRouteProcessor.isNativeRoute(urlObject.name)) {
				return {urlObject, type: 'NATIVE'};
			}
			return {urlObject, type: 'OTHER_APP_CUSTOM'};
		}).tap(obj => {
			if (setupRouteViewDriverStream.routeViewIsChanging) {
				Logger.error(new Error("Re-entrance hashchange"), {
					obj,
					latest: describeGmailRouteView(latestGmailRouteView)
				});
			}
		});

	const customAndCustomListRouteHashChanges = eligibleHashChanges
		.filter(({type}) => type !== 'NATIVE');

	// If a user goes from a native route to a custom route, and then back to the
	// same native route, we need to make a new GmailRouteView because
	// getMainContentElementChangedStream() won't be firing.
	const revertNativeHashChanges = eligibleHashChanges
		.filter(({type}) => type === 'NATIVE')
		.filter(({urlObject}) => {
			const tmp = lastNativeHash;
			lastNativeHash = urlObject.hash;
			return tmp === urlObject.hash;
		});

	// Merge everything that can trigger a new RouteView
	return Kefir.merge([
		customAndCustomListRouteHashChanges,
		revertNativeHashChanges,

		//when native gmail changes main view there's a div that takes on role=main
		kefirCast(Kefir, GmailElementGetter.getMainContentElementChangedStream())
			.map(event => ({
				urlObject: getURLObject(document.location.href),
				type: 'NATIVE'
			}))
			.tap(obj => {
				if (setupRouteViewDriverStream.routeViewIsChanging) {
					Logger.error(new Error("Re-entrance content changed"), {
						obj,
						latest: describeGmailRouteView(latestGmailRouteView)
					});
				}
			})
	]).map(options => {
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
	}).map(options => {
		if (options.type === 'NATIVE' || options.type === 'CUSTOM_LIST') {
			driver.showNativeRouteView();
		} else if (options.type === 'CUSTOM_LIST_TRIGGER') {
			driver.showCustomThreadList(options.routeID, customListRouteIDs.get(options.routeID));
			return;
		}
		return new GmailRouteView(options, GmailRouteProcessor);
	})
	.filter(Boolean)
	.tap((gmailRouteView) => {
		setupRouteViewDriverStream.routeViewIsChanging = true;
		if(latestGmailRouteView){
			const originalLatestGmailRouteView = latestGmailRouteView;
			const pre = describeGmailRouteView(latestGmailRouteView);
			latestGmailRouteView.GOOD_DESTROY = true;
			latestGmailRouteView.destroy();
			if (latestGmailRouteView._eventStream) {
				const middle = describeGmailRouteView(latestGmailRouteView);
				latestGmailRouteView.destroy();
				const post = describeGmailRouteView(latestGmailRouteView);
				Logger.error(new Error("Failed to destroy routeView"), {
					pre, middle, post,
					latest: describeGmailRouteView(latestGmailRouteView),
					new: describeGmailRouteView(gmailRouteView),
					original: latestGmailRouteView !== originalLatestGmailRouteView ?
						describeGmailRouteView(originalLatestGmailRouteView) : null,
					latestEqOriginal: latestGmailRouteView === originalLatestGmailRouteView,
					latestEqNew: latestGmailRouteView === gmailRouteView
				});
			} else if (latestGmailRouteView !== originalLatestGmailRouteView) {
				Logger.error(new Error("Re-entrance weirdness"), {
					latest: describeGmailRouteView(latestGmailRouteView),
					new: describeGmailRouteView(gmailRouteView),
					original: latestGmailRouteView !== originalLatestGmailRouteView ?
						describeGmailRouteView(originalLatestGmailRouteView) : null,
					latestEqOriginal: latestGmailRouteView === originalLatestGmailRouteView,
					latestEqNew: latestGmailRouteView === gmailRouteView
				});
			}
		}
		latestGmailRouteView = gmailRouteView;
		setupRouteViewDriverStream.routeViewIsChanging = false;
	});
}
setupRouteViewDriverStream.routeViewIsChanging = false;

function describeGmailRouteView(gmailRouteView) {
	return {
		ended: gmailRouteView._eventStream ? gmailRouteView._eventStream.ended : 'none',
		GOOD_DESTROY: !!gmailRouteView.GOOD_DESTROY,
		asapHasFired: gmailRouteView.asapHasFired,
		routeID: gmailRouteView._eventStream && gmailRouteView.getRouteID(),
		name: gmailRouteView._name,
		hash: gmailRouteView.getHash(),
		type: gmailRouteView.getType()
	};
}


/**
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 */
