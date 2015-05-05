export default function(element, lastRange){
	element.focus();
	const selection = document.getSelection();
	const range = selection && selection.rangeCount ? selection.getRangeAt(0) : lastRange;

	if (!range) return null;

	const div = document.createElement('div');
	div.appendChild(range.cloneContents());
	return div.innerHTML;
}
