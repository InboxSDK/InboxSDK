/* @flow */

import fs from 'fs';
import * as GSRP from './gmail-sync-response-processor';

describe('extractThreadsFromSearchResponse', () => {
  it('regular search request', () => {
    const data = fs.readFileSync(
      __dirname+'/../../../../__tests__/gmail-sync-response-processor/input-triggered-search-response-2018-01-25.json',
      'utf8'
    );

    const threads = GSRP.extractThreadsFromSearchResponse(data);

    expect(threads.length).toEqual(12);
    expect(threads[0]).toMatchObject({
      subject: 'Introducing Comment Editing and @Mentions',
      snippet: '@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly',
      syncThreadID: 'thread-f:1589064200257780346',
      oldGmailThreadID: '160d7d788da7ba7a',
      extraMetaData: {
        snippet: 'www.streak.com ) ( https://www.streak.com/careers ) @Mentions, \nConversations, and Editing for Comments Happy New Year',
        syncMessageData: [{"date": 1516729798134, "syncMessageID": "msg-f:1590406465099407434"}]
      },
      rawResponse: {"1":{"1":"Introducing Comment Editing and @Mentions","2":"@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly","3":"1516729798134","4":"thread-f:1589064200257780346","5":[{"1":"msg-f:1590406465099407434","2":{"1":1,"2":"support@streak.com","3":"Streak.com"},"7":"1516729798134","10":"@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly","11":["^a","^all","^smartlabel_notification","^u"],"18":"1516729798411","31":"1516729798411","34":2,"44":0,"48":"1590406465099407434"}],"8":"1516731537162","17":0,"18":"1589064200257780346"},"2":"8058"}
    });
  });

  it('works for SDK triggered ajax request', () => {
    const data = fs.readFileSync(
      __dirname+'/../../../../__tests__/gmail-sync-response-processor/sdk-triggered-search-response-2018-01-25.json',
      'utf8'
    );

    const threads = GSRP.extractThreadsFromSearchResponse(data);

    expect(threads.length).toEqual(1);
    expect(threads[0]).toMatchObject({
      subject:"mail merge test 22222",
      snippet:"dsafdsafdsafdsa ᐧ",
      syncThreadID:"thread-f:1590533107145425147",
      oldGmailThreadID:"1612b56f16e6c0fb",
      rawResponse:{"1":{"1":"mail merge test 22222","2":"dsafdsafdsafdsa ᐧ","3":"1516850573718","4":"thread-f:1590533107145425147","5":[{"1":"msg-f:1590533107145425147","2":{"1":1,"2":"inboxsdktestdataonly@gmail.com","3":"Jane Doe"},"7":"1516850573718","10":"dsafdsafdsafdsa ᐧ","11":["^all","^f"],"18":"1516850573678","31":"1516850573678","34":0,"44":3,"48":"1590533107145425147"}],"15":{"1":[{"1":"","2":"oismail+test@gmail.com"}]},"17":0,"18":"1590533107145425147"},"2":"9245"},
      extraMetaData:{
        snippet:"",
        syncMessageData:[{"date": 1516850573718, "syncMessageID": "msg-f:1590533107145425147"}]
      }
    });
  });

});

describe('extractThreadsFromThreadResponse', function() {

  it('works for input triggered ajax request', () => {
    const data = fs.readFileSync(
      __dirname+'/../../../../__tests__/gmail-sync-response-processor/thread-response-2018-03-08.json',
      'utf8'
    );

    const threads = GSRP.extractThreadsFromThreadResponse(data);
    expect(threads.length).toEqual(1);
    expect((threads[0]: any).oldGmailThreadID).toBe('16207922dbd860d9');
    expect(threads[0].syncThreadID).toBe('thread-f:1594407458713395417');
  });

});

it('replaceThreadsInSearchResponse works', () => {

  const originalSearchResponse = fs.readFileSync(
    __dirname+'/../../../../__tests__/gmail-sync-response-processor/input-triggered-search-response-2018-01-25.json',
    'utf8'
  );

  const replacementThreads = GSRP.extractThreadsFromSearchResponse(
    fs.readFileSync(
      __dirname+'/../../../../__tests__/gmail-sync-response-processor/sdk-triggered-search-response-2018-01-25.json',
      'utf8'
    )
  );

  const responesShouldLookLike = fs.readFileSync(
    __dirname+'/../../../../__tests__/gmail-sync-response-processor/replaced-threads-response-example-data-2018-01-25.json',
    'utf8'
  ).replace('\n', '');

  const newResponse = GSRP.replaceThreadsInSearchResponse(originalSearchResponse, replacementThreads, {start: 0});
  expect(newResponse).toBe(responesShouldLookLike);
});
