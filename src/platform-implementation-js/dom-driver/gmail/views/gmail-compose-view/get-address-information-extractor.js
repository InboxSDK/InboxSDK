/* @flow */

import Logger from '../../../../lib/logger';
import extractContactFromString from '../../../../lib/extract-contact-from-string';

export default function getAddressInformationExtractor(addressType: string): (node: HTMLElement) => ?Contact {
	return function(node: HTMLElement): ?Contact {
		var contactNode = node.querySelector('input[name=' + addressType + ']');

		var emailAddress = null;
		var name = null;

		if(contactNode){
			var contactInfoString = (contactNode: any).value;

			return extractContactFromString(contactInfoString);			
		}
		else{
			Logger.error(new Error('contactNode cant be found'), {
				addressType
			});

			return null;
		}
	};
};
