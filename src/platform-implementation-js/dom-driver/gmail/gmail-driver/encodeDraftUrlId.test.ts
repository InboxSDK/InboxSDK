import encodeDraftUrlId from './encodeDraftUrlId';

test('works', () => {
  expect(
    encodeDraftUrlId(
      'thread-f:1689835521506698369',
      'msg-a:r-4437691956637862407',
    ),
  ).toBe(
    'CqMvqmRLbRhtqczNhFhkDQPRFTQBHmDpFpKtPVWGdZHFgscZcWpMKGJpSjgpgpvdSbRMRTSpSxB',
  );
});
