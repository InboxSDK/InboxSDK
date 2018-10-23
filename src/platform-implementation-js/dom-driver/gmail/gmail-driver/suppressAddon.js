/* @flow */

import type GmailDriver from '../gmail-driver';
import { simulateClick } from '../../../lib/dom/simulate-mouse-event';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import waitFor from '../../../lib/stream-wait-for';
import GmailElementGetter from '../gmail-element-getter';

export default function suppressAddon(driver: GmailDriver, addonTitle: string) {
  waitFor(() => GmailElementGetter.getCompanionSidebarIconContainerElement())
    .map(iconContainerElement => {
      // .J-KU-Jg is pre-2018-07-30 element?
      const elementToWatch = iconContainerElement.querySelector(
        '.J-KU-Jg, [role=tablist], .brC-bsf-aT5-aOt'
      );
      if (!elementToWatch) {
        driver
          .getLogger()
          .error(
            new Error('_waitForAddonTitleAndSuppress: elementToWatch not found')
          );
        return null;
      }
      return elementToWatch;
    })
    .filter()
    .flatMap(makeElementChildStream)
    .filter(
      ({ el }) =>
        el.getAttribute('role') === 'tab' &&
        (el.getAttribute('data-tooltip') || el.getAttribute('aria-label')) ===
          addonTitle
    )
    .takeUntilBy(driver.getStopper())
    .onValue(({ el }) => {
      if (
        el.classList.contains('.J-KU-KO') || // old pre-2018-07-30 classname?
        el.classList.contains('.bse-bvF-I-KO')
      ) {
        // it is currently open, so let's close
        simulateClick(el);
      }

      el.style.display = 'none';
    })
    .onError(err => {
      driver.getLogger().error(err, 'error in suppressAddon');
    });
}
