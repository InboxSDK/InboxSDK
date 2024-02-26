interface Policy {
  /**
   * This method returns a {@link TrustedTypePolicy},
   * but typescript@5.3.3's lib.dom doesn't support assigning non-strings
   * to {@link HTMLElement.innerHTML}.
   */
  createHTML(string: string): string;
}

declare global {
  /**
   * typescript@5.3.3 doesn't ship types for trustedTypes yet.
   * Safari 17.2 doesn't support it either, so a fallback is needed if
   * it's not defined.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML
   */
  var trustedTypes:
    | {
        createPolicy(name: string, policy: Policy): Policy;
      }
    | undefined;
}

/**
 * This function removes all HTML tags from a string.
 * The resulting string may still contain HTML entities and not be suitable to display as plain text.
 *
 * This function's output will never contain `<` and therefore will never contain any HTML
 * tags, so it's safe to use this on arbitrary input and assign the result to an element's
 * innerHTML property.
 *
 * @see Use [htmlToText](./html-to-text.ts) instead if you want to convert HTML to
 * unformatted text to display.
 */
function removeHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/g, '');
}

/**
 * This policy object is used to strip HTML tags from a string.
 */
export const removeHtmlTagsPolicy = globalThis.trustedTypes?.createPolicy(
  'inboxSdk__removeHtmlTagsPolicy',
  {
    createHTML(string: string) {
      return removeHtmlTags(string);
    },
  },
) ?? {
  createHTML(string: string) {
    return removeHtmlTags(string);
  },
};
