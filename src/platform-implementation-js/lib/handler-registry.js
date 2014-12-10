var _ = require('lodash');
var BasicClass = require('./basic-class');

var HandlerRegistry = function(){
    BasicClass.call(this);
};

HandlerRegistry.prototype = Object.create(BasicClass.prototype);

_.extend(HandlerRegistry.prototype, {

    __memberVariables: [
        {name: '_targets', destroy: false, defaultValue: []},
        {name: '_handlers', destroy: false, defaultValue: []}
    ],

    registerHandler: function(handler){
        this._handlers.push(handler);

        this._informHandlerOfTargets(handler);

        var self = this;
        return function(){
            var index = self._handlers.indexOf(handler);
            if(index > -1){
                self._handlers.splice(index, 1);
            }
        };
    },

    addTarget: function(target){
        this._targets.push(target);

        this._informHandlersOfTarget(target);
    },

    removeTarget: function(target){
        var index = this._targets.indexOf(target);
        if(index > -1){
            this._targets.splice(index, 1);
        }
    },

    _informHandlerOfTargets: function(handler){
        this._targets.forEach(handler);
    },

    _informHandlersOfTarget: function(target){
        this._handlers.forEach(function(handler){
            handler(target);
        });
    }

});

module.exports = HandlerRegistry;
