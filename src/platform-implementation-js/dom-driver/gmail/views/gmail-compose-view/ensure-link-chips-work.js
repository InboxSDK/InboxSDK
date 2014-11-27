var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('RSVP');

var isNodeInRange = require('../../../../lib/dom/is-node-in-range');

var extId = ''+Math.random();

var Z_SPACE_CHAR = '\u200b';

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();
    var fixupCursorFunction = _.once(_fixupCursor.bind(null, gmailComposeView));

    var bodyChangedStream = gmailComposeView.getEventStream().startWith({eventName: 'bodyChanged'}).filter(function(event){
        return event.eventName === 'bodyChanged';
    }).debounceImmediate(100).takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd());


    bodyChangedStream.onValue(function(){
        var chips = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
        var chipContainerChain =  _.chain(chips).map(_getChipContainer);

        chipContainerChain
            .filter(_isNotEnhanced)
            .each(_addEnhancements)
            .each(fixupCursorFunction);

        chipContainerChain.each(_checkAndRemoveBrokenChip.bind(null, gmailComposeView));
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

function _checkChipZSpaceSharing(gmailComposeView){
    var range = document.getSelection().getRangeAt(0);

    if(range.startContainer.nodeType !== 3){
        return;
    }

    var triggerZone = _getTriggerZone(range.startContainer, range.startOffset);

    if(triggerZone === 'Z_SPACE_0'){
        _cleanOutBrokenChip(gmailComposeView, range.startContainer.nextSibling, ['MISSING_PREVIOUS_SIBLING']);
    }
    else if(triggerZone === 'Z_SPACE_1'){
        _cleanOutBrokenChip(gmailComposeView, range.startContainer.previousSibling, ['MISSING_NEXT_SIBLING']);
    }
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

    _checkAndFix(range, range.startContainer, range.startOffset, 'setStart', movementType);
    _checkAndFix(range, range.endContainer, range.endOffset, 'setEnd', movementType);
}

function _checkAndFix(range, container, offset, boundaryAction, movementType){

    if(container.nodeType !== 3){
        return;
    }

    var triggerZone = _getTriggerZone(container, offset);

    if(!triggerZone){
        return;
    }

    _fixRangeOutOfTriggerZone(triggerZone, range, container, boundaryAction, movementType);
}

function _getTriggerZone(textNode, offset){

    if(textNode.nextSibling && textNode.nextSibling._linkChipEnhancedByThisExtension && offset === textNode.textContent.length && textNode.textContent.charAt(offset - 1) === Z_SPACE_CHAR ){
        return 'Z_SPACE_0';
    }
    else if(textNode.previousSibling && textNode.previousSibling._linkChipEnhancedByThisExtension && offset === 0 && textNode.textContent.charAt(0) === Z_SPACE_CHAR){
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


function _checkAndRemoveBrokenChip(gmailComposeView, chipElement){
    if(!chipElement._linkChipEnhancedByThisExtension){
        return;
    }

    var brokenModes = _getBrokenModes(chipElement);

    if(brokenModes.length > 0){
        _cleanOutBrokenChip(gmailComposeView, chipElement, brokenModes);
    }
}

function _getBrokenModes(chipElement){
    var brokenModes = [];
    if(chipElement.previousSibling){
        if(chipElement.previousSibling.nodeType === 3){
            if(chipElement.previousSibling.textContent.charAt(chipElement.previousSibling.length - 1) !== Z_SPACE_CHAR){
                brokenModes.push('PREVIOUS_SIBLING_MISSING_Z_SPACE_CHAR');
            }
        }
        else{
            brokenModes.push('PREVIOUS_SIBLING_NOT_TEXT_NODE');
        }
    }
    else{
        brokenModes.push('MISSING_PREVIOUS_SIBLING');
    }

    if(chipElement.nextSibling){
        if(chipElement.nextSibling.nodeType === 3){
            if(chipElement.nextSibling.textContent.charAt(0) !== Z_SPACE_CHAR){
                brokenModes.push('NEXT_SIBLING_MISSING_Z_SPACE_CHAR');
            }
        }
        else{
            brokenModes.push('NEXT_SIBLING_NOT_TEXT_NODE');
        }
    }
    else{
        brokenModes.push('MISSING_NEXT_SIBLING');
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

    if(isNodeInRange(chipElement, gmailComposeView.getSelectionRange())){
        _fixRange(chipElement, range);
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

    textNode.textContent = textNode.textContent.substring(0, textNode.textContent.length - 1);
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

function _fixRange(node, range){
    var parent = node.parentNode;
    var currentIndex = Array.prototype.indexOf.call(parent.childNodes, node);

    range.setStart(parent, Math.max(currentIndex - 1, 0));
}
