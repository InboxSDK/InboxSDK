module.exports = function(containerElement, append, newIconClass){
	if(!this._iconElement && newIconClass){
		require('./create-icon-element').call(this, containerElement, append);

	}
	else if(this._iconClass && !newIconClass){
		if(!this._iconClass){
			this._iconElement.remove();
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
