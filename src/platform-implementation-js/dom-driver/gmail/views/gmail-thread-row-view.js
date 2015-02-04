var _ = require('lodash');
var $ = require('jquery');
var assert = require('assert');
var Bacon = require('baconjs');

var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
var baconCast = require('bacon-cast');
var ThreadRowViewDriver = require('../../../driver-interfaces/thread-row-view-driver');

var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var DropdownView = require('../../../widgets/buttons/dropdown-view');

var GmailThreadRowView = function(element) {
  ThreadRowViewDriver.call(this);

  assert(element.hasAttribute('id'), 'check element is main thread row');

  this._element = element;
  this._isVertical = _.intersection(_.toArray(this._element.classList), ['zA','apv']).length === 2;
  if (this._isVertical) {
    var threadRow3 = this._element.nextSibling.nextSibling;
    this._verticalRowCount = (threadRow3 && threadRow3.classList.contains('apw')) ? 3 : 2;
  }

  this._pageCommunicator = null; // supplied by GmailDriver later
  this._userView = null; // supplied by ThreadRowView

  this._eventStream = new Bacon.Bus();
  this._stopper = this._eventStream.filter(false).mapEnd();

  // Stream that emits an event after whenever Gmail replaces the ThreadRow DOM
  // nodes. One time this happens is when you have a new email in your inbox,
  // you read the email, return to the inbox, get another email, and then the
  // first email becomes re-rendered.
  // Important: This stream is only listened on if some modifier method
  // (like addLabel) is called. If none of those methods are called, then the
  // stream is not listened on and no MutationObserver ever gets made, saving
  // us a little bit of work.
  this._refresher = makeMutationObserverStream(this._element, {
    childList: true
  }).map(null).takeUntil(this._stopper).toProperty(null);

  this.getCounts = _.once(function() {
    var thing = this._element.querySelector('td.yX div.yW');
    var parts = thing.innerHTML.split(/<font color=[^>]+>[^>]+<\/font>/);
    var preDrafts = parts[0], drafts = parts[1];

    var preDraftsWithoutNames = preDrafts.replace(/<span\b[^>]*>.*?<\/span>/g, '');

    var messageCountMatch = preDraftsWithoutNames.match(/\((\d+)\)/);
    var messageCount = messageCountMatch ? +messageCountMatch[1] : (preDrafts ? 1 : 0);

    var draftCountMatch = drafts && drafts.match(/\((\d+)\)/);
    var draftCount = draftCountMatch ? +draftCountMatch[1] : (drafts != null ? 1 : 0);
    return {messageCount: messageCount, draftCount: draftCount};
  });
};

GmailThreadRowView.prototype = Object.create(ThreadRowViewDriver.prototype);

_.extend(GmailThreadRowView.prototype, {

  __memberVariables: [
    {name: '_element', destroy: false},
    {name: '_isVertical', destroy: false},
    {name: '_verticalRowCount', destroy: false},
    {name: '_pageCommunicator', destroy: false},
    {name: '_userView', destroy: false},
    {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
    {name: '_stopper', destroy: false},
    {name: '_refresher', destroy: false}
  ],

  destroy: function() {
    if(!this._element){
      return;
    }

    _.toArray(
      this._element.getElementsByClassName('inboxsdk__thread_row_addition')
    ).forEach(function(node) {
      node.remove();
    });
    _.toArray(
      this._element.getElementsByClassName('inboxsdk__thread_row_hidden_inline')
    ).forEach(function(node) {
      node.style.display = 'inline';
    });
    ThreadRowViewDriver.prototype.destroy.call(this);
  },

  // Called by GmailDriver
  setPageCommunicator: function(pageCommunicator) {
    this._pageCommunicator = pageCommunicator;
  },

  // Returns a stream that emits this object once this object is ready for the
  // user. It should almost always synchronously ready immediately, but there's
  // a few cases such as with multiple inbox that it needs a moment.
  waitForReady: function() {
    var self = this;
    var time = [0,10,100];
    function step() {
      if (self._threadIdReady()) {
        return Bacon.once(self);
      } else {
        var stepTime = time.shift();
        if (stepTime == undefined) {
          console.log('Should not happen: ThreadRowViewDriver never became ready', self);
          return Bacon.never();
        } else {
          return Bacon.later(stepTime).flatMap(step);
        }
      }
    }

    return step().takeUntil(this._stopper);
  },

  setUserView: function(userView) {
    this._userView = userView;
  },

  _expandColumn: function(colSelector, width) {
    var tableParent = $(this._element).closest('div > table.cf').get(0);
    _.each(tableParent.querySelectorAll('table.cf > colgroup > '+colSelector), function(col) {
      var currentWidth = parseInt(col.style.width, 10);
      if (isNaN(currentWidth) || currentWidth < width) {
        col.style.width = width+'px';
      }
    });
  },

  addLabel: function(label) {
    if (this._isVertical) return; // TODO
    var self = this;
    var labelDiv = document.createElement('div');
    labelDiv.className = 'yi inboxsdk__thread_row_addition inboxSDKlabel';
    labelDiv.innerHTML = '<div class="ar as"><div class="at" title="text" style="background-color: #ddd; border-color: #ddd;"><div class="au" style="border-color:#ddd"><div class="av" style="color: #666">text</div></div></div></div><div class="as">&nbsp;</div>';

    var at = labelDiv.querySelector('div.at');
    var au = labelDiv.querySelector('div.au');
    var av = labelDiv.querySelector('div.av');

    var prop = baconCast(Bacon, label).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).onValue(function(label) {
      if (!label) {
        labelDiv.remove();
      } else {
        _.defaults(label, {
          color: '#ddd',
          textColor: '#666'
        });

        if (at.title != label.title) {
          at.title = av.textContent = label.title;
        }
        if (at.style.backgroundColor != label.color) {
          at.style.backgroundColor = at.style.borderColor = au.style.borderColor = label.color;
        }
        if (av.style.color != label.textColor) {
          av.style.color = label.textColor;
        }

        var labelParentDiv = self._element.querySelector('td.a4W div.xS div.xT');
        if (!labelParentDiv.contains(labelDiv)) {
          labelParentDiv.insertBefore(labelDiv, labelParentDiv.firstChild);
        }
      }
    });
  },

  addButton: function(buttonDescriptor) {
    if (this._isVertical) return; // TODO
    var self = this;
    var activeDropdown = null;
    var buttonSpan = document.createElement('span');
    var buttonImg = document.createElement('img');
    buttonSpan.appendChild(buttonImg);

    var prop = baconCast(Bacon, buttonDescriptor).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).mapEnd(null).onValue(function(buttonDescriptor) {
      if (!buttonDescriptor) {
        if (activeDropdown) {
          activeDropdown.close();
          activeDropdown = null;
        }
        buttonSpan.remove();
      } else {
        var starGroup = self._element.querySelector('td.apU.xY, td.aqM.xY'); // could also be trash icon

        // Don't let the whole column count as the star for click and mouse over purposes.
        // Click events that aren't directly on the star should be stopped.
        // Mouseover events that aren't directly on the star should be stopped and
        // re-emitted from the thread row, so the thread row still has the mouseover
        // appearance.
        // Click events that are on one of our buttons should be stopped. Click events
        // that aren't on the star button or our buttons should be re-emitted from the
        // thread row so it counts as clicking on the thread.
        starGroup.onmouseover = starGroup.onclick = function(event) {
          var isOnStar = this.firstElementChild.contains(event.target);
          var isOnSDKButton = !isOnStar && this !== event.target;
          if (!isOnStar) {
            event.stopPropagation();
            if (!isOnSDKButton || event.type == 'mouseover') {
              var newEvent = document.createEvent('MouseEvents');
              newEvent.initMouseEvent(
                event.type, event.bubbles, event.cancelable, event.view,
                event.detail, event.screenX, event.screenY, event.clientX, event.clientY,
                event.ctrlKey, event.altKey, event.shiftKey, event.metaKey,
                event.button, event.relatedTarget
              );
              this.parentElement.dispatchEvent(newEvent);
            }
          }
        };

        buttonSpan.className = 'inboxsdk__thread_row_addition inboxsdk__thread_row_button ' + (buttonDescriptor.className || '');
        buttonImg.src = buttonDescriptor.iconUrl;
        buttonSpan.onclick = buttonDescriptor.onClick && function(event) {
          var appEvent = {
            threadRowView: self._userView
          };
          if (buttonDescriptor.hasDropdown) {
            if (activeDropdown) {
              self._element.classList.remove('inboxsdk__dropdown_active');
              activeDropdown.close();
              activeDropdown = null;
              return;
            } else {
              self._element.classList.add('inboxsdk__dropdown_active');
              appEvent.dropdown = activeDropdown = new DropdownView(new GmailDropdownView(), buttonSpan, null);
            }
          }
          buttonDescriptor.onClick.call(null, appEvent);
        };

        if (!starGroup.contains(buttonSpan)) {
          starGroup.appendChild(buttonSpan);
          self._expandColumn('col.y5', 26*starGroup.children.length);
        }
      }
    });
  },

  addAttachmentIcon: function(opts) {
    if (this._isVertical) return; // TODO
    var self = this;
    var img = document.createElement('img');
    // The gmail iP css class sets width:16, height:16, opacity: 0.8
    img.className = 'iP inboxsdk__thread_row_addition inboxsdk__thread_row_attachment_icon';
    img.src = 'images/cleardot.gif';
    var currentIconUrl;

    var prop = baconCast(Bacon, opts).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).onValue(function(opts) {
      if (!opts) {
        img.remove();
      } else {
        if (img.title != opts.title) {
          img.title = opts.title;
        }
        if (currentIconUrl != opts.iconUrl) {
          img.style.background = "url("+opts.iconUrl+") no-repeat 0 0";
          currentIconUrl = opts.iconUrl;
        }

        var attachmentDiv = self._element.querySelector('td.yf.xY');
        if (!attachmentDiv.contains(img)) {
          attachmentDiv.appendChild(img);
        }
      }
    });
  },

  replaceDate: function(opts) {
    if (this._isVertical) return; // TODO
    var self = this;

    var prop = baconCast(Bacon, opts).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).onValue(function(opts) {
      var dateContainer = self._element.querySelector('td.xW');
      var originalDateSpan = dateContainer.firstChild;
      var customDateSpan = originalDateSpan.nextElementSibling;
      if (!customDateSpan) {
        customDateSpan = document.createElement('span');
        customDateSpan.className = 'inboxsdk__thread_row_addition inboxsdk__thread_row_custom_date';
        dateContainer.appendChild(customDateSpan);

        originalDateSpan.classList.add('inboxsdk__thread_row_hidden_inline');
      }

      if (!opts) {
        customDateSpan.style.display = 'none';
        originalDateSpan.style.display = 'inline';
      } else {
        customDateSpan.textContent = opts.text;
        if (opts.title) {
          customDateSpan.setAttribute('title', opts.title);
          customDateSpan.setAttribute('aria-label', opts.title);
        } else {
          customDateSpan.removeAttribute('title');
          customDateSpan.removeAttribute('aria-label');
        }
        customDateSpan.style.color = opts.textColor || '';

        customDateSpan.style.display = 'inline';
        originalDateSpan.style.display = 'none';

        self._expandColumn('col.xX', customDateSpan.offsetWidth+8+6);
      }
    });
  },

  getSubject: function() {
    if (this._isVertical) {
      return this._element.nextSibling.querySelector('div.xS div.xT div.y6 > span[id]').textContent;
    } else {
      return this._element.querySelector('td.a4W div.xS div.xT div.y6 > span[id]').textContent;
    }
  },

  getDateString: function() {
    return this._element.querySelector('td.xW > span, td.yf.apt > div.apm > span').title;
  },

  _threadIdReady: function() {
    return !!this.getThreadID();
  },

  getThreadID: function() {
    return this._pageCommunicator.getThreadIdForThreadRow(this._element);
  },

  getVisibleDraftCount: function() {
    return this.getCounts().draftCount;
  },

  getVisibleMessageCount: function() {
    return this.getCounts().messageCount;
  },

  getContacts: function(){
    const senderSpans = this._element.querySelectorAll('[email]');

    return _.chain(senderSpans)
            .map((span) => ({
              emailAddress: span.getAttribute('email'),
              name: span.getAttribute('name')
            }))
            .uniq((contact) => contact.emailAddress)
            .value();
  },

  isSelected: function(){
    return !!this._element.querySelector('div[role=checkbox][aria-checked=true]');

  }

});

module.exports = GmailThreadRowView;
