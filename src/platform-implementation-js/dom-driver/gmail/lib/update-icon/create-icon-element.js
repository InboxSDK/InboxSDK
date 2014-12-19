module.exports = function(containerElement, append){
	this._iconElement = document.createElement('div');
	this._iconElement.classList.add('inboxsdk__button_icon');
	this._iconElement.innerHTML = '&nbsp;';

	if(append){
		containerElement.appendChild(this._iconElement);
	}
	else{
		containerElement.insertBefore(this._iconElement, containerElement.firstElementChild);
	}

};
