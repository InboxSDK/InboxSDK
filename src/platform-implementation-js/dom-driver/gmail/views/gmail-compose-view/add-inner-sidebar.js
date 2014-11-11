module.exports = function(gmailComposeView, options){
	if(!gmailComposeView.getAdditionalAreas().innerSidebar){
		_createInnerSidebar(gmailComposeView);
	}

	gmailComposeView.getAdditionalAreas().innerSidebar.appendChild(options.el);
};

function _createInnerSidebar(gmailComposeView){
	var sidebar = document.createElement('div');
	sidebar.classList.add('inboxsdk__compose_innerSidebar');

	var borderColor = gmailComposeView.getElement().querySelector('.aoD').getComputedStyle().getPropertyValue('border-bottom-color');

	sidebar.style.borderLeft = '1px solid ' + borderColor;
	sidebar.style.borderBottom = '1px solid ' + borderColor;

	gmailComposeView.getElement().querySelector('.I5').appendChild(sidebar);
	gmailComposeView.getElement().classList.add('inboxsdk__compose_innerSidebarActive');

	gmailComposeView.getAdditionalAreas().innerSidebar = sidebar;
}
