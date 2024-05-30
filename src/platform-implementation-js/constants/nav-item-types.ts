/**
 * The different nav item types that exist
 */
const navItemTypes = Object.freeze({
  /**
   * standard nav item for navigating
   */
  NAVIGATION: 'NAVIGATION',

  /**
   * nav item that looks like a link
   */
  LINK: 'LINK',

  // nav item for logical grouping. In Gmailv2, the entire nav item can be clicked to expand/collapse its children and it ignores all NavItemDescriptor options other than `name` and `subtitle`.
  // Behaves identically to NAVIGATION when in Gmailv1.
  GROUPER: 'GROUPER',

  // Old alias for LINK
  MANAGE: 'MANAGE',

  SECTION: 'SECTION',
} as const);

export default navItemTypes;
