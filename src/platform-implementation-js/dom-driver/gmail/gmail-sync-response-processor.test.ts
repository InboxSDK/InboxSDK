import fs from 'fs';
import * as GSRP from './gmail-sync-response-processor';

describe('extractThreadsFromSearchResponse', () => {
  it('regular search request', () => {
    const data = fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/input-triggered-search-response-2018-01-25.json',
      'utf8',
    );

    const threads = GSRP.extractThreadsFromSearchResponse(data);

    expect(threads.length).toBe(12);
    expect(threads[0]).toEqual({
      subject: 'Introducing Comment Editing and @Mentions',
      snippet:
        '@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly',
      syncThreadID: 'thread-f:1589064200257780346',
      oldGmailThreadID: '160d7d788da7ba7a',
      extraMetaData: {
        snippet:
          'www.streak.com ) ( https://www.streak.com/careers ) @Mentions, \nConversations, and Editing for Comments Happy New Year',
        syncMessageData: [
          {
            date: 1516729798134,
            syncMessageID: 'msg-f:1590406465099407434',
            oldMessageID: '1777401cdeadbeef',
          },
        ],
      },
      rawResponse: {
        '1': {
          '1': 'Introducing Comment Editing and @Mentions',
          '2': '@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly',
          '3': '1516729798134',
          '4': 'thread-f:1589064200257780346',
          '5': [
            {
              '1': 'msg-f:1590406465099407434',
              '2': { '1': 1, '2': 'support@streak.com', '3': 'Streak.com' },
              '7': '1516729798134',
              '10': '@Mentions, Conversations, and Editing for Comments Happy New Year! In 2017, users added millions of new Comments to Streak - the most pouplar type of content to add. In 2018, Comments are significantly',
              '11': ['^a', '^all', '^smartlabel_notification', '^u'],
              '18': '1516729798411',
              '31': '1516729798411',
              '34': 2,
              '44': 0,
              '48': '1590406465099407434',
              '56': '1777401cdeadbeef',
            },
          ],
          '8': '1516731537162',
          '17': 0,
          '18': '1589064200257780346',
        },
        '2': '8058',
      },
    });
  });

  it('works for SDK triggered ajax request', () => {
    const data = fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/sdk-triggered-search-response-2018-01-25.json',
      'utf8',
    );

    const threads = GSRP.extractThreadsFromSearchResponse(data);

    expect(threads.length).toBe(1);
    expect(threads[0]).toEqual({
      subject: 'mail merge test 22222',
      snippet: 'dsafdsafdsafdsa ᐧ',
      syncThreadID: 'thread-f:1590533107145425147',
      oldGmailThreadID: '1612b56f16e6c0fb',
      rawResponse: {
        '1': {
          '1': 'mail merge test 22222',
          '2': 'dsafdsafdsafdsa ᐧ',
          '3': '1516850573718',
          '4': 'thread-f:1590533107145425147',
          '5': [
            {
              '1': 'msg-f:1590533107145425147',
              '2': {
                '1': 1,
                '2': 'inboxsdktestdataonly@gmail.com',
                '3': 'Jane Doe',
              },
              '7': '1516850573718',
              '10': 'dsafdsafdsafdsa ᐧ',
              '11': ['^all', '^f'],
              '18': '1516850573678',
              '31': '1516850573678',
              '34': 0,
              '44': 3,
              '48': '1590533107145425147',
            },
          ],
          '15': { '1': [{ '1': '', '2': 'oismail+test@gmail.com' }] },
          '17': 0,
          '18': '1590533107145425147',
        },
        '2': '9245',
      },
      extraMetaData: {
        snippet: '',
        syncMessageData: [
          { date: 1516850573718, syncMessageID: 'msg-f:1590533107145425147' },
        ],
      },
    });
  });
});

describe('extractThreadsFromThreadResponse', function () {
  it('works for input triggered ajax request', () => {
    const data = fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/thread-response-2018-03-08.json',
      'utf8',
    );

    const threads = GSRP.extractThreadsFromThreadResponse(data);
    expect(threads.length).toBe(1);
    expect((threads[0] as any).oldGmailThreadID).toBe('16207922dbd860d9');
    expect(threads[0].syncThreadID).toBe('thread-f:1594407458713395417');
    expect(threads[0].extraMetaData).toEqual({
      snippet: '',
      syncMessageData: [
        {
          syncMessageID: 'msg-f:1594407458713395417',
          date: 1520545443261,
          recipients: [
            {
              emailAddress: 'billingchanges@streak.com',
              name: 'Billing Changes',
            },
            { emailAddress: 'sales@streak.com', name: 'Sales Team' },
          ],
        },
      ],
    });
  });

  it('works for getThreadFromSyncThreadId response', () => {
    const data = fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/thread-response-2018-03-14.json',
      'utf8',
    );
    const threads = GSRP.extractThreadsFromThreadResponse(data);
    expect(threads.length).toBe(1);
    expect((threads[0] as any).oldGmailThreadID).toBe('1620d2f175a1a6c9');
    expect(threads[0].syncThreadID).toBe('thread-f:1594506202591635145');
    expect(threads[0].extraMetaData).toMatchObject({
      snippet: '',
      syncMessageData: [
        { syncMessageID: 'msg-f:1594506202591635145', date: 1520639612762 },
        { syncMessageID: 'msg-f:1594508744604132981', date: 1520642037014 },
        { syncMessageID: 'msg-f:1594509071530617554', date: 1520642348795 },
        { syncMessageID: 'msg-f:1594959172652759326', date: 1521071598675 },
      ],
    });
  });

  it('works on 2018-07-09 data', () => {
    const data = fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/fd-response-20180709.json',
      'utf8',
    );
    const threads = GSRP.extractThreadsFromThreadResponse(data);
    expect(threads.length).toBe(1);
    expect((threads[0] as any).oldGmailThreadID).toBe('1636109e7816ac5d');
    expect(threads[0].syncThreadID).toBe('thread-f:1600484990382419037');
    expect(threads[0].extraMetaData).toMatchObject({
      snippet:
        'Aleem M commented: is it currently implemented but not documented or is it implemwented on the streak side but not in sdk? on the threadRowView.addStatusText() ',
      syncMessageData: [
        { syncMessageID: 'msg-f:1600484990382419037', date: 1526341429121 },
      ],
    });
  });
});

it('replaceThreadsInSearchResponse works', () => {
  const originalSearchResponse = fs.readFileSync(
    __dirname +
      '/../../../../__tests__/gmail-sync-response-processor/input-triggered-search-response-2018-01-25.json',
    'utf8',
  );

  const replacementThreads = GSRP.extractThreadsFromSearchResponse(
    fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/sdk-triggered-search-response-2018-01-25.json',
      'utf8',
    ),
  );

  const responesShouldLookLike = JSON.parse(
    fs.readFileSync(
      __dirname +
        '/../../../../__tests__/gmail-sync-response-processor/replaced-threads-response-example-data-2018-01-25.json',
      'utf8',
    ),
  );

  const newResponse = GSRP.replaceThreadsInSearchResponse(
    originalSearchResponse,
    replacementThreads,
    {},
  );
  expect(JSON.parse(newResponse)).toEqual(responesShouldLookLike);
});
