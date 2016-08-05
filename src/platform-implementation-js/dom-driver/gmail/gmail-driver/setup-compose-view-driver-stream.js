/* @flow */
//jshint ignore:start

import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import streamWaitFor from '../../../lib/stream-wait-for';

import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import elementViewMapper from '../../../lib/dom/element-view-mapper';
import makeElementStreamMerger from '../../../lib/dom/make-element-stream-merger';
import GmailElementGetter from '../gmail-element-getter';

import GmailComposeView from '../views/gmail-compose-view';
import type GmailMessageView from '../views/gmail-message-view';

import Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';

var impStream = udKefir(module, imp);

export default function setupComposeViewDriverStream(gmailDriver: GmailDriver, messageViewDriverStream: Kefir.Stream<GmailMessageView>, xhrInterceptorStream: Kefir.Stream<Object>): Kefir.Stream<GmailComposeView> {
	return impStream.flatMapLatest(imp =>
		imp(gmailDriver, messageViewDriverStream, xhrInterceptorStream));
}

function imp(gmailDriver: GmailDriver, messageViewDriverStream: Kefir.Stream<GmailMessageView>, xhrInterceptorStream: Kefir.Stream<Object>): Kefir.Stream<GmailComposeView> {
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

		return elementStream.map(elementViewMapper(el => {
			var composeView = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
			composeView.setIsStandalone(isStandalone);

			return composeView;
		}));
	}).merge(
		messageViewDriverStream.flatMap(gmailMessageView =>
			gmailMessageView.getReplyElementStream()
				.map(elementViewMapper(el => {
					var view = new GmailComposeView(el, xhrInterceptorStream, gmailDriver);
					view.setIsInlineReplyForm(true);
					return view;
				}))
		)
	).flatMap((composeViewDriver:any) =>
		composeViewDriver.ready()
	);
}


function _setupStandardComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(() =>
		GmailElementGetter.getComposeWindowContainer()
	).flatMap(composeGrandParent => {
		var composeParentEl = composeGrandParent.el.querySelector('div.AD');
		if (composeParentEl) {
			return makeElementChildStream(composeParentEl)
				.takeUntilBy(composeGrandParent.removalStream)
				.map(_informElement('composeFullscreenStateChanged'));
		} else {
			return Kefir.never();
		}
	}).merge(
		_waitForContainerAndMonitorChildrenStream(() =>
			GmailElementGetter.getFullscreenComposeWindowContainer()
		)
		.map(_informElement('composeFullscreenStateChanged'))
		.map(({el, removalStream}) => {
			// If you close a fullscreen compose while it's still saving, Gmail never
			// removes it from the DOM, and instead only removes a specific child
			// element. Ugh. Watch for its removal too.
			var targetEl = el.querySelector('[role=dialog] div.aaZ');
			if (!targetEl) return null;
			var hiddenStream = kefirMakeMutationObserverChunkedStream(
					targetEl, {childList: true}
				)
				.filter(() => targetEl.childElementCount === 0)
				.map(() => null);
			return {
				el, removalStream: removalStream.merge(hiddenStream).take(1)
			};
		})
		.filter(Boolean)
	).map(event => {
		if (!event) throw new Error("Should not happen");
		return {
			removalStream: event.removalStream,
			el: event.el.querySelector('[role=dialog]')
		};
	}).filter(event =>
		event && event.el && event.el.querySelector('form')
	).flatMap(makeElementStreamMerger());
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

function _informElement(eventName) {
	return function(event) {
		const composeEl = event && event.el && event.el.querySelector && event.el.querySelector('[role=dialog]');
		if(composeEl){
			composeEl.dispatchEvent(new CustomEvent(eventName, {
				bubbles: false, cancelable: false, detail: null
			}));
		}
		return event;
	};
}
