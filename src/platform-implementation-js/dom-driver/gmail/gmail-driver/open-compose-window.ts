import { simulateClick } from '../../../lib/dom/simulate-mouse-event';

import waitFor from '../../../lib/wait-for';

import type GmailDriver from '../gmail-driver';

export default async function openComposeWindow(gmailDriver: GmailDriver) {
  await gmailDriver.elementGetter.waitForGmailModeToSettle();

  if (
    gmailDriver.elementGetter.isStandaloneComposeWindow() ||
    gmailDriver.elementGetter.isStandaloneThreadWindow()
  ) {
    throw new Error('Can not open new compose while in standalone window');
  }

  if (!gmailDriver.elementGetter.getComposeButton()) {
    await waitFor(() => !!gmailDriver.elementGetter.getComposeButton());
  }

  const composeButton = gmailDriver.elementGetter.getComposeButton();
  if (!composeButton) throw new Error('Could not find compose button');
  simulateClick(composeButton);
}
