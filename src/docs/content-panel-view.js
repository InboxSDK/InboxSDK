/**
* @class
* A view representing a panel of your apps content. This is the object that is returned when you add a sidebar content panel to a thread view or similar.
*/
var ContentPanelView = /** @lends ContentPanelView */ {

    /**
     * This property is set to true once the view is destroyed.
     * @type {boolean}
     */
    destroyed: false,

    /**
     * Closes material Gmail's sidebar.
     * @return {void}
     */
    close: function(){},

    /**
     * Returns whether the content panel is currently visible.
     * @return {boolean}
     */
    isActive: function(){},

    /**
     * Opens material Gmail's sidebar. It may only be called during a user input event.
     * @return {void}
     */
    open: function(){},

    /**
     * Removes the content panel from its host.
     * @return {void}
     */
    remove: function(){},

    /**
    * Fires when the content panel becomes visisble. This can happen the first time the Panel is shown or subsequent
    * times if the panel is presented in a tabbed interface and the ContentPanels tab is selected.
    * @event ContentPanelView#activate
    */

    /**
    * Fires when the content panel is hidden. Typically this occurs when the user switches to another ContentPanel.
    * @event ContentPanelView#deactivate
    */

    /**
    * Fires when the content panel view is no longer valid (i.e. the user navigates away from the thread with the sidebar).
    * @event ContentPanelView#destroy
    */

};
