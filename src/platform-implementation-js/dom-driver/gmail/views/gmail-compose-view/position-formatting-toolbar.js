module.exports = function(gmailComposeView){
	if(gmailComposeView.getFormattingToolbar() && gmailComposeView.getFormattingToolbar().style.display === ''){
		var arrowElement = gmailComposeView.getFormattingToolbarArrow();
		var buttonElement = gmailComposeView.getFormattingToolbarToggleButton();

		var left = buttonElement.offsetLeft+buttonElement.clientWidth/2-arrowElement.offsetWidth/2;
		arrowElement.style.left = left + 'px';
	}
};
