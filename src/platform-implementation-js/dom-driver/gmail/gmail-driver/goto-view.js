/* @flow */
//jshint ignore:start

var ud = require('ud');
import simulateClick from '../../../lib/dom/simulate-click';
import getURLObject from './get-url-object';
import type GmailDriver from '../gmail-driver';

var gotoView = ud.defn(module, function gotoView(gmailDriver: GmailDriver, viewName: string, params: ?{[ix: string]: string}) {
	var newHash = gmailDriver.createLink(viewName, params);
	var currentURLObject = getURLObject(location.href);

	var startHash = window.location.hash;

	// Create a fake link and simulate a click event on it to let Gmail handle
	// the view change. If we just set window.location.hash ourselves to the
	// newHash, it's a Gmail hash, and any composes are open, then Gmail will
	// redirect the user to the hash with ?compose=... appended to the end and
	// break the back button. If we try to pre-empt Gmail and add the
	// ?compose=... part ourselves, then sometimes Gmail thinks it's new and
	// actually triggers now composes to open. This fake link method avoids the
	// issue.
	var link = document.createElement('a');
	link.style.display = 'none';
	link.href = newHash;
	document.body.appendChild(link);
	simulateClick(link);
	(link:any).remove();

	// If Gmail didn't respond to the fake click, then that's because it's not a
	// Gmail hash and is instead a hash for a custom view. We need to set the
	// hash ourselves. Gmail won't react at all to a hashchange event for a hash
	// it doesn't recognize, so we don't have to worry about the above issue.
	if (window.location.hash === startHash) {
		window.location.hash = newHash;
	}
});

export default gotoView;
