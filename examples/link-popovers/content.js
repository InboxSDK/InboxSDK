InboxSDK.load(2, 'popover-example').then(function (sdk) {
  sdk.Compose.registerComposeViewHandler(function (composeView) {
    // Watch for gmail's link popover to appear
    composeView.on('linkPopOver', (linkPopOver) => {
      console.log(
        `popover in compose (with subject ${composeView.getSubject()})`,
        linkPopOver.getLinkElement()
      );

      // Create our custom sections
      const section = linkPopOver.addSection();
      section.getElement().textContent = 'An added section';
      const section2 = linkPopOver.addSection();
      section2.getElement().textContent = 'This is a second section';

      linkPopOver.on('close', () => {
        console.log('link popover closed', linkPopOver.getLinkElement());
      });
    });
  });
});
