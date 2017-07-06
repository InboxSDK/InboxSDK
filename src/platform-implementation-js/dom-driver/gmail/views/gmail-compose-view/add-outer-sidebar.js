/* @flow */

import _ from 'lodash';
import type GmailComposeView from '../gmail-compose-view';

type Options = {
	title: string;
	el: HTMLElement;
};

export default function addOuterSidebar(gmailComposeView: GmailComposeView, options: Options) {
	// if(!gmailComposeView.getAdditionalAreas().outerSidebar){
	// 	_createOuterSidebar(gmailComposeView);
	// }
	//
	// gmailComposeView.getAdditionalAreas().outerSidebar.querySelector('.inboxsdk__compose_outerSidebar_header').innerHTML = _.escape(options.title);
	// gmailComposeView.getAdditionalAreas().outerSidebar.querySelector('.inboxsdk__compose_outerSidebar_footer').appendChild(options.el);
}

function _createOuterSidebar(gmailComposeView: GmailComposeView){
	const outerSidebar = document.createElement('div');
	outerSidebar.classList.add('inboxsdk__compose_outerSidebar_wrapper');

	const header = document.createElement('div');
	header.classList.add('inboxsdk__compose_outerSidebar_header');
	outerSidebar.appendChild(header);

	const body = document.createElement('div');
	body.classList.add('inboxsdk__compose_outerSidebar_body');
	outerSidebar.appendChild(body);

	const footer = document.createElement('div');
	footer.classList.add('inboxsdk__compose_outerSidebar_footer');
	footer.classList.add('aDh');
	outerSidebar.append(footer);

	gmailComposeView.getElement().appendChild(outerSidebar);
	// gmailComposeView.getAdditionalAreas().outerSidebar = outerSidebar;

	((document.body:any):HTMLElement).classList.add('inboxsdk__outerSidebarActive');
	// gmailComposeView.getElement().addClass('inboxsdk__compose_outerSidebarActive');
}
