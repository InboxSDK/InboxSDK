/* @flow */

import censorHTMLtree from '../../../../../common/censor-html-tree';
import {simulateClick} from '../../../../lib/dom/simulate-mouse-event';


import type GmailDriver from '../../gmail-driver';
import type GmailComposeView from '../gmail-compose-view';

let hasLoggedError = false;

export default function overrideEditSubject(gmailDriver: GmailDriver, gmailComposeView: GmailComposeView){
  if(!gmailComposeView.isReply()) return;

  const menuItem =
    gmailComposeView
      .getElement()
      .querySelector(
        'div.J-M.jQjAxd.HX[role=menu] > div.SK.AX > [role=menuitem]:nth-last-child(2)'
      );
  if(!menuItem){
    if(!hasLoggedError){
      gmailDriver.getLogger().error(new Error('could not find edit subject item'), {
        composeElement: censorHTMLtree(gmailComposeView.getElement())
      });
      hasLoggedError = true;
    }
    return;
  }

  menuItem.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
  }, true);

  menuItem.addEventListener('mouseup', (e: MouseEvent) => {
    e.stopPropagation();
    _cloneContentToNewCompose(gmailDriver, gmailComposeView);
  }, true);

}

function _cloneContentToNewCompose(gmailDriver, gmailComposeView){
  const toRecipients = gmailComposeView.getToRecipients();
  const ccRecipients = gmailComposeView.getCcRecipients();
  const bccRecipients = gmailComposeView.getBccRecipients();
  const fromAddress = gmailComposeView.getFromContact();

  const subject = gmailComposeView.getSubject();

  _ensureExtraContentIsVisible(gmailComposeView);
  const body = gmailComposeView.getHTMLContent();

  gmailComposeView.discard();

  gmailDriver
    .openNewComposeViewDriver()
    .then((newComposeView: GmailComposeView) => {

      if(toRecipients.length > 0) newComposeView.setToRecipients(toRecipients.map(c => c.emailAddress));
      if(ccRecipients.length > 0) newComposeView.setCcRecipients(ccRecipients.map(c => c.emailAddress));
      if(bccRecipients.length > 0) newComposeView.setBccRecipients(bccRecipients.map(c => c.emailAddress));

      newComposeView.setFromEmail(fromAddress.emailAddress);
      newComposeView.setSubject(subject);
      newComposeView.setBodyHTML(body);

      setTimeout(function(){
        newComposeView.getSubjectInput().select();
      }, 1);
    });
}

function _ensureExtraContentIsVisible(gmailComposeView){
  if(gmailComposeView.getBodyElement().querySelector('.gmail_extra')) return;

  const quoteDotsElement = gmailComposeView.getElement().querySelector('.ajR');
  if(quoteDotsElement) simulateClick(quoteDotsElement);
}
