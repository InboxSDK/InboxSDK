/* @flow */

import _ from 'lodash';
import * as ud from 'ud';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = ud.defonce(module, ()=>new WeakMap());

// documented in src/docs/
class User {
	constructor(driver: Driver){
		memberMap.set(this, {driver});
	}

	getEmailAddress() {
		return memberMap.get(this).driver.getUserEmailAddress();
	}

	getUserContact() {
		memberMap.get(this).driver.getLogger().deprecationWarning('User.getUserContact', 'User.getEmailAddress');
		return memberMap.get(this).driver.getUserContact();
	}

	getAccountSwitcherContactList() {
		let list = memberMap.get(this).driver.getAccountSwitcherContactList();
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
