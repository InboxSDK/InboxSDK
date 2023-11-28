import censorHTMLstring from './censorHTMLstring';

export function extractDocumentHtmlAndCss(
  options: { censor: boolean } = { censor: true },
) {
  try {
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          const name = `\n/* Stylesheet : ${
            sheet.href || '[inline styles]'
          } */`;
          const rules = Array.from(sheet.cssRules).map(
            (cssRule) => cssRule.cssText,
          );
          rules.splice(0, 0, name);
          return rules;
        } catch (e) {
          return [];
        }
      })
      .join('\n')
      .replaceAll(`url("//`, `url("https://`);

    const links = Array.from(document.querySelectorAll('link'))
      .filter((link) => link.href?.includes('fonts') || link.as === 'image')
      .map((link) => link.outerHTML)
      .join('\n');

    let body = document.body.innerHTML;
    body = body.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    if (options.censor) {
      body = censorHTMLstring(body);
    }

    return `
      <!DOCTYPE html>
      <html>
          <head>
            ${links}
            <style>
              ${css}
            </style>
          </head>
          <body>
            ${body}
          </body>
      </html>
      `;
  } catch (err) {
    return `couldn't extract document html and css: ${err}`;
  }
}
