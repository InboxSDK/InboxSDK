/* @flow */

import isValidEmail from './is-valid-email';

export default function extractContactFromEmailContactString(contactInfoString: string): Contact {
  let name = null;
  let emailAddress = null;

  const contactInfoParts = contactInfoString.split('<');
  const firstPartTrimmed = contactInfoParts[0].trim();
  if(contactInfoParts.length > 1){
    name = firstPartTrimmed;
    emailAddress = contactInfoParts[1].split('>')[0].trim();
  }
  else{
    if(isValidEmail(firstPartTrimmed)){
      emailAddress = firstPartTrimmed;
    }
    else{
      throw new Error(firstPartTrimmed + ' is not a valid email address');
    }
  }

  return {name, emailAddress};

}
