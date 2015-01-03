var RSVP = require('rsvp');

module.exports = function(){
	return new RSVP.Promise(function(resolve, reject){
		if(document.body.classList.length > 0){
			resolve();
		}

		var mutationObserver = new MutationObserver(function(mutations){
			var classList = mutations[0].target.classList;

			if(classList.length > 0){
				mutationObserver.disconnect();
				resolve();
			}
		});

		mutationObserver.observe(
			document.body,
			{attributes: true, attributeFilter: ['class']}
		);
	});
};
