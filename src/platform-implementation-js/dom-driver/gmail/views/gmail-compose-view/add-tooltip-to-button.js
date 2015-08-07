/* @flow */
//jshint ignore:start

import * as Bacon from 'baconjs';
var Kefir = require('kefir');
import kefirCast from 'kefir-cast';
import Logger from '../../../../lib/logger';

import GmailTooltipView from '../../widgets/gmail-tooltip-view';
import type GmailComposeView from '../gmail-compose-view';

export type TooltipButtonDescriptor = {
	type: string
};

export type TooltipDescriptor = {
	el?: HTMLElement,
	title?: string,
	subtitle?: string,
	imageUrl?: string,
	button?: {onClick?: Function}&Object
};

export default function addTooltipToButton(gmailComposeView: GmailComposeView, buttonViewController: Object, buttonDescriptor: TooltipButtonDescriptor, tooltipDescriptor: TooltipDescriptor): GmailTooltipView {

	var gmailTooltipView = new GmailTooltipView(tooltipDescriptor);
	var tooltipStopperStream: Bacon.Observable = gmailTooltipView.getEventStream().filter(false).mapEnd();

	document.body.appendChild(gmailTooltipView.getElement());

	_anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	gmailComposeView.getEventStream()
					.filter(function(event){
						return event.eventName === 'buttonAdded' || event.eventName === 'composeFullscreenStateChanged';
					})
					.merge(
						kefirCast(Kefir, gmailTooltipView.getEventStream())
							.filter(({eventName}) => eventName === 'imageLoaded')
					)
					.debounce(10)
					.takeUntilBy(kefirCast(Kefir, tooltipStopperStream))
					.onValue(_anchorTooltip.bind(null, gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor));

	buttonViewController
		.getView()
		.getEventStream()
		.takeUntil(tooltipStopperStream)
		.filter(function(event){
			return event.eventName === 'click';
		})
		.onValue(gmailTooltipView.destroy.bind(gmailTooltipView));

	var stoppedIntervalStream = Kefir.interval(50).takeUntilBy(gmailTooltipView.getStopper());

	var left = 0;
	var top = 0;

	stoppedIntervalStream
			.takeWhile(() =>
				!!buttonViewController.getView() && !!gmailTooltipView.getElement()
			)
			.map(() =>
				buttonViewController.getView().getElement().getBoundingClientRect()
			)
			.filter(rect =>
				rect.left !== left || rect.top !== top
			)
			.map(rect => {
				left = rect.left;
				top = rect.top;
				return rect;
			})
			.onValue(gmailTooltipView.anchor.bind(gmailTooltipView, buttonViewController.getView().getElement(), {position: 'top'}));

	stoppedIntervalStream
		.filter(() =>
			!buttonViewController.getView() || !buttonViewController.getView().getElement().offsetParent
		)
		.onValue(gmailTooltipView.destroy.bind(gmailTooltipView));

	return gmailTooltipView;
}

function _anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor){
	try{
		gmailComposeView.ensureGroupingIsOpen(buttonDescriptor.type);
		setTimeout(function(){
			gmailTooltipView.anchor(buttonViewController.getView().getElement(), {position: 'top'});
		}, 10);
	}
	catch(err){
		Logger.error(err);
	}
}
