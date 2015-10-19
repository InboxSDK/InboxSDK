var _ = require('lodash');
var RSVP = require('rsvp');

var SectionView = require('./section-view');

var membersMap = new WeakMap();

// documented in src/docs/
var CollapsibleSectionView = function(collapsibleSectionViewDriver, driver){
	var members = {};
	membersMap.set(this, members);
	members.collapsibleSectionViewDriver = collapsibleSectionViewDriver;

	_bindToEventStream(this, collapsibleSectionViewDriver, driver);
};

CollapsibleSectionView.prototype = Object.create(SectionView.prototype);

_.extend(CollapsibleSectionView.prototype, {

	setCollapsed(value){
		membersMap.get(this).collapsibleSectionViewDriver.setCollapsed(value);
	},

	remove(){
		this.destroy();
	},

	destroy(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.collapsibleSectionViewDriver.destroy();

		this.removeAllListeners();
	}

});


function _bindToEventStream(collapsibleSectionView, collapsibleSectionViewDriver, driver){
	collapsibleSectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(collapsibleSectionView, 'emit');

	collapsibleSectionViewDriver
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

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'titleLinkClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver.getEventStream().onEnd(collapsibleSectionView, 'emit', 'destroy');
}

module.exports = CollapsibleSectionView;
