/* @flow */

import _ from 'lodash';

import Logger from '../../../../lib/logger';
import simulateClick from '../../../../lib/dom/simulate-click';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';

const cache: {[key: string]: ?{
  headerContact: Contact;
  modalContact: Contact;
}} =  {};

export default function getUpdatedContact(headerContact: Contact, element: HTMLElement): Contact {
  let cacheEntry = cache[headerContact.emailAddress];
  if(cacheEntry){
    if(cacheEntry.headerContact.name !== headerContact.name){
      delete cache[headerContact.emailAddress];
    }
    else{
      return cacheEntry.modalContact;
    }
  }

  const menuButtonElement = element.querySelector('.ajy[aria-haspopup=true]');
  if(menuButtonElement){
    //the modal that contains this email address is not visible, so we need to bring the modal up
    const block = (event: MouseEvent) => {
      event.stopPropagation();
    };
    const modifyFocusEvent = event => {
      event.shouldIgnore = true;
    };
    element.addEventListener('click', block);
    (document: any).addEventListener('focus', modifyFocusEvent, true);
    simulateClick(menuButtonElement);
    try {
      updateContactCacheFromModal(headerContact);
    } catch (err) {
      Logger.error(err);
    } finally {
      simulateClick(menuButtonElement);
      element.removeEventListener('click', block);
      (document: any).removeEventListener('focus', modifyFocusEvent, true);
    }

    cacheEntry = cache[headerContact.emailAddress];
    if(cacheEntry){
      return cacheEntry.modalContact;
    }
  }

  return headerContact;
}

function updateContactCacheFromModal(headerContact) {
  const spans = document.querySelectorAll('.ajC [email]');

  for(let ii=0; ii<spans.length; ii++){
    const span = spans[ii];
    let emailAddress = span.getAttribute('email');
    if(!emailAddress) continue;
    if(cache[emailAddress]) continue;

    let modalContact: Contact = {emailAddress, name: null};
    let name = span.getAttribute('name');
    if(name){
      modalContact.name = name;
    }
    else{
      const stringContact = extractContactFromEmailContactString(span.textContent);
      if(emailAddress === stringContact.emailAddress){
        modalContact = stringContact;
      }
    }

    cache[emailAddress] = {headerContact,modalContact};
  }
}
