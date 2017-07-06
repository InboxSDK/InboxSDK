/* @flow */

import NativeGmailNavItemView from '../views/native-gmail-nav-item-view';
import GmailElementGetter from '../gmail-element-getter';
import findParent from '../../../../common/find-parent';
import waitFor from '../../../lib/wait-for';

export default function getNativeNavItem(label: string): Promise<NativeGmailNavItemView> {
	return waitFor(() => {
		const navContainer = GmailElementGetter.getLeftNavContainerElement();
		if (!navContainer) return null;
		return navContainer.querySelector(`.aim a[href*="#${label}"]`);
	}, 300*1000).then(labelLinkElement => {
		const labelElement = findParent(labelLinkElement, el => el.classList.contains('aim'));

		if(!labelElement){
			throw new Error('native nav item structured weird');
		}

		if(!(labelElement:any).__nativeGmailNavItemView){
			(labelElement:any).__nativeGmailNavItemView = new NativeGmailNavItemView(labelElement, label);
		}

		return (labelElement:any).__nativeGmailNavItemView;
	}).catch(err => {
		if(GmailElementGetter.isStandalone()){
			// never resolve
			return new Promise((resolve, reject) => {});
		}

		throw err;
	});
}
