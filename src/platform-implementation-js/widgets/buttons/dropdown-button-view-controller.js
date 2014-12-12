var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');
var RSVP = require('rsvp');

var DropdownView = require('./dropdown-view');

var DropdownButtonViewController = function(options){
	BasicClass.call(this);

	this._dropdownShowFunction = options.dropdownShowFunction;
	this._dropdownViewDriverClass = options.dropdownViewDriverClass;

	this._view = options.buttonView;
	this._dropdownPositionOptions = options.dropdownPositionOptions;

	this._bindToViewEvents();
};

DropdownButtonViewController.prototype = Object.create(BasicClass.prototype);

_.extend(DropdownButtonViewController.prototype, {

	__memberVariables: [
		{name: '_view', destroy: true, get: true},
		{name: '_dropdownShowFunction', destroy: false, set: true},
		{name: '_dropdownElement', destroy: false},
		{name: '_dropdownView', destroy: true},
		{name: '_dropdownViewDriverClass', destroy: true},
		{name: '_dropdownPositionOptions', destroy: true},
		{name: '_focusFunction', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	showDropdown: function(){
		this._showDropdown();
	},

	hideDropdown: function(){
		this._hideDropdown();
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

		this._view
			.getEventStream()
			.filter(function(event){
				return event.eventName === 'keydown' && event.domEvent.which === 27; //escape
			})
			.onValue(this, '_hideDropdown');
	},

	_toggleDropdownState: function(){
		if(this._dropdownView){
			this._dropdownView.close();
		}
		else{
			this._showDropdown();
		}
	},

	_showDropdown: function(){
		this._view.activate();
		this._dropdownView = new DropdownView(new this._dropdownViewDriverClass(), this._view.getElement());

		this._dropdownView.focus();
		this._dropdownView.on('unload', this._dropdownClosed.bind(this));

		if(this._dropdownShowFunction){
			this._dropdownShowFunction({dropdown: this._dropdownView});
		}

		if(!this._dropdownView){
			return;
		}

		this._dropdownView.containByScreen(this._view.getElement(), this._dropdownPositionOptions);
	},

	_hideDropdown: function(){
		if(this._dropdownView){
			this._dropdownView.close();
		}
	},

	_dropdownClosed: function(){
		this._view.deactivate();
		this._dropdownView.destroy();
		this._dropdownView = null;
	}

});

module.exports = DropdownButtonViewController;
