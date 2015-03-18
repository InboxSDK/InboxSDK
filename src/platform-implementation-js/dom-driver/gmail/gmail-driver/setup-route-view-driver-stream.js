const _ = require('lodash');
const waitFor = require('../../../lib/wait-for');

const GmailElementGetter = require('../gmail-element-getter');

const GmailRouteView = require('../views/gmail-route-view/gmail-route-view');

const getURLObject = require('./get-url-object');

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import escapeRegExp from '../../../../common/escape-reg-exp';

let currentUrlObject = {};
let currentMainElement = null;

const routeIDtoRegExp = _.memoize(routeID =>
	new RegExp('^#'+escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'$')
);

function routeIDmatchesHash(routeID, hash) {
	const routeIDre = routeIDtoRegExp(routeID);
	return hash.match(routeIDre);
}

// returns a Kefir stream
export default function setupRouteViewDriverStream(GmailRouteProcessor, customRouteIDs, customListRouteIDs) {
	const eligibleHashChanges = Kefir.fromEvent(window, 'hashchange')
		.filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
		.filter(event => event.newURL === document.location.href); // ignore outdated events

	const customRouteHashChanges = eligibleHashChanges
		.map(event => {
			const hash = document.location.hash;
			for (let routeID of customRouteIDs) {
				if (routeIDmatchesHash(routeID, hash)) {
					return routeID;
				}
			}
			return null;
		})
		.filter(Boolean)
		.map(customRouteID => ({customRouteID}));

	const customListRouteHashChanges = eligibleHashChanges
		.map(event => {
			const hash = document.location.hash;
			for (let routeID of customListRouteIDs) {
				if (routeIDmatchesHash(routeID, hash)) {
					return routeID;
				}
			}
			return null;
		})
		.filter(Boolean)
		.map(customListRouteID => ({customListRouteID}));

	return Kefir.merge([
		customRouteHashChanges,
		customListRouteHashChanges,

		//when native gmail changes main view there's a div that takes on role=main
		kefirCast(Kefir, GmailElementGetter.getMainContentElementChangedStream())
			.map(event => ({}))
	]).map(options => _createRouteViewDriver(GmailRouteProcessor, options));
}

function _createRouteViewDriver(GmailRouteProcessor, options) {
	const urlObject = getURLObject(location.href);

	return new GmailRouteView(urlObject, options, GmailRouteProcessor);
}

/**
 *
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 *
 */
