/**
 * Bundled Gmail selector registry.
 *
 * Each key maps to an ORDERED list of candidates, tried one at a time until one
 * matches. An extension can supply overrides to this registry, which are PREPENDED
 * to the bundled chain.
 *
 * Selectors must be ordered by preference (which selector must be tried first),
 * not in chronological order.
 *
 * Never join a chain into one comma-separated selector: `querySelector('a, b')` picks
 * the first match in document order, which ignores this ranking.
 */
export const GMAIL_SELECTORS = {
  /**
   * The compose title-bar table.
   *
   * The `Ht`-less rung matches a superset of the `Ht` one, so it must stay BELOW it:
   * above, it would win always and the specific rung would never run.
   * Root: compose root.
   */
  'composeView.titleBarTable': [
    '.nH.Hy.aXJ table.cf.Ht',
    '.nH.Hy.aXJ table.cf',
  ],

  /**
   * The title-bar cell holding the compose window buttons; inside the table above,
   * but resolved independently of it.
   * Root: compose root.
   */
  'composeView.titleBarTd': [
    '.nH.Hy.aXJ table.cf.Ht td.Hm',
    '.nH.Hy.aXJ table.cf td.Hm',
  ],

  /**
   * The native title element. Stay at this depth: the code anchors on its PARENT
   * cell, not on the element itself.
   * Root: `composeView.titleBarTable`
   */
  'composeView.titleBarText': ['div.Hp'],

  /**
   * The three layers `setTitleBarColor()` paints.
   * Root: compose root.
   */
  'composeView.titleBarColorOuter': ['.nH.Hy.aXJ .pi > .l.o'],
  'composeView.titleBarColorBody': ['.nH.Hy.aXJ .l.m'],
  'composeView.titleBarColorBodyInner': ['.nH.Hy.aXJ .l.m > .l.n'],

  /**
   * Native button used to identify the Inbox-state toolbar section.
   * Root: one `.G-Ni` section.
   */
  'toolbar.archiveSectionButton': [
    '.ar9',
    '.aFh',
    '.aFj',
    '.lR',
    '.nN',
    '.nX',
    '.aFk',
  ],

  /**
   * Native checkbox used to identify the selection toolbar section.
   * Root: one `.G-Ni` section.
   */
  'toolbar.checkboxSectionButton': ['.T-Jo-auh'],

  /**
   * Primary native buttons or icon descendants in Gmail's Move/Label section.
   * Root: one `.G-Ni` section.
   */
  'toolbar.moveSectionButton': ['.asb', '.ase', '.ns', '.mw', '.bq5'],

  /**
   * Gmail search threads retain `.aFj` around "Move to Inbox" when Material
   * SVG icons replace the legacy `.bq5` descendant.
   * Root: one `.G-Ni` section. Kept separate so a real Move section wins.
   */
  'toolbar.moveSectionFallbackButton': ['.aFj'],

  /**
   * Body of an open message.
   * Root: message element.
   */
  'messageView.body': ['div.ii.gt', '.adP'],

  /**
   * Message body carrying the legacy `m<hex>` id class. Narrower than
   * `messageView.body` on purpose — the `.adP` rung does not carry that class.
   * Root: message element.
   */
  'messageView.legacyIdBody': ['div.ii.gt'],

  /**
   * Element carrying the thread's id attributes.
   * Root: thread element.
   */
  'threadView.idElement': ['[data-legacy-thread-id]'],

  /**
   * A message's open "more actions" menu. Gmail renders it outside
   * the message, so a match may belong to another message.
   * Root: `document.body`.
   */
  'messageView.openMoreMenu': [
    // 2023-11-16 thread-view redesign
    'div.nH.a98.iY > div.nH .aHU .b7.J-M[aria-haspopup=true]',
    // 2022-11-23, same shape under an extra `td >`
    'td > div.nH.a98.iY > div.nH .aHU .b7.J-M[aria-haspopup=true]',
    // pre-2023 `.if` layout
    'td > div.nH.if > div.nH.aHU div.b7.J-M[aria-haspopup=true]',
  ],

  /**
   * The "more actions" button that opens `messageView.openMoreMenu`.
   * Only present while the message is expanded.
   * Root: message element.
   */
  'messageView.moreButton': [
    'tr.acZ div.T-I.J-J5-Ji.aap.L3[role=button][aria-haspopup]',
  ],

  /**
   * The sender's span in a message header; carries the `email` and `name`
   * attributes the contact is built from.
   * Root: message element.
   */
  'messageView.senderSpan': ['td.gF span[email]'],

  /**
   * The message's date element; the full date is read from its `title`,
   * not its text.
   * Root: message element.
   */
  'messageView.dateElement': ['.ads .gK .g3'],

  /**
   * The element carrying the message's sync id in `data-message-id`.
   * Root: message element.
   */
  'messageView.syncIdElement': ['[data-message-id]'],

  /**
   * The element carrying `data-legacy-message-id`. The SDK also writes that
   * attribute onto `messageView.syncIdElement`, so a rung must match both.
   * Root: message element.
   */
  'messageView.legacyIdElement': ['[data-legacy-message-id]'],

  /**
   * The header span attachment icons are added to, in an expanded message.
   * Root: message element.
   */
  'messageView.attachmentIconSlot': ['td.gH div.gK span'],

  /**
   * The header span attachment icons are added to, in a collapsed message.
   * Root: message element.
   */
  'messageView.attachmentIconSlotCollapsed': ['.adf.ads td.gH span'],

  /**
   * The container that holds an inline reply; watched for its class change.
   * Root: message element.
   */
  'messageView.replyContainer': ['.ip'],

  /**
   * The thread's subject heading. Read for its text, or walked child by child
   * when it contains emoji images.
   * Root: thread element.
   */
  'threadView.subject': ['.ha h2'],

  /**
   * The list holding the thread's messages, which custom messages are
   * inserted into.
   * Root: thread element.
   */
  'threadView.messageList': ['[role=list]'],

  /**
   * The message element that contains the hidden messages notice.
   * Root: thread element.
   */
  'threadView.hiddenNoticeMessage': ['.adv'],

  /**
   * The span holding the number of messages Gmail has hidden; read as a number.
   * Root: `threadView.hiddenNoticeMessage`.
   */
  'threadView.hiddenNoticeCount': ['.adx span'],

  /**
   * Where a stand-in notice is inserted when Gmail renders no native one.
   * Root: `threadView.hiddenNoticeMessage`.
   */
  'threadView.hiddenNoticeSlot': ['.G3'],

  /**
   * The container an app's thread label is appended to, and re-appended to
   * whenever Gmail removes it.
   * Root: thread element.
   */
  'threadView.labelContainer': ['.ha .J-J5-Ji'],

  /**
   * The subject wrapper that subject buttons are added to.
   * Root: thread element.
   */
  'threadView.subjectParent': ['.V8djrc.byY'],

  /**
   * The messages container, whose last message footer holds footer buttons.
   * Root: thread element.
   */
  'threadView.messagesContainer': ['div.nH .aHU'],

  /**
   * The toolbar beside the thread subject, which subject buttons are put in.
   * Root: thread element.
   */
  'threadView.subjectToolbar': ['.bHJ'],

  /**
   * An expanded message. Its PARENT is the container the message view stream
   * watches, so stay at this depth.
   * Root: thread element.
   */
  'threadView.openMessage': ['.h7'],

  /**
   * The expand-all icon. The code walks up to its `role=button` ancestor, so
   * stay at the image.
   * Root: thread element.
   */
  'threadView.expandAllButton': ['img.gx'],

  /**
   * The collapse-all icon. The code walks up to its `role=button` ancestor, so
   * stay at the image.
   * Root: thread element.
   */
  'threadView.collapseAllButton': ['img.gq'],

  /**
   * The subject container the notice bar is inserted into, in the current
   * thread view.
   * Root: thread element.
   */
  'threadView.subjectContainer': [
    // 2023-11-16 thread-view redesign
    '* > .nH',
  ],

  /**
   * The subject container the notice bar is inserted into, in the thread
   * views that predate the redesign.
   * Root: thread element.
   */
  'threadView.subjectContainerLegacy': [
    // 2018 layout
    '.if > .nH',
    // 2022-10-21 layout
    '.a98.iY > .nH',
    // 2022-10-12 layout
    '.PeIF1d > .nH',
  ],

  /**
   * The element holding the list toolbar and the thread list.
   * Root: the row list element container.
   */
  'routeView.rowListWrapper': ['.bGI.nH'],

  /**
   * The toolbar above the thread list.
   * Root: `routeView.rowListWrapper`.
   */
  'routeView.listToolbar': ['[gh=tm]', '.G-atb'],

  /**
   * The left nav column.
   * Root: `document`.
   */
  'leftNav.root': ['.aeN'],

  /**
   * The left nav when Gmail shows the app menu
   * https://support.google.com/mail/answer/11555490
   * Root: `document`.
   */
  'leftNav.appMenu': ['.aeN.WR.a6o.anZ.nH.oy8Mbf[role=navigation]'],

  /**
   * The app menu container, which holds the menu items and their panels.
   * Root: `document`.
   */
  'appMenu.container': ['.aqk.aql.bkL'],

  /**
   * The main menu button in the Gmail header; its `aria-expanded` is read.
   * Root: `document`.
   */
  'appMenu.burgerButton': [
    'header[role="banner"] > div > div > div[aria-expanded]',
  ],

  /**
   * The app header, which toggles into panel-less mode with the app menu.
   * Root: `document`.
   */
  'appMenu.header': ['.oy8Mbf.qp'],

  /**
   * The Hangouts buttons at the bottom of the left nav.
   * Root: `document`.
   */
  'leftNav.gtalkButtons': ['.aeN .aj5.J-KU-Jg'],

  /**
   * This selector matches the app menu if it is or will be present, otherwise if
   * we're in a mode of Gmail without the app menu, then this might match the
   * collapsible panel left nav menu instead. We wait for this selector so we can
   * know when the app menu is ready or if it will never be ready.
   * Root: `document`.
   */
  'leftNav.appMenuOrNavMenuFallback': ['.aeN.WR.nH.oy8Mbf[role=navigation]'],
} as const satisfies Record<string, readonly string[]>;

export type SelectorKey = keyof typeof GMAIL_SELECTORS;

/** Resolved candidates for every key. The merge builds new lists. */
export type SelectorCandidates = Record<SelectorKey, readonly string[]>;

/** Shape of the `selectors` object in a remote config. */
export type SelectorOverrides = Partial<Record<SelectorKey, readonly string[]>>;
