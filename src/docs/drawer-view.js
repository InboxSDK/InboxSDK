/**
* @class
* Represents a drawer panel.
*/
var DrawerView = /** @lends DrawerView */{
  /**
   * This closes the drawer. Does nothing if already closed.
   * @return {void}
   */
  close: function(){},

  /**
   * This method allows a compose view to be associated with a pre-existing
   * drawer. The compose view will be usable and shown next to the drawer
   * instead of being hidden behind it.
   * @param  {ComposeView} composeView
   * @return {void}
   */
  associateComposeView: function(composeView) {},

  /**
   * This property is set to true once the view is destroyed.
   * @type {boolean}
   */
  destroyed: false,

  /**
   * Fires when this DrawerView instance is visible and in position.
   * @event DrawerView#slideAnimationDone
   */

  /**
   * Fires when this DrawerView has started closing and animating to off-screen.
   * @event DrawerView#closing
   */

  /**
   * Fires when this DrawerView instance is closed and not visible.
   * @event DrawerView#destroy
   */
};
