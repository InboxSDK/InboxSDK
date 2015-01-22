'use strict';

var _ = require('lodash');

var Map = require('es6-unweak-collections').Map;

var ModalView = require('../widgets/modal-view');


var memberMap = new Map();

var Modal = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

};

_.extend(Modal.prototype, {

	show: function(options){
		var modalView = this.createModalView(options);
		modalView.show();

		return modalView;
	},

  createModalView: function(options){
    var modalViewDriver = memberMap.get(this).driver.createModalViewDriver(options);
    return new ModalView({
      modalViewDriver: modalViewDriver
    });
  }

});

module.exports = Modal;
