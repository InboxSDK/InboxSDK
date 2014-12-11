var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');
var makeMutationObserverStream = require('../../../../lib/dom/make-mutation-observer-stream');


module.exports = function(gmailComposeView){
	var recipientRowElements = gmailComposeView.getRecipientRowElements();

	if(!recipientRowElements || recipientRowElements.length === 0){
		return Bacon.Never();
	}

	return Bacon.mergeAll(
		_makeSubAddressStream('to', recipientRowElements, 0),
		_makeSubAddressStream('cc', recipientRowElements, 1),
		_makeSubAddressStream('bcc', recipientRowElements, 2)
	);
};

function _makeSubAddressStream(addressType, rowElements, rowIndex){
	if(!rowElements[rowIndex]){
		return Bacon.Never();
	}

	var mainSubAddressStream =
		makeMutationObserverStream(
			rowElements[rowIndex],
			{
				childList: true,
				subtree: true
			}
		);

	//using a bus here instead of mergeAll because of a bug with mergeAll
	var bus = new Bacon.Bus();

	bus.plug(
		mainSubAddressStream
			.startWith({
				addedNodes: rowElements[rowIndex].querySelectorAll('.vR')
			})
			.map('.addedNodes')
			.map(_.toArray)
			.flatMap(Bacon.fromArray)
			.filter(_isRecipientNode)
			.map(_extractAddressInformation.bind(null, addressType, addressType + 'AddressAdded'))
	);

	bus.plug(
		mainSubAddressStream
			.map('.removedNodes')
			.map(_.toArray)
			.flatMap(Bacon.fromArray)
			.filter(_isRecipientNode)
			.map(_extractAddressInformation.bind(null, addressType, addressType + 'AddressRemoved'))
	);



	RSVP.Promise.resolve().then(function() {
		var nodes = rowElements[rowIndex].querySelectorAll('.vR');
		_.chain(nodes)
			.filter(_isRecipientNode)
			.map(_extractAddressInformation.bind(null, addressType, addressType + 'AddressAdded'))
			.each(bus.push.bind(bus));
	});

	return bus;

	/* what it should be but is broken for some reason
	return Bacon.mergeAll(
		mainSubAddressStream
			.startWith({
				addedNodes: rowElements[rowIndex].querySelectorAll('.vR')
			})
			.map('.addedNodes')
			.map(_.toArray)
			.flatMap(Bacon.fromArray)
			.filter(_isRecipientNode)
			.map(_extractAddressInformation.bind(null, addressType, addressType + 'AddressAdded')),

		mainSubAddressStream
			.map('.removedNodes')
			.map(_.toArray)
			.flatMap(Bacon.fromArray)
			.filter(_isRecipientNode)
			.map(_extractAddressInformation.bind(null, addressType, addressType + 'AddressRemoved'))
	);
*/


}

function _isRecipientNode(node){
	return node.classList.contains('vR');
}

function _extractAddressInformation(addressType, eventName, node){
	var contactNode = node.querySelector('input[name=' + addressType + ']');
	var contactInfoString = contactNode.value;

	var emailAddress;
	var name;

	var contactInfoParts = contactInfoString.split('<');
	if(contactInfoParts.length > 0){
		name = contactInfoParts[0].trim();
		emailAddress = contactInfoParts[1].split('>')[0].trim();
	}
	else{
		emailAddress = contactInfoParts[0];
	}

	return {
		eventName: eventName,
		data: {
			emailAddress: emailAddress,
			name: name
		}
	};
}
