/* @flow */

import _ from 'lodash';

export default function multiCompareSort(array: Array<any>, comparisonFunctions: Array<Function>){
    array.sort(
		_.chain(comparisonFunctions)
      .map(_makeComparisonFunction)
      .reduceRight(_getGenericComparer, _getFallbackCompareFunction)
      .value()
	);
}

// If given a string, it returns a comparison function for comparing
// two objects by that field name (or calls the method if it's a method).
// If given a function, it returns a comparison function that runs the
// given function on both objects and compares the results.
function _makeComparisonFunction(compareBy){
    var iterator;
	if (_.isFunction(compareBy)) {
		iterator = compareBy;
	} else {
		iterator = function(o) {
            if(_.isFunction(o[compareBy])){
                return o[compareBy]();
            }
            else{
                return o[compareBy];
            }
        };
	}
	return function(a, b) {
		var vA = iterator(a) || 0, vB = iterator(b) || 0;
		if (vA == vB) {
			return 0;
		} else {
			return vA < vB ? -1 : 1;
		}
	};
}


function _getGenericComparer(fnA, fnB){
	return function(a, b) {
		var resultB = fnB(a, b);
		if (resultB) {
			return resultB;
		} else {
			return fnA(a, b);
		}
	};
}

function _getFallbackCompareFunction(){
	return function(a, b) {
		return 0;
	};
}
