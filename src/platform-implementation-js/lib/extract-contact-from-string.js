/* @flow */

export default function extractContactFromString(contactInfoString: string): Contact {
  let name = null;
  let emailAddress = null;

  var contactInfoParts = contactInfoString.split('<');
  if(contactInfoParts.length > 1){
    name = contactInfoParts[0].trim();
    emailAddress = contactInfoParts[1].split('>')[0].trim();
  }
  else{
    emailAddress = contactInfoParts[0];
  }

  return {name, emailAddress};

}
