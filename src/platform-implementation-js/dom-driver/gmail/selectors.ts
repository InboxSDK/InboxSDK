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
   * Element carrying the thread's legacy id attribute.
   * Root: thread element.
   */
  'threadView.idElement': ['[data-legacy-thread-id]'],

  /**
   * Element carrying the thread's permanent id attribute.
   * Root: thread element.
   */
  'threadView.permanentIdElement': ['[data-thread-perm-id]'],

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
   * The thread's subject heading. Read for its text, or walked child by child
   * when it contains emoji images.
   * Root: thread element.
   */
  'threadView.subject': ['.ha h2'],
} as const satisfies Record<string, readonly string[]>;

export type SelectorKey = keyof typeof GMAIL_SELECTORS;

/** Resolved candidates for every key. The merge builds new lists. */
export type SelectorCandidates = Record<SelectorKey, readonly string[]>;

/** Shape of the `selectors` object in a remote config. */
export type SelectorOverrides = Partial<Record<SelectorKey, readonly string[]>>;
