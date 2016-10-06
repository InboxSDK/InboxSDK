/* @flow */

import _ from 'lodash';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

// documented in src/docs/
export default class Search {
	constructor(appId: string, driver: Driver){
		const members = {appId, driver};
		memberMap.set(this, members);
	}

	registerSearchSuggestionsProvider(handler: Function) {
		if (typeof handler != 'function') {
			throw new Error("Incorrect arguments");
		}
		const members = memberMap.get(this);
		members.driver.registerSearchSuggestionsProvider(handler);
	}

	registerSearchQueryRewriter(rewriter: Object) {
		if (typeof rewriter.termReplacer != 'function' || typeof rewriter.term != 'string') {
			throw new Error("Incorrect arguments");
		}
		if (!rewriter.term.match(/^(app|has):/)) {
			throw new Error("Custom search term must begin with 'app:'");
		}
		const members = memberMap.get(this);
		members.driver.registerSearchQueryRewriter(rewriter);
	}
}
