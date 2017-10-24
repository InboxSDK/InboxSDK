/**
* @class
* The functions in this class are only used for load related functionality like loading the SDK itself or other external scripts.
*/
var InboxSDK = {
	LOADER_VERSION: BUILD_VERSION
};

/**
* Loads InboxSDK remotely and prepares it to be used. Returns a promise
* which resolves with the SDK interface (see usage examples under "Structuring
* Your App") when the SDK is loaded and ready to be used.
* @function
* @param {number} version - The API version of the SDK to use. The recommended value right now is <code>1</code>. The value <code>2</code> may be used to opt in early to use the Inbox support which is still under development. See the <a href="#InboxSupport">Inbox Support</a> section for more information.
* @param {string} appId - The AppId that you registered for on the <a href="/register">AppId Registration page</a>.
* @param {LoadOptions} [options] - Optional options object.
* @return {Promise}
*/
InboxSDK.load = function(){};

/**
* Loads a remote script into the extension's content script space and evals it.
* Returns a promise which resolves when the script is finished downloading and eval'ing.
* @function
* @param {string} url - The URL of the remote script to load.
* @param {LoadScriptOptions} [options] - Optional options object.
* @return {Promise}
*/
InboxSDK.loadScript = function(){};

/**
 * @class
 * This type may be passed into the {InboxSDK.load} method.
 */
var LoadOptions = /** @lends LoadOptions */{
	/**
	 * The name of your app. This is used by several methods in the SDK.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	appName: null,

	/**
	 * The URL of the icon of your app. Can be HTTPS or a chrome runtime url.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	appIconUrl:null,

	/**
	 * The name of the Gmail Add-On you want to hide. Use this if you have both an extension
	 * and a Gmail Add-On that provide similar functionality.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	 suppressAddonTitle:null
};

/**
 * @class
 * This type may be passed into the {InboxSDK.loadScript} method.
 */
var LoadScriptOptions = /** @lends LoadScriptOptions */{
	/**
	 * By default, the loaded script is wrapped in a closure which happens to
	 * prevent top-level variable declarations from becoming global variables.
	 * Setting this property to true disables this behavior.
	 * ^optional
	 * ^default=false
	 * @type {boolean}
	 */
	nowrap: false
};
