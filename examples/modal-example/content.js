var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

var modal = (new InboxSDK('simple-example')).Modal.show({
	el: div,
	chrome: true
});
