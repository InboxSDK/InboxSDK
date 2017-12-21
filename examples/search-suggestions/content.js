'use strict';

function log(...args) {
  console.log('search-suggestions', ...args);
}

function delay(time, value) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve.bind(null, value), time);
  });
}

InboxSDK.load(2, 'search-suggestions').then(inboxSDK => {
  window._sdk = inboxSDK;

  inboxSDK.Router.handleCustomRoute('example2/:monkeyName', function(customRouteView) {
    customRouteView.setFullWidth(false);

    customRouteView.getElement().textContent = 'hello world! ' + customRouteView.getParams().monkeyName;
  });


  inboxSDK.Search.registerSearchQueryRewriter({term: 'has:testing', termReplacer: () => '.'});

  inboxSDK.Search.registerSearchSuggestionsProvider(query => {
    log('search autocompleter', query);
    return delay(0, [
      {
        name: 'new window',
        description: 'opens in new window',
        externalURL: 'https://www.xkcd.com'
      },
      {
        name: 'search term',
        description: 'sets a search term',
        searchTerm: 'foobar'
      },
      {
        name: 'alert box',
        description: 'opens an alert box',
        onClick() {
          alert('foo of bar');
        }
      },
      {
        name: 'alert box+link',
        description: 'opens an alert box and goes somewhere',
        externalURL: 'https://www.xkcd.com',
        onClick() {
          alert('foo of bar');
        }
      },
      {
        "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Launc<b>he</b>d Today*\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\tPipeline: Eng - S29, 9/26\n\t\t</div>",
        "iconUrl": "https://mailfoogae.appspot.com/images/extension/saved-views-icon.png",
        "descriptionHTML": "Filter: Stage Is Any Of Launched and Date of Last Stage Change In a range , Group By: Date Last Updated",
        "routeName": "example2/:monkeyName",
        "routeParams": {
          "monkeyName": "bob"
        }
      },
      {
        "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Launc<b>he</b>d Today\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\tPipeline: Eng - S29, 9/26\n\t\t</div>",
        "iconUrl": "https://mailfoogae.appspot.com/images/extension/saved-views-icon.png",
        "descriptionHTML": "Filter: Stage Is Any Of Launched and Date of Last Stage Change In a range , Group By: Date Last Updated",
        "routeName": "pipeline/:key/:viewKey",
        "routeParams": {
          "key": "agxzfm1haWxmb29nYWVyMgsSDE9yZ2FuaXphdGlvbiIRb2lzbWFpbEBnbWFpbC5jb20MCxIIV29ya2Zsb3cY6TYM",
          "viewKey": "5d47c367-860c-4af8-b8ab-77d808c18fd1"
        }
      },
      {
        "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Needs to be Pus<b>he</b>d by Me\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\tPipeline: Hiring\n\t\t</div>",
        "iconUrl": "https://mailfoogae.appspot.com/images/extension/saved-views-icon.png",
        "descriptionHTML": "Filter: Stage Is Any Of First Interview, Simulation, Decision Making for Next Round, Second Interview, Onsite, Offer and Assigned To Is Any Of Me and Last Email From Does Not Contain streak.com or Stage Is Any Of First Interview, Simulation, Decision Making for Next Round, Second Interview, Onsite, Offer and Assigned To Is Any Of Me and Date of Last Sent Email Before , Group By: Stage",
        "routeName": "pipeline/:key/:viewKey",
        "routeParams": {
          "key": "agxzfm1haWxmb29nYWVyMQsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEghXb3JrZmxvdxiAgICgnvaXCgw",
          "viewKey": "93e92925-e36b-4a0e-a994-222ecee8d185"
        }
      }
    ]);
  });

  inboxSDK.Search.registerSearchSuggestionsProvider(query => {
    return [
      {
        "iconUrl": "https://mailfoogae.appspot.com/images/extension/pipeline-icon.png",
        "nameHTML": "<b>He</b>lp and Tours",
        "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_pipeline\">Idea: 4 boxes, Planned: 2 boxes, Implemented: 0 boxes, Reviewed: 0 boxes, Launched: 6 boxes</div>",
        "routeName": "pipeline/:key",
        "routeParams": {
          "key": "agxzfm1haWxmb29nYWVyMQsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEghXb3JrZmxvdxiAgICg9NqLCgw"
        }
      }
    ];
  });

  // inboxSDK.Search.registerSearchSuggestionsProvider(query => {
  //   return [
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Search <em>he</em>lp\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t14m ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(251, 76, 47);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(251, 76, 47);\"></div><div class=\"streak__labelTag_label\">Incoming</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGMvsiLMFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Streak and Zap <em>he</em>lp\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t3h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh3.googleusercontent.com/-ziiNctJQMnY/AAAAAAAAAAI/AAAAAAAAACk/BoPLGEbKyfU/photo.jpg\" title=\"Andrew S\" class=\"streak__circleContactImage\" email=\"andrew@streak.com\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGImtsrMFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Re: <em>HE</em>LP\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t3h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(250, 209, 101);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(250, 209, 101);\"></div><div class=\"streak__labelTag_label\">Pending</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGLq656wFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t <em>He</em>lp Topic Suggestion\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t4h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(251, 76, 47);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(251, 76, 47);\"></div><div class=\"streak__labelTag_label\">Incoming</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh4.googleusercontent.com/-niX3dLVwHOY/AAAAAAAAAAI/AAAAAAAAAAs/rdMolbuOYpI/photo.jpg\" title=\"Weston L\" class=\"streak__circleContactImage\" email=\"weston@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGP38p7MFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t <em>He</em>lp\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t4h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGMn9x6oFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Re: <em>He</em>lp with ZAPs\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t4h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(251, 76, 47);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(251, 76, 47);\"></div><div class=\"streak__labelTag_label\">Incoming</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh3.googleusercontent.com/-ziiNctJQMnY/AAAAAAAAAAI/AAAAAAAAACk/BoPLGEbKyfU/photo.jpg\" title=\"Andrew S\" class=\"streak__circleContactImage\" email=\"andrew@streak.com\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGLm_hrAFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t <em>He</em>llo\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t6h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh4.googleusercontent.com/-niX3dLVwHOY/AAAAAAAAAAI/AAAAAAAAAAs/rdMolbuOYpI/photo.jpg\" title=\"Weston L\" class=\"streak__circleContactImage\" email=\"weston@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGKnU07UFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t Further Zapier Streak <em>he</em>lp\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t8h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh3.googleusercontent.com/-ziiNctJQMnY/AAAAAAAAAAI/AAAAAAAAACk/BoPLGEbKyfU/photo.jpg\" title=\"Andrew S\" class=\"streak__circleContactImage\" email=\"andrew@streak.com\"><img src=\"https://lh5.googleusercontent.com/-B1z34A9dzJ8/AAAAAAAAAAI/AAAAAAAAAso/8vEzX3rmixA/photo.jpg\" title=\"Brianna D\" class=\"streak__circleContactImage\" email=\"brianna@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGNnS_rMFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t <em>He</em>lp Topic Suggestion\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t8h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh4.googleusercontent.com/-niX3dLVwHOY/AAAAAAAAAAI/AAAAAAAAAAs/rdMolbuOYpI/photo.jpg\" title=\"Weston L\" class=\"streak__circleContactImage\" email=\"weston@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGNmO67MFDA"
  //       }
  //     },
  //     {
  //       "iconUrl": "https://mailfoogae.appspot.com/images/extension/box-icon.png",
  //       "nameHTML": "<span class=\"streak__suggestion_box_name\">\n\t\t\t <em>He</em>lp Totionpic Sugges\n\t\t</span>\n\t\t<div class=\"streak__suggestion_box_updated\">\n\t\t\t10h ago\n\t\t</div>",
  //       "descriptionHTML": "<div class=\"streak__suggestion streak__suggestion_box\"><div><div class=\"streak__labelTag\" style=\"background-color:rgb(194, 194, 194);color:rgb(255, 255, 255);border:1px solid rgb(194, 194, 194);\"><div class=\"streak__labelTag_icon\" style=\"-webkit-mask:url(https://mailfoogae.appspot.com/build/images/pipelineIcon.svg) center / 8px no-repeat;background-color:rgb(255, 255, 255);\"></div><div class=\"streak__labelTag_label\">Support 2016</div></div><div class=\"streak__labelTag\" style=\"background-color:rgb(239, 239, 239);color:rgb(22, 167, 102);border:1px solid rgb(239, 239, 239);\"><div class=\"streak__labelTag_icon\" style=\"width:8px;-webkit-mask:url(https://mailfoogae.appspot.com/build/images/chevron.svg) 100% center / 6px no-repeat;background-color:rgb(22, 167, 102);\"></div><div class=\"streak__labelTag_label\">Resolved</div></div></div><div class=\"streak__suggestion_box_assigned\"><img src=\"https://lh4.googleusercontent.com/-niX3dLVwHOY/AAAAAAAAAAI/AAAAAAAAAAs/rdMolbuOYpI/photo.jpg\" title=\"Weston L\" class=\"streak__circleContactImage\" email=\"weston@streak.com\"></div></div>",
  //       "routeName": "box/:key/search",
  //       "routeParams": {
  //         "key": "agxzfm1haWxmb29nYWVyKgsSDE9yZ2FuaXphdGlvbiIKc3RyZWFrLmNvbQwLEgRDYXNlGOyIirMFDA"
  //       }
  //     }
  //   ];
  // });
});
