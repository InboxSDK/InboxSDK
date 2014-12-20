var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ThreadRowViewDriver = function(){
  BasicClass.call(this);
};

ThreadRowViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ThreadRowViewDriver.prototype, {

  addLabel: null,

  addButton: null,

  addAttachmentIcon: null,

  replaceDate: null,

  getSubject: null,

  getDateString: null,

  getThreadId: null

});

module.exports = ThreadRowViewDriver;
