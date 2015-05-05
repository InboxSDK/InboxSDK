export default function(element, lastRange){
  element.focus();
  const selection = document.getSelection();
  const range = selection && selection.rangeCount ? selection.getRangeAt(0) : lastRange;
  return range ? range.toString() : null;
}
