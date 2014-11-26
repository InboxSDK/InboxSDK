var _ = require('lodash');
var Bacon = require('baconjs');

var extId = ''+Math.random();

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();
    var fixupCursorFunction = _.once(_fixupCursor.bind(null, gmailComposeView))


    gmailComposeView.getEventStream().startWith({eventName: 'bodyChanged'}).filter(function(event){
        return event.eventName === 'bodyChanged';
    }).debounceImmediate(100).onValue(function(){
        var chips = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
        _.chain(chips)
            .map(_getChipContainer)
            .filter(_isNotEnhanced)
            .each(_addEnhancements)
            .each(fixupCursorFunction);
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

    var keydownStream = Bacon.fromEventTarget(gmailComposeView.getBodyElement(), 'keydown');

    var streamAction = _checkAndAction.bind(null, keydownStream);

    streamAction(37, 'LEFT', _moveCursor); //left arrow
    streamAction(39, 'RIGHT', _moveCursor); //right arrow

    streamAction(8, 'LEFT', _delete); //backspace
    streamAction(46, 'RIGHT', _delete); //"delete"

}

function _checkAndAction(keyupStream, keyCode, direction, action){
    keyupStream.filter(function(event){
        return event.which === keyCode;
    }).onValue(function(event){

        var range = document.getSelection().getRangeAt(0);
        if(!range.startContainer){
            return;
        }

        var siblingProperty = direction === 'LEFT' ? 'previousSibling' : 'nextSibling';


        var container;
        if(direction === 'LEFT'){
            container = range.startContainer;
        }
        else{
            container = range.endContainer;
        }

        if(!range.collapsed && event.shiftKey){

        }

        var wasCollapsed;

        if(_isNeedToJumpLeftFromTextNode(siblingProperty, range, container)){
            wasCollapsed = _updateRangeToJumpLeftFromTextNode(range, container);
        }
        else if(_isNeedToJumpRightFromTextNode(siblingProperty, range, container)){
            wasCollapsed =_updateRangeToJumpRightFromTextNode(range, container);
        }
        else if(_isNeedToJumpLeftInElement(siblingProperty, range, container)){
            wasCollapsed = _updateRangeToJumpLeftFromTextNode(range, container.childNodes[range.startOffset-1]);
        }
        else{
            return;
        }

        action(range, wasCollapsed && !event.shiftKey, siblingProperty === 'previousSibling');
        event.preventDefault();
    });
}

function _isNeedToJumpLeftFromTextNode(siblingProperty, range, textNode){
    if(textNode.nodeType !== 3){
        return false;
    }

    if(siblingProperty !== 'previousSibling'){
        return false;
    }

    if(range.startOffset > 1){
        return false;
    }

    if(textNode.textContent.charAt(0) !== '\u200b'){
        return false;
    }

    return _siblingCheck(siblingProperty, textNode);
}

function _isNeedToJumpRightFromTextNode(siblingProperty, range, textNode){
    if(textNode.nodeType !== 3){
        return false;
    }

    if(siblingProperty !== 'nextSibling'){
        return false;
    }

    if(range.endOffset < textNode.length - 2){
        return false;
    }

    if(textNode.textContent.charAt(textNode.length - 1) !== '\u200b'){
        return false;
    }

    return _siblingCheck(siblingProperty, textNode);
}

function _isNeedToJumpLeftInElement(siblingProperty, range, container){
    if(siblingProperty !== 'previousSibling'){
        return false;
    }

    if(container.nodeType === 3){
        return false;
    }

    if(range.startOffset < 3){
        return false;
    }

    var textNode = container.childNodes[range.startOffset-1];
    if(textNode.nodeType !== 3){
        return false;
    }

    if(textNode.textContent !== '\u200b'){
        return false;
    }

    return _siblingCheck(siblingProperty, textNode);
}

function _siblingCheck(siblingProperty, node){
    if(!node[siblingProperty]){
        return false;
    }

    if(!node[siblingProperty]._linkChipEnhancedByThisExtension){
        return false;
    }

    if(!node[siblingProperty][siblingProperty]){
        return false;
    }

    return true;
}

function _updateRangeToJumpLeftFromTextNode(range, textNode){
    var newTextNode = textNode.previousSibling.previousSibling;
    var offset = newTextNode.length - 1;

    return _updateRangeFromTextNode(range, 'setStart', newTextNode, offset, true);
}

function _updateRangeToJumpRightFromTextNode(range, textNode){
    var newTextNode = textNode.nextSibling.nextSibling;
    var offset = 1;

    return _updateRangeFromTextNode(range, 'setEnd', newTextNode, offset);
}

function _updateRangeFromTextNode(range, boundaryPoint, newTextNode, offset, collapseToStart){
    var isCollapsed = range.collapsed;
    range[boundaryPoint](newTextNode, offset);

    return isCollapsed;
}


function _moveCursor(range, shouldCollapse, collapseToStart){
    if(shouldCollapse){
        range.collapse(collapseToStart);
    }

    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
}

function _delete(range){
    range.deleteContents();
}
