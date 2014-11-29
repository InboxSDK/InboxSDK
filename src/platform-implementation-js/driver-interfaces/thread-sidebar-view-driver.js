var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ThreadSidebarViewDriver = function(){
    BasicClass.call(this);
};

ThreadSidebarViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ThreadSidebarViewDriver.prototype, {

    getThread: function(){},

    addContentPanel: function(){},

    getEventStream: function(){}

});

module.exports = ThreadSidebarViewDriver;
