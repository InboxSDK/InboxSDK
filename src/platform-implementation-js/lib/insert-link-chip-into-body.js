/* @flow */

import RSVP from 'rsvp';
import * as ud from 'ud';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';
import autoHtml from 'auto-html';

var insertLinkChipIntoBody = ud.defn(module, function(composeViewDriver: ComposeViewDriver, options: Object): HTMLElement {
    composeViewDriver.focus();

    var chipElement = _getChipElement(options);

    // Gmail compose treats text directly bordering the chipElement weirdly in
    // regards to cursor movement, so surround the chip with newlines which
    // makes Gmail act up a little less.
    var frag = (document:any).createDocumentFragment();
    frag.appendChild(document.createTextNode('\u200b'));
    frag.appendChild(chipElement);
    frag.appendChild(document.createTextNode('\u200b'));

    composeViewDriver.insertBodyHTMLAtCursor(frag);

    if(!composeViewDriver.isFullscreen() && !composeViewDriver.isInlineReplyForm() && document.activeElement !== composeViewDriver.getBodyElement()){
        composeViewDriver.setMinimized(true);
        composeViewDriver.setMinimized(false);
    }

    composeViewDriver.focus();

    return chipElement;
});
export default insertLinkChipIntoBody;

function _getChipElement(options: Object): HTMLElement {
    var chipElement = document.createElement("div");

    var iconHtml: string = options.iconUrl ? autoHtml `
<img style="height:16px; width:16px; vertical-align: bottom; border: none;" height="16px" width="16px" src="${options.iconUrl}">&nbsp;
` : '';
    var chipHTML: string = autoHtml `
<div contenteditable="false" class="inboxsdk__compose_linkChip"
style="width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245);" hspace="inboxsdk__chip_main">
  <a href="${options.url}" target="_blank" style=" display:inline-block; max-width: 366px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-height: 1.2em; text-decoration: none; cursor: pointer; padding: 1px 0; border: none; ">
    ${{__html:iconHtml}}
    <span dir="ltr" style="color: rgb(17, 85, 204); text-decoration: none; vertical-align: bottom;">${options.text}</span>
  </a>
</div>
`;
    chipElement.innerHTML = chipHTML;
    return (chipElement.children[0]:any);
}
