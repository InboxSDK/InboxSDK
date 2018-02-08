/* @flow */

import includes from 'lodash/includes';
import * as ud from 'ud';
import {NATIVE_ROUTE_IDS} from '../../../constants/router';
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';
import getURLObject from './get-url-object';

import type GmailDriver from '../gmail-driver';
import type {RouteParams} from '../../../namespaces/router';

const gotoView = ud.defn(module, async function gotoView(gmailDriver: GmailDriver, viewName: string, params: ?RouteParams|string) {
	if (viewName[0] === '#') {
		if (params) {
			throw new Error("params parameter can't be passed with resolved URL");
		}
		viewName = viewName.slice(1);
	}

	if (includes(NATIVE_ROUTE_IDS, viewName)) {
		if(gmailDriver.isUsingSyncAPI()){
			// need to go to the new url
			if(params && typeof params !== 'string'){
				const threadID = params.threadID;
				if(threadID && typeof threadID === 'string'){
					const int = parseInt(threadID, 16);
					if(!isNaN(int)){ //we got an old id
						const syncThreadId = await gmailDriver.getSyncThreadIdForOldGmailThreadId(threadID);
						params = {
							...params,
							threadID: '#' + syncThreadId
						};
					}
				}
			}
		}

		const newHash = gmailDriver.createLink(viewName, params);
		// Create a fake link and simulate a click event on it to let Gmail handle
		// the view change. If we just set window.location.hash ourselves to the
		// newHash, it's a Gmail hash, and any composes are open, then Gmail will
		// redirect the user to the hash with ?compose=... appended to the end and
		// break the back button. If we try to pre-empt Gmail and add the
		// ?compose=... part ourselves, then sometimes Gmail thinks it's new and
		// actually triggers now composes to open. This fake link method avoids the
		// issue.
		const link = document.createElement('a');
		link.style.display = 'none';
		link.href = newHash;
		((document.body:any):HTMLElement).appendChild(link);
		simulateClick(link);
		link.remove();
	} else {
		const newHash = gmailDriver.createLink(viewName, params);
		// If it's not a gmail view name, then it's probably a hash for a custom
		// view. We need to set the hash ourselves. Gmail won't react at all to a
		// hashchange event for a hash it doesn't recognize, so we don't have to
		// worry about the above issue.
		window.location.hash = newHash;
	}
});

export default gotoView;
