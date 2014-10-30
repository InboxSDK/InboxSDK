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
			for (var c = 0; c < value.length; c++) {
				if(!value[c]){
					continue;
				}

				if (value[c].destroy) {
					value[c].destroy();
				}

				if(value[c].remove){
					value[c].remove();
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
		this._memberVariableIterate(function(memberVariable){
			var name = memberVariable.name;

			if (memberVariable.get) {
				this._makeGetterFunction(name);
			}

			if (memberVariable.set) {
				this._makeSetterFunction(name);
			}
		});
	},

	_makeGetterFunction: function(name) {
		var getter = this._getterName(name);
		if(this[getter]){ //don't overwrite
			return;
		}

		this[getter] = function() {
			return this[name];
		};
	},

	_getterName: function(variableName) {
		return 'get' + variableName.charAt(1).toUpperCase() + variableName.slice(2);
	},

	_makeSetterFunction: function(name) {
		var setter = this._setterName(name);
		if(this[setter]){ //don't overwrite
			return;
		}

		this[setter] = function(value) {
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
		while ((proto = Object.getPrototypeOf(object))) {
			object = proto;
			if (object.__memberVariables) {
				for (var i = 0; i < object.__memberVariables.length; i++) {
					var memberVariable = object.__memberVariables[i];
					iterateFunction.call(this, memberVariable);
				}
			}
		}
	},

	destroy: function() {
		this._nullifyMemberVariables(true);
	}
});

module.exports = BasicClass;
