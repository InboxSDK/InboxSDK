/* @flow */
//jshint ignore:start

import Bacon from 'baconjs';
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

export default function addTooltipToButton(gmailComposeView: GmailComposeView, buttonViewController: Object, buttonDescriptor: TooltipButtonDescriptor, tooltipDescriptor: TooltipDescriptor){

	var gmailTooltipView = new GmailTooltipView(tooltipDescriptor);
	var tooltipStopperStream = gmailTooltipView.getEventStream().filter(false).mapEnd();

	document.body.appendChild(gmailTooltipView.getElement());

	_anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	gmailComposeView.getEventStream()
					.takeUntil(tooltipStopperStream)
					.filter(function(event){
						return event.eventName === 'buttonAdded' || event.eventName === 'composeFullscreenStateChanged';
					})
					.merge(
						gmailTooltipView
							.getEventStream()
							.filter(({eventName}) => eventName === 'imageLoaded')
					)
					.debounce(10)
					.onValue(_anchorTooltip, gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	buttonViewController
		.getView()
		.getEventStream()
		.takeUntil(tooltipStopperStream)
		.filter(function(event){
			return event.eventName === 'click';
		})
		.onValue(gmailTooltipView, 'destroy');


	var stoppedIntervalStream = Bacon.interval(50).takeUntil(gmailTooltipView.getEventStream().filter(false).mapEnd());

	var left = 0;
	var top = 0;

	stoppedIntervalStream
			.takeWhile(function(){
				return !!buttonViewController.getView() && !!gmailTooltipView.getElement();
			})
			.map(function(){
				return buttonViewController.getView().getElement().getBoundingClientRect();
			})
			.filter(function(rect){
				return rect.left !== left || rect.top !== top;
			})
			.doAction(function(rect){
				left = rect.left;
				top = rect.top;
			})
			.onValue(gmailTooltipView, 'anchor', buttonViewController.getView().getElement(), {position: 'top'});


	stoppedIntervalStream
		.filter(function(){
			return !buttonViewController.getView() || !buttonViewController.getView().getElement().offsetParent;
		})
		.onValue(gmailTooltipView, 'destroy');


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
