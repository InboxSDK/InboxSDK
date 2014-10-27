var _ = require('lodash');
var ElementObserver = require('./element-observer');

console.log('imp hello world');
new ElementObserver('imp').hello();

module.exports.getUser = _.constant({emailAddress: 'abc@example.com'});
