/* @flow */

import Logger from '../../../../lib/logger';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';

export default function getAddressInformationExtractor(addressType: string): (node: HTMLElement) => ?Contact {
	return function(node: HTMLElement): ?Contact {
		var contactNode = node.querySelector('input[name=' + addressType + ']');

		var emailAddress = null;
		var name = null;

		if(contactNode){
			var contactInfoString = (contactNode: any).value;

			try{
				return extractContactFromEmailContactString(contactInfoString);
			}
			catch(err){
				Logger.error(new Error('problem extracting address information'), {
					message: err.message
				});

				return null;
			}

		}
		else{
			Logger.error(new Error('contactNode cant be found'), {
				addressType
			});

			return null;
		}
	};
};
