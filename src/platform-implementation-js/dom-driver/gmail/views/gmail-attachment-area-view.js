var _ = require('lodash');
var RSVP = require('rsvp');
var AttachmentAreaViewDriver = require('../../../driver-interfaces/attachment-area-view-driver');

var GmailAttachmentCardView = require('./gmail-attachment-card-view');
var ButtonView = require('../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var GmailAttachmentAreaView = function(element){
	AttachmentAreaViewDriver.call(this);

	this._isNative = !!element;

	if(element){
		this._element = element;
		this._setupAttachmentCardViews();
	}
	else{
		this._setupElement();
	}
};

GmailAttachmentAreaView.prototype = Object.create(AttachmentAreaViewDriver.prototype);

_.extend(GmailAttachmentAreaView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_isNative', destroy: false},
		{name: '_attachmentCardViews', destroy: true, get: true}
	],

	ready: function(){
		var self = this;

		return RSVP.resolve().then(function(){
			if(!self._isNative || self._attachmentCardViews.length === 0){
				return true;
			}

			return RSVP.all(self._attachmentCardViews.map(function(attachmentCardView){
				return attachmentCardView.ready();
			}));
		});
	},

	_setupElement: function(){
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
	},

	_setupAttachmentCardViews: function(){
		var attachments = this._element.querySelectorAll('.aQH > span');
		this._attachmentCardViews = Array.prototype.map.call(attachments, function(attachment){
			return new GmailAttachmentCardView({element: attachment});
		});
	},

	addGmailAttachmentCardView: function(gmailAttachmentCardView){
		var lastChild = this._element.querySelector('.aZK');
		lastChild.parentNode.insertBefore(gmailAttachmentCardView.getElement(), lastChild);
	},

	addButtonToDownloadAllArea: function(options){
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

module.exports = GmailAttachmentAreaView;
