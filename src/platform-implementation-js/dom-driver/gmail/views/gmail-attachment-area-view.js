var _ = require('lodash');
var AttachmentAreaViewDriver = require('../../../driver-interfaces/attachment-area-view-driver');

var GmailAttachmentCardView = require('./gmail-attachment-card-view');
var IconButtonView = require('../widgets/buttons/icon-button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var GmailAttachmentAreaView = function(element){
	AttachmentAreaViewDriver.call(this);

	if(element){
		this._element = element;
	}
	else{
		this._setupElement();
	}
};

GmailAttachmentAreaView.prototype = Object.create(AttachmentAreaViewDriver.prototype);

_.extend(GmailAttachmentAreaView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true}
	],

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

	getGmailAttachmentCardViews: function(){
		var attachments = this._element.querySelectorAll('.aQH > span');

		return Array.prototype.map.call(attachments, function(attachment){
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

		var iconButtonView = new IconButtonView({
			iconClass: 'T-I-J3',
			iconUrl: options.iconUrl,
			tooltip: options.tooltip,
			hasButtonToLeft: true
		});

		iconButtonView.addClass('aZj');
		iconButtonView.getElement().children[0].setAttribute('class', 'asa');

		var self = this;
		var basicButtonViewController = new BasicButtonViewController({
			activateFunction: function(){
				options.callback(self.getGmailAttachmentCardViews());
			},
			buttonView: iconButtonView
		});

		this._element.querySelector('.aZi').appendChild(iconButtonView.getElement());
	}

});

module.exports = GmailAttachmentAreaView;
