var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var MessageSidebarViewDriver = function(){
    BasicClass.call(this);
};

MessageSidebarViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(MessageSidebarViewDriver.prototype, {

    getMessage: function(){},

    addContentPanel: function(options){},

    getEventStream: function(){}

});

module.exports = MessageSidebarViewDriver;
