module.exports = function(containerElement, append, newIconClass){
	if(!this._iconElement && newIconClass){
		require('./create-icon-element').call(this, containerElement, append);

	}
	else if(this._iconClass && !newIconClass){
		if(!this._iconUrl){
			this._iconElement.remove();
			this._iconElement = null;
			this._iconClass = newIconClass;
		}
		else{
			this._iconElement.setAttribute('class', 'inboxsdk__button_icon ');
			this._iconClass = newIconClass;
		}
	}

	if(newIconClass) {
		this._iconElement.setAttribute('class', 'inboxsdk__button_icon ' + newIconClass);
		this._iconClass = newIconClass;
	}
};
