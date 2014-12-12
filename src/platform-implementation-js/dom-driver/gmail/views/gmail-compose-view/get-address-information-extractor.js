module.exports = function(addressType, node){
	return function(node){
		var contactNode = node.querySelector('input[name=' + addressType + ']');
		var contactInfoString = contactNode.value;

		var emailAddress = null;
		var name = null;

		var contactInfoParts = contactInfoString.split('<');
		if(contactInfoParts.length > 1){
			name = contactInfoParts[0].trim();
			emailAddress = contactInfoParts[1].split('>')[0].trim();
		}
		else{
			emailAddress = contactInfoParts[0];
		}

		return {
			emailAddress: emailAddress,
			name: name
		};
	};
};
