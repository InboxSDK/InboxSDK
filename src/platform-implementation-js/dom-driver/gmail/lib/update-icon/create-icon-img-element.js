module.exports = function(containerElement, append){
	if(!this._iconElement){
		require('./create-icon-element').call(this, containerElement, append);
	}

	this._iconElement.innerHTML = '';

	this._iconImgElement = document.createElement('img');
	this._iconImgElement.classList.add('inboxsdk__button_iconImg');

	this._iconImgElement.src = this._iconUrl;
	this._iconElement.appendChild(this._iconImgElement);
};
