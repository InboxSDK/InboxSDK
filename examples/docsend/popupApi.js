DsApiBridge = {
  BASE_URL: 'https://docsend.com/',

  get INFO_URL () {
    return DsApiBridge.BASE_URL + 'api/info/1_2_2';
  },

  get DOCUMENTS_URL () {
    return DsApiBridge.BASE_URL + 'api/chrome/documents';
  },

  get LINK_CREATE_URL () {
    return DsApiBridge.BASE_URL + 'api/chrome/links';
  }
};
