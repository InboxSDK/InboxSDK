/* @flow */

import once from 'lodash/once';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import makeElementChildStream from '../../lib/dom/make-element-child-stream';
import type {ElementWithLifetime} from '../../lib/dom/make-element-child-stream';
import querySelector from '../../lib/dom/querySelectorOrFail';
import {defobj} from 'ud';
import waitForGmailModeToSettle from './gmail-element-getter/wait-for-gmail-mode-to-settle';

import getMainContentElementChangedStream from './gmail-element-getter/get-main-content-element-changed-stream';

// TODO Figure out if these functions can and should be able to return null
const GmailElementGetter = {

	waitForGmailModeToSettle(): Promise<void> {
		return waitForGmailModeToSettle().toPromise(RSVP.Promise);
	},

	getMainContentElementChangedStream: once(function(){
		return getMainContentElementChangedStream(this);
	}),

	isStandalone(): boolean {
		return GmailElementGetter.isStandaloneComposeWindow() || GmailElementGetter.isStandaloneThreadWindow();
	},

	isStandaloneComposeWindow(): boolean {
		return ((document.body:any):HTMLElement).classList.contains('xE') && ((document.body:any):HTMLElement).classList.contains('xp');
	},

	isStandaloneThreadWindow(): boolean {
		return ((document.body:any):HTMLElement).classList.contains('aAU') && ((document.body:any):HTMLElement).classList.contains('xE') && ((document.body:any):HTMLElement).classList.contains('Su');
	},

	getComposeWindowContainer(): ?HTMLElement {
		return document.querySelector('.dw .nH > .nH > .no');
	},

	getFullscreenComposeWindowContainerStream(): Kefir.Observable<ElementWithLifetime> {
		if (!document.body) throw new Error();
		return makeElementChildStream(document.body)
			.filter(({el}) => el.classList.contains('aSs'))
			.flatMap(({el, removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
			.filter(({el}) => el.classList.contains('aSt'));
	},

	getFullscreenComposeWindowContainer(): ?HTMLElement {
		return document.querySelector('.aSs .aSt');
	},

	getContentSectionElement(): ?HTMLElement {
		var leftNavContainer = GmailElementGetter.getLeftNavContainerElement();
		if(leftNavContainer){
			return (leftNavContainer.nextElementSibling:any).children[0];
		}
		else{
			return null;
		}
	},

	getMainContentContainer(): ?HTMLElement {
		// This method used to just look for the div[role=main] element and then
		// return its parent, but it turns out the Contacts page does not set
		// role=main.
		return document.querySelector('div.aeF > div.nH');
	},

	getMoleParent(): ?HTMLElement {
		return ((document.body:any):HTMLElement).querySelector('.dw .nH > .nH > .no');
	},

	isPreviewPane(): boolean {
		return !!document.querySelector('.aia');
	},

	getRowListElements(): HTMLElement[] {
		return Array.from(document.querySelectorAll('[gh=tl]'));
	},

	getSearchInput(): ?HTMLInputElement {
		const classicUIInput = ((document.getElementById('gbqfq'): any): ?HTMLInputElement);
		const materialUIInput = ((document.querySelector('form[role=search] input'): any): ?HTMLInputElement);
		return classicUIInput || materialUIInput;
	},

	getSearchSuggestionsBoxParent(): ?HTMLElement {
		return document.querySelector('table.gstl_50 > tbody > tr > td.gssb_e');
	},

	getToolbarElement(): HTMLElement {
		return querySelector(document, '[gh=tm]');
	},

	getThreadContainerElement(): ?HTMLElement {
		return document.querySelector('[role=main] .g.id table.Bs > tr');
	},

	getThreadBackButton(): ?HTMLElement {
		let toolbarElement;
		try {
			toolbarElement = GmailElementGetter.getToolbarElement();
		} catch(err) {
			return null;
		}

		return toolbarElement.querySelector('.lS');
	},

	getSidebarContainerElement(): ?HTMLElement {
		return document.querySelector('[role=main] table.Bs > tr .y3');
	},

	getComposeButton(): ?HTMLElement {
		return document.querySelector('[gh=cm]');
	},

	getLeftNavContainerElement(): ?HTMLElement {
		return document.querySelector('.aeN');
	},

	getAddonSidebarContainerElement(): ?HTMLElement {
		return document.querySelector('.no > .nn.bnl');
	},

	getCompanionSidebarContentContainerElement(): ?HTMLElement {
		return document.querySelector('.brC-brG');
	},

	getCompanionSidebarIconContainerElement(): ?HTMLElement {
		return document.querySelector('.brC-aT5-aOt-Jw');
	},

	getMainContentBodyContainerElement(): ?HTMLElement {
		return document.querySelector('.no > .nn.bkK');
	},

	getGtalkButtons(): ?HTMLElement {
		return document.querySelector('.aeN .aj5.J-KU-Jg');
	},

	getNavItemMenuInjectionContainer(): ?HTMLElement {
		return document.querySelector('.aeN .n3');
	},

	getActiveMoreMenu(): ?HTMLElement {
		var elements = document.querySelectorAll('.J-M.aX0.aYO.jQjAxd');

		for(var ii=0; ii<elements.length; ii++){
			if(elements[ii].style.display !== 'none'){
				return elements[ii];
			}
		}

		return null;
	},

	getTopAccountContainer(): ?HTMLElement {
		if (this.isUsingMaterialUI()) {
			return document.querySelector('header[role="banner"] > div:nth-child(2) > div:nth-child(3)');
		}

		var gPlusMenu = document.getElementById('gbsfw');
		if(!gPlusMenu){
			return null;
		}

		return (gPlusMenu:any).parentElement.parentElement;
	},

	isGplusEnabled(): boolean {
		var topAccountContainer = GmailElementGetter.getTopAccountContainer();
		if(!topAccountContainer){
			return false;
		}

		return topAccountContainer.querySelectorAll('a[href*="https://plus"][href*="upgrade"]').length === 0;
	},

	isUsingMaterialUI(): boolean {
		const s = (document.head:any).getAttribute('data-inboxsdk-using-material-ui');
    if (s == null) throw new Error('Failed to read value');
    return s === 'true';
	},

	StandaloneCompose: {
		getComposeWindowContainer(): ?HTMLElement {
			return document.querySelector('[role=main]');
		}
	}

};

export default defobj(module, GmailElementGetter);
