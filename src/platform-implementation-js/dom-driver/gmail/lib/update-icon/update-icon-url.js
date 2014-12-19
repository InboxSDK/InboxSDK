module.exports = function(containerElement, append, newIconUrl){
	if(!this._iconUrl && newIconUrl){
		this._iconUrl = newIconUrl;
		require('./create-icon-img-element').call(this, containerElement, append);
	}
	else if(this._iconUrl && !newIconUrl){
		this._iconImgElement.remove();
		this._iconImgElement = null;
		this._iconUrl = newIconUrl;
	}
	else if(newIconUrl){
		this._iconImgElement.src = newIconUrl;
		this._iconUrl = newIconUrl;
	}
};
