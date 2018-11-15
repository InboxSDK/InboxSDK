/* @flow */

import { extractMetadataFromThreadRow } from './thread-row-parser';

describe('extractMetadataFromThreadRow', () => {
  it('can read row', () => {
    const table = document.createElement('table');
    table.innerHTML =
      '<tbody>' +
      '<tr class="zA yO" id=":46" tabindex="-1" aria-labelledby=":47"><td class="PF xY"></td><td id=":48" class="oZ-x3 xY aid" style=""><div id=":49" class="oZ-jc T-Jo J-J5-Ji " role="checkbox" aria-labelledby=":47" dir="ltr" aria-checked="false" tabindex="-1"><div class="T-Jo-auh"></div></div></td><td class="apU xY"><span id=":4a" class="aXw T-KT" title="Not starred" aria-label="Not starred"><img class="T-KT-JX" src="images/cleardot.gif" alt="Not starred"></span></td><td class="WA xY"><div class="pG" data-tooltip-contained="true" data-tooltip-align="b,l" data-tooltip-delay="1500" aria-label="Not important" role="img" id=":4b"><div class="T-ays-a45"><span class="aol">Click to teach Streak Mail this conversation is important.</span></div><div class="pH-A7"></div><div class="UW "></div></div></td><td class="yX xY "><div id=":47" class="afn">me (15), test merge again, 2:02 pm, 4 On Thu, Dec 4, 2014 at 2:02 PM, Chris Cowan &lt;cowan@streak.com&gt; wrote: 3 On Thu, Dec 4, 2014.</div><div id=":4c" class="yW"><span class="yP" email="cowan@streak.com" name="me">me</span> (15)</div></td><td id=":4d" tabindex="-1" class="xY a4W"><div class="xS" role="link"><div class="xT"><div class="y6"><span id=":4f">test merge again</span><span class="y2">&nbsp;-&nbsp;4 On Thu, Dec 4, 2014 at 2:02 PM, Chris Cowan &lt;cowan@streak.com&gt; wrote: 3 On Thu, Dec 4, 2014</span></div></div></div></td><td class="yf xY ">&nbsp;</td><td class="xW xY "><span title="Thu, Dec 4, 2014 at 2:02 PM" id=":4g" aria-label="Thu, Dec 4, 2014 at 2:02 PM">2:02 pm</span></td></tr>' +
      '</tbody>';
    const threadRow = table.querySelector('tr');
    if (!threadRow) throw new Error();
    const parsed = extractMetadataFromThreadRow(threadRow);
    expect(parsed).toEqual({
      timeString: 'Thu, Dec 4, 2014 at 2:02 PM',
      subject: 'test merge again',
      peopleHtml: '<span email="cowan@streak.com" name="me">me</span> (15)'
    });
  });

  it('can read vertical preview pane row', () => {
    const table = document.createElement('table');
    table.innerHTML =
      '<tbody>' +
      '<tr class="zA yO apv" id=":151" tabindex="-1" aria-labelledby=":150"><td rowspan="3" class="PF xY"></td><td rowspan="3" id=":14z" class="apo-x3 xY aid" style=""><div id=":14y" class="apo-jc T-Jo J-J5-Ji " role="checkbox" aria-labelledby=":150" dir="ltr" aria-checked="false" tabindex="-1"><div class="T-Jo-auh"></div></div></td><td class="yX xY apy"><div id=":150" class="afn"><span class="yP" email="cowan@streak.com" name="me">me</span> (15), test merge again, 2:02 pm, 4 On Thu, Dec 4, 2014 at 2:02 PM, Chris Cowan &lt;cowan@streak.com&gt; wrote: 3 On Thu, Dec 4, 2014.</div><div id=":14x" class="yW"><span class="yP" email="cowan@streak.com" name="me">me</span> (15)</div></td><td class="yf xY  apt"><div class="apm"><span title="Thu, Dec 4, 2014 at 2:02 PM" id=":14w" aria-label="Thu, Dec 4, 2014 at 2:02 PM">2:02 pm</span></div>&nbsp;</td><td rowspan="3" class="apU apC"><span id=":14v" class="aXw T-KT" title="Not starred" aria-label="Not starred"><img class="T-KT-JX" src="images/cleardot.gif" alt="Not starred"></span></td></tr>' +
      '<tr class="zA yO apv"><td colspan="2" tabindex="0" role="link" class="xY  apD"><div class="apn apd"><div class="pG" data-tooltip-contained="true" data-tooltip-align="b,l" data-tooltip-delay="1500" aria-label="Not important" role="img" id=":14u"><div class="T-ays-a45"><span class="aol">Click to teach Streak Mail this conversation is important.</span></div><div class="pH-A7 aok"></div><div class="UW UW-yN-aa"></div></div></div><div class="xS" role="undefined"><div class="xT"><div class="y6"><span id=":14t">test merge again</span></div></div></div></td></tr>' +
      '<tr class="zA yO apv apw"><td colspan="2" class="xY apA"><div class="apB"><div class="apu"><div class="as">&nbsp;</div></div><div class="y2 apz">4 On Thu, Dec 4, 2014 at 2:02 PM, Chris Cowan &lt;cowan@streak.com&gt; wrote: 3 On Thu, Dec 4, 2014</div></div></td></tr>' +
      '</tbody>';
    const threadRow = table.querySelector('tr');
    if (!threadRow) throw new Error();
    const parsed = extractMetadataFromThreadRow(threadRow);
    expect(parsed).toEqual({
      timeString: 'Thu, Dec 4, 2014 at 2:02 PM',
      subject: 'test merge again',
      peopleHtml: '<span email="cowan@streak.com" name="me">me</span> (15)'
    });
  });

  it('can read snippet-less vertical preview pane row', () => {
    const table = document.createElement('table');
    table.innerHTML =
      '<tbody>' +
      '<tr class="zA yO apv" id=":3p" tabindex="-1" aria-labelledby=":3q"><td rowspan="2" class="PF xY"></td><td rowspan="2" id=":3r" class="apq-x3 xY aid" style=""><div id=":3s" class="apq-jc T-Jo J-J5-Ji " role="checkbox" aria-labelledby=":3q" dir="ltr" aria-checked="false" tabindex="-1"><div class="T-Jo-auh"></div></div></td><td class="xY apx"><div id=":3q" class="afn"><span class="yP" email="notifications@mailfoogae.appspotmail.com" name="Streak Bot">Streak Bot</span>, lordprogrammer finished a deploy (fed8a27), 11:02 am, .</div><div class="apu"><div class="as">&nbsp;</div></div><div class="yW NyC7Y"><span class="yP" email="notifications@mailfoogae.appspotmail.com" name="Streak Bot">Streak Bot</span></div></td><td class="yf xY  apt"><div class="apm"><span title="Mon, Jan 5, 2015 at 11:02 AM" id=":3t" aria-label="Mon, Jan 5, 2015 at 11:02 AM">11:02 am</span></div>&nbsp;</td><td rowspan="2" class="apU apC"><span id=":3u" class="aXw T-KT" title="Not starred" aria-label="Not starred"><img class="T-KT-JX" src="images/cleardot.gif" alt="Not starred"></span></td></tr>' +
      '<tr class="zA yO apv"><td colspan="2" tabindex="0" role="link" class="xY  apE"><div class="apn apd"><div class="pG" data-tooltip-contained="true" data-tooltip-align="b,l" data-tooltip-delay="1500" aria-label="Not important" role="img" id=":3v"><div class="T-ays-a45"><span class="aol">Click to teach Streak Mail this conversation is important.</span></div><div class="pH-A7"></div><div class="UW "></div></div></div><div class="xS" role="undefined"><div class="xT"><div class="y6"><span id=":3w">lordprogrammer finished a deploy (fed8a27)</span></div></div></div></td></tr>' +
      '</tbody>';
    const threadRow = table.querySelector('tr');
    if (!threadRow) throw new Error();
    const parsed = extractMetadataFromThreadRow(threadRow);
    expect(parsed).toEqual({
      timeString: 'Mon, Jan 5, 2015 at 11:02 AM',
      subject: 'lordprogrammer finished a deploy (fed8a27)',
      peopleHtml:
        '<span email="notifications@mailfoogae.appspotmail.com" name="Streak Bot">Streak Bot</span>'
    });
  });
});
