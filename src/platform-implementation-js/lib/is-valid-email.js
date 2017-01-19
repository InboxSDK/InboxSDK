/* @flow */

const re = /^([^<>()[\]\\,;:\s\"]+|\".+\")@[^\s<>]+$/;

// This function is supposed to be pretty forgiving because emails can have
// almost anything in their From header. This function exists as a sanity check
// to make sure that we didn't try to read from the wrong DOM element. It
// passes anything with at least one @ sign that doesn't contain certain
// symbols. We might want to make it even less strict and allow more symbols if
// it turns out people are legitimately receiving emails with these in the From
// or other recipient headers.
export default function isValidEmail(candidate: ?string): boolean{
	if(candidate == null){
		return false;
	}

	return re.test(candidate);
}
