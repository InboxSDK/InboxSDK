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
   * The compose title-bar table, resolved against the compose root.
   *
   * The `Ht`-less rung matches a superset of the `Ht` one, so it must stay BELOW it:
   * above, it would win always and the specific rung would never run.
   */
  'composeView.titleBarTable': [
    '.nH.Hy.aXJ table.cf.Ht',
    '.nH.Hy.aXJ table.cf',
  ],

  /**
   * The title-bar cell holding the compose window buttons — inside the table above,
   * but resolved against the same compose root.
   */
  'composeView.titleBarTd': [
    '.nH.Hy.aXJ table.cf.Ht td.Hm',
    '.nH.Hy.aXJ table.cf td.Hm',
  ],

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
} as const satisfies Record<string, readonly string[]>;

export type SelectorKey = keyof typeof GMAIL_SELECTORS;

/** Resolved candidates for every key. The merge builds new lists. */
export type SelectorCandidates = Record<SelectorKey, readonly string[]>;

/** Shape of the `selectors` object in a remote config. */
export type SelectorOverrides = Partial<Record<SelectorKey, readonly string[]>>;
