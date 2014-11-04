var _ = require('lodash');
var BasicClass = require('../basic-class');

var BodyClickBinder = function(clickFunction){
	BasicClass.call(this);

	this._clickFunction = clickFunction;
};

BodyClickBinder.prototype = Object.create(BasicClass.prototype);

_.extend(BodyClickBinder.prototype, {

	__memberVariables: [
		{name: '_clickFunction', destroy: false, set:true}
	],

	bind: function(){
		document.body.addEventListener('click', this._clickFunction);
	},

	unbind: function(){
		document.body.removeEventListener('click', this._clickFunction);
	},

	destroy: function(){
		this.unbind();

		BasicClass.prototype.destroy.call(this);
	}

});

module.exports = BodyClickBinder;
