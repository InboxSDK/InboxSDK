function createIconElement(iconSettings, containerElement, append){
	iconSettings.iconElement = document.createElement('div');
	iconSettings.iconElement.classList.add('inboxsdk__button_icon');
	iconSettings.iconElement.innerHTML = '&nbsp;';

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

	iconSettings.iconElement.innerHTML = '';

	iconSettings.iconImgElement = document.createElement('img');
	iconSettings.iconImgElement.classList.add('inboxsdk__button_iconImg');

	iconSettings.iconImgElement.src = iconSettings.iconUrl;
	iconSettings.iconElement.appendChild(iconSettings.iconImgElement);
}

// TODO make this return a class instead of taking the iconSettings state object
module.exports = function updateIcon(iconSettings, containerElement, append, newIconClass, newIconUrl){
	if(!iconSettings.iconUrl && newIconUrl){
		iconSettings.iconUrl = newIconUrl;
		createIconImgElement(iconSettings, containerElement, append);
	}
	else if(iconSettings.iconUrl && !newIconUrl){
		iconSettings.iconImgElement.remove();
		iconSettings.iconImgElement = null;
		if (!iconSettings.iconClass) {
			iconSettings.iconElement.remove();
			iconSettings.iconElement = null;
		} else {
			iconSettings.iconElement.innerHTML = '&nbsp;';
		}
		iconSettings.iconUrl = newIconUrl;
	}
	else if(newIconUrl){
		iconSettings.iconImgElement.src = newIconUrl;
		iconSettings.iconUrl = newIconUrl;
	}

	if(!iconSettings.iconElement && newIconClass){
		createIconElement(iconSettings, containerElement, append);
	}
	else if(iconSettings.iconClass && !newIconClass){
		if(!iconSettings.iconUrl){
			iconSettings.iconElement.remove();
			iconSettings.iconElement = null;
			iconSettings.iconClass = newIconClass;
		}
		else{
			iconSettings.iconElement.setAttribute('class', 'inboxsdk__button_icon ');
			iconSettings.iconClass = newIconClass;
		}
	}

	if(newIconClass) {
		iconSettings.iconElement.setAttribute('class', 'inboxsdk__button_icon ' + newIconClass);
		iconSettings.iconClass = newIconClass;
	}
};
