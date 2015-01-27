var RSVP = require('rsvp');
var waitFor = require('../../lib/wait-for');

var $ = require('jquery');

var GmailElementGetter = {

	waitForGmailModeToSettle: function(){
		return require('./gmail-element-getter/wait-for-gmail-mode-to-settle')();
	},

	getMainContentElementChangedStream: function(){
		return require('./gmail-element-getter/get-main-content-element-changed-stream')(this);
	},

	isStandalone: function(){
		return GmailElementGetter.isStandaloneComposeWindow() || GmailElementGetter.isStandaloneThreadWindow();
	},

	isStandaloneComposeWindow: function(){
		return document.body.classList.contains('xE') && document.body.classList.contains('xp');
	},

	isStandaloneThreadWindow: function(){
		return document.body.classList.contains('aAU') && document.body.classList.contains('xE') && document.body.classList.contains('Su');
	},

	getComposeWindowContainer: function(){
		return document.querySelector('.dw .nH > .nH > .no');
	},

	getFullscreenComposeWindowContainer: function(){
		return document.querySelector('.aSs .aSt');
	},

	getContentSectionElement: function(){
		var leftNavContainer = GmailElementGetter.getLeftNavContainerElement();
		if(leftNavContainer){
			return leftNavContainer.nextElementSibling.children[0];
		}
		else{
			return null;
		}
	},

	getMainContentContainer: function(){
		var mainContentElement = GmailElementGetter.getCurrentMainContentElement();

		if(!mainContentElement){
			return null;
		}

		return mainContentElement.parentElement;
	},

	getCurrentMainContentElement: function(){
		return document.querySelector('div[role=main]');
	},

	isPreviewPane: function(){
		return !!document.querySelector('.aia');
	},

	getRowListElements: function(){
		return document.querySelectorAll('[gh=tl]');
	},

	getToolbarElementContainer: function(){
		return document.querySelector('[gh=tm]').parentElement;
	},

	getToolbarElement: function(){
		return document.querySelector('[gh=tm]');
	},

	getThreadToolbarElement: function(){
		return document.querySelector('[gh=mtb]');
	},

	getThreadContainerElement: function(){
		return document.querySelector('[role=main] .g.id table.Bs > tr');
	},

	getSidebarContainerElement: function(){
		return document.querySelector('[role=main] table.Bs > tr .y3');
	},

	getComposeButton: function(){
		return document.querySelector('[gh=cm]');
	},

	getLeftNavContainerElement: function(){
		return document.querySelector('.aeN');
	},

	getNavItemMenuInjectionContainer: function(){
		return document.querySelectorAll('.aeN .n3')[0];

	}

};

GmailElementGetter.StandaloneCompose = {

	getComposeWindowContainer: function(){
		return document.querySelector('[role=main]');
	}

};

module.exports = GmailElementGetter;
