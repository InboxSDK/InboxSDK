/* @flow */

import getChatSidebarClassname from './getChatSidebarClassname';

document.documentElement.innerHTML = `
<head>
<style type="text/css">
.blah {
  color: red;
}

.bz, .bS {
  width: 1200px;
  margin-left: auto;
  margin-right: auto;
}
@media (max-width: 1800px) {
  .bz, .bS {
    width: 66.66%;
  }
}
@media (max-width: 1260px) {
  .bz, .bS {
    width: 840px;
  }
}
.cM {
  min-width: 512px;
  padding: 56px 0 1px;
}

/* chat sidebar open rules */
@media (max-width: 1632px) {
  .m .bz {
    width: auto;
    margin-left: 50px;
    margin-right: 272px;
  }
}

/* nav sidebar open rules */
@media (max-width: 1632px) {
  .M .bz {
    width: auto;
    margin-left: 272px;
    margin-right: 104px;
  }
}

/* both open */
@media (max-width: 1632px) {
  .m.M .bz {
    margin-left: 272px;
    margin-right: 272px;
  }
}
</style>
</head>
<body>
  <div>
    <div role="application" class="cM bz">
      <p>foo
    </div>
  </div>
</body>
`;

test('works', () => {
  expect(getChatSidebarClassname()).toBe('m');
});
