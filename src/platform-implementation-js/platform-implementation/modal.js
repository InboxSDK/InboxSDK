'use strict';

var _ = require('lodash');

var ModalView = require('../widgets/modal-view');


var memberMap = new Map();

// Deprecated, applications should use Widgets instead.
function Modal(appId, driver) {
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
}

_.assign(Modal.prototype, {

  // Deprecated, use Widgets.showModalView
	show: function(options){
		var modalView = this.createModalView(options);
		modalView.show();

		return modalView;
	},

  // Deprecated, does not have an exact replacement. Use Widgets.showModalView.
  createModalView: function(options){
    var modalViewDriver = memberMap.get(this).driver.createModalViewDriver(options);
    return new ModalView({
      modalViewDriver: modalViewDriver
    });
  }

});

module.exports = Modal;
