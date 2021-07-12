// Use insert-element-in-order instead of this!
export default function getInsertBeforeElement(
  checkElement: HTMLElement,
  childElements: ArrayLike<any>,
  dataAttributes: string[]
): HTMLElement | null {
  const checkValues: { [attr: string]: any } = {};

  dataAttributes.forEach(function(attribute) {
    const stringValue = checkElement.getAttribute(attribute);
    checkValues[attribute] =
      stringValue == null ? null : parseIfNumber(stringValue) ?? stringValue;
  });

  for (let ii = 0; ii < childElements.length; ii++) {
    const child: HTMLElement = childElements[ii];

    if (_isChildAfter(checkValues, child, dataAttributes)) {
      return child;
    }
  }

  return null;
}

function _isChildAfter(
  checkValues: { [attr: string]: any },
  child: HTMLElement,
  dataAttributes: string[]
): boolean {
  for (let ii = 0; ii < dataAttributes.length; ii++) {
    const attribute = dataAttributes[ii];
    const stringValue = child.getAttribute(attribute);

    const value: any =
      stringValue == null ? null : parseIfNumber(stringValue) ?? stringValue;

    if (value > checkValues[attribute]) {
      return true;
    } else if (value < checkValues[attribute]) {
      return false;
    }
  }

  return false;
}

function parseIfNumber(value: string): number | null {
  const n = parseFloat(value);
  if (!isNaN(n) && isFinite(n)) {
    return n;
  } else {
    return null;
  }
}
