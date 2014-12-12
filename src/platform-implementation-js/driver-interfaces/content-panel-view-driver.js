var _ = require('lodash');

var BasicClass = require('../lib/basic-class');

var ContentPanelViewDriver = function(){
  BasicClass.call(this);
};

ContentPanelViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ContentPanelViewDriver.prototype, {

  remove: null,

  getEventStream: null

});

module.exports = ContentPanelViewDriver;
