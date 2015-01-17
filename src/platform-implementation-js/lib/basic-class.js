/**
 * Copyright 2014-2014, Rewardly, Inc.
 *
 *
 * A very simple base class that removes the need for some boiler plate when initializing
 * member variables. Also adds a "destroy" function to help clear out references and
 * prevent memory leaks
 *
 */

var _ = require('lodash');

var BasicClass = function(){
	this._validateMemberVariables();
	this._nullifyMemberVariables();
	this._createGettersAndSetters();
	this._initializeDefaultValues();
};


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
		this._memberVariableIterate(function(memberVariable, prototype, rootPrototype){
			var name = memberVariable.name;

			var prototypeProperyNames = Object.getOwnPropertyNames(prototype);
			var rootPrototypePropertyNames = Object.getOwnPropertyNames(rootPrototype);

			if (memberVariable.get) {
				this._makeGetterFunction(name, prototypeProperyNames, rootPrototypePropertyNames);
			}

			if (memberVariable.set) {
				this._makeSetterFunction(name, prototypeProperyNames, rootPrototypePropertyNames);
			}
		});
	},

	_makeGetterFunction: function(name, prototypeProperyNames, rootPrototypePropertyNames) {
		var getterName = this._getterName(name);

		if(prototypeProperyNames.indexOf(getterName) > -1 || rootPrototypePropertyNames.indexOf(getterName) > -1){
			return;
		}

		this[getterName] = function() {
			return this[name];
		};
	},

	_getterName: function(variableName) {
		return 'get' + variableName.charAt(1).toUpperCase() + variableName.slice(2);
	},

	_makeSetterFunction: function(name, prototypeProperyNames, rootPrototypePropertyNames) {
		var setterName = this._setterName(name);

		if(prototypeProperyNames.indexOf(setterName) > -1 || rootPrototypePropertyNames.indexOf(setterName) > -1){
			return;
		}

		this[setterName] = function(value) {
			this[name] = value;
		};
	},

	_setterName: function(variableName) {
		return 'set' + variableName.charAt(1).toUpperCase() + variableName.slice(2);
	},

	_initializeDefaultValues: function() {
		this._memberVariableIterate(function(memberVariable){
			if (memberVariable.defaultValue !== undefined) {
				this[memberVariable.name] = _.clone(memberVariable.defaultValue);
			}
		});
	},

	_memberVariableIterate: function(iterateFunction){
		var object = this;
		var proto;

		var rootPrototype = Object.getPrototypeOf(this);

		while ((proto = Object.getPrototypeOf(object))) {
			object = proto;
			if (object.__memberVariables) {
				for (var i = 0; i < object.__memberVariables.length; i++) {
					var memberVariable = object.__memberVariables[i];
					iterateFunction.call(this, memberVariable, proto, rootPrototype);
				}
			}
		}
	},

	destroy: function() {
		this._nullifyMemberVariables(true);
	}
});

module.exports = BasicClass;
