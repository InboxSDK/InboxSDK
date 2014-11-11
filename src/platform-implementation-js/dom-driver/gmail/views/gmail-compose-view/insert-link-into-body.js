var _ = require('lodash');
var $ = require('jquery');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var simulateClick = require('../../../../lib/dom/simulate-click');
var setValueAndDispatchEvent = require('../../../../lib/dom/set-value-and-dispatch-event');

function insertLinkIntoBody(gmailComposeView, text, href){
	return new RSVP.Promise(function(resolve, reject){
		if(document.hasFocus()){
			_insertLinkIntoBody(gmailComposeView, text, href);
			resolve();
		}
		else{
			Bacon.fromEventTarget(window, 'focus').take(1).onValue(function(){
				_insertLinkIntoBody(gmailComposeView, text, href);
				resolve();
			});
		}
	});
}

function _insertLinkIntoBody(gmailComposeView, text, href){
	var composeBodyElement = $(gmailComposeView.getBodyElement());
	composeBodyElement.focus();

	simulateClick(gmailComposeView.getInsertLinkButton()[0]);

	if($('#linkdialog-text').length === 0){
		return;
	}

	var originalText = $('#linkdialog-text').val();
	setValueAndDispatchEvent($('#linkdialog-onweb-tab-input')[0], href, 'input');

	simulateClick($('button[name=ok]')[0]);

	var $link = composeBodyElement.find('a[href="'+href+'"]');

	if(originalText.length === 0){
		$link.text(text);
	}
}

module.exports = insertLinkIntoBody;
