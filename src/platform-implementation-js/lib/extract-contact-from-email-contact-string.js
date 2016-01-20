/* @flow */

import isValidEmail from './is-valid-email';

export default function extractContactFromEmailContactString(contactInfoString: string): Contact {
  let name = null;
  let emailAddress = '';

  var contactInfoParts = contactInfoString.split('<');
  if(contactInfoParts.length > 1){
    name = contactInfoParts[0].trim();
    emailAddress = contactInfoParts[1].split('>')[0].trim();
  }
  else{
    if(isValidEmail(contactInfoParts[0])){
      emailAddress = contactInfoParts[0];
    }
    else{
      throw new Error(contactInfoParts[0] + ' is not a valid email address');
    }
  }

  return {name, emailAddress};

}
