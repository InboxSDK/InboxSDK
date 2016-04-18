/* @flow */

import NativeGmailNavItemView from '../views/native-gmail-nav-item-view';
import $ from 'jquery';
import GmailElementGetter from '../gmail-element-getter';

import waitFor from '../../../lib/wait-for';

export default function getNativeNavItem(label: string): Promise<NativeGmailNavItemView> {
	return waitFor(function(){
		return $(GmailElementGetter.getLeftNavContainerElement()).find('.aim a[href*=#' + label + ']').length > 0;
	}, 300*1000).then(function(){
		var labelLinkElement = $(GmailElementGetter.getLeftNavContainerElement()).find('.aim a[href*=#' + label + ']');

		var labelElement = labelLinkElement.closest('.aim')[0];

		if(!labelElement){
			throw new Error('native nav item structured weird');
		}

		if(!labelElement.__nativeGmailNavItemView){
			labelElement.__nativeGmailNavItemView = new NativeGmailNavItemView(labelElement, label);
		}

		return labelElement.__nativeGmailNavItemView;
	}).catch(function(err){
		if(GmailElementGetter.isStandalone()){
			// never resolve
			return new Promise((resolve, reject) => {});
		}

		throw err;
	});
};
