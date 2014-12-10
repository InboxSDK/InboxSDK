var _ = require('lodash');
var BasicClass = require('./basic-class');
var Set = require('es6-unweak-collections').Set;

var HandlerRegistry = function(){
    BasicClass.call(this);

    this._targets = new Set();
    this._handlers = new Set();
};

HandlerRegistry.prototype = Object.create(BasicClass.prototype);

_.extend(HandlerRegistry.prototype, {

    __memberVariables: [
        {name: '_targets', destroy: false},
        {name: '_handlers', destroy: false}
    ],

    registerHandler: function(handler){
        this._handlers.add(handler);

        this._informHandlerOfTargets(handler);

        var self = this;
        return function(){
            self._handlers.delete(handler);
        };
    },

    addTarget: function(target){
        this._targets.add(target);

        this._informHandlersOfTarget(target);
    },

    removeTarget: function(target){
        this._targets.delete(target);
    },

    _informHandlerOfTargets: function(handler){
        this._targets.forEach(function(target) {
          handler(target);
        });
    },

    _informHandlersOfTarget: function(target){
        this._handlers.forEach(function(handler){
            handler(target);
        });
    }

});

module.exports = HandlerRegistry;
