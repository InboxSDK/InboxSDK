module.exports = function(eventName){
	return function(event){
		return event.eventName === eventName;
	};
};
