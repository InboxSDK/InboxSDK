/* @flow */

import _ from 'lodash';
import findParent from '../../../../lib/dom/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  return Array.from(root.querySelectorAll(
    `
    div[data-msg-id] section > div > div[tabindex][title],
    div[jsaction*="update_chip_carousel_arrows"] div[role=listitem][title][jsaction*="preview_attachments"]
    `
  ));
}
