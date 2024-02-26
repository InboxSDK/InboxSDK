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

const escapeHTMLPolicy = globalThis.trustedTypes?.createPolicy(
  'inboxSdkEscapePolicy',
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
 */
export default function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = escapeHTMLPolicy.createHTML(html);
  return div.textContent!;
}
