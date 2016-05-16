/* @flow */

import _ from 'lodash';

import simulateClick from '../../../../lib/dom/simulate-click';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';

const cache: {[key: string]: ?Contact} =  {};

export default function getUpdatedContact(inContact: Contact, element: HTMLElement){
  let cachedContact = cache[inContact.emailAddress];
  if(cachedContact) return cachedContact;

  const contact = _.clone(inContact);

  const menuButtonElement = element.querySelector('.ajy[aria-haspopup=true]');
  if(menuButtonElement){
    //the modal that contains this email address is not visible, so we need to bring the modal up
    function block(event){event.stopPropagation();};
    (element: any).addEventListener('click', block);
    simulateClick(menuButtonElement);
    updateContactCacheFromModal();
    simulateClick(menuButtonElement);
    (element: any).removeEventListener('click', block);

    cachedContact = cache[contact.emailAddress];
    if(cachedContact){
      contact.name = cachedContact.name;
    }
  }

  return contact;
}

function updateContactCacheFromModal(): ?string {
  const spans = document.querySelectorAll(`.ajC [email]`);

  for(let ii=0; ii<spans.length; ii++){
    const span = spans[ii];
    let emailAddress = span.getAttribute('email');
    if(!emailAddress) continue;
    if(cache[emailAddress]) continue;

    let contact: Contact = {emailAddress, name: null};
    let name = span.getAttribute('name');
    if(name){
      contact.name = name;
    }
    else{
      const stringContact = extractContactFromEmailContactString(span.textContent);
      if(emailAddress === stringContact.emailAddress){
        contact = stringContact;
      }
    }

    cache[emailAddress] = contact;
  }
}
