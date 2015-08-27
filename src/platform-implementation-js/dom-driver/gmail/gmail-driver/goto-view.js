/* @flow */
//jshint ignore:start

var ud = require('ud');
import getURLObject from './get-url-object';
import type GmailDriver from '../gmail-driver';

var gotoView = ud.defn(module, function gotoView(gmailDriver: GmailDriver, viewName: string, params: ?{[ix: string]: string}) {
	var newHash = gmailDriver.createLink(viewName, params);
	var currentURLObject = getURLObject(location.href);

	// Gmail changes the hash after location changes to re-add the query string
	// and breaks the back button, so we need to work around that.

	var newHashWithQuery = newHash + (currentURLObject.query ? '?' + currentURLObject.query : '');

	window.location.hash = newHashWithQuery;
});

export default gotoView;
