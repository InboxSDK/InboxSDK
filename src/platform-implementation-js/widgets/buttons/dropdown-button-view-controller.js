var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');
var RSVP = require('rsvp');

var DropdownView = require('./dropdown-view');

var DropdownButtonViewController = function(options){
	BasicClass.call(this);

	this._dropdownShowFunction = options.dropdownShowFunction;
	this._DropdownViewDriverClass = options.dropdownViewDriverClass;

	this._view = options.buttonView;
	this._dropdownPositionOptions = options.dropdownPositionOptions;

	this._bindToViewEvents();
};

DropdownButtonViewController.prototype = Object.create(BasicClass.prototype);

_.extend(DropdownButtonViewController.prototype, {

	__memberVariables: [
		{name: '_view', destroy: true, get: true},
		{name: '_dropdownShowFunction', destroy: false, set: true},
		{name: '_dropdownView', destroy: true, destroyFunction: 'close'},
		{name: '_DropdownViewDriverClass', destroy: false},
		{name: '_dropdownPositionOptions', destroy: true}
	],

	showDropdown: function(){
		this._view.activate();
		this._dropdownView = new DropdownView(new this._DropdownViewDriverClass(), this._view.getElement(), this._dropdownPositionOptions);

		this._dropdownView.on('destroy', this._dropdownClosed.bind(this));

		if(this._dropdownShowFunction){
			this._dropdownShowFunction({dropdown: this._dropdownView});
		}
	},

	hideDropdown: function(){
		if(this._dropdownView){
			this._dropdownView.close();
		}
	},

	isDropdownVisible: function(){
		return !!this._dropdownView;
	},

	_bindToViewEvents: function(){
		var self = this;
		this._view
			.getEventStream()
			.filter(function(event){
				return event.eventName === 'click';
			})
			.onValue(function(){
				self._toggleDropdownState();
			});
	},

	_toggleDropdownState: function(){
		if(this._dropdownView){
			this._dropdownView.close();
		}
		else{
			this.showDropdown();
		}
	},

	_dropdownClosed: function(){
		this._view.deactivate();
		this._dropdownView = null;
	}

});

module.exports = DropdownButtonViewController;
