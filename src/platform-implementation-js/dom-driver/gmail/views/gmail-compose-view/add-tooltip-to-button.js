'use strict';

var GmailTooltipView = require('../../widgets/gmail-tooltip-view');

function addTooltipToButton(gmailComposeView, buttonViewController, buttonDescriptor, tooltipDescriptor){

	var gmailTooltipView = new GmailTooltipView(tooltipDescriptor);

	document.body.appendChild(gmailTooltipView.getElement());

	_anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	gmailComposeView.getEventStream()
					.takeUntil(gmailTooltipView.getEventStream().filter(false).mapEnd())
					.filter(function(event){
						return event.eventName === 'buttonAdded';
					})
					.onValue(_anchorTooltip, gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

}

function _anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor){
	gmailComposeView.ensureGroupingIsOpen(buttonDescriptor.type);
	gmailTooltipView.anchor(buttonViewController.getView().getElement());
}


module.exports = addTooltipToButton;
