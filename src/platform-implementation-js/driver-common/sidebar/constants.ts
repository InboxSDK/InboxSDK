import cx from 'classnames';
import { legacyIdMap } from '../../lib/idMap';

const cssGlobal = 'inboxsdk__app_sidebar_waiting_platform';

const enum SidebarClassName {
  /** v1.1.0 CSS module selector, */
  v1_1_0 = 'inboxsdk__a0oshmeH6N_2vLtc3DNT',
  /** v1.1.1 CSS module selector, */
  v1_1_1 = 'inboxsdk__BV_FA4qVT4qYxs3LbEU4',
}

export const sidebarWaitingPlatformSelector = [
  cssGlobal,
  SidebarClassName.v1_1_0,
  SidebarClassName.v1_1_1,
  // Pre CSS module selector <1.1.0
  legacyIdMap('app_sidebar_waiting_platform'),
]
  .map((x) => '.' + x)
  .join(', ');

/**
 * The CSS local corresponding to this SDK's classname is intentionally in
 * this classname. This is because this classname
 * is used as a selector for disparate bits of code,
 * and the CSS local is only used for styling.
 */
export const sidebarWaitingPlatformClassName = cx(
  cssGlobal,
  SidebarClassName.v1_1_0,
  SidebarClassName.v1_1_1,
  legacyIdMap('app_sidebar_waiting_platform')
);
