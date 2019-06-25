/**
 * @class
 * @extends SimpleElementView
 * Object that represents a compose notice at the top of the reply area.
 */
var ComposeNoticeView = /** @lends ComposeNoticeView */ {};

/**
 * @class
 * This type is passed into the {ComposeView.addComposeNotice()} method as a way to configure the compose notice shown.
 */
var ComposeNoticeDescriptor = /** @lends ComposeNoticeDescriptor */ {
  /**
   * The order in which to show the compose notice.
   * ^optional
   * ^default=0
   * @type {Number}
   */
  orderHint: null
};
