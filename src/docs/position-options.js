// These are the options passed to contain-by-screen2.
/**
 * @class
 * This object is used to control the positioning of an element (such as a
 * drop-down menu) relative to an anchor element (the button that opened the
 * drop-down menu). It is used by {DropdownView#setPlacementOptions()}.
 */
var PositionOptions = /** @lends PositionOptions */{
	/**
	 * This value sets the prioritized position for the element relative to its
	 * anchor. It may be set to null, "top", "bottom", "left", or "right". The
	 * element will use this position unless it is not possible to do so while
	 * fitting the element on-screen.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	position: null,

	/**
	 * If true, then the configured position value will be used even if it
	 * results in the element going off of the screen.
	 * ^optional
	 * ^default=false
	 * @type {boolean}
	 */
	forcePosition: null,

	/**
	 * This value sets the prioritized horizontal alignment mode for the element
	 * relative to its anchor. The horizontal alignment mode is used if the
	 * element is positioned in the top or bottom positions relative to the
	 * anchor, and causes the element to be moved horizontally in order to make a
	 * specific edge align. It may be set to null, "center", "left", or "right".
	 * The element will use this alignment unless it is not possible to do so
	 * while fitting the element on-screen.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	hAlign: null,

	/**
	 * If true, then the configured hAlign value will be used even if it results
	 * in the element going off of the screen.
	 * ^optional
	 * ^default=false
	 * @type {boolean}
	 */
	forceHAlign: null,

	/**
	 * This value sets the prioritized vertical alignment mode for the element
	 * relative to its anchor. The vertical alignment mode is used if the
	 * element is positioned in the left or right positions relative to the
	 * anchor, and causes the element to be moved vertically in order to make a
	 * specific edge align. It may be set to null, "center", "top", or "bottom".
	 * The element will use this alignment unless it is not possible to do so
	 * while fitting the element on-screen.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	vAlign: null,

	/**
	 * If true, then the configured vAlign value will be used even if it results
	 * in the element going off of the screen.
	 * ^optional
	 * ^default=false
	 * @type {boolean}
	 */
	forceVAlign: null,

	/**
	 * This property specifies a number of pixels to be used as a buffer zone
	 * around the element. The element will be treated as if it was this much
	 * larger in all directions, requiring it to be placed with the given amount
	 * of space between it, the anchor element, and the edges of the screen. The
	 * buffer option is useful if the element has children which are positioned
	 * such that they escape the boundaries of the element.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	buffer: null,

	/**
	 * See buffer property. This specifies an additional buffer space only for
	 * the top edge.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	topBuffer: null,

	/**
	 * See buffer property. This specifies an additional buffer space only for
	 * the bottom edge.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	bottomBuffer: null,

	/**
	 * See buffer property. This specifies an additional buffer space only for
	 * the left edge.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	leftBuffer: null,

	/**
	 * See buffer property. This specifies an additional buffer space only for
	 * the top edge.
	 * ^optional
	 * ^default=0
	 * @type {number}
	 */
	rightBuffer: null
};
