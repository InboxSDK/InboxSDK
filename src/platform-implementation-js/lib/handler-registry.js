import _ from 'lodash';
import logger from './logger';
import BasicClass from './basic-class';

export default function HandlerRegistry() {
    BasicClass.call(this);

    this._targets = new Set();
    this._handlers = new Set();
}

HandlerRegistry.prototype = Object.create(BasicClass.prototype);

_.assign(HandlerRegistry.prototype, {

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

        if(target.on){
            target.on('destroy', this.removeTarget.bind(this, target));
        }

        this._informHandlersOfTarget(target);
    },

    removeTarget: function(target){
        this._targets.delete(target);
    },

    _informHandlerOfTargets: function(handler){
        this._targets.forEach(function(target) {
            try{
                handler(target);
            }
            catch(err){
                logger.error(err);
            }
        });
    },

    _informHandlersOfTarget: function(target){
        this._handlers.forEach(function(handler){
            try{
                handler(target);
            }
            catch(err){
                logger.error(err);
            }

        });
    }

});
