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

function removeHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/g, '');
}

const removeHtmlTagsPolicy = globalThis.trustedTypes?.createPolicy(
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

/**
 * Quick function for converting HTML with entities into text without
 * introducing an XSS vulnerability.
 * Converts text like "&amp;" into "&" and "&lt;" into "<".
 *
 * This is *not* for creating "safe HTML" from user input to assign to
 * an element's innerHTML. The result of this function should not be treated
 * as HTML.
 */
export default function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = removeHtmlTagsPolicy.createHTML(html);
  return div.textContent!;
}
