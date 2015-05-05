import assert from 'assert';

import isValidAppId from "../src/platform-implementation-js/lib/is-valid-app-id";

function shouldPass(description, appId) {
  it(description, function() {
    assert.strictEqual(isValidAppId(appId), true);
  });
}
function shouldFail(description, appId) {
  it(description, function() {
    assert.strictEqual(isValidAppId(appId), false);
  });
}

describe("isValidAppId", function() {
  describe("passes", function() {
    shouldPass("streak",
      "streak");
    shouldPass("good hash",
      "sdk_testfoo_2a9c68f994");
    shouldPass("respects case",
      "sdk_testFoo_e647eccc5a");
    shouldPass("short test",
      "sdk_12345_8cb2237d06");
    shouldPass("long test",
      "sdk_12345678901234_a0c55fdf6b");
  });

  describe("failures", function() {
    shouldFail("nearly whitelisted",
      "streak2");
    shouldFail("trailing data",
      "sdk_testfoo_2a9c68f9942");
    shouldFail("bad hash",
      "sdk_testfoo_2a9c68f993");
    shouldFail("bad case",
      "sdk_Testfoo_2a9c68f994");
    shouldFail("bad prefix",
      "xsdk_testfoo_2a9c68f994");
  });
});
