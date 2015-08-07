/* @flow */
//jshint ignore:start

var Bacon = require('baconjs');
import baconCast from 'bacon-cast';
import streamWaitFor from '../../../lib/stream-wait-for';

import dispatchCustomEvent from '../../../lib/dom/dispatch-custom-event';

import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import makeElementViewStream from '../../../lib/dom/make-element-view-stream';
import makeElementStreamMerger from '../../../lib/dom/make-element-stream-merger';
import GmailElementGetter from '../gmail-element-getter';

import GmailComposeView from '../views/gmail-compose-view';

import Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';

export default function setupComposeViewDriverStream(gmailDriver: GmailDriver, messageViewDriverStream: Bacon.Observable, xhrInterceptorStream: Bacon.Observable){
	return Bacon.fromPromise(
		GmailElementGetter.waitForGmailModeToSettle()
	).flatMap(function() {
		var elementStream;
		var isStandalone = false;

		if (GmailElementGetter.isStandaloneComposeWindow()) {
			elementStream = _setupStandaloneComposeElementStream();
			isStandalone = true;
		} else if (GmailElementGetter.isStandaloneThreadWindow()) {
			elementStream = Bacon.never();
		} else {
			elementStream = _setupStandardComposeElementStream();
		}

		return elementStream.flatMap(makeElementViewStream(function(el) {
			var composeView = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
			composeView.setIsStandalone(isStandalone);

			return composeView;
		}));
	}).merge(
		messageViewDriverStream.flatMap(function(gmailMessageView){
			return gmailMessageView.getReplyElementStream().flatMap(makeElementViewStream(function(el) {
				var view = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
				view.setIsInlineReplyForm(true);
				return view;
			}));
		})
	).flatMap(composeViewDriver => {
		return baconCast(Bacon, composeViewDriver.ready());
	});
}

function _setupStandardComposeElementStream(): Bacon.Observable {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.getComposeWindowContainer();
	}).flatMap(function(composeGrandParent) {
		var composeParentEl = composeGrandParent.el.querySelector('div.AD');
		if (composeParentEl) {
			return makeElementChildStream(composeParentEl)
					.takeUntil(composeGrandParent.removalStream)
					.doAction(_informElement('composeFullscreenStateChanged'));
		} else {
			return Bacon.never();
		}
	}).merge(
		_waitForContainerAndMonitorChildrenStream(function() {
			return GmailElementGetter.getFullscreenComposeWindowContainer();
		})
		.doAction(_informElement('composeFullscreenStateChanged'))
	).map(function(event) {
		return {
			removalStream: event.removalStream,
			el: event.el.querySelector('[role=dialog]')
		};
	}).filter(function(event) {
		return Boolean(event && event.el && event.el.querySelector('form'));
	}).flatMap(makeElementStreamMerger());
}

function _setupStandaloneComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(() =>
		GmailElementGetter.StandaloneCompose.getComposeWindowContainer()
	);
}

function _waitForContainerAndMonitorChildrenStream(containerFn) {
	return streamWaitFor(containerFn)
		.flatMap(containerEl => makeElementChildStream(containerEl));
}

function _informElement(eventName){
	return function(event){
		var composeEl = event && event.el && event.el.querySelector && event.el.querySelector('[role=dialog]');
		if(composeEl){
			dispatchCustomEvent(composeEl, eventName);
		}
	};
}
