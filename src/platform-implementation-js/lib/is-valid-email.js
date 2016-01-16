/* @flow */

var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function isValidEmail(candidate: ?string): boolean{
	if(candidate == null){
		return false;
	}

	var matches = candidate.match(re);
	return matches ? matches.length > 0 : false;
}
