var _ = require('lodash');

 var BasicClass = require('../lib/basic-class');

 var SidebarContentPanelViewDriver = function(){
     BasicClass.call(this);
 };

 SidebarContentPanelViewDriver.prototype = Object.create(BasicClass.prototype);

 _.extend(SidebarContentPanelViewDriver.prototype, {

     remove: function(){},

     getEventStream: function(){}

 });
