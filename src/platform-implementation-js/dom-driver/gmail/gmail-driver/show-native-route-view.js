var GmailElementGetter = require('../gmail-element-getter');

module.exports = function(gmailDriver, element){

	var contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	var children = contentSectionElement.children;
	Array.prototype.forEach.call(children, function(child){
		child.style.display = '';
	});

};
