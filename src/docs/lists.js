/**
* @class
* This namespace allows you to interact with Lists of emails. They typically appear in
* various views like Inbox, Search or Labels. The interaction primarily lets you view
* and modify data in each row of the list.
* @name Lists
*/
var Lists = /** @lends Lists */ {

	/**
	* Registers a handler that gets called whenever a new ThreadRowView becomes visible on screen.
	* Your handler is guaranteed to be called exactly once per thread per route. That is, each time
	* your user visits a route with {ThreadRowView}s, this handler will get called once for each {ThreadRowView}
	* @param {func(ThreadRowView)} handler - The function to call on each new visible ThreadRowView.
	* Your function is passed a ThreadRowView
	* @return {void}
	*/
	registerThreadRowViewHandler: function(){}

};
