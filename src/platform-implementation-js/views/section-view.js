var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('../lib/safe-event-emitter');

var membersMap = new WeakMap();

// documented in src/docs/
var SectionView = function(sectionViewDriver, driver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);
	members.sectionViewDriver = sectionViewDriver;

	_bindToEventStream(this, sectionViewDriver, driver);
};

SectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(SectionView.prototype, {

	remove(){
		this.destroy();
	},

	destroy(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.sectionViewDriver.destroy();

		this.removeAllListeners();
	}

});


function _bindToEventStream(sectionView, sectionViewDriver, driver){
	sectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(sectionView, 'emit');

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.map('.rowDescriptor')
		.onValue(function(rowDescriptor){
			if(rowDescriptor.routeID){
				driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
			}

			if(_.isFunction(rowDescriptor.onClick)){
				rowDescriptor.onClick();
			}
		});

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'summaryClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(sectionView);
			}
		});

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(sectionView);
			}
		});

	sectionViewDriver.getEventStream().onEnd(sectionView, 'emit', 'destroy');
}

module.exports = SectionView;
