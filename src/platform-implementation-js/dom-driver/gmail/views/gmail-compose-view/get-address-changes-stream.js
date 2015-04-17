import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';

import baconFlatten from '../../../../lib/bacon-flatten';
import makeMutationObserverStream from '../../../../lib/dom/make-mutation-observer-stream';
import getAddressInformationExtractor from './get-address-information-extractor';

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
			baconFlatten(
				mainSubAddressStream
					.startWith({
						addedNodes: rowElements[rowIndex].querySelectorAll('.vR')
					})
					.map('.addedNodes')
					.map(_.toArray)
				)
				.filter(_isRecipientNode)
				.map(getAddressInformationExtractor(addressType))
				.map(_convertToEvent.bind(null, addressType + 'ContactAdded')),

			baconFlatten(
				mainSubAddressStream
					.map('.removedNodes')
					.map(_.toArray)
				)
				.filter(_isRecipientNode)
				.map(getAddressInformationExtractor(addressType))
				.map(_convertToEvent.bind(null, addressType + 'ContactRemoved'))
		);
	});
}

function _isRecipientNode(node){
	// We want to filter non-element nodes out too.
	return node.classList && node.classList.contains('vR');
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
		var parts = event.eventName.split('Contact'); //splits "toContactAdded" => ["to", "Added"]
		grouping[parts[0]][parts[1].toLowerCase()].push(event.data);
	});

	return {
		eventName: 'recipientsChanged',
		data: grouping
	};
}
