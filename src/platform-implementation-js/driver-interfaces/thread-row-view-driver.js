var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ThreadRowViewDriver = function(){
  BasicClass.call(this);
};

ThreadRowViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ThreadRowViewDriver.prototype, {

  addLabel: function(label) {},

  addButton: function(buttonDescriptor) {},

  addAttachmentIcon: function(url) {}

});

module.exports = ThreadRowViewDriver;
