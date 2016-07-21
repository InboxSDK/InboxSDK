'use strict';

var _ = require('lodash');

var ModalView = require('../widgets/modal-view');


var memberMap = new Map();

// Deprecated, applications should use Widgets instead.
function Modal(appId, driver, piOpts) {
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
    members.piOpts = piOpts;
}

_.assign(Modal.prototype, {

  // Deprecated, use Widgets.showModalView
  show: function(options){
    var driver = memberMap.get(this).driver;
    if (memberMap.get(this).piOpts.inboxBeta) {
      driver.getLogger().deprecationWarning('Modal.show', 'Widgets.showModalView');
    }
    var modalViewDriver = driver.createModalViewDriver(options);
    var modalView = new ModalView({driver, modalViewDriver});
    modalView.show();

    return modalView;
  },

  // Deprecated, does not have an exact replacement. Use Widgets.showModalView.
  createModalView: function(options){
    var driver = memberMap.get(this).driver;
    driver.getLogger().deprecationWarning('Modal.createModalView', 'Widgets.showModalView');

    var modalViewDriver = driver.createModalViewDriver(options);
    return new ModalView({driver, modalViewDriver});
  }

});

module.exports = Modal;
