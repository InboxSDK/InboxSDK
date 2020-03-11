/**
 * @class
 * Object that represents a Gmail support item in the support menu. This class is returned by {Global.addSupportItem()}.
 */
var SupportItemView = /** @lends SupportItemView */ {
  /**
   *	Remove the support view item from support menu
   * @return {void}
   */
  destroy: function() {}
};

/**
 * @class
 * This type is accepted by the {Global.addSupportItem()} method to insert a {SupportItemView}
 * for a Gmail support item. A support item view allows you adding an element that is used for displaying and a callback function to call when the user clicks on the item.
 * Support item view also supports arrow key up/down navigation same as other Gmail support items in the menu and on Enter key press down it fires the onClick call back.
 */
var SupportItemDescriptor = /** @lends SupportItemDescriptor */ {
  /**
   * The actual {HTMLElement} of the support item.
   * @type {HTMLElement}
   */
  element: null,

  /**
   * The callback when the item is clicked.
   * @type {func(event)}
   */
  onClick: null
};
