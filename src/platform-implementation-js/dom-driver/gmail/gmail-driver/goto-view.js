/* @flow */
//jshint ignore:start

var ud = require('ud');
import simulateClick from '../../../lib/dom/simulate-click';
import getURLObject from './get-url-object';
import type GmailDriver from '../gmail-driver';

var gotoView = ud.defn(module, function gotoView(gmailDriver: GmailDriver, viewName: string, params: ?{[ix: string]: string}) {
	console.log('gotoView', viewName, params);
	var newHash = gmailDriver.createLink(viewName, params);
	var currentURLObject = getURLObject(location.href);

	var startHash = window.location.hash;

	var link = document.createElement('a');
	link.style.display = 'none';
	link.href = newHash;
	document.body.appendChild(link);
	simulateClick(link);
	(link:any).remove();

	if (window.location.hash === startHash) {
		window.location.hash = newHash;
	}
});

export default gotoView;
