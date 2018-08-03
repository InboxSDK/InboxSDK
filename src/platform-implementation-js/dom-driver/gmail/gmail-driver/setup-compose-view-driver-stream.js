/* @flow */

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

export default function setupComposeViewDriverStream(gmailDriver: GmailDriver, messageViewDriverStream: Kefir.Observable<GmailMessageView>, xhrInterceptorStream: Kefir.Observable<Object>): Kefir.Observable<GmailComposeView> {
	return impStream.flatMapLatest(imp =>
		imp(gmailDriver, messageViewDriverStream, xhrInterceptorStream));
}

function imp(gmailDriver: GmailDriver, messageViewDriverStream: Kefir.Observable<GmailMessageView>, xhrInterceptorStream: Kefir.Observable<Object>): Kefir.Observable<GmailComposeView> {
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

		return elementStream.map(elementViewMapper(el =>
			new GmailComposeView(el, xhrInterceptorStream, gmailDriver, {
				isStandalone,
				isInlineReplyForm: false
			})
		));
	}).merge(
		messageViewDriverStream.flatMap(gmailMessageView =>
			gmailMessageView.getReplyElementStream()
				.map(elementViewMapper(el =>
					new GmailComposeView(el, xhrInterceptorStream, gmailDriver, {
						isStandalone: false,
						isInlineReplyForm: true
					})
				))
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
		GmailElementGetter.getFullscreenComposeWindowContainerStream()
			.flatMap(({el, removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
			.map(_informElement('composeFullscreenStateChanged'))
			.map(({el, removalStream}) => {
				// If you close a fullscreen compose while it's still saving, Gmail never
				// removes it from the DOM, and instead only removes a specific child
				// element. Ugh. Watch for its removal too.
				const targetEl = el.querySelector('[role=dialog] div.aaZ');
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
	).flatMap(event => {
		if (!event) throw new Error("Should not happen");
		const el = event.el.querySelector('[role=dialog]');
		if (!el || !el.querySelector('form')) {
			return Kefir.never();
		}
		return Kefir.constant({
			el, removalStream: event.removalStream
		});
	}).flatMap(makeElementStreamMerger());
}

function _setupStandaloneComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(() =>
		GmailElementGetter.StandaloneCompose.getComposeWindowContainer()
	);
}

function _waitForContainerAndMonitorChildrenStream(containerFn: () => ?HTMLElement) {
	return Kefir.interval(2000) // TODO replace this with page-parser-tree
		.map(containerFn)
		.filter()
		.take(1)
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
