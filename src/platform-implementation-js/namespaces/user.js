/* @flow */

import _ from 'lodash';
import * as ud from 'ud';
import get from '../../common/get-or-fail';
import type {Driver} from '../driver-interfaces/driver';
import type {PiOpts} from '../platform-implementation';

const memberMap = ud.defonce(module, ()=>new WeakMap());

// documented in src/docs/
class User {
	constructor(driver: Driver, piOpts: PiOpts){
		memberMap.set(this, {driver, piOpts});
	}

	getEmailAddress() {
		return get(memberMap, this).driver.getUserEmailAddress();
	}

	getUserContact() {
		const {driver, piOpts} = get(memberMap, this);
		driver.getLogger().deprecationWarning('User.getUserContact', 'User.getEmailAddress');
		if (piOpts.REQUESTED_API_VERSION !== 1) {
			throw new Error('This method was discontinued after API version 1');
		}
		return driver.getUserContact();
	}

	getAccountSwitcherContactList() {
		let list = get(memberMap, this).driver.getAccountSwitcherContactList();
		const userEmail = this.getEmailAddress();
		const listHasUser = !!_.find(list, item => item.emailAddress === userEmail);
		if (!listHasUser) {
			// This happens for delegated accounts.
			list = list.concat([{name: userEmail, emailAddress: userEmail}]);
		}
		return list;
	}
}

export default ud.defn(module, User);
