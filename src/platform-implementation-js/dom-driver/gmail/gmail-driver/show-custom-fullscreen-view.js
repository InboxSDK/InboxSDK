var GmailElementGetter = require('../gmail-element-getter');

function showCustomFullscreenView(gmailDriver, element){

	var contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	var customViewContainerElement = _getCustomViewContainerElement(contentSectionElement);
	customViewContainerElement.appendChild(element);

	var children = contentSectionElement.children;
	Array.prototype.forEach.call(children, function(child){
		if(child.classList.contains('inboxsdk__custom_view')){
			return;
		}

		child.style.display = 'none';
	});

}


function _getCustomViewContainerElement(contentSectionElement){

	var customViewContainerElement = contentSectionElement.querySelector('.inboxsdk__custom_view');
	if(customViewContainerElement){
		return customViewContainerElement;
	}

	customViewContainerElement = document.createElement('div');
	customViewContainerElement.classList.add('inboxsdk__custom_view');

	contentSectionElement.appendChild(customViewContainerElement);

	return customViewContainerElement;
}

module.exports = showCustomFullscreenView;
