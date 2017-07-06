/* eslint-disable flowtype/require-valid-file-annotation */

import BasicClass from '../lib/basic-class';

export default function RowListViewDriver() {
	BasicClass.call(this);
}

RowListViewDriver.prototype = Object.create(BasicClass.prototype);

Object.assign(RowListViewDriver.prototype, {

	getSelectedThreadRows: null

});
