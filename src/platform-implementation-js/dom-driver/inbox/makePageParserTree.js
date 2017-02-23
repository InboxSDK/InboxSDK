/* @flow */

import type {Driver} from '../../driver-interfaces/driver';
import PageParserTree from 'page-parser-tree';
import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
import pageParserOptions from './pageParserOptions';
import once from 'lodash/once';

const pageParserOptionsStream: Kefir.Observable<*> = udKefir(module, pageParserOptions);

export default function makePageParserTree(driver: ?Driver, root: Document|HTMLElement): PageParserTree {
	const page = new PageParserTree(root, pageParserOptions);
	pageParserOptionsStream.changes().onValue(pageParserOptions => {
		console.log('replacing PageParserTree options');
		page.replaceOptions(pageParserOptions);
	});
	return page;
}
