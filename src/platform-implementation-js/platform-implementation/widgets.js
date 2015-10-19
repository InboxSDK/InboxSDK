'use strict';

import _ from 'lodash';
import Bacon from 'baconjs';
import baconCast from 'bacon-cast';

import ModalView from '../widgets/modal-view';
import MoleView from '../widgets/mole-view';
import TopMessageBarView from '../widgets/top-message-bar-view';

var memberMap = new Map();

// documented in src/docs/
function Widgets(appId, driver) {
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
}

_.assign(Widgets.prototype, {

	showModalView(options){
    var modalViewDriver = memberMap.get(this).driver.createModalViewDriver(options);
    var modalView = new ModalView({
      modalViewDriver: modalViewDriver
    });
		modalView.show();

		return modalView;
	},

  showMoleView(options) {
    var moleViewDriver = memberMap.get(this).driver.createMoleViewDriver(options);
    var moleView = new MoleView({
      moleViewDriver: moleViewDriver
    });
		moleViewDriver.show();

		return moleView;
  },

  showTopMessageBarView(options){
    const topMessageBarViewDriver = memberMap.get(this).driver.createTopMessageBarDriver(baconCast(Bacon, options));

    return new TopMessageBarView({
      topMessageBarViewDriver
    });
  }

});

module.exports = Widgets;
