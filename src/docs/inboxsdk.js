/**
* @class
* The functions in this class are only used for load related functionality like loading the SDK itself or other external scripts.
*/
var InboxSDK = {
	LOADER_VERSION: BUILD_VERSION
};

/**
* Loads the InboxSDK remotely and prepares it to be used.
* @function
* @param {string} version - The version of the SDK to load, the only acceptable value currently is "1.0".
* @param {string} appId - The AppId that you registered for on the <a href="/register">AppId Registration page</a>.
* @param {LoadOptions} [options] - Optional options object.
* @return {Promise} A promise which resolves when the SDK is loaded and ready to be used.
*/
InboxSDK.load = function(){};

/**
* Loads a remote script into this extension's content script space and evals it
* @function
* @param {string} url - The URL of the remote script to load.
* @param {LoadScriptOptions} [options] - Optional options object.
* @return {Promise} a promise which resolves when this script is finished downloading and eval'ing
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
	appIconUrl:null
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
