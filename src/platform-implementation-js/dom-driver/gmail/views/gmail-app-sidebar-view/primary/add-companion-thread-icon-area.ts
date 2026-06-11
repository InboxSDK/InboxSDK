import { defn } from 'ud';
import type Logger from '../../../../../lib/logger';
import waitFor from '../../../../../lib/wait-for';

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
) {
  let tabList: Element | null;

  try {
    tabList = await waitFor(
      () => companionSidebarIconContainerEl.querySelector(TAB_LIST_SELECTOR),
      5000,
    );
  } catch (e) {
    logger.error(new Error('addCompanionThreadIconArea: no tablist'));
    return;
  }

  const separator =
    companionSidebarIconContainerEl.querySelector('[role=separator]');

  if (!separator) {
    logger.error(
      new Error('addCompanionThreadIconArea: failed to find separator'),
    );
    tabList.insertAdjacentElement('beforebegin', iconArea);
  } else {
    if (!separator.parentElement) throw new Error();
    separator.parentElement.insertBefore(
      iconArea,
      separator.nextElementSibling,
    );
  }
}

export default defn(module, addCompanionThreadIconArea);
