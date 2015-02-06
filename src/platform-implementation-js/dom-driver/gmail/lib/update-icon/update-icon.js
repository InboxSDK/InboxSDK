function createIconElement(iconSettings, containerElement, append){
	iconSettings._iconElement = document.createElement('div');
	iconSettings._iconElement.classList.add('inboxsdk__button_icon');
	iconSettings._iconElement.innerHTML = '&nbsp;';

	if(append){
		containerElement.appendChild(iconSettings._iconElement);
	}
	else{
		containerElement.insertBefore(iconSettings._iconElement, containerElement.firstElementChild);
	}
}

function createIconImgElement(iconSettings, containerElement, append){
	if(!iconSettings._iconElement){
		createIconElement(iconSettings, containerElement, append);
	}

	iconSettings._iconElement.innerHTML = '';

	iconSettings._iconImgElement = document.createElement('img');
	iconSettings._iconImgElement.classList.add('inboxsdk__button_iconImg');

	iconSettings._iconImgElement.src = iconSettings._iconUrl;
	iconSettings._iconElement.appendChild(iconSettings._iconImgElement);
}

// TODO make this return a class instead of taking the iconSettings state object
module.exports = function updateIcon(iconSettings, containerElement, append, newIconClass, newIconUrl){
	if(!iconSettings._iconUrl && newIconUrl){
		iconSettings._iconUrl = newIconUrl;
		createIconImgElement(iconSettings, containerElement, append);
	}
	else if(iconSettings._iconUrl && !newIconUrl){
		iconSettings._iconImgElement.remove();
		iconSettings._iconImgElement = null;
		if (!iconSettings._iconClass) {
			iconSettings._iconElement.remove();
			iconSettings._iconElement = null;
		} else {
			iconSettings._iconElement.innerHTML = '&nbsp;';
		}
		iconSettings._iconUrl = newIconUrl;
	}
	else if(newIconUrl){
		iconSettings._iconImgElement.src = newIconUrl;
		iconSettings._iconUrl = newIconUrl;
	}

	if(!iconSettings._iconElement && newIconClass){
		createIconElement(iconSettings, containerElement, append);
	}
	else if(iconSettings._iconClass && !newIconClass){
		if(!iconSettings._iconUrl){
			iconSettings._iconElement.remove();
			iconSettings._iconElement = null;
			iconSettings._iconClass = newIconClass;
		}
		else{
			iconSettings._iconElement.setAttribute('class', 'inboxsdk__button_icon ');
			iconSettings._iconClass = newIconClass;
		}
	}

	if(newIconClass) {
		iconSettings._iconElement.setAttribute('class', 'inboxsdk__button_icon ' + newIconClass);
		iconSettings._iconClass = newIconClass;
	}
};
