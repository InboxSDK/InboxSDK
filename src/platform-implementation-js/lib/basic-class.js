/*!
 * Copyright 2014-2014, Rewardly, Inc.
 *
 *
 * A very simple base class that removes the need for some boiler plate when initializing
 * member variables. Also adds a "destroy" function to help clear out references and
 * prevent memory leaks
 *
 */
/* eslint-disable flowtype/require-valid-file-annotation */
// DEPRECATED, superseded by standard ES6 classes!

import memoize from 'lodash/memoize';
import has from 'lodash/has';
import clone from 'lodash/clone';
import isObject from 'lodash/isObject';
import getPrototypeChain from './get-prototype-chain';

const getGetterName = memoize(variableName =>
  'get' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

const getSetterName = memoize(variableName =>
  'set' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

const makeGetter = memoize(variableName =>
  function() {
    return this[variableName];
  }
);

const makeSetter = memoize(variableName =>
  function(x) {
    this[variableName] = x;
  }
);

let shouldMakeMethod;
{
	const __cachedShouldMakeMethod = new WeakMap();

	// Follow the Object's prototype chain until memberProto is hit to see if
	// any of them already have a methodName method. Caches based on the object
	// parameter's prototype and on the methodName.
	shouldMakeMethod = function(object, memberProto, methodName) {
		const objectProto = Object.getPrototypeOf(object);
		let protoCache = __cachedShouldMakeMethod.get(objectProto);
		if (!protoCache) {
			protoCache = memoize((memberProto, methodName) => {
				for (let currentProto of getPrototypeChain(object)) {
					if (has(currentProto, methodName)) {
						return false;
					}
					if (currentProto === memberProto) {
						break;
					}
				}
				return true;
			}, (memberProto, methodName) => methodName);
			__cachedShouldMakeMethod.set(objectProto, protoCache);
		}
		return protoCache(memberProto, methodName);
	};
}

let validateMemberVariables;
{
	const validatedPrototypes = new WeakSet();

	validateMemberVariables = function(object) {
		const proto = Object.getPrototypeOf(object);
		if (!validatedPrototypes.has(proto)) {
			memberVariableIterate(object, memberVariable => {
				if (memberVariable.name === undefined) {
					throw new Error('name is a required parameter to memberVariables');
				}

				if (memberVariable.destroy === undefined) {
					throw new Error('destroy is a required parameter to memberVariables');
				}

				for (var property in memberVariable) {
					if (['name', 'destroy', 'get', 'set', 'defaultValue', 'destroyFunction'].indexOf(property) == -1) {
						throw new Error(property + ' is not a valid parameter to memberVariables');
					}
				}
			});
			validatedPrototypes.add(proto);
		}
	};
}

function nullifyMemberVariables(object, doDestroy) {
	memberVariableIterate(object, function(memberVariable) {
		nullifyMemberVariable.call(this, memberVariable, doDestroy && memberVariable.destroy);
	});
}

// `this` must be the object
function nullifyMemberVariable(memberVariable, doDestroy) {
	if (!doDestroy) {
		this[memberVariable.name] = null;
		return;
	}

	var value = this[memberVariable.name];
	this[memberVariable.name] = null;

	if (!value) {
		return;
	}

	if(memberVariable.destroyFunction){
		if(typeof value[memberVariable.destroyFunction] === 'function'){
			value[memberVariable.destroyFunction]();
			return;
		}
	}

	if (Array.isArray(value)) {
		var valueClone = clone(value);
		for (var c = 0; c < valueClone.length; c++) {
			if(!valueClone[c]){
				continue;
			}

			if (valueClone[c].destroy) {
				valueClone[c].destroy();
			}
			else if(valueClone[c].remove){
				valueClone[c].remove();
			}
		}
		value.length = 0;
	} else if (value.destroy) {
		value.destroy();
	} else if(value.remove){
		value.remove();
	} else if (isObject(value)) {
		for (var key in value) {
			if(value[key]){
				if (value[key].destroy) {
					value[key].destroy();
				} else if (value[key].remove) {
					try{
						value[key].remove();
					}
					catch(err){
            console.error('basic-class caught error', err); //eslint-disable-line no-console
					}
				}
			}
		}
	} else if (typeof value === 'function'){
		value();
	}
}

function createGettersAndSetters(object) {
	memberVariableIterate(object, function(memberVariable, prototype) {
		if (memberVariable.get) {
			makeGetterFunction(this, memberVariable.name, prototype);
		}

		if (memberVariable.set) {
			makeSetterFunction(this, memberVariable.name, prototype);
		}
	});
}

function makeGetterFunction(object, name, prototype) {
	const getterName = getGetterName(name);

	if(shouldMakeMethod(object, prototype, getterName)) {
		object[getterName] = makeGetter(name);
	}
}

function makeSetterFunction(object, name, prototype) {
	const setterName = getSetterName(name);

	if(shouldMakeMethod(object, prototype, setterName)) {
		object[setterName] = makeSetter(name);
	}
}

function initializeDefaultValues(object) {
	memberVariableIterate(object, function(memberVariable){
		if (memberVariable.defaultValue !== undefined) {
			this[memberVariable.name] = clone(memberVariable.defaultValue);
		}
	});
}

function memberVariableIterate(object, iterateFunction) {
	let proto = object;
	while ((proto = Object.getPrototypeOf(proto))) {
		if (proto.__memberVariables) {
			for (var i = 0, len = proto.__memberVariables.length; i < len; i++) {
				var memberVariable = proto.__memberVariables[i];
				iterateFunction.call(object, memberVariable, proto);
			}
		}
	}
}

function BasicClass() {
	validateMemberVariables(this);
	nullifyMemberVariables(this);
	createGettersAndSetters(this);
	initializeDefaultValues(this);
}

Object.assign(BasicClass.prototype, {

	//__memberVariables: [],

	destroy: function() {
		nullifyMemberVariables(this, true);
	}
});

module.exports = BasicClass;
