'use strict';

var Bacon = require('baconjs');
var fromEventTargetCapture = require('../../../../lib/from-event-target-capture');



module.exports =  function(gmailComposeView){

	var element = gmailComposeView.getElement();
	var sendButtonElement = gmailComposeView.getSendButton();
	var sendAndArchiveButtonElement = gmailComposeView.getSendAndArchiveButton();

	var domEventStream = Bacon.mergeAll(
		fromEventTargetCapture(element, 'keydown')
			.filter(function(domEvent){
				return domEvent.ctrlKey || domEvent.metaKey;
			})
			.filter(function(domEvent){
				return domEvent.which === 13 || domEvent.keyCode === 13;
			}),

		fromEventTargetCapture(element, 'keydown')
			.filter(function(domEvent){
				return [13, 32].indexOf(domEvent.which) > -1 ||  [13, 32].indexOf(domEvent.keyCode) > -1;
			})
			.filter(function(domEvent){
				return (sendButtonElement && sendButtonElement.contains(domEvent.srcElement)) || (sendAndArchiveButtonElement && sendAndArchiveButtonElement.contains(domEvent.srcElement));
			}),

		fromEventTargetCapture(element, 'mousedown')
			.filter(function(domEvent){
				return (sendButtonElement && sendButtonElement.contains(domEvent.srcElement)) || (sendAndArchiveButtonElement && sendAndArchiveButtonElement.contains(domEvent.srcElement));
			}),

		fromEventTargetCapture(element, 'click')
			.filter(function(domEvent){
				return (sendButtonElement && sendButtonElement.contains(domEvent.srcElement)) || (sendAndArchiveButtonElement && sendAndArchiveButtonElement.contains(domEvent.srcElement));
			})
	);

	return domEventStream.map(function(domEvent){
							return {
								eventName: 'presending',
								data: {
									cancel: function(){
										domEvent.preventDefault();
										domEvent.stopPropagation();
										domEvent.stopImmediatePropagation();
									}
								}
							};
						});

};
