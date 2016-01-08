/**
 * @class
 * Represents a mole view. These are modals attached to the bottom of the
 * viewport, like a compose view.
 */
var MoleView = /** @lends MoleView */ {

  /**
   * This closes the mole view. Does nothing if already closed.
   * @return {void}
   */
  close: function(){},

  /**
   * This allows the title to be changed.
   * @param  {string} text
 	 * @return {void}
   */
  setTitle: function(){},

  /**
   * This allows the minimize state to be changed.
   * @param  {boolean} minimized - If true, the mole view will be minimized.
 	 * @return {void}
   */
  setMinimized: function(){},

  /**
   * This allows the minimize state to be retrieved.
 	 * @return {boolean}
   */
  getMinimized: function(){},

  /**
   * This property is set to true once the view is destroyed.
   * @type {boolean}
   */
  destroyed: false,

  /**
   * Fires when this MoleView instance is closed.
   * @event MoleView#destroy
   */

  /**
   * Fires when this MoleView instance is minimized.
   * @event MoleView#minimize
   */

  /**
   * Fires when this MoleView instance is restored.
   * @event MoleView#restore
   */

};
