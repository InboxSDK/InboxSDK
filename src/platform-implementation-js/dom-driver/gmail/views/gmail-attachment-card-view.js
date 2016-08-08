/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import RSVP from 'rsvp';
import util from 'util';
import autoHtml from 'auto-html';
import {defn} from 'ud';
import type GmailDriver from '../gmail-driver';

import type GmailMessageView from './gmail-message-view';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

import simulateClick from '../../../lib/dom/simulate-click';
import waitFor from '../../../lib/wait-for';
import streamWaitFor from '../../../lib/stream-wait-for';

class GmailAttachmentCardView {
	_element: HTMLElement;
	_driver: GmailDriver;
	_messageViewDriver: ?GmailMessageView;
	_cachedType: any;
	_stopper: Kefir.Stream<null>&{destroy():void} = kefirStopper();
	_previewClicks = Kefir.pool();

	constructor(options: Object, driver: GmailDriver, messageViewDriver: ?GmailMessageView) {
		this._driver = driver;
		this._messageViewDriver = messageViewDriver;

		if(options.element){
			this._element = options.element;
		}
		else{
			this._createNewElement(options);
		}
	}

	destroy() {
		this._stopper.destroy();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getMessageViewDriver() {
		return this._messageViewDriver;
	}

	getStopper(): Kefir.Stream<null> {
		return this._stopper;
	}

	getPreviewClicks(): Kefir.Stream<Event> {
		return this._previewClicks.takeUntilBy(this._stopper);
	}

	_isStandardAttachment(): boolean {
		return this.getAttachmentType() === 'FILE';
	}

	getAttachmentType(): string {
		if (this._cachedType) {
			return this._cachedType;
		}
		const type = this._readAttachmentType();
		if (type !== 'UNLOADED') {
			this._cachedType = type;
		}
		return type;
	}

	_readAttachmentType(): string {
		if (this._element.classList.contains('inboxsdk__attachmentCard')) {
			return 'CUSTOM';
		}
		// FILE attachment cards are never in unloaded state.
		if (this._element.children.length === 1 && this._element.children[0].children.length === 0) {
			return 'UNLOADED';
		}
		const link = this._getDownloadLink();
		if (!link || link.match(/^https?:\/\/mail\.google\.com\//)) {
			// Only files and unloaded ever lack a link.
			return 'FILE';
		}
		if (link.match(/^https?:\/\/([^\/]*\.)?google(usercontent)?\.com\//)) {
			return 'DRIVE';
		}
		return 'UNKNOWN';
	}

	addButton(options: Object) {
		var buttonView = new ButtonView({
			iconUrl: options.iconUrl,
			tooltip: options.tooltip
		});

		var basicButtonViewController = new BasicButtonViewController({
			activateFunction: function(){
				if(options.onClick){
					options.onClick();
				}
			},
			buttonView: buttonView
		});

		this._addButton(buttonView);
	}

	getTitle(): string {
		const title = this._element.querySelector('span .aV3');
		return title ? title.textContent : "";
	}

	_getDownloadLink(): ?string {
		const download_url = this._element.getAttribute('download_url');
		if (download_url) {
			const m = /:(https:\/\/[^:]+)/.exec(download_url);
			return m ? m[1] : null;
		}
		// download_url attribute may not be available yet. Use the a link href.
		const firstChild: ?HTMLAnchorElement = (this._element.firstElementChild: any);
		if (!firstChild) throw new Error("Failed to find link");
		if (firstChild.tagName !== 'A') return null;
		return firstChild.href;
	}

	// Resolves the short-lived cookie-less download URL
	getDownloadURL(): Promise<?string> {
		return RSVP.Promise.resolve().then(() => {
			if (this._isStandardAttachment()) {
				return waitFor(() => this._getDownloadLink()).then(downloadUrl => {
					if (!downloadUrl) return null;
					return this._driver.resolveUrlRedirects(downloadUrl);
				});
			} else {
				const downloadButton = this._element.querySelector('[data-inboxsdk-download-url]');
				return downloadButton ?
					downloadButton.getAttribute('data-inboxsdk-download-url') : null;
			}
		});
	}

	_extractFileNameFromElement(): string {
		return this._element.querySelector('.aQA > span').textContent;
	}

	_createNewElement(options: Object) {
		this._element = document.createElement('span');
		this._element.classList.add('aZo');
		this._element.classList.add('inboxsdk__attachmentCard');

		var htmlArray = [autoHtml `
			<a target="_blank" role="link" class="aQy e" href="">
				<div aria-hidden="true">
					<div class="aSG"></div>
					<div class="aVY aZn">
						<div class="aZm"></div>
					</div>
					<div class="aSH">`
		];

		if(options.iconThumbnailUrl){
			htmlArray = htmlArray.concat([autoHtml `
				<div class="aYv">
					<img class="aZG aYw" src="${options.iconThumbnailUrl}">
				</div>`
			]);
		}
		else{
			htmlArray = htmlArray.concat([autoHtml `
				<img class="aQG aYB inboxsdk__attachmentCard_previewThumbnailUrl"
					src="${options.previewThumbnailUrl}">`
			]);
		}

		htmlArray = htmlArray.concat([autoHtml `
			<div class="aYy">
				<div class="aYA">
					<img class="aSM" src="${options.fileIconImageUrl}">
				</div>
				<div class="aYz">
					<div class="a12">
						<div class="aQA">
							<span class="aV3 a6U"></span>
						</div>
						<div class="aYp">
							<span class="SaH2Ve"></span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="aSI">
			<div class="aSJ"></div>
		</div>
	</div>
</a>
<div class="aQw"></div>`
		]);

		this._element.innerHTML = htmlArray.join('');

		(this._element.children[0]:any).href = options.previewUrl;

		if(options.mimeType && options.mimeType.split('/')[0] === 'image'){
			this._element.children[0].classList.add('aZI');
		}


		this._element.querySelector('span .aV3').textContent = options.title;
		this._element.querySelector('div.aYp > span').textContent = options.description || '';
		this._element.querySelector('div.aSJ').style.borderColor = options.foldColor;

		this._addHoverEvents();

		if(options.buttons){
			var downloadButton = _.find(options.buttons, function(button){
				return button.downloadUrl;
			});

			if(downloadButton){
				this._addDownloadButton(downloadButton);
			}


			this._addMoreButtons(options.buttons);
		}

		var self = this;
		// :any to work around https://github.com/facebook/flow/issues/1155
		this._previewClicks.plug(
			Kefir.fromEvents(this._element, 'click')
				.map(event => ({
					preventDefault: () => event.preventDefault()
				}))
		);

		if(options.previewThumbnailUrl && options.failoverPreviewIconUrl){
			var previewThumbnailUrlImage = this._element.querySelector('.inboxsdk__attachmentCard_previewThumbnailUrl');
			previewThumbnailUrlImage.onerror = (e) => {
				var iconDiv = document.createElement('div');
				iconDiv.classList.add('aYv');
				iconDiv.innerHTML = '<img class="aZG aYw" src="' + options.failoverPreviewIconUrl + '">';
				const parent = previewThumbnailUrlImage.parentElement;
				if (!parent) throw new Error("Could not find parent element");
				parent.insertBefore(iconDiv, previewThumbnailUrlImage.nextElementSibling);

				previewThumbnailUrlImage.remove();
			};
		}
	}

	_addHoverEvents(){
		Kefir.merge([
				Kefir.fromEvents(this._element, 'mouseenter'),
				fromEventTargetCapture(this._element, 'focus')
			])
			.onValue(() => {
				this._element.classList.add('aZp');
			});

		Kefir.merge([
				Kefir.fromEvents(this._element, 'mouseleave'),
				fromEventTargetCapture(this._element, 'blur')
			])
			.onValue(() => {
				this._element.classList.remove('aZp');
			});

		const anchor = this._element.querySelector('a');
		Kefir.fromEvents(anchor, 'focus')
			.onValue(() => {
				anchor.classList.add('a1U');
			});
		Kefir.fromEvents(anchor, 'blur')
			.onValue(() => {
				anchor.classList.remove('a1U');
			});
	}

	_addDownloadButton(options: Object) {
		var buttonView = new ButtonView({
			tooltip: 'Download',
			iconClass: 'aSK J-J5-Ji aYr'
		});

		buttonView.getElement().setAttribute('data-inboxsdk-download-url', options.downloadUrl);

		var basicButtonViewController = new BasicButtonViewController({
			activateFunction: function(){
				var prevented = false;

				if(options.onClick){
					options.onClick({
						preventDefault: function(){
							prevented = true;
						}
					});
				}

				if(prevented){
					return;
				}

				var downloadLink = document.createElement('a');
				downloadLink.href = options.downloadUrl;

				(downloadLink:any).addEventListener('click', function(e) {
					e.stopPropagation();
				}, true);

				if(options.openInNewTab){
					downloadLink.setAttribute('target', '_blank');
				}

				document.body.appendChild(downloadLink);

				simulateClick(downloadLink);
				downloadLink.remove();
			},
			buttonView: buttonView
		});

		this._addButton(buttonView);
	}

	_addMoreButtons(buttonDescriptors: ?Object[]){
		_.chain(buttonDescriptors)
			.filter(function(buttonDescriptor){
				return !buttonDescriptor.downloadUrl;
			})
			.map(function(buttonDescriptor){
				var buttonView = new ButtonView(buttonDescriptor);
				var buttonViewController = new BasicButtonViewController({
					buttonView: buttonView,
					activateFunction: buttonDescriptor.onClick
				});

				return buttonView;
			})
			.each(this._addButton.bind(this)).value();
	}

	_addButton(buttonView: ButtonView) {
		buttonView.addClass('aQv');

		this._getButtonContainerElement().appendChild(buttonView.getElement());
	}

	_getPreviewImageUrl(): ?string {
		var previewImage = this._getPreviewImage();
		if(!previewImage){
			return null;
		}

		return previewImage.src;
	}

	_getPreviewImage(): HTMLImageElement {
		return (this._element.querySelector('img.aQG'): any);
	}

	_getButtonContainerElement(): HTMLElement {
		return this._element.querySelector('.aQw');
	}
}

export default defn(module, GmailAttachmentCardView);
