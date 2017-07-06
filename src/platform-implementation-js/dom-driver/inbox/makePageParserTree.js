/* @flow */

import type {Driver} from '../../driver-interfaces/driver';
import PageParserTree from 'page-parser-tree';
import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
import pageParserOptions from './pageParserOptions';
import censorHTMLtree from '../../../common/censor-html-tree';

const pageParserOptionsStream: Kefir.Observable<*> = udKefir(module, pageParserOptions);

export default function makePageParserTree(driver: ?Driver, root: Document|HTMLElement): PageParserTree {
	const _driver = driver;

	function transformOptions(pageParserOptions) {
		return !_driver ? pageParserOptions : {...pageParserOptions, logError(err, el) {
			const details = {
				el,
				html: el ? censorHTMLtree(el) : null
			};
			_driver.getLogger().errorSite(err, details);
		}};
	}

	const page = new PageParserTree(root, transformOptions(pageParserOptions));
	pageParserOptionsStream.changes().onValue(pageParserOptions => {
		console.log('replacing PageParserTree options'); //eslint-disable-line no-console
		page.replaceOptions(transformOptions(pageParserOptions));
	});
	return page;
}
