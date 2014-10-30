var EventEmitter = require('events').EventEmitter;

var Mailbox = new EventEmitter();

require('./interface').load().then(function() {
  Mailbox.emit('example', 'implementation loaded');
});

module.exports = Mailbox;
