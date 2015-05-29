DsApiBridge = {
  BASE_URL: 'https://docsend.com/',

  get INFO_URL () {
    return DsApiBridge.BASE_URL + 'api/info/1_2_2';
  },

  get LOGIN_URL () {
    return DsApiBridge.BASE_URL + 'api/gmail/login';
  },

  get DOCUMENTS_URL () {
    return DsApiBridge.BASE_URL + 'api/gmail/documents';
  },

  get LINK_CREATE_URL () {
    return DsApiBridge.BASE_URL + 'api/gmail/links';
  },

  get LINK_UPDATE_URL () {
    return DsApiBridge.BASE_URL + 'api/gmail/update_links/';
  }
};
