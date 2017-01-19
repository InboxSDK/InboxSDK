/* @flow */

import isValidEmail from './is-valid-email';

export default function extractContactFromEmailContactString(contactInfoString: string): Contact {
  let name = null;
  let emailAddress = null;

  const contactInfoParts = contactInfoString.split('<');
  const firstPartTrimmed = contactInfoParts[0].replace(/\u202c/g, '').trim();
  if(contactInfoParts.length > 1){
    name = firstPartTrimmed;
    emailAddress = contactInfoParts[1].split('>')[0].replace(/\u202c/g, '').trim();
  }
  else{
    if(isValidEmail(firstPartTrimmed)){
      emailAddress = firstPartTrimmed;
    }
    else{
      throw Object.assign((new Error('Invalid email address'):any), {firstPartTrimmed});
    }
  }

  return {name, emailAddress};

}
