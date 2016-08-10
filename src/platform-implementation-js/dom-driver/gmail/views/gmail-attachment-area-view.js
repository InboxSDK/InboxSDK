/* @flow */
//jshint ignore:start

import _ from 'lodash';
import RSVP from 'rsvp';
import {defn} from 'ud';
import type GmailDriver from '../gmail-driver';
import type GmailMessageView from './gmail-message-view';
import GmailAttachmentCardView from './gmail-attachment-card-view';
import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

const GmailAttachmentAreaView = defn(module, class GmailAttachmentAreaView {
	_element: HTMLElement;
	_messageViewDriver: GmailMessageView;
	_driver: GmailDriver;
	_elsToCardViews: WeakMap<HTMLElement, GmailAttachmentCardView>;

	constructor(element: ?HTMLElement, driver: GmailDriver, messageViewDriver: GmailMessageView) {
		this._driver = driver;
		this._messageViewDriver = messageViewDriver;
		this._elsToCardViews = new WeakMap();
		if(element){
			this._element = element;
		} else {
			this._setupElement();
		}
	}

	destroy() {
		this.getAttachmentCardViews().forEach(view => {
			view.destroy();
		});
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getAttachmentCardViews() {
		const attachments = this._element.querySelectorAll('.aQH > span');
		return _.map(attachments, attachment => {
			let cardView = this._elsToCardViews.get(attachment);
			if (!cardView) {
				cardView = new GmailAttachmentCardView(
					{element: attachment},
					this._driver,
					this._messageViewDriver
				);
				this._elsToCardViews.set(attachment, cardView);
			}
			return cardView;
		});
	}

	_setupElement(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'hq gt a10');

		this._element.innerHTML = [
			'<div class="hp"></div>',
			'<div class="a3I">Attachments area</div>',
			'<div></div>',
			'<div class="aQH">',
				'<div class="aZK"></div>',
			'</div>'
		].join('');
	}

	_createAreaToolbarIfNeeded(): HTMLElement {
		const preexistingToolbar = this._element.querySelector('.ho');
		if (preexistingToolbar) {
			return preexistingToolbar;
		}
		const toolbar = document.createElement('div');
		toolbar.className = 'ho';
		toolbar.innerHTML = `<span class="aVW"><span>${this.getAttachmentCardViews().length}</span> Attachments</span><div class="aZi J-J5-Ji"></div>`;
		this._element.insertBefore(toolbar, this._element.lastElementChild);
		this._element.classList.remove('a10');
		return toolbar;
	}

	_updateToolbarCardCount() {
		const cardCount = this.getAttachmentCardViews().length;
		if (cardCount > 1) {
			const toolbar = this._createAreaToolbarIfNeeded();
			const counter = toolbar.querySelector('.aVW > span');
			counter.textContent = String(cardCount);
		}
	}

	addGmailAttachmentCardView(gmailAttachmentCardView: GmailAttachmentCardView){
		const zone = this._element.querySelector('.aXK, .aQH');
		if (!zone) {
			this._driver.getLogger().error(new Error("Could not find attachment zone"));
			return;
		}
		zone.insertBefore(gmailAttachmentCardView.getElement(), zone.lastElementChild);
		this._updateToolbarCardCount();
	}

	addButtonToDownloadAllArea(options: Object){
		var buttonView = new ButtonView({
			iconClass: 'T-I-J3',
			iconUrl: options.iconUrl,
			tooltip: options.tooltip,
			hasButtonToLeft: true
		});

		buttonView.addClass('aZj');
		buttonView.getElement().children[0].className = 'asa';

		var basicButtonViewController = new BasicButtonViewController({
			activateFunction: () => {
				if(options.onClick){
					options.onClick();
				}
			},
			buttonView: buttonView
		});

		const toolbar = this._createAreaToolbarIfNeeded();
		toolbar.querySelector('.aZi').appendChild(buttonView.getElement());
	}

});

export default GmailAttachmentAreaView;
