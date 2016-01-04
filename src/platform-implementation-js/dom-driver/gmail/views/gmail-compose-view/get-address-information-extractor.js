/* @flow */

import Logger from '../../../../lib/logger';

export default function getAddressInformationExtractor(addressType: string): (node: HTMLElement) => ?Contact {
	return function(node: HTMLElement): ?Contact {
		var contactNode = node.querySelector('input[name=' + addressType + ']');

		var emailAddress = null;
		var name = null;

		if(contactNode){
			var contactInfoString = (contactNode: any).value;

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
		}
		else{
			Logger.error(new Error('contactNode cant be found'), {
				addressType
			});

			return null;
		}
	};
};
