/**
 * Copyright 2014-2014, Rewardly, Inc.
 *
 *
 * A very simple base class that removes the need for some boiler plate when initializing
 * member variables. Also adds a "destroy" function to help clear out references and
 * prevent memory leaks
 *
 */

import _ from 'lodash';
import getPrototypeChain from './get-prototype-chain';

const BasicClass = function(){
	this._validateMemberVariables();
	this._nullifyMemberVariables();
	this._createGettersAndSetters();
	this._initializeDefaultValues();
};

const _getterName = _.memoize(variableName =>
	'get' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

const _setterName = _.memoize(variableName =>
	'set' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

const _makeGetter = _.memoize(variableName =>
	function() {
		return this[variableName];
	}
);

const _makeSetter = _.memoize(variableName =>
	function(x) {
		this[variableName] = x;
	}
);

let _shouldMakeMethod;
{
	const __cachedShouldMakeMethod = new WeakMap();

	// Follow the Object's prototype chain until memberProto is hit to see if
	// any of them already have a methodName method. Caches based on the object
	// parameter's prototype and on the methodName.
	_shouldMakeMethod = (object, memberProto, methodName) => {
		const objectProto = Object.getPrototypeOf(object);
		let protoCache = __cachedShouldMakeMethod.get(objectProto);
		if (!protoCache) {
			protoCache = _.memoize((memberProto, methodName) => {
				for (let currentProto of getPrototypeChain(object)) {
					if (_.has(currentProto, methodName)) {
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

_.extend(BasicClass.prototype, {

	__memberVariables: [],

	_validateMemberVariables: function() {
		this._memberVariableIterate(function(memberVariable){
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
	},

	_nullifyMemberVariables: function(doDestroy) {
		this._memberVariableIterate(function(memberVariable){
			this._nullifyMemberVariable(memberVariable, doDestroy && memberVariable.destroy);
		});
	},

	_nullifyMemberVariable: function(memberVariable, doDestroy) {
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
			if(_.isFunction(value[memberVariable.destroyFunction])){
				value[memberVariable.destroyFunction]();
				return;
			}
		}

		if (_.isArray(value)) {
			var valueClone = _.clone(value);
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
		} else if (_.isObject(value)) {
			for (var key in value) {
				if(value[key]){
					if (value[key].destroy) {
						value[key].destroy();
					} else if (value[key].remove) {
						try{
							value[key].remove();
						}
						catch(err){
						}
					}
				}
			}
		} else if (_.isFunction(value)){
			value();
		}
	},

	_createGettersAndSetters: function() {
		this._memberVariableIterate(function(memberVariable, prototype) {
			if (memberVariable.get) {
				this._makeGetterFunction(memberVariable.name, prototype);
			}

			if (memberVariable.set) {
				this._makeSetterFunction(memberVariable.name, prototype);
			}
		});
	},

	_makeGetterFunction: function(name, prototype) {
		const getterName = _getterName(name);

		if(_shouldMakeMethod(this, prototype, getterName)) {
			this[getterName] = _makeGetter(name);
		}
	},

	_makeSetterFunction: function(name, prototype) {
		const setterName = _setterName(name);

		if(_shouldMakeMethod(this, prototype, setterName)) {
			this[setterName] = _makeSetter(name);
		}
	},

	_initializeDefaultValues: function() {
		this._memberVariableIterate(function(memberVariable){
			if (memberVariable.defaultValue !== undefined) {
				this[memberVariable.name] = _.clone(memberVariable.defaultValue);
			}
		});
	},

	_memberVariableIterate: function(iterateFunction){
		for (let proto of getPrototypeChain(this)) {
			if (proto.__memberVariables) {
				for (var i = 0; i < proto.__memberVariables.length; i++) {
					var memberVariable = proto.__memberVariables[i];
					iterateFunction.call(this, memberVariable, proto);
				}
			}
		}
	},

	destroy: function() {
		this._nullifyMemberVariables(true);
	}
});

module.exports = BasicClass;
