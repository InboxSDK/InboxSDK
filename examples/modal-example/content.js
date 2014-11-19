var modal = (new InboxSDK('simple-example')).Modal.show({
	title: 'Monkeys'
});

setTimeout(function(){modal.close();}, 10*1000);
