'use strict';

var _ = require('lodash');

var Map = require('es6-unweak-collections').Map;

var ModalViewController = require('../widgets/modal-view-controller');
var ModalView = require('../views/modal-view');

var memberMap = new Map();

var Modal = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

};

_.extend(Modal.prototype, {

	show: function(options){
		var modalView = _createModalView(memberMap.get(this).driver, options);
		modalView.show();

		return modalView;
	},

    createModalView: function(options){
        var modalView = memberMap.get(this).driver.createModalView(options);
        var modalViewController = new ModalViewController({
            modalView: modalView
        });

        return new ModalView(modalViewController);
    }

});

function _createModalView(driver, options){
	var modalView = driver.createModalView(options);
    var modalViewController = new ModalViewController({
        modalView: modalView
    });

    return new ModalView(modalViewController);
}

module.exports = Modal;
