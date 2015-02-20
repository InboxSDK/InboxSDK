var _ = require('lodash');
var assert = require('assert');
var Bacon = require('baconjs');
const asap = require('asap');

const BasicClass = require('../../../lib/basic-class');
const assertInterface = require('../../../lib/assert-interface');
var makeMutationObserverChunkedStream = require('../../../lib/dom/make-mutation-observer-chunked-stream');
var baconCast = require('bacon-cast');
var ThreadRowViewDriver = require('../../../driver-interfaces/thread-row-view-driver');

var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var DropdownView = require('../../../widgets/buttons/dropdown-view');
var GmailLabelView = require('../widgets/gmail-label-view');

var updateIcon = require('../lib/update-icon/update-icon');

const cachedModificationsByRow = new WeakMap();

var GmailThreadRowView = function(element, rowListViewDriver) {
  BasicClass.call(this);

  assert(element.hasAttribute('id'), 'check element is main thread row');

  const isVertical = _.intersection(_.toArray(element.classList), ['zA','apv']).length === 2;
  if (isVertical) {
    const threadRow3 = element.nextElementSibling.nextElementSibling;
    const has3Rows = (threadRow3 && threadRow3.classList.contains('apw'));
    this._elements = has3Rows ?
      [element, element.nextElementSibling, element.nextElementSibling.nextElementSibling] :
      [element, element.nextElementSibling];
  } else {
    this._elements = [element];
  }

  this._modifications = cachedModificationsByRow.get(this._elements[0]);
  if (!this._modifications) {
    this._modifications = {
      label: {unclaimed: [], claimed: []}
    };
    cachedModificationsByRow.set(this._elements[0], this._modifications);
  }

  this._rowListViewDriver = rowListViewDriver;
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
  const watchElement = this._elements.length === 1 ?
    this._elements[0] : this._elements[0].children[2];
  this._refresher = makeMutationObserverChunkedStream(watchElement, {
    childList: true
  }).map(null).takeUntil(this._stopper).toProperty(null);

  if(isVertical){
    this._subjectRefresher = Bacon.once(null).toProperty(null);
  }
  else{
    const subjectElement = watchElement.querySelector('.y6');
    this._subjectRefresher = makeMutationObserverChunkedStream(subjectElement, {
      childList: true
    }).merge(
      makeMutationObserverChunkedStream(watchElement, {
        attributes: true, attributeFilter: ['class']
      })
    ).map(null).takeUntil(this._stopper).toProperty(null);
  }

  this.getCounts = _.once(function() {
    const thing = this._elements[0].querySelector('td div.yW');
    const [preDrafts, drafts] = thing.innerHTML.split(/<font color=[^>]+>[^>]+<\/font>/);

    const preDraftsWithoutNames = preDrafts.replace(/<span\b[^>]*>.*?<\/span>/g, '');

    const messageCountMatch = preDraftsWithoutNames.match(/\((\d+)\)/);
    const messageCount = messageCountMatch ? +messageCountMatch[1] : (preDrafts ? 1 : 0);

    const draftCountMatch = drafts && drafts.match(/\((\d+)\)/);
    const draftCount = draftCountMatch ? +draftCountMatch[1] : (drafts != null ? 1 : 0);
    return {messageCount, draftCount};
  });

  // Undo any remaining cached row modifications
  setTimeout(() => {
    if (!this._modifications) return;
    for (let mod of this._modifications.label.unclaimed) {
      console.log('removing unclaimed mod', mod);
      mod.remove();
    }
    this._modifications.label.unclaimed.length = 0;
  }, 3000);
};

GmailThreadRowView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailThreadRowView.prototype, {

  __memberVariables: [
    {name: '_elements', destroy: false},
    {name: '_modifications', destroy: false},
    {name: '_pageCommunicator', destroy: false},
    {name: '_userView', destroy: false},
    {name: '_cachedThreadID', destroy: false},
    {name: '_rowListViewDriver', destroy: false},
    {name: '_pendingExpansionsSignal', destroy: false},
    {name: '_pendingExpansions', destroy: false},
    {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
    {name: '_stopper', destroy: false},
    {name: '_refresher', destroy: false}
  ],

  destroy: function() {
    if(!this._elements){
      return;
    }

    this._modifications.label.unclaimed = this._modifications.label.unclaimed
      .concat(this._modifications.label.claimed);
    this._modifications.label.claimed.length = 0;

    _.chain(this._elements)
      .map((el) => el.getElementsByClassName('inboxsdk__thread_row_addition'))
      .map(_.toArray)
      .flatten()
      .value().forEach((el) => {
        el.remove();
      });

    _.chain(this._elements)
      .map((el) => el.getElementsByClassName('inboxsdk__thread_row_hidden_inline'))
      .map(_.toArray)
      .flatten()
      .value().forEach((el) => {
        el.style.display = 'inline';
      });

    BasicClass.prototype.destroy.call(this);
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
    this._rowListViewDriver.expandColumn(colSelector, width);
  },

  addLabel: function(label) {
    const prop = baconCast(Bacon, label).toProperty().combine(this._refresher, _.identity).takeUntil(this._stopper);
    var labelMod;
    prop.onValue(labelDescriptor => {
      if(labelDescriptor){
        if (!labelMod) {
          labelMod = this._modifications.label.unclaimed.shift();
          if (!labelMod) {
            const gmailLabelView = new GmailLabelView({
              classes: ['inboxsdk__thread_row_label']
            });
            const el = gmailLabelView.getElement();
            labelMod = {
              type: 'label',
              labelDescriptor,
              gmailLabelView,
              remove: el.remove.bind(el)
            };
          }
          labelMod.gmailLabelView.setLabelDescriptorProperty(prop);
          this._modifications.label.claimed.push(labelMod);
        }
        const labelParentDiv = this._getLabelParent();
        if (!_.contains(labelParentDiv.children, labelMod.gmailLabelView.getElement())) {
          labelParentDiv.insertBefore(
            labelMod.gmailLabelView.getElement(), labelParentDiv.lastChild);
        }
      }
      else{
        if (labelMod) {
          labelMod.gmailLabelView.getElement().remove();
          this._modifications.label.claimed.splice(
            this._modifications.label.indexOf(labelMod), 1);
        }
      }
    });
  },

  addImage: function(inIconDescriptor){
    const prop = baconCast(Bacon, inIconDescriptor)
                  .toProperty()
                  .combine(this._refresher, _.identity)
                  .combine(this._subjectRefresher, _.identity)
                  .takeUntil(this._stopper);

    var iconSettings = {};

    var iconWrapper = document.createElement('div');
    iconWrapper.setAttribute('class', 'inboxsdk__thread_row_icon_wrapper inboxsdk__thread_row_addition');
    var added = false;

    prop.onValue((newIconDescriptor) => {

      var iconDescriptor = newIconDescriptor || {};

      updateIcon(iconSettings, iconWrapper, false, iconDescriptor.imageClass, iconDescriptor.imageUrl);

      var containerRow = this._elements.length > 1 ?
                           this._elements[this._elements.length === 2 ? 0 : 2] :
                           this._elements[0];

      if(iconSettings.iconElement){
        containerRow.classList.add('inboxsdk__thread_row_image_added');

        if(iconDescriptor.tooltip){
          iconSettings.iconElement.setAttribute('data-tooltip', iconDescriptor.tooltip);
        }

        if(!added || !this._elements[0].contains(iconWrapper)){
          var insertionPoint = this._elements.length > 1 ?
                                this._getLabelParent() :
                                this._getLabelParent().querySelector('.y6');

          insertionPoint.insertBefore(iconWrapper, insertionPoint.firstElementChild);

          added = true;
          this._elements[0].style.display = 'none';
          this._elements[0].style.display = '';
        }
      }
      else{
        if(added){
          iconWrapper.remove();

          containerRow.classList.remove('inboxsdk__thread_row_image_added');

          added = false;
        }
      }

    });
  },

  addButton: function(buttonDescriptor) {
    if (this._elements.length != 1) return; // TODO

    var activeDropdown = null;
    var buttonSpan = document.createElement('span');
    buttonSpan.className = 'inboxsdk__thread_row_addition inboxsdk__thread_row_button';
    buttonSpan.setAttribute('tabindex', "-1");

    var iconSettings = {
      iconUrl: null,
      iconClass: null,
      iconElement: null,
      iconImgElement: null
    };

    var prop = baconCast(Bacon, buttonDescriptor).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).mapEnd(null).onValue((buttonDescriptor) => {
      if (!buttonDescriptor) {
        if (activeDropdown) {
          activeDropdown.close();
          activeDropdown = null;
        }
        buttonSpan.remove();
      } else {
        // compat workaround
        if (buttonDescriptor.className) {
          buttonDescriptor.iconClass = buttonDescriptor.className;
          delete buttonDescriptor.className;
        }

        var starGroup = this._elements[0].querySelector('td.apU.xY, td.aqM.xY'); // could also be trash icon

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

        if(buttonDescriptor.onClick){
          buttonSpan.onclick = (event) => {
            var appEvent = {
              threadRowView: this._userView
            };
            if (buttonDescriptor.hasDropdown) {
              if (activeDropdown) {
                this._elements[0].classList.remove('inboxsdk__dropdown_active');
                activeDropdown.close();
                activeDropdown = null;
                return;
              } else {
                this._elements[0].classList.add('inboxsdk__dropdown_active');
                appEvent.dropdown = activeDropdown = new DropdownView(new GmailDropdownView(), buttonSpan, null);
                appEvent.dropdown.on('destroy', function(){
                  setTimeout(function(){
                    activeDropdown = null;
                  }, 1);
                });
              }
            }
            buttonDescriptor.onClick.call(null, appEvent);
          };
        }


        buttonSpan.onmousedown = function(event){
          buttonSpan.focus();
          event.stopPropagation();
        };

        updateIcon(iconSettings, buttonSpan, false, buttonDescriptor.iconClass, buttonDescriptor.iconUrl);

        if (!starGroup.contains(buttonSpan)) {
          starGroup.appendChild(buttonSpan);
          this._expandColumn('col.y5', 26*starGroup.children.length);
        }
      }


    });
  },

  addAttachmentIcon: function(opts) {
    const getImgElement = _.once(() => {
      const img = document.createElement('img');
      img.src = 'images/cleardot.gif';
      return img;
    });
    var added = false;
    var currentIconUrl;

    var prop = baconCast(Bacon, opts).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).onValue(opts => {
      if (!opts) {
        if (added) {
          getImgElement().remove();
          added = false;
        }
      } else {
        const img = getImgElement();
        if(opts.tooltip){
          img.setAttribute('data-tooltip', opts.tooltip);
        }
        else{
          img.removeAttribute('data-tooltip');
        }

        img.className =
          'inboxsdk__thread_row_addition inboxsdk__thread_row_attachment_icon ' +
          (opts.iconClass || '');
        if (currentIconUrl != opts.iconUrl) {
          img.style.background = opts.iconUrl ? "url("+opts.iconUrl+") no-repeat 0 0" : '';
          currentIconUrl = opts.iconUrl;
        }

        var attachmentDiv = this._elements[0].querySelector('td.yf.xY');
        if (!attachmentDiv.contains(img)) {
          attachmentDiv.appendChild(img);
          added = true;
          this._expandColumn('col.yg', attachmentDiv.children.length*16);
          if (this._elements.length > 1) {
            this._fixDateColumnWidth();
          }
        }
      }
    });
  },

  _fixDateColumnWidth: function() {
    asap(() => {
      if (!this._elements) return;

      const dateContainer = this._elements[0].querySelector('td.xW, td.yf > div.apm');
      if (!dateContainer) return;
      const visibleDateSpan = dateContainer.querySelector('.inboxsdk__thread_row_custom_date') ||
        dateContainer.firstElementChild;

      // Attachment icons are only in the date column in vertical preivew pane.
      const dateColumnAttachmentIconCount = this._elements[0].querySelectorAll('td.yf > img').length;
      this._expandColumn('col.xX',
        visibleDateSpan.offsetWidth + 8 + 6 + dateColumnAttachmentIconCount*16);
    });
  },

  replaceDate: function(opts) {
    const prop = baconCast(Bacon, opts).toProperty();
    prop.combine(this._refresher, _.identity).takeUntil(this._stopper).onValue(opts => {
      const dateContainer = this._elements[0].querySelector('td.xW, td.yf > div.apm');
      const originalDateSpan = dateContainer.firstElementChild;
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
        if (opts.tooltip) {
          customDateSpan.setAttribute('data-tooltip', opts.tooltip);
          customDateSpan.setAttribute('aria-label', opts.tooltip);
        } else {
          customDateSpan.removeAttribute('data-tooltip');
          customDateSpan.removeAttribute('aria-label');
        }
        customDateSpan.style.color = opts.textColor || '';

        customDateSpan.style.display = 'inline';
        originalDateSpan.style.display = 'none';

        this._fixDateColumnWidth();
      }
    });
  },

  getSubject: function() {
    if (this._elements.length > 1) {
      return this._elements[1].querySelector('div.xS div.xT div.y6 > span[id]').textContent;
    } else {
      return this._elements[0].querySelector('td.a4W div.xS div.xT div.y6 > span[id]').textContent;
    }
  },

  getDateString: function() {
    return this._elements[0].querySelector('td.xW > span, td.yf.apt > div.apm > span').title;
  },

  _threadIdReady: function() {
    return !!this.getThreadID();
  },

  getThreadID: function() {
    if (this._cachedThreadID) {
      return this._cachedThreadID;
    }
    const threadID = this._pageCommunicator.getThreadIdForThreadRow(this._elements[0]);
    if (threadID) {
      this._cachedThreadID = threadID;
    }
    return threadID;
  },

  getVisibleDraftCount: function() {
    return this.getCounts().draftCount;
  },

  getVisibleMessageCount: function() {
    return this.getCounts().messageCount;
  },

  getContacts: function(){
    const senderSpans = this._elements[0].querySelectorAll('[email]');

    return _.chain(senderSpans)
            .map((span) => ({
              emailAddress: span.getAttribute('email'),
              name: span.getAttribute('name')
            }))
            .uniq((contact) => contact.emailAddress)
            .value();
  },

  isSelected: function(){
    return !!this._elements[0].querySelector('div[role=checkbox][aria-checked=true]');
  },

  _getLabelParent: function(){
    return this._elements.length > 1 ?
            this._elements[ this._elements.length === 2 ? 0 : 2 ].querySelector('div.apu') :
            this._elements[0].querySelector('td.a4W div.xS div.xT');
  }

});

assertInterface(GmailThreadRowView.prototype, ThreadRowViewDriver);

module.exports = GmailThreadRowView;
