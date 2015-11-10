'use strict';

var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');
var Kefir = require('kefir');
var ud = require('ud');
var kefirCast = require('kefir-cast');
var RSVP = require('rsvp');

var ComposeButtonView = require('./compose-button-view');

var memberMap = ud.defonce(module, ()=>new WeakMap());

// documented in src/docs/
var ComposeView = function(driver, composeViewImplementation, appId, composeViewStream) {
	EventEmitter.call(this);

	var members = {
		driver: driver,
		composeViewImplementation: composeViewImplementation,
		appId: appId,
		composeViewStream: composeViewStream
	};
	memberMap.set(this, members);

	var self = this;

	this.on('newListener', function(eventName) {
		if (eventName === 'close') {
			driver.getLogger().deprecationWarning('composeView close event', 'composeView destroy event');
		} else if (eventName === 'messageIDChange') {
			driver.getLogger().deprecationWarning('composeView messageIDChange event');
		}
	});

	members.composeViewImplementation.getEventStream().onValue(function(event){
		self.emit(event.eventName, event.data);
	});

	members.composeViewImplementation.getStopper().onValue(function(){
		self.emit('close'); /* TODO: deprecated */
	});
};

ComposeView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeView.prototype, {

	addButton(buttonDescriptor){
		var members = memberMap.get(this);
		var buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);

		var optionsPromise = members.composeViewImplementation.addButton(buttonDescriptorStream, members.appId, {composeView: this});
		return new ComposeButtonView(optionsPromise, members.composeViewImplementation);
	},

	/*
	// Incomplete
	addInnerSidebar(options){
		memberMap.get(this).composeViewImplementation.addInnerSidebar(options);
	},

	// Incomplete
	addOuterSidebar(options){
		memberMap.get(this).composeViewImplementation.addOuterSidebar(options);
	},
	*/

	addStatusBar(statusBarDescriptor) {
		return memberMap.get(this).composeViewImplementation.addStatusBar(statusBarDescriptor);
	},

	addRecipientRow(options){
		return {
			destroy: memberMap.get(this).composeViewImplementation.addRecipientRow(kefirCast(Kefir, options))
		};
	},

	close(){
		memberMap.get(this).composeViewImplementation.close();
	},

	send() {
		memberMap.get(this).composeViewImplementation.send();
	},

	getBodyElement(){
		return memberMap.get(this).composeViewImplementation.getBodyElement();
	},

	// NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS
	// TODO remove?
	getComposeID(){
		memberMap.get(this).driver.getLogger().deprecationWarning('composeView.getComposeID');
		return memberMap.get(this).composeViewImplementation.getComposeID();
	},

	getInitialMessageID(){
		return memberMap.get(this).composeViewImplementation.getInitialMessageID();
	},

	/* deprecated */
	getMessageID() {
		memberMap.get(this).driver.getLogger().deprecationWarning('composeView.getMessageID');
		return memberMap.get(this).composeViewImplementation.getMessageID();
	},

	getThreadID() {
		return memberMap.get(this).composeViewImplementation.getThreadID();
	},

	getHTMLContent(){
		return memberMap.get(this).composeViewImplementation.getHTMLContent();
	},

	getSelectedBodyHTML(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyHTML() || '';
	},

	getSelectedBodyText(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyText() || '';
	},

	getSubject(){
		return memberMap.get(this).composeViewImplementation.getSubject();
	},

	getTextContent(){
		return memberMap.get(this).composeViewImplementation.getTextContent();
	},

	getToRecipients(){
		return memberMap.get(this).composeViewImplementation.getToRecipients();
	},

	getCcRecipients(){
		return memberMap.get(this).composeViewImplementation.getCcRecipients();
	},

	getBccRecipients(){
		return memberMap.get(this).composeViewImplementation.getBccRecipients();
	},

	insertTextIntoBodyAtCursor(text){
		return memberMap.get(this).composeViewImplementation.insertBodyTextAtCursor(text);
	},

	insertHTMLIntoBodyAtCursor(html){
		return memberMap.get(this).composeViewImplementation.insertBodyHTMLAtCursor(html);
	},

	insertLinkChipIntoBodyAtCursor(text, url, iconUrl){
		if(!iconUrl || typeof iconUrl !== 'string' || iconUrl.indexOf('http') !== 0){
			console.warn('You must provide a publicly accessible iconUrl');
			return;
		}

		return memberMap.get(this).composeViewImplementation.insertLinkChipIntoBody({
			text: text,
			url: url,
			iconUrl: iconUrl
		});
	},

	insertLinkIntoBodyAtCursor(text, url){
		return memberMap.get(this).composeViewImplementation.insertLinkIntoBody(text, url);
	},

	isInlineReplyForm(){
		return memberMap.get(this).composeViewImplementation.isInlineReplyForm();
	},

	popOut() {
		memberMap.get(this).composeViewImplementation.popOut();
		return memberMap.get(this).composeViewStream.take(1).toPromise(RSVP.Promise);
	},

	isReply(){
		return memberMap.get(this).composeViewImplementation.isReply();
	},

	setToRecipients(emails){
		memberMap.get(this).composeViewImplementation.setToRecipients(emails);
	},

	setCcRecipients(emails){
		memberMap.get(this).composeViewImplementation.setCcRecipients(emails);
	},

	setBccRecipients(emails){
		memberMap.get(this).composeViewImplementation.setBccRecipients(emails);
	},

	getFromContact() {
		return memberMap.get(this).composeViewImplementation.getFromContact();
	},

	getFromContactChoices() {
		return memberMap.get(this).composeViewImplementation.getFromContactChoices();
	},

	setFromEmail(email) {
		memberMap.get(this).composeViewImplementation.setFromEmail(email);
	},

	setSubject(text){
		memberMap.get(this).composeViewImplementation.setSubject(text);
	},

	setBodyHTML(html){
		memberMap.get(this).composeViewImplementation.setBodyHTML(html);
	},

	setBodyText(text){
		memberMap.get(this).composeViewImplementation.setBodyText(text);
	},

	//NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
	getElement(){
		return memberMap.get(this).composeViewImplementation.getElement();
	},

	registerRequestModifier(modifier){
		memberMap.get(this).composeViewImplementation.registerRequestModifier(modifier);
	}

});

ComposeView = ud.defn(module, ComposeView);

module.exports = ComposeView;
