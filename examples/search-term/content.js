function log() {
	console.log.apply(console, ['search-term'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'search-term').then(function(sdk) {
	sdk.Search.createFilter({
		term: 'app:custom',
		termReplacer: function(event) {
			console.log('is:custom activate', event);
			return [
				{rfc822msgid: '<bcaec51b1acbb643d8050b8ee898@google.com>'},
				{rfc822msgid: '<CADBYpy=tCAyweRdjMTuvKd5y8XYtbJZmQHW19gTOgAhotQtYQA@mail.gmail.com>'},
				{rfc822msgid: '<047d7b6760760bc84f050b66ad3e@google.com>'},
				{rfc822msgid: '<CADBYpykj83T_cW9Xpb6jKAq7_RuKvcEZ6qfccJd6JLq2ndm4iA@mail.gmail.com>'},
				{rfc822msgid: '<047d7b0722a8b0e3f2050b65a36b@google.com>'},
				{rfc822msgid: '<047d7b6d83be145f07050b63eb10@google.com>'},
				{rfc822msgid: '<CADBYpy=iMTZTg8Gxap6QhncCVDZXxaNdiwSk=UtkYOzuSHztsQ@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpymyoVNkV-kASO+=EO7NeLezMT5023g3DE_H9un+5eR2iA@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWBZSAgDxXDT=0Owur6W=0oGkFme9KWf7nS4aXM7k3aD7A@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpykTcxzyq+hp4rj1Z6jEy5+gBCJw6_DLfH=U3-By2n-DBA@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpymynkxToBiu2mvugofGk-xm06JtiRkQsC9F=HUAQLPa4Q@mail.gmail.com>'},
				{rfc822msgid: '<CAL_Ays_KDVF-m0jccMu_FA_7BDohhq9o7i+hAFWPJr3Js6QfEQ@mail.gmail.com>'},
				{rfc822msgid: '<549d847975c16_23fd5409cd3304768d@94402556-b42b-4c02-92c3-61cc1c6d30d5.mail>'},
				{rfc822msgid: '<CAKDYPWCsfRF-RJEXTu1F07s2Xg1N17Vjb4B6aGU-MjnHaYYEZw@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpy=-5EoMCVsFa5kAvCOG53kquuSDKEf+4p73aszk4JJ3yA@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWBS9HfGBv_=DTQp=9G5vCB1L8gpVcV0=pQ_P7+gguhSYw@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWDfAbdFoT-BkLjh7-9MKNYMS1z2dwO-bV1F+K5A0MqafQ@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWBXr5uDAspJFOJpiACGyZX5BG3mwTgYzzmkaiv8xFwBjA@mail.gmail.com>'},
				{rfc822msgid: '<5499957a9b6eb_5fd05bfb42c3557fa@prod-rs-r05.ihost.brewster.com.mail>'},
				{rfc822msgid: '<15-5288392773638389732-836200586460265275-chromium=googlecode.com@googlecode.com>'},
				{rfc822msgid: '<001a11c1c5580d58d0050adf4058@google.com>'},
				{rfc822msgid: '<CAKDYPWCec8xBAdjnK5ZgXrtUJbsQTgq4BSWM99FKpNZHdbUNyA@mail.gmail.com>'},
				{rfc822msgid: '<089e01294ff02a9344050ad9dcd3@google.com>'},
				{rfc822msgid: '<CA+jPuQ91MdxZZrgrv0_PBATGPUfzkHnNwWha1nX732cgq4mvog@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpynVjnSj_uhjd9bUGuGmnTPj2Pw7KpNtjWEm7bsT62Em7w@mail.gmail.com>'},
				{rfc822msgid: '<CA+jPuQ-XE7faUxZrkbkPRwD=sFRM7fYTKL5UKiUHEMbOmv_fWw@mail.gmail.com>'},
				{rfc822msgid: '<CA+jPuQ-3FhrHdTp0yjvmCsBP7zp7g9ps=5H6LZMx9=u0CkKRmg@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWDAZoYDYF0TYpiNEs0RQ4TNo2c8OwH2CVd67fJYsxJp2g@mail.gmail.com>'},
				{rfc822msgid: '<41d1bfcf-2dcb-4f3d-821f-c0fe20d8c47e@xtnvmta109.xt.local>'},
				{rfc822msgid: '<4863d5f1-3d81-46f1-90c2-51d4c693604a@xtnvmta201.xt.local>'},
				{rfc822msgid: '<CAKDYPWBy=6ruwEE9bonAN=YkMHxBre06ZkH9+ztP5eLd2As1yg@mail.gmail.com>'},
				{rfc822msgid: '<702cdc6d8ae2fee48124bfb55e9207b8132.20141222184022@mail181.atl81.rsgsv.net>'},
				{rfc822msgid: '<089e0115f450155032050ad24250@google.com>'},
				{rfc822msgid: '<20141209212307.2156E14EDCB@mail.crashcoherency.net>'},
				{rfc822msgid: '<20141209204935.56C7014EDB5@mail.crashcoherency.net>'},
				{rfc822msgid: '<20141209204757.9106814EDB5@mail.crashcoherency.net>'},
				{rfc822msgid: '<CAKDYPWC_hm=+Oks6VTN1w0b5ftr85oPRMSFgi-8X3RxrAtFbKw@mail.gmail.com>'},
				{rfc822msgid: '<CADBYpy=oXGbx4EQJtSFi0zs4B6b0dw0ms-Cpe0JBJRkFzf+PyQ@mail.gmail.com>'},
				{rfc822msgid: '<CAKDYPWBbyyHko3Q2HG=OCw=XST7QSstecenNUM9q0E91Ebr2hA@mail.gmail.com>'},
				{rfc822msgid: '<CAG5517AWbP2uBmq-P4v+5Dxq1ORN3_8Wf4aA25g4beB66Z=+yA@mail.gmail.com>'},
				{rfc822msgid: '<702cdc6d8ae2fee48124bfb55e9207b8132.20141209180343@mail157.atl21.rsgsv.net>'},
				{rfc822msgid: '<047d7b11208ffa58f50509caa4f1@google.com>'},
				{rfc822msgid: '<bcaec517cdb65def830509c5a0de@google.com>'},
				{rfc822msgid: '<CADBYpymTHxjOsXsXjeGShiTpbnuuDC5Mh31LACkSE8ACWZp0mQ@mail.gmail.com>'},
				{rfc822msgid: '<6-5288392773638389732-2578584358222473794-googleappengine=googlecode.com@googlecode.com>'}
			];
		}
	});
});
