var _ = require('lodash');

module.exports = function(gmailComposeView, options){
	if(!gmailComposeView.getAdditionalAreas().outerSidebar){
		_createOuterSidebar(gmailComposeView);
	}

	gmailComposeView.getAdditionalAreas().outerSidebar.querySelector('.inboxsdk__compose_outerSidebar_header').innerHTML = _.escape(options.title);
	gmailComposeView.getAdditionalAreas().outerSidebar.querySelector('.inboxsdk__compose_outerSidebar_footer').appendChild(options.el);
};

function _createOuterSidebar(gmailComposeView){
	var outerSidebar = document.createElement('div');
	outerSidebar.classList.add('inboxsdk__compose_outerSidebar_wrapper');

	var header = document.createElement('div');
	header.classList.add('inboxsdk__compose_outerSidebar_header');
	outerSidebar.appendChild(header);

	var body = document.createElement('div');
	body.classList.add('inboxsdk__compose_outerSidebar_body');
	outerSidebar.appendChild(body);

	var footer = document.createElement('div');
	footer.classList.add('inboxsdk__compose_outerSidebar_footer');
	footer.classList.add('aDh');
	outerSidebar.append(footer);

	gmailComposeView.getElement().appendChild(outerSidebar);
	gmailComposeView.getAdditionalAreas().outerSidebar = outerSidebar;

	document.body.classList.add('inboxsdk__outerSidebarActive');
	gmailComposeView.getElement().addClass('inboxsdk__compose_outerSidebarActive');
}
