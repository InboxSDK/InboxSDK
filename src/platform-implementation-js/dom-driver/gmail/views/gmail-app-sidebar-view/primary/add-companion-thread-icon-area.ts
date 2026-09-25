import { defn } from 'ud';
import type Logger from '../../../../../lib/logger';
import waitFor, { WaitForError } from '../../../../../lib/wait-for';

/*
As of Feb 6th, 2018.
  div.brC-aT5-aOt-Jw - the container for native global icons and sidebar icons
    div.brC-aT5-aOt-bsf-Jw - container for sdk global sidebar icons
      [role=tablist] - container for native and sdk thread sidebar icons
*/
const TAB_LIST_SELECTOR = '[role=tablist],.J-KU-Jg';

async function addCompanionThreadIconArea(
  logger: Logger,
  iconArea: HTMLElement,
  companionSidebarIconContainerEl: HTMLElement,
  isStopped: () => boolean,
) {
  // Insert synchronously when the tablist is already present so that callers
  // can find the icon area in the DOM immediately after calling this.
  let tabList =
    companionSidebarIconContainerEl.querySelector(TAB_LIST_SELECTOR);

  if (!tabList) {
    // Gmail may not have made the tablist match the selector yet, e.g. when
    // the extension loads on an already-open conversation (#1287).
    try {
      tabList = await waitFor(
        () => companionSidebarIconContainerEl.querySelector(TAB_LIST_SELECTOR),
        5000,
      );
    } catch (e) {
      if (e instanceof WaitForError) {
        logger.error(e, 'addCompanionThreadIconArea: no tablist');
      } else {
        logger.error(e);
      }
      return;
    }

    if (isStopped()) {
      return;
    }

    // Another icon area may have been inserted while we were waiting.
    if (
      companionSidebarIconContainerEl.querySelector('.sidebar_thread_iconArea')
    ) {
      return;
    }
  }

  const separator =
    companionSidebarIconContainerEl.querySelector('[role=separator]');

  if (separator?.parentElement) {
    separator.parentElement.insertBefore(
      iconArea,
      separator.nextElementSibling,
    );
  } else {
    logger.error(
      new Error('addCompanionThreadIconArea: failed to find separator'),
    );
    tabList.insertAdjacentElement('beforebegin', iconArea);
  }
}

export default defn(module, addCompanionThreadIconArea);
