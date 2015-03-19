const _ = require('lodash');
const makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
const Bacon = require('baconjs');

module.exports = function trackEvents(gmailDriver){

	_setupComposeMonitoring(gmailDriver);
	_setupAttachmentModalMonitoring(gmailDriver);
	_setupDragDropMonitoring(gmailDriver);
};


function _setupComposeMonitoring(gmailDriver){
	let logger = gmailDriver.getLogger();

	gmailDriver.getComposeViewDriverStream().onValue(
		(composeViewDriver) => {

			const logFunction = _getLogFunction(gmailDriver, composeViewDriver);
			logFunction('compose open');

			_monitorComposeSpecificEvents(composeViewDriver, logFunction);
		}
	);
}


function _getLogFunction(gmailDriver, composeViewDriver){
	const logger = gmailDriver.getLogger();
	const composeStats = {
		isInlineReply: composeViewDriver.isInlineReplyForm(),
		isReply: composeViewDriver.isReply()
	};


	return function(eventName, extraOptions){
		logger.eventGmail(eventName, _.extend({}, composeStats, extraOptions));
	};
}

function _monitorComposeSpecificEvents(composeViewDriver, logFunction){
	_monitorAttachmentButton(composeViewDriver, logFunction);
	_monitorDriveButton(composeViewDriver, logFunction);
}

function _monitorAttachmentButton(composeViewDriver, logFunction){

	let attachmentButton = composeViewDriver.getElement().querySelector('.a1');
	if(attachmentButton){
		attachmentButton.addEventListener('mousedown', () => {
			logFunction('attachment button clicked');
			_monitorAttachmentAdded(composeViewDriver, logFunction);
		});
	}

}

function _monitorAttachmentAdded(composeViewDriver, logFunction) {
	makeMutationObserverStream(document.body, {childList: true})
		.filter((mutation) => mutation.addedNodes.length > 0)
		.map('.addedNodes')
		.flatMap((addedNodes) => Bacon.fromArray(_.toArray(addedNodes)))
		.startWith(document.querySelector('input[type=file]'))
		.filter(node => node && node.type === 'file')
		.take(1)
		.flatMap((node) => {
			return Bacon.fromEventTarget(node, 'change')
						.map(true)
						.merge(
							Bacon.fromEventTarget(composeViewDriver.getBodyElement(), 'focus')
									.map(false)
									.delay(1000)
						);
		})
		.take(1)
		.filter(Boolean)
		.onValue(() => logFunction('attachment uploaded'));
}

function _monitorDriveButton(composeViewDriver, logFunction){

	let driveButton = composeViewDriver.getElement().querySelector('.aA7');
	if(driveButton){
		driveButton.addEventListener('mousedown', () => {
			logFunction('drive button clicked');
			_monitorDriveFileAdded(composeViewDriver, logFunction);
		});
	}

}

function _monitorDriveFileAdded(composeViewDriver, logFunction){
	let numberCurrentDriveChips = composeViewDriver.getBodyElement().querySelectorAll('.gmail_drive_chip').length;

	makeMutationObserverStream(document.body, {childList: true})
		.filter((mutation) => mutation.addedNodes.length > 0)
		.map('.addedNodes')
		.flatMap((addedNodes) => Bacon.fromArray(_.toArray(addedNodes)))
		.startWith(document.querySelector('.picker-dialog'))
		.filter(node => node && node.classList.contains('picker-dialog'))
		.take(1)
		.flatMap((node) => {
			return Bacon.fromEventTarget(composeViewDriver.getBodyElement(), 'focus')
						.delay(1000)
						.map(() => {
							if(composeViewDriver.getBodyElement()){
								return composeViewDriver.getBodyElement().querySelectorAll('.gmail_drive_chip').length;
							}

							return 0;
						})
						.map((newNumber) => numberCurrentDriveChips < newNumber)
						.take(1);
		})
		.take(1)
		.filter(Boolean)
		.onValue(() => logFunction('drive file added'));
}

function _setupAttachmentModalMonitoring(gmailDriver){

	makeMutationObserverStream(document.body, {childList: true})
		.filter((mutation) => mutation.addedNodes.length > 0)
		.map('.addedNodes')
		.flatMap((addedNodes) => Bacon.fromArray(_.toArray(addedNodes)))
		.startWith(document.querySelector('[role=alertdialog]'))
		.filter(Boolean)
		.onValue((node) => {

			let heading = node.querySelector('[role=heading]');
			if(heading){
				if(heading.textContent.indexOf('exceeds the 25MB') > -1){
					gmailDriver.getLogger().eventGmail('large attachment suggest drive');
					return;
				}
			}

			var body = node.querySelector('.Kj-JD-Jz');
			if(body){
				if(body.textContent.indexOf('exceeds the maximum') > -1){
					gmailDriver.getLogger().eventGmail('large attachment from drag and drop');
					return;
				}
			}

		});

}

function _setupDragDropMonitoring(gmailDriver){

	gmailDriver.getComposeViewDriverStream()
				.flatMapLatest(() => {

					return Bacon.fromEventTarget(document.body, 'dragenter')
								.filter((event) => event.toElement.classList.contains('aC7') || event.toElement.classList.contains('aC9'))
								.take(1);

				})
				.onValue(() => gmailDriver.getLogger().eventGmail('compose drag file'));


	gmailDriver.getComposeViewDriverStream()
				.flatMapLatest(() => {

					return Bacon.fromEventTarget(document.body, 'drop')
								.filter((event) => event.toElement.classList.contains('aC7') || event.toElement.classList.contains('aC9'))
								.take(1);

				})
				.onValue(() => gmailDriver.getLogger().eventGmail('compose drop file'));

}
