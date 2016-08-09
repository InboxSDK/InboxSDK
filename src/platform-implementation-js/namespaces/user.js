/* @flow */

import _ from 'lodash';
import type {Driver} from '../driver-interfaces/driver';

// documented in src/docs/
export default class User {
	_driver: Driver;

	constructor(driver: Driver){
		this._driver = driver;
	}

	getEmailAddress() {
		return this._driver.getUserEmailAddress();
	}

	getUserContact() {
		this._driver.getLogger().deprecationWarning('User.getUserContact', 'User.getEmailAddress');
		return this._driver.getUserContact();
	}

	getAccountSwitcherContactList() {
		let list = this._driver.getAccountSwitcherContactList();
		const userEmail = this.getEmailAddress();
		const listHasUser = !!_.find(list, item => item.emailAddress === userEmail);
		if (!listHasUser) {
			// This happens for delegated accounts.
			list = list.concat([{name: userEmail, emailAddress: userEmail}]);
		}
		return list;
	}
}
