var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');

var extId = ''+Math.random();

var Z_SPACE_CHAR = '\u200b';

module.exports = function(gmailComposeView){
    var mainElement = gmailComposeView.getElement();
    if(mainElement.classList.contains('inboxsdk__ensure_link_active')){
        return;
    }
    mainElement.classList.add('inboxsdk__ensure_link_active');


    var bodyElement = gmailComposeView.getBodyElement();
    var fixupCursorFunction = _.once(_fixupCursor.bind(null, gmailComposeView));

    gmailComposeView
        .getEventStream()
        .startWith({eventName: 'bodyChanged'})
        .filter(function(event){
            return event.eventName === 'bodyChanged';
        })
        .debounceImmediate(100)
        .takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
        .onValue(function(){
            var chips = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
            var chipContainerChain =  _.chain(chips).map(_getChipContainer);

            chipContainerChain
                .filter(_isNotEnhanced)
                .each(_addEnhancements)
                .each(fixupCursorFunction).value();

            chipContainerChain
                .filter(_isOurEnhanced)
                .each(_checkAndRemoveBrokenChip.bind(null, gmailComposeView)).value();
        });

};

function _getChipContainer(span){
    return span.parentElement;
}

function _isNotEnhanced(chipElement){
    var claim = chipElement.getAttribute('data-sdk-linkchip-claimed');
    if (extId === claim) {
      return !chipElement._linkChipEnhancedByThisExtension;
    }
    return claim == null;
}


function _addEnhancements(chipElement){
    var anchor = chipElement.querySelector('a');
    if (anchor) {
      anchor.addEventListener('mousedown', function(e) {
        e.stopImmediatePropagation();
      }, true);
      anchor.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
      }, true);
    }

    var xElement = document.createElement('div');
    xElement.innerHTML = '<img src="//ssl.gstatic.com/ui/v1/icons/common/x_8px.png" style="opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px;">';
    xElement = xElement.children[0];

    xElement.addEventListener('mousedown', function(e){
        chipElement.remove();
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
            xElement.remove();
            chipElement.querySelector('a > span').style.textDecoration = 'none';
        }
    );

    chipElement.addEventListener(
        'mousedown',
        function(e){
            e.preventDefault();
        }
    );

    chipElement.contentEditable = false;
    chipElement.setAttribute('data-sdk-linkchip-claimed', extId);
    chipElement._linkChipEnhancedByThisExtension = true;

    chipElement._previousSpacerTextNode = chipElement.previousSibling;
    chipElement._nextSpacerTextNode = chipElement.nextSibling;
}

function _fixupCursor(gmailComposeView){
    var keydownStream = Bacon.fromEventTarget(gmailComposeView.getBodyElement(), 'keydown')
                            .takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd());

    keydownStream
            .filter(_isBackspaceOrDelete)
            .delay(1)
            .filter(_rangeStillExists)
            .onValue(_checkChipZSpaceSharing.bind(null, gmailComposeView));

    keydownStream
            .filter(_isArrowKey)
            .delay(1)
            .filter(_rangeStillExists)
            .map(_getMovementType)
            .onValue(_fixupRange);

    Bacon.fromEventTarget(gmailComposeView.getBodyElement(), 'mouseup')
         .takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
         .delay(1)
         .filter(_rangeStillExists)
         .map('VERTICAL')
         .onValue(_fixupRange);
}

function _isArrowKey(event){
    return event.which > 36 && event.which < 41;
}

function _isBackspaceOrDelete(event){
    return event.which === 8 || event.which === 46;
}

function _rangeStillExists(){
    return document.getSelection() && document.getSelection().rangeCount > 0;
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


function _fixupRange(movementType){
    var range = document.getSelection().getRangeAt(0);

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

    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
}

function _isOurEnhanced(chipElement){
    return chipElement._linkChipEnhancedByThisExtension;
}

function _checkChipZSpaceSharing(gmailComposeView){
    var range = document.getSelection().getRangeAt(0);

    if(range.startContainer.nodeType !== Node.TEXT_NODE){
        return;
    }

    var triggerZone = _getTriggerZone(range.startContainer, range.startOffset);

    if(triggerZone === 'Z_SPACE_0'){
        _cleanOutBrokenChip(gmailComposeView,
                            range.startContainer.nextSibling /* chip element */,
                            ['MISSING_PREVIOUS_SIBLING'] /* don't remove ambiguous z_space */);
    }
    else if(triggerZone === 'Z_SPACE_1'){
        _cleanOutBrokenChip(gmailComposeView,
                            range.startContainer.previousSibling /* chip element */,
                            ['MISSING_NEXT_SIBLING'] /* don't remove ambiguous z_space */);
    }
}

function _checkAndRemoveBrokenChip(gmailComposeView, chipElement){
    _fixupBlockquotes(chipElement);
    _fixupStyling(chipElement);
    _fixupTriggerZones(chipElement);
    var brokenModes = _getBrokenModes(chipElement);

    if(brokenModes.length > 0){
        _cleanOutBrokenChip(gmailComposeView, chipElement, brokenModes);
    }
}

function _fixupBlockquotes(chipElement){
    //our text nodes have a previous and next sibling, so it's not the blockquote case
    if(chipElement._previousSpacerTextNode.nextSibling || chipElement._nextSpacerTextNode.previousSibling){
        return;
    }

    chipElement.insertAdjacentText('beforebegin', Z_SPACE_CHAR);
    chipElement.insertAdjacentText('afterend', Z_SPACE_CHAR);

    chipElement._previousSpacerTextNode = chipElement.previousSibling;
    chipElement._nextSpacerTextNode = chipElement.nextSibling;
}

function _fixupStyling(chipElement){
    chipElement.setAttribute('style', 'width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245);');
}

function _fixupTriggerZones(chipElement){
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
                    chipElement.insertAdjacentText('beforebegin', Z_SPACE_CHAR);
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
                    chipElement.insertAdjacentText('afterend', Z_SPACE_CHAR);
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
function _getBrokenModes(chipElement){
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
            if(previousSibling.nodeValue.charAt(previousSibling.length - 1) !== Z_SPACE_CHAR){
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

function _cleanOutBrokenChip(gmailComposeView, chipElement, brokenModes){
    if(_doesZSpaceZeroExist(brokenModes)){
        _removeZSpaceZero(chipElement);
    }

    if(_doesZSpaceOneExist(brokenModes)){
        _removeZSpaceOne(chipElement);
    }

    chipElement.remove();

    if(document.getSelection().rangeCount === 0 && gmailComposeView.getSelectionRange()){
        document.getSelection().addRange(gmailComposeView.getSelectionRange());
    }
}

function _doesZSpaceZeroExist(brokenModes){
    return brokenModes.indexOf('MISSING_PREVIOUS_SIBLING') === -1 &&
            brokenModes.indexOf('PREVIOUS_SIBLING_NOT_TEXT_NODE') === -1 &&
            brokenModes.indexOf('PREVIOUS_SIBLING_MISSING_Z_SPACE_CHAR') === -1;
}

function _removeZSpaceZero(chipElement, range){
    var textNode = chipElement.previousSibling;

    textNode.nodeValue = textNode.nodeValue.substring(0, textNode.textContent.length - 1);
}

function _doesZSpaceOneExist(brokenModes){
    return brokenModes.indexOf('MISSING_NEXT_SIBLING') === -1 &&
            brokenModes.indexOf('NEXT_SIBLING_NOT_TEXT_NODE') === -1 &&
            brokenModes.indexOf('NEXT_SIBLING_MISSING_Z_SPACE_CHAR') === -1;
}

function _removeZSpaceOne(chipElement){
    var textNode = chipElement.nextSibling;

    textNode.textContent = textNode.textContent.substring(1);
}
