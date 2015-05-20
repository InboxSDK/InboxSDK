import _ from 'lodash';
import simulateClick from '../../../../lib/dom/simulate-click';

export function getFromContact(driver, gmailComposeView) {
  const emailAddress = gmailComposeView.getElement().querySelector('input[name="from"]').value ||
    driver.getUserEmailAddress();
  const name = _.find(getFromContactChoices(driver, gmailComposeView),
    contact => contact.emailAddress == emailAddress).name;
  return {emailAddress, name};
}

export function getFromContactChoices(driver, gmailComposeView) {
  const choiceParent = gmailComposeView.getElement().querySelector('div.J-M.jQjAxd.J-M-awS[role=menu] > div.SK.AX');
  if (!choiceParent) {
    // From field isn't present
    const emailAddress = driver.getUserEmailAddress();
    return [
      {emailAddress, name: emailAddress}
    ];
  }
  return _.map(choiceParent.children, item => ({
    emailAddress: item.getAttribute('value'),
    name: item.textContent.replace(/<.*/, '').trim()
  }));
}

export function setFromEmail(driver, gmailComposeView, email) {
  let currentFromAddress = gmailComposeView.getFromContact().emailAddress;
  if(currentFromAddress === email){
    return;
  }

  const choiceParent = gmailComposeView.getElement().querySelector('div.J-M.jQjAxd.J-M-awS[role=menu] > div.SK.AX');
  if (!choiceParent) {
    if (driver.getUserEmailAddress() != email) {
      throw new Error("Chosen email from choice was not found");
    }
    return;
  }
  const chosenChoice = _.find(choiceParent.children, item =>
    item.getAttribute('value') == email
  );
  if (!chosenChoice) {
    throw new Error("Chosen email from choice was not found");
  }
  simulateClick(chosenChoice);
}
