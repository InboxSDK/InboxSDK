/* @flow */
//jshint ignore:start

import _ from 'lodash';
import RSVP from 'rsvp';
import {defn} from 'ud';
import type GmailDriver from '../gmail-driver';
import GmailAttachmentCardView from './gmail-attachment-card-view';
import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

const GmailAttachmentAreaView = defn(module, class GmailAttachmentAreaView {
	_element: HTMLElement;
	_driver: GmailDriver;
	_attachmentCardViews: Array<Object>;

	constructor(element: ?HTMLElement, driver: GmailDriver) {
		this._driver = driver;
		if(element){
			this._element = element;
		} else {
			this._setupElement();
		}
		this._setupAttachmentCardViews();
	}

	destroy() {
		this._attachmentCardViews.forEach(view => {
			view.destroy();
		});
		this._attachmentCardViews.length = 0;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getAttachmentCardViews(): Array<Object> {
		return this._attachmentCardViews;
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

	_setupAttachmentCardViews(){
		const attachments = this._element.querySelectorAll('.aQH > span');
		this._attachmentCardViews = Array.prototype.map.call(attachments, attachment =>
			new GmailAttachmentCardView({element: attachment}, this._driver)
		);
	}

	addGmailAttachmentCardView(gmailAttachmentCardView: GmailAttachmentCardView){
		const zone = this._element.querySelector('.aXK, .aQH');
		if (zone) {
			zone.insertBefore(gmailAttachmentCardView.getElement(), zone.lastChild);
		} else {
			this._driver.getLogger().error(new Error("Could not find attachment zone"));
		}
	}

	addButtonToDownloadAllArea(options: Object){
		if(!this._element.querySelector('.aZi')){
			return;
		}

		var buttonView = new ButtonView({
			iconClass: 'T-I-J3',
			iconUrl: options.iconUrl,
			tooltip: options.tooltip,
			hasButtonToLeft: true
		});

		buttonView.addClass('aZj');
		buttonView.getElement().children[0].setAttribute('class', 'asa');

		var self = this;
		var basicButtonViewController = new BasicButtonViewController({
			activateFunction: function(){
				if(options.onClick){
					options.onClick(self.getAttachmentCardViews());
				}
			},
			buttonView: buttonView
		});

		this._element.querySelector('.aZi').appendChild(buttonView.getElement());
	}

});

export default GmailAttachmentAreaView;
