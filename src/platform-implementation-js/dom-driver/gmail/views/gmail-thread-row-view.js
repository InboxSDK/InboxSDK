var _ = require('lodash');
var Bacon = require('baconjs');

var ThreadRowViewDriver = require('../../../driver-interfaces/thread-row-view-driver');

var GmailThreadRowView = function(element) {
  ThreadRowViewDriver.call(this);

  this._eventStream = new Bacon.Bus();
  this._element = element;
};

GmailThreadRowView.prototype = Object.create(ThreadRowViewDriver.prototype);

_.extend(GmailThreadRowView.prototype, {

  __memberVariables: [
    {name: '_element', destroy: false},
    {name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
  ],

  destroy: function() {
    _.each(this._element.getElementsByClassName('inboxSDKlabel'), removeNode);
    _.each(this._element.getElementsByClassName('inboxSDKattachmentIcon'), removeNode);
    ThreadRowViewDriver.prototype.destroy.call(this);
  },

  addLabel: function(label) {
    var labelParentDiv = this._element.querySelector('td.a4W > div.xS > div.xT');

    var labelDiv = document.createElement('div');
    labelDiv.className = 'yi inboxSDKlabel';
    labelDiv.innerHTML = '<div class="ar as"><div class="at" title="text" style="background-color: #ddd; border-color: #ddd;"><div class="au" style="border-color:#ddd"><div class="av" style="color: #666">text</div></div></div></div><div class="as">&nbsp;</div>';
    var at = labelDiv.querySelector('div.at');
    var au = labelDiv.querySelector('div.au');
    var av = labelDiv.querySelector('div.av');

    av.textContent = at.title = label.text;
    if (label.color) {
      at.style.backgroundColor = at.style.borderColor = au.style.borderColor = label.color;
    }
    if (label.textColor) {
      av.style.color = label.textColor;
    }

    labelParentDiv.insertBefore(labelDiv, labelParentDiv.firstChild);
  },

  addButton: function(buttonDescriptor) {
    console.log('addButton unimplemented');
  },

  addAttachmentIcon: function(url, title) {
    var attachmentDiv = this._element.querySelector('td.yf.xY');
    var img = document.createElement('img');
    img.className = 'iP inboxSDKattachmentIcon';
    img.src = 'images/cleardot.gif';
    if (title) {
      img.alt = title;
    }
    img.style.background = "url("+url+") no-repeat -2px -2px";
    attachmentDiv.appendChild(img);
  }

});

module.exports = GmailThreadRowView;

function removeNode(node) {
  node.remove();
}
