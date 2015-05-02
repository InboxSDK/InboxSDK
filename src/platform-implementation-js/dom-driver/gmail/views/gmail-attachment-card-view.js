import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';
import util from 'util';

import AttachmentCardViewDriver from '../../../driver-interfaces/attachment-card-view-driver';

import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';

import simulateClick from '../../../lib/dom/simulate-click';
import waitFor from '../../../lib/wait-for';
import streamWaitFor from '../../../lib/stream-wait-for';

function GmailAttachmentCardView(options, driver) {
	AttachmentCardViewDriver.call(this);

	this._eventStream = new Bacon.Bus();
	this._driver = driver;

	this.getAttachmentType = _.once(() => {
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
	});

	if(options.element){
		this._element = options.element;
	}
	else{
		this._createNewElement(options);
	}
}

util.inherits(GmailAttachmentCardView, AttachmentCardViewDriver);

_.assign(GmailAttachmentCardView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_driver', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	_isStandardAttachment() {
		return this.getAttachmentType() === 'FILE';
	},

	addButton: function(options){
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
	},

	_getDownloadLink() {
		const download_url = this._element.getAttribute('download_url');
		if (download_url) {
			const m = /:(https:\/\/[^:]+)/.exec(download_url);
			return m && m[1];
		}
		// download_url attribute may not be available yet. Use the a link href.
		const firstChild = this._element.firstElementChild;
		if (firstChild.tagName !== 'A') return null;
		return firstChild.href;
	},

	// Resolves the short-lived cookie-less download URL
	getDownloadURL() {
		return RSVP.Promise.resolve().then(() => {
			if (!this._isStandardAttachment()) return null;
			return waitFor(() => this._getDownloadLink());
		}).then(downloadUrl => {
			if (!downloadUrl) return null;
			return this._driver.resolveUrlRedirects(downloadUrl);
		});
	},

	_extractFileNameFromElement: function(){
		return this._element.querySelector('.aQA > span').textContent;
	},

	_createNewElement: function(options){
		this._element = document.createElement('span');
		this._element.classList.add('aZo');
		this._element.classList.add('inboxsdk__attachmentCard');

		var htmlArray = [
			'<a target="_blank" role="link" class="aQy e" href="">',
				'<div aria-hidden="true">',
					'<div class="aSG"></div>',
					'<div class="aVY aZn">',
						'<div class="aZm"></div>',
					'</div>',
					'<div class="aSH">'
		];

		if(options.iconThumbnailUrl){
			htmlArray = htmlArray.concat([
				'<div class="aYv">',
					'<img class="aZG aYw" src="' + options.iconThumbnailUrl + '">',
				'</div>'
			]);
		}
		else{
			htmlArray = htmlArray.concat([
				'<img class="aQG aYB" src="' +  options.previewThumbnailUrl + '">'
			]);
		}

		htmlArray = htmlArray.concat([
						'<div class="aYy">',
							'<div class="aYA">',
								'<img class="aSM" src="' + options.fileIconImageUrl + '">',
							'</div>',
							'<div class="aYz">',
								'<div class="a12">',
									'<div class="aQA">',
										'<span class="aV3 a6U"></span>',
									'</div>',
									'<div class="aYp">',
										'<span class="SaH2Ve"></span>',
									'</div>',
								'</div>',
							'</div>',
						'</div>',
					'</div>',
					'<div class="aSI">',
						'<div class="aSJ"></div>',
					'</div>',
				'</div>',
			'</a>',
			'<div class="aQw">',
			'</div>'
		]);

		this._element.innerHTML = htmlArray.join('');

		this._element.children[0].href = options.previewUrl;

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
		this._element.addEventListener('click', function(e){
			if(options.previewOnClick){
				options.previewOnClick({
					attachmentCardView: self,
					preventDefault: function(){
						e.preventDefault();
					}
				});
			}
		});
	},

	_addHoverEvents: function(){
		var self = this;
		this._element.addEventListener(
			'mouseenter',
			function(){
				self._element.classList.add('aZp');
			}
		);

		this._element.addEventListener(
			'mouseleave',
			function(){
				self._element.classList.remove('aZp');
			}
		);

	},

	_addDownloadButton: function(options){
		var buttonView = new ButtonView({
			tooltip: 'Download',
			iconClass: 'aSK J-J5-Ji aYr'
		});

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

				downloadLink.addEventListener('click', function(e) {
					e.stopImmediatePropagation();
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
	},

	_addMoreButtons: function(buttonDescriptors){
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
	},

	_addButton: function(buttonView){
		buttonView.addClass('aQv');

		this._getButtonContainerElement().appendChild(buttonView.getElement());
	},

	_getPreviewImageUrl: function(){
		var previewImage = this._getPreviewImage();
		if(!previewImage){
			return null;
		}

		return previewImage.src;
	},

	_getPreviewImage: function(){
		return this._element.querySelector('img.aQG');
	},

	_getButtonContainerElement: function(){
		return this._element.querySelector('.aQw');
	}

});

module.exports = GmailAttachmentCardView;
