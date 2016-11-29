/* @flow */

import _ from 'lodash';
import EventEmitter from '../lib/safe-event-emitter';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import * as ud from 'ud';
import RSVP from 'rsvp';

import ComposeButtonView from './compose-button-view';

import type {Driver} from '../driver-interfaces/driver';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';

const memberMap = ud.defonce(module, ()=>new WeakMap());

// documented in src/docs/
class ComposeView extends EventEmitter {
	destroyed: boolean = false;

	constructor(driver: Driver, composeViewImplementation: ComposeViewDriver, appId: string, composeViewStream: Kefir.Observable<ComposeView>) {
		super();

		const members = {
			driver,
			composeViewImplementation,
			appId,
			composeViewStream
		};
		memberMap.set(this, members);

		this.on('newListener', function(eventName) {
			if (eventName === 'close') {
				driver.getLogger().deprecationWarning('composeView close event', 'composeView destroy event');
			} else if (eventName === 'messageIDChange') {
				driver.getLogger().deprecationWarning(
					'composeView messageIDChange event', 'composeView.getDraftID');
			}
		});

		members.composeViewImplementation.getEventStream().onValue(event => {
			if (event.eventName === 'destroy') {
				this.destroyed = true;
				this.emit('close'); /* TODO: deprecated */
			}
			this.emit(event.eventName, event.data);
		});
	}

	addButton(buttonDescriptor){
		var members = memberMap.get(this);
		var buttonDescriptorStream = kefirCast((Kefir: any), buttonDescriptor);

		var optionsPromise = members.composeViewImplementation.addButton(buttonDescriptorStream, members.appId, {composeView: this});
		return new ComposeButtonView(optionsPromise, members.composeViewImplementation);
	}

	/*
	// Incomplete
	addInnerSidebar(options){
		memberMap.get(this).composeViewImplementation.addInnerSidebar(options);
	}

	// Incomplete
	addOuterSidebar(options){
		memberMap.get(this).composeViewImplementation.addOuterSidebar(options);
	}
	*/

	addStatusBar(statusBarDescriptor) {
		return memberMap.get(this).composeViewImplementation.addStatusBar(statusBarDescriptor);
	}

	addRecipientRow(options){
		return {
			destroy: memberMap.get(this).composeViewImplementation.addRecipientRow(kefirCast((Kefir: any), options))
		};
	}

	close(){
		memberMap.get(this).composeViewImplementation.close();
	}

	send() {
		memberMap.get(this).composeViewImplementation.send();
	}

	getBodyElement(){
		return memberMap.get(this).composeViewImplementation.getBodyElement();
	}

	// NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS
	// TODO remove?
	getComposeID(){
		memberMap.get(this).driver.getLogger().deprecationWarning('composeView.getComposeID');
		return memberMap.get(this).composeViewImplementation.getComposeID();
	}

	getInitialMessageID(){
		return memberMap.get(this).composeViewImplementation.getInitialMessageID();
	}

	/* deprecated */
	getMessageID() {
		memberMap.get(this).driver.getLogger().deprecationWarning(
			'composeView.getMessageID', 'composeView.getDraftID');
		return memberMap.get(this).composeViewImplementation.getMessageID();
	}

	getThreadID() {
		return memberMap.get(this).composeViewImplementation.getThreadID();
	}

	getDraftID() {
		return memberMap.get(this).composeViewImplementation.getDraftID();
	}

	getCurrentDraftID() {
		return memberMap.get(this).composeViewImplementation.getCurrentDraftID();
	}

	getHTMLContent(){
		return memberMap.get(this).composeViewImplementation.getHTMLContent();
	}

	getSelectedBodyHTML(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyHTML() || '';
	}

	getSelectedBodyText(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyText() || '';
	}

	getSubject(){
		return memberMap.get(this).composeViewImplementation.getSubject();
	}

	getTextContent(){
		return memberMap.get(this).composeViewImplementation.getTextContent();
	}

	getToRecipients(){
		return memberMap.get(this).composeViewImplementation.getToRecipients();
	}

	getCcRecipients(){
		return memberMap.get(this).composeViewImplementation.getCcRecipients();
	}

	getBccRecipients(){
		return memberMap.get(this).composeViewImplementation.getBccRecipients();
	}

	insertTextIntoBodyAtCursor(text){
		return memberMap.get(this).composeViewImplementation.insertBodyTextAtCursor(text);
	}

	insertHTMLIntoBodyAtCursor(html){
		return memberMap.get(this).composeViewImplementation.insertBodyHTMLAtCursor(html);
	}

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
	}

	insertLinkIntoBodyAtCursor(text, url){
		return memberMap.get(this).composeViewImplementation.insertLinkIntoBody(text, url);
	}

	isInlineReplyForm(){
		return memberMap.get(this).composeViewImplementation.isInlineReplyForm();
	}

	isFullscreen() {
		return memberMap.get(this).composeViewImplementation.isFullscreen();
	}

	setFullscreen(fullscreen: boolean) {
		memberMap.get(this).composeViewImplementation.setFullscreen(fullscreen);
	}

	isMinimized() {
		return memberMap.get(this).composeViewImplementation.isMinimized();
	}

	setMinimized(minimized: boolean) {
		memberMap.get(this).composeViewImplementation.setMinimized(minimized);
	}

	popOut(): Promise<ComposeView> {
		memberMap.get(this).composeViewImplementation.popOut();
		return memberMap.get(this).composeViewStream.take(1).toPromise(RSVP.Promise);
	}

	isReply(){
		return memberMap.get(this).composeViewImplementation.isReply();
	}

	setToRecipients(emails){
		memberMap.get(this).composeViewImplementation.setToRecipients(emails);
	}

	setCcRecipients(emails){
		memberMap.get(this).composeViewImplementation.setCcRecipients(emails);
	}

	setBccRecipients(emails){
		memberMap.get(this).composeViewImplementation.setBccRecipients(emails);
	}

	getFromContact(): Contact {
		return memberMap.get(this).composeViewImplementation.getFromContact();
	}

	getFromContactChoices(): Contact[] {
		return memberMap.get(this).composeViewImplementation.getFromContactChoices();
	}

	setFromEmail(email: string) {
		memberMap.get(this).composeViewImplementation.setFromEmail(email);
	}

	setSubject(text){
		memberMap.get(this).composeViewImplementation.setSubject(text);
	}

	setBodyHTML(html){
		memberMap.get(this).composeViewImplementation.setBodyHTML(html);
	}

	setBodyText(text){
		memberMap.get(this).composeViewImplementation.setBodyText(text);
	}

	async attachFiles(files): Promise<void> {
		if (files.length === 0) {
			return;
		}
		if (!(files[0] instanceof global.Blob)) {
			throw new Error("parameter must be an array of Blob objects");
		}
		return memberMap.get(this).composeViewImplementation.attachFiles(Array.from(files));
	}

	async attachInlineFiles(files: Blob[]): Promise<void> {
		if (files.length === 0) {
			return;
		}
		if (!(files[0] instanceof global.Blob)) {
			throw new Error("parameter must be an array of Blob objects");
		}
		return memberMap.get(this).composeViewImplementation.attachInlineFiles(Array.from(files));
	}

	// Old alias that we should keep around until we're sure no one is using it.
	dragFilesIntoCompose(files: Blob[]): Promise<void> {
		const driver = memberMap.get(this).driver;
		driver.getLogger().deprecationWarning(
			'ComposeView.dragFilesIntoCompose', 'ComposeView.attachInlineFiles');

		return this.attachInlineFiles(files);
	}

	//NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
	getElement(){
		return memberMap.get(this).composeViewImplementation.getElement();
	}

	registerRequestModifier(modifier){
		memberMap.get(this).composeViewImplementation.registerRequestModifier(modifier);
	}

	// TODO remove
	overrideEditSubject(){
		memberMap.get(this).driver.getLogger().deprecationWarning('composeView.overrideEditSubject');
		const {composeViewImplementation} = memberMap.get(this);
		if (typeof composeViewImplementation.overrideEditSubject === 'function')
			composeViewImplementation.overrideEditSubject();
	}
}

export default ud.defn(module, ComposeView);
