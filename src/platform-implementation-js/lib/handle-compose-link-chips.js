/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import {defn} from 'ud';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';

const extId = ''+Math.random();

const Z_SPACE_CHAR = '\u200b';
const X_URL = 'https://ssl.gstatic.com/ui/v1/icons/common/x_8px.png';

const handleComposeLinkChips = defn(module, function(composeView: ComposeViewDriver) {
  // Abort if we're missing elements we'll need.
  try {
    composeView.getBodyElement();
  } catch(err) {
    return;
  }

  const mainElement = composeView.getElement();
  _waitToClaim(mainElement)
    .takeUntilBy(composeView.getStopper())
    .onValue(() => {
      mainElement.classList.add('inboxsdk__ensure_link_active');
      composeView.getStopper().onValue(() => {
        mainElement.classList.remove('inboxsdk__ensure_link_active');
      });

      const bodyElement = composeView.getBodyElement();
      const fixupCursorFunction = _.once(_fixupCursor.bind(null, composeView));

      composeView.getEventStream()
        .filter(event => event.eventName === 'bodyChanged')
        .toProperty(()=>null)
        .debounce(100, {immediate:true})
        .takeUntilBy(composeView.getStopper())
        .onValue(() => {
          doFixing(composeView, bodyElement, fixupCursorFunction);
        });

      composeView.getEventStream()
        .filter(event => event.eventName === 'presending')
        .onValue(() => {
          doPresendFixing(composeView, bodyElement);
        });

    });
});
export default handleComposeLinkChips;

const doFixing = defn(module, function(composeView: ComposeViewDriver, bodyElement: HTMLElement, fixupCursorFunction: ()=>void) {
  const chips = _getChipElements(bodyElement);

  _.chain(chips)
    .filter(_isNotEnhanced)
    .each(_addEnhancements)
    .each(fixupCursorFunction)
    .value();

  _.chain(chips)
    .filter(_isOurEnhanced)
    .each(_checkAndRemoveBrokenChip.bind(null, composeView))
    .value();
}, 'doFixing');

const doPresendFixing = defn(module, function(composeView: ComposeViewDriver, bodyElement: HTMLElement) {
  const chips = _getChipElements(bodyElement);
  _.chain(chips)
    .filter(_isOurEnhanced)
    .each(chip => {
      const xBtn = chip.querySelector(`img[src="${X_URL}"]`);
      if (xBtn) {
        xBtn.remove();
      }
      const title = chip.querySelector('a > span');
      if (title) {
        title.style.textDecoration = 'none';
      }
    })
    .value();
}, 'doPresendFixing');

function _getChipElements(bodyElement: HTMLElement): HTMLElement[] {
  const chipInnerEls = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
  return _.map(chipInnerEls, x => x.parentElement);
}

function _waitToClaim(el: HTMLElement): Kefir.Stream<boolean> {
  return Kefir.later(0).merge(
      makeMutationObserverChunkedStream(el, {attributes: true, attributeFilter: ['class']})
    )
    .map(() => !el.classList.contains('inboxsdk__ensure_link_active'))
    .filter(Boolean)
    .take(1);
}

function _isNotEnhanced(chipElement: HTMLElement): boolean {
    var claim = chipElement.getAttribute('data-sdk-linkchip-claimed');
    if (extId === claim) {
      return !(chipElement:any)._linkChipEnhancedByThisExtension;
    }
    return claim == null;
}

function _addEnhancements(chipElement: HTMLElement) {
    var anchor = chipElement.querySelector('a');
    if (anchor) {
      anchor.addEventListener('mousedown', function(e) {
        e.stopImmediatePropagation();
      }, true);
      anchor.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
      }, true);
    }

    const xElement = document.createElement('img');
    xElement.src = X_URL;
    xElement.setAttribute('style', 'opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px;');

    xElement.addEventListener('mousedown', function(e){
        (chipElement:any).remove();
    }, true);

    xElement.addEventListener('click', function(e){
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);


    chipElement.addEventListener(
        'mouseenter',
        function(){
            chipElement.appendChild(xElement);
            chipElement.querySelector('a > span').style.textDecoration = 'underline';
        }
    );

    chipElement.addEventListener(
        'mouseleave',
        function(){
            (xElement:any).remove();
            chipElement.querySelector('a > span').style.textDecoration = 'none';
        }
    );

    chipElement.addEventListener(
        'mousedown',
        function(e){
            e.preventDefault();
        }
    );

    chipElement.contentEditable = 'false';
    chipElement.setAttribute('data-sdk-linkchip-claimed', extId);
    (chipElement:any)._linkChipEnhancedByThisExtension = true;

    (chipElement:any)._previousSpacerTextNode = chipElement.previousSibling;
    (chipElement:any)._nextSpacerTextNode = chipElement.nextSibling;
}

function _fixupCursor(composeView: ComposeViewDriver){
    var stopper = composeView.getStopper();
    var keydownStream = Kefir.fromEvents(composeView.getBodyElement(), 'keydown')
      .takeUntilBy(stopper);

    keydownStream
            .filter(_isBackspaceOrDelete)
            .delay(1)
            .filter(_rangeStillExists)
            .onValue(() => _checkChipZSpaceSharing(composeView));

    keydownStream
            .filter(_isArrowKey)
            .delay(1)
            .filter(_rangeStillExists)
            .map(_getMovementType)
            .onValue(type => _fixupRange(type));

    Kefir.fromEvents(composeView.getBodyElement(), 'mouseup')
         .takeUntilBy(stopper)
         .delay(1)
         .filter(_rangeStillExists)
         .map(x => 'VERTICAL')
         .onValue(type => _fixupRange(type));
}

function _isArrowKey(event){
    return event.which > 36 && event.which < 41;
}

function _isBackspaceOrDelete(event){
    return event.which === 8 || event.which === 46;
}

function _rangeStillExists(){
    return (document:any).getSelection() && (document:any).getSelection().rangeCount > 0;
}

function _getMovementType(event){
    var keyCode = event.which;
    if(keyCode === 38 || keyCode === 40){
        return 'VERTICAL';
    }
    else if(keyCode === 37 || keyCode === 39) {
        return event.metaKey || event.altKey ? 'VERTICAL' : 'HORIZONTAL';
    }

    return 'HORIZONTAL';
}


function _fixupRange(movementType: string) {
    var range = (document:any).getSelection().getRangeAt(0);

    _checkAndFixRange(range, range.startContainer, range.startOffset, 'setStart', movementType);
    _checkAndFixRange(range, range.endContainer, range.endOffset, 'setEnd', movementType);
}

function _checkAndFixRange(range, container, offset, boundaryAction, movementType){

    if(container.nodeType !== Node.TEXT_NODE){
        return;
    }

    var triggerZone = _getTriggerZone(container, offset);

    if(!triggerZone){
        return;
    }

    _fixRangeOutOfTriggerZone(triggerZone, range, container, boundaryAction, movementType);
}

function _getTriggerZone(textNode, offset){

    if(textNode.nextSibling &&
        textNode.nextSibling._linkChipEnhancedByThisExtension &&
        offset === textNode.nodeValue.length &&
        textNode.nodeValue.charAt(offset - 1) === Z_SPACE_CHAR )
    {
        return 'Z_SPACE_0';
    }
    else if(textNode.previousSibling &&
        textNode.previousSibling._linkChipEnhancedByThisExtension &&
        offset === 0 &&
        textNode.nodeValue.charAt(0) === Z_SPACE_CHAR)
    {
        return 'Z_SPACE_1';
    }
    else{
        return null;
    }
}

function _fixRangeOutOfTriggerZone(triggerZone, range, textNode, boundaryAction, movementType){
    if(triggerZone === 'Z_SPACE_0'){
        if(movementType === 'VERTICAL'){
            range[boundaryAction](textNode, textNode.length - 1); //move to just before zSpace char
        }
        else{
            range[boundaryAction](textNode.nextSibling.nextSibling, 1);
        }
    }
    else if(triggerZone === 'Z_SPACE_1'){
        if(movementType === 'VERTICAL'){
            range[boundaryAction](textNode, 1);
        }
        else{
            range[boundaryAction](textNode.previousSibling.previousSibling, textNode.previousSibling.previousSibling.length - 1);
        }
    }

    (document:any).getSelection().removeAllRanges();
    (document:any).getSelection().addRange(range);
}

function _isOurEnhanced(chipElement: HTMLElement): boolean {
    return !!(chipElement:any)._linkChipEnhancedByThisExtension;
}

function _checkChipZSpaceSharing(composeView: ComposeViewDriver){
    var range = (document:any).getSelection().getRangeAt(0);

    if(range.startContainer.nodeType !== Node.TEXT_NODE){
        return;
    }

    var triggerZone = _getTriggerZone(range.startContainer, range.startOffset);

    if(triggerZone === 'Z_SPACE_0'){
        _cleanOutBrokenChip(composeView,
                            range.startContainer.nextSibling /* chip element */,
                            ['MISSING_PREVIOUS_SIBLING'] /* don't remove ambiguous z_space */);
    }
    else if(triggerZone === 'Z_SPACE_1'){
        _cleanOutBrokenChip(composeView,
                            range.startContainer.previousSibling /* chip element */,
                            ['MISSING_NEXT_SIBLING'] /* don't remove ambiguous z_space */);
    }
}

function _checkAndRemoveBrokenChip(composeView: ComposeViewDriver, chipElement: HTMLElement) {
    _fixupBlockquotes(chipElement);
    _fixupStyling(chipElement);
    _fixupTriggerZones(chipElement);
    var brokenModes = _getBrokenModes(chipElement);

    if(brokenModes.length > 0){
        _cleanOutBrokenChip(composeView, chipElement, brokenModes);
    }
}

function _fixupBlockquotes(chipElement: HTMLElement) {
    if(
      !(chipElement:any)._previousSpacerTextNode ||
      (chipElement:any)._nextSpacerTextNode
    ) return;

    //our text nodes have a previous and next sibling, so it's not the blockquote case
    if (
      (chipElement:any)._previousSpacerTextNode.nextSibling ||
      (chipElement:any)._nextSpacerTextNode.previousSibling
    ) {
        return;
    }

    chipElement.insertAdjacentHTML('beforebegin', Z_SPACE_CHAR);
    chipElement.insertAdjacentHTML('afterend', Z_SPACE_CHAR);

    (chipElement:any)._previousSpacerTextNode = chipElement.previousSibling;
    (chipElement:any)._nextSpacerTextNode = chipElement.nextSibling;
}

function _fixupStyling(chipElement: HTMLElement){
    chipElement.setAttribute('style', 'width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245);');
}

function _fixupTriggerZones(chipElement: HTMLElement) {
    var inNonTextNode = false;
    var children;
    var ii;
    var newTextNode;

    var previousSibling = chipElement.previousSibling;
    for(ii=0; ii<10000; ii++){
        if(!previousSibling){
            break;
        }

        if(previousSibling.nodeType === Node.TEXT_NODE){
            if(previousSibling.nodeValue.charAt(previousSibling.nodeValue.length - 1) === Z_SPACE_CHAR){
                if(inNonTextNode){
                    previousSibling.nodeValue = previousSibling.nodeValue.substring(0, previousSibling.nodeValue.length - 1);
                    chipElement.insertAdjacentHTML('beforebegin', Z_SPACE_CHAR);
                }
            }
            break;
        }

        children = previousSibling.childNodes;
        if(children.length ===  0){
            break;
        }

        previousSibling = children[children.length - 1];
        inNonTextNode = true;
    }

    inNonTextNode = false;
    var nextSibling = chipElement.nextSibling;
    for(ii=0; ii<10000; ii++){
        if(!nextSibling){
            break;
        }

        if(nextSibling.nodeType === Node.TEXT_NODE){
            if(nextSibling.nodeValue.charAt(0) === Z_SPACE_CHAR){
                if(inNonTextNode){
                    nextSibling.nodeValue = nextSibling.nodeValue.substring(1);
                    chipElement.insertAdjacentHTML('afterend', Z_SPACE_CHAR);
                }
            }

            break;
        }

        children = nextSibling.childNodes;
        if(children.length ===  0){
            break;
        }

        inNonTextNode = true;
        nextSibling = children[0];
    }
}

/* purposefully doesn't handle ambiguous case where you have Z_SPACE linkChip Z_SPACE linkChip Z_SPACE */
function _getBrokenModes(chipElement: HTMLElement): string[] {
    var brokenModes = [];
    var children;
    var ii;

    var previousSibling = chipElement.previousSibling;
    for(ii=0; ii<10000; ii++){
        if(!previousSibling){
            brokenModes.push('MISSING_PREVIOUS_SIBLING');
            break;
        }

        if(previousSibling.nodeType === Node.TEXT_NODE){
            if(previousSibling.nodeValue.charAt(previousSibling.nodeValue.length - 1) !== Z_SPACE_CHAR){
                brokenModes.push('PREVIOUS_SIBLING_MISSING_Z_SPACE_CHAR');
            }
            break;
        }

        children = previousSibling.childNodes;
        if(children.length ===  0){
            brokenModes.push('MISSING_PREVIOUS_SIBLING');
            break;
        }

        previousSibling = children[children.length - 1];
    }

    var nextSibling = chipElement.nextSibling;
    for(ii=0; ii<10000; ii++){
        if(!nextSibling){
            brokenModes.push('MISSING_NEXT_SIBLING');
            break;
        }

        if(nextSibling.nodeType === Node.TEXT_NODE){
            if(nextSibling.nodeValue.charAt(0) !== Z_SPACE_CHAR){
                brokenModes.push('NEXT_SIBLING_MISSING_Z_SPACE_CHAR');
            }

            break;
        }

        children = nextSibling.childNodes;
        if(children.length ===  0){
            brokenModes.push('MISSING_NEXT_SIBLING');
            break;
        }

        nextSibling = children[0];
    }

    return brokenModes;
}

function _cleanOutBrokenChip(composeView: ComposeViewDriver, chipElement: HTMLElement, brokenModes: string[]) {
    if(_doesZSpaceZeroExist(brokenModes)){
        _removeZSpaceZero(chipElement);
    }

    if(_doesZSpaceOneExist(brokenModes)){
        _removeZSpaceOne(chipElement);
    }

    (chipElement:any).remove();
    composeView.focus();
}

function _doesZSpaceZeroExist(brokenModes: string[]): boolean {
    return brokenModes.indexOf('MISSING_PREVIOUS_SIBLING') === -1 &&
            brokenModes.indexOf('PREVIOUS_SIBLING_NOT_TEXT_NODE') === -1 &&
            brokenModes.indexOf('PREVIOUS_SIBLING_MISSING_Z_SPACE_CHAR') === -1;
}

function _removeZSpaceZero(chipElement, range){
    var textNode = chipElement.previousSibling;
    if(textNode){
      textNode.nodeValue = textNode.nodeValue.substring(0, textNode.textContent.length - 1);
    }
}

function _doesZSpaceOneExist(brokenModes: string[]): boolean {
    return brokenModes.indexOf('MISSING_NEXT_SIBLING') === -1 &&
            brokenModes.indexOf('NEXT_SIBLING_NOT_TEXT_NODE') === -1 &&
            brokenModes.indexOf('NEXT_SIBLING_MISSING_Z_SPACE_CHAR') === -1;
}

function _removeZSpaceOne(chipElement: HTMLElement){
    var textNode = chipElement.nextSibling;
    if(textNode){
      textNode.textContent = textNode.textContent.substring(1);
    }
}
