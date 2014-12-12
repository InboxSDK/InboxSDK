var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');

var makeMutationObserverStream = require('../../../../lib/dom/make-mutation-observer-stream');
var getAddressInformationExtractor = require('./get-address-information-extractor');

module.exports = function(gmailComposeView){
	var recipientRowElements = gmailComposeView.getRecipientRowElements();

	if(!recipientRowElements || recipientRowElements.length === 0){
		return Bacon.never();
	}

	var mergedStream = Bacon.mergeAll(
		_makeSubAddressStream('to', recipientRowElements, 0),
		_makeSubAddressStream('cc', recipientRowElements, 1),
		_makeSubAddressStream('bcc', recipientRowElements, 2)
	);

	var umbrellaStream = mergedStream.bufferWithTime(100).map(_groupChangeEvents);

	return Bacon.mergeAll(mergedStream, umbrellaStream);
};

function _makeSubAddressStream(addressType, rowElements, rowIndex){
	if(!rowElements[rowIndex]){
		return Bacon.never();
	}

	var mainSubAddressStream =
		makeMutationObserverStream(
			rowElements[rowIndex],
			{
				childList: true,
				subtree: true
			}
		);

	return Bacon.later(0).flatMap(function() {
		return Bacon.mergeAll(
			mainSubAddressStream
				.startWith({
					addedNodes: rowElements[rowIndex].querySelectorAll('.vR')
				})
				.map('.addedNodes')
				.map(_.toArray)
				.flatMap(Bacon.fromArray)
				.filter(_isRecipientNode)
				.map(getAddressInformationExtractor(addressType))
				.map(_convertToEvent.bind(null, addressType + 'AddressRemoved')),

			mainSubAddressStream
				.map('.removedNodes')
				.map(_.toArray)
				.flatMap(Bacon.fromArray)
				.filter(_isRecipientNode)
				.map(getAddressInformationExtractor(addressType))
				.map(_convertToEvent.bind(null, addressType + 'AddressRemoved'))
		);
	});
}

function _isRecipientNode(node){
	return node.classList.contains('vR');
}

function _convertToEvent(eventName, addressInfo){
	return {
		eventName: eventName,
		data: addressInfo
	};
}

function _groupChangeEvents(events){
	var grouping = {
		to: {
			added: [],
			removed: []
		},
		cc: {
			added: [],
			removed: []
		},
		bcc: {
			added: [],
			removed: []
		}
	};

	events.forEach(function(event){
		var parts = event.eventName.split('Address'); //splits "toAddressAdded" => ["to", "Added"]
		grouping[parts[0]][parts[1].toLowerCase()].push(event.data);
	});

	return {
		eventName: 'recipientsChanged',
		data: grouping
	};
}
