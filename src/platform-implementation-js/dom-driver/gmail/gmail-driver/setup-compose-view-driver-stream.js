/* @flow */
//jshint ignore:start

var Kefir = require('kefir');
var kefirCast = require('kefir-cast');
import kefirWaitFor from '../../../lib/kefir-wait-for';
import type Bacon from 'baconjs';

import dispatchCustomEvent from '../../../lib/dom/dispatch-custom-event';

import makeElementChildStream from '../../../lib/dom/kefir-make-element-child-stream';
import kefirElementViewMapper from '../../../lib/dom/kefir-element-view-mapper';
import makeElementStreamMerger from '../../../lib/dom/make-element-stream-merger';
import GmailElementGetter from '../gmail-element-getter';

import GmailComposeView from '../views/gmail-compose-view';

import Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';

export default function setupComposeViewDriverStream(gmailDriver: GmailDriver, messageViewDriverStream: Kefir.Stream, xhrInterceptorStream: Bacon.Observable): Kefir.Stream<GmailComposeView> {
	return Kefir.fromPromise(
		GmailElementGetter.waitForGmailModeToSettle()
	).flatMap(() => {
		var elementStream;
		var isStandalone = false;

		if (GmailElementGetter.isStandaloneComposeWindow()) {
			elementStream = _setupStandaloneComposeElementStream();
			isStandalone = true;
		} else if (GmailElementGetter.isStandaloneThreadWindow()) {
			elementStream = Kefir.never();
		} else {
			elementStream = _setupStandardComposeElementStream();
		}

		return elementStream.map(kefirElementViewMapper(el => {
			var composeView = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
			composeView.setIsStandalone(isStandalone);

			return composeView;
		}));
	}).merge(
		messageViewDriverStream.flatMap(gmailMessageView =>
			kefirCast(Kefir, gmailMessageView.getReplyElementStream())
				.map(kefirElementViewMapper(el => {
					var view = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
					view.setIsInlineReplyForm(true);
					return view;
				}))
		)
	).flatMap((composeViewDriver:any) =>
		composeViewDriver.ready()
	);
}

function _setupStandardComposeElementStream(): Kefir.Stream {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.getComposeWindowContainer();
	}).flatMap(function(composeGrandParent) {
		var composeParentEl = composeGrandParent.el.querySelector('div.AD');
		if (composeParentEl) {
			return makeElementChildStream(composeParentEl)
					.takeUntilBy(composeGrandParent.removalStream)
					.map(_informElement('composeFullscreenStateChanged'));
		} else {
			return Kefir.never();
		}
	}).merge(
		_waitForContainerAndMonitorChildrenStream(function() {
			return GmailElementGetter.getFullscreenComposeWindowContainer();
		})
		.map(_informElement('composeFullscreenStateChanged'))
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
	return kefirWaitFor(containerFn)
		.flatMap(containerEl => makeElementChildStream(containerEl));
}

function _informElement(eventName) {
	return function(event) {
		var composeEl = event && event.el && event.el.querySelector && event.el.querySelector('[role=dialog]');
		if(composeEl){
			dispatchCustomEvent(composeEl, eventName);
		}
		return event;
	};
}
