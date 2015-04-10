'use strict';

var _ = require('lodash');
var BasicClass = require('../../../lib/basic-class');
var Bacon = require('baconjs');
var asap = require('asap');

var ButtonView = require('./buttons/button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var ARROW_HORIZONTAL_HEIGHT = 9;
var ARROW_HORIZONTAL_WIDTH = 18;
var ARROW_VERTICAL_HEIGHT = 18;
var ARROW_VERTICAL_WIDTH = 9;

var GmailTooltipView = function(options){
	BasicClass.call(this);

	this._eventStream = new Bacon.Bus();

	this._setupElement(options || {});
};

GmailTooltipView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailTooltipView.prototype, {

	__memberVariables: [
		{name: '_element', get: true, destroy: true},
		{name: '_eventStream', get: true, destroy: true, destroyFunction: 'end'}
	],

	anchor: function(anchorElement, placementOptions){
		if(!anchorElement){
			return;
		}

		if(!this._element){
			return;
		}

		var targetBoundingBox = anchorElement.getBoundingClientRect();
		var tipBoundingBox = this._element.getBoundingClientRect();

		var theBoundingBoxWrapperToUse;
		if(placementOptions && placementOptions.position){
			switch(placementOptions.position){
				case 'top':
					theBoundingBoxWrapperToUse = {
						type: 'top',
						value: this._getTopPositionBoundingBox(targetBoundingBox, tipBoundingBox)
					};
				break;
				case 'bottom':
					theBoundingBoxWrapperToUse = {
						type: 'bottom',
						value: this._getBottomPositionBoundingBox(targetBoundingBox, tipBoundingBox)
					};
				break;
			}
		}
		else{
			theBoundingBoxWrapperToUse = this._getAutomaticPlacementBoundingBox(targetBoundingBox, tipBoundingBox);
		}

		var containedBoundingBox = this._containBoundingBox(theBoundingBoxWrapperToUse.value, placementOptions && placementOptions.offset);
		this._setPositionAtBoundingBox(containedBoundingBox);
		this._setArrowPosition(theBoundingBoxWrapperToUse.type, containedBoundingBox, targetBoundingBox);
	},

	getContainerElement: function(){
		return this._element;
	},

	getContentElement: function(){
		return this._element.querySelector('.aRM');
	},

	close: function(){
		this.destroy();
	},

	_setupElement: function(options){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'inboxsdk__tooltip');

		if(options.el){
			let html =
					`<div class="T-P aRL">
						<div class="T-P-Jz-UR">
							<div class="aRM" tabindex="0">
							</div>
						</div>

						<div class="T-P-hFsbo-UR T-P-hFsbo T-P-atB inboxsdk__tooltip_arrow">
							<div class="T-P-atD"></div>
							<div class="T-P-atC"></div>
						</div>
					</div>`;

			this._element.innerHTML = html;

			this._element.classList.add('inboxdk__tooltip_content');
			this._element.querySelector('.aRM').appendChild(options.el);
		}
		else{
			let html = [
				'<div class="T-P aRL">',
					'<div class="T-P-Jz-UR">',
						'<div class="aRM" tabindex="0">',
							'<div class="aVn inboxsdk__tooltip_image">',
								//image goes here
							'</div>',
							'<div class="aRR">',
								_.escape(options.title || ""),
							'</div>',
							'<div class="aRQ">',
								_.escape(options.subtitle || ""),
							'</div>',
							'<div class="inboxsdk__tooltip_button">',
								//button goes here
							'</div>',
						'</div>',
					'</div>',
					'<div class="T-P-aut-UR T-P-aut inboxsdk__tooltip_close" aria-label="Close" role="button"></div>',
					'<div class="T-P-hFsbo-UR T-P-hFsbo T-P-atB inboxsdk__tooltip_arrow">',
						'<div class="T-P-atD"></div>',
						'<div class="T-P-atC"></div>',
					'</div>',
				'</div>'
			].join('');

			this._element.innerHTML = html;

			let closeElement = this._element.querySelector('.inboxsdk__tooltip_close');
			if(closeElement){
				closeElement.addEventListener('click', () => {
					this.destroy();
				});
			}


			if(options.imageUrl){
				var image = document.createElement('img');
				image.src = options.imageUrl;
				this._element.querySelector('.inboxsdk__tooltip_image').appendChild(image);

				image.addEventListener('load', (domEvent) => {
					asap(() => {
						this._eventStream.push({
							eventName: 'imageLoaded'
						});
					});
				});

			}

			if(options.button){
				var buttonOptions = _.clone(options.button);

				buttonOptions.buttonColor = 'blue';

				var oldOnClick = buttonOptions.onClick;
				buttonOptions.onClick = () => {
					this.destroy();
					if(oldOnClick){
						oldOnClick();
					}
				};

				buttonOptions.buttonView = new ButtonView(buttonOptions);
				var buttonViewController = new BasicButtonViewController(buttonOptions);
				this._element.querySelector('.inboxsdk__tooltip_button').appendChild(buttonOptions.buttonView.getElement());
			}
		}
	},

	_getAutomaticPlacementBoundingBox: function(targetBoundingBox, tipBoundingBox){
		var boundingBoxWrappers = [
			{
				type: 'top',
				value: this._getTopPositionBoundingBox(targetBoundingBox, tipBoundingBox)
			},
			{
				type: 'left',
				value: this._getLeftPositionBoundingBox(targetBoundingBox, tipBoundingBox)
			},
			{
				type: 'right',
				value: this._getRightPositionBoundingBox(targetBoundingBox, tipBoundingBox)
			},
			{
				type: 'bottom',
				value: this._getBottomPositionBoundingBox(targetBoundingBox, tipBoundingBox)
			}
		];

		var bestBoundingBoxWrapper = this._figureOutBestBoundingBox(boundingBoxWrappers);
		return bestBoundingBoxWrapper;
	},

	_getTopPositionBoundingBox: function(targetBoundingBox, tipBoundingBox){
		var top = targetBoundingBox.top - tipBoundingBox.height - ARROW_HORIZONTAL_HEIGHT;
		var left = targetBoundingBox.left + targetBoundingBox.width/2 - tipBoundingBox.width/2;

		return [
			{
				x:left,
				y:top
			},
			{
				x:left+tipBoundingBox.width,
				y:top+tipBoundingBox.height
			}
		];
	},

	_getRightPositionBoundingBox: function(targetBoundingBox, tipBoundingBox){
		var left = targetBoundingBox.right + ARROW_VERTICAL_WIDTH;
		var top = targetBoundingBox.top + targetBoundingBox.height/2 - tipBoundingBox.height/2;

		return [
			{
				x:left,
				y:top
			},
			{
				x:left+tipBoundingBox.width,
				y:top+tipBoundingBox.height
			}
		];
	},

	_getBottomPositionBoundingBox: function(targetBoundingBox, tipBoundingBox){
		var top = targetBoundingBox.bottom + ARROW_HORIZONTAL_HEIGHT;
		var left = targetBoundingBox.left + targetBoundingBox.width/2 - tipBoundingBox.width/2;

		return [
			{
				x:left,
				y:top
			},
			{
				x:left+tipBoundingBox.width,
				y:top+tipBoundingBox.height
			}
		];
	},

	_getLeftPositionBoundingBox: function(targetBoundingBox, tipBoundingBox){
		var left = targetBoundingBox.left - ARROW_VERTICAL_WIDTH - tipBoundingBox.width;
		var top = targetBoundingBox.top + targetBoundingBox.height/2 - tipBoundingBox.height/2;

		return [
			{
				x:left,
				y:top
			},
			{
				x:left+tipBoundingBox.width,
				y:top+tipBoundingBox.height
			}
		];
	},

	_figureOutBestBoundingBox: function(boundingBoxWrappers){
		for(var ii=0; ii<boundingBoxWrappers.length; ii++){
			boundingBoxWrappers[ii].smallestDistance = this._getSmallestDistance(boundingBoxWrappers[ii]);
		}

		return _.sortBy(boundingBoxWrappers, function(boundingBoxWrapper){
			return boundingBoxWrapper.smallestDistance;
		}).reverse()[0];
	},

	_getSmallestDistance: function(boundingBoxWrapper){
		var distances = [
			boundingBoxWrapper.value[0].y, //top
			boundingBoxWrapper.value[0].x, //left
			document.body.clientWidth - boundingBoxWrapper.value[1].x, //right
			document.body.clientHeight - boundingBoxWrapper.value[1].y //bottom
		];

		return _.sortBy(distances, function(distance){
			return distance;
		})[0];
	},

	_containBoundingBox: function(boundingBox, offset){
		var boundingBoxHeight = boundingBox[1].y - boundingBox[0].y;
		var boundingBoxWidth = boundingBox[1].x - boundingBox[0].x;

		if(boundingBox[0].y < -1){
			boundingBox[0].y = 0;
			boundingBox[1].y = boundingBox[0].y + boundingBoxHeight;
		}
		else if(boundingBox[1].y > document.body.clientHeight){
			boundingBox[0].y = document.body.clientHeight - boundingBoxHeight;
			boundingBox[1].y = boundingBox[0].y + boundingBoxHeight;
		}

		if(boundingBox[0].x < -1){
			boundingBox[0].x = 0;
			boundingBox[1].x = boundingBox[0].x + boundingBoxWidth;
		}
		else if(boundingBox[1].x > document.body.clientWidth){
			boundingBox[0].x = document.body.clientWidth - boundingBoxWidth - 20;
			boundingBox[1].x = boundingBox[0].x + boundingBoxWidth;
		}

		if(offset){
			if(offset.left){
				boundingBox[0].x += offset.left;
				boundingBox[1].x += offset.left;
			}

			if(offset.top){
				boundingBox[0].y += offset.top;
				boundingBox[1].y += offset.top;
			}
		}

		return boundingBox;
	},

	_setPositionAtBoundingBox: function(boundingBox){
		this._element.style.left = boundingBox[0].x + 'px';
		this._element.style.top = boundingBox[0].y + 'px';
	},

	_setArrowPosition: function(type, containedBoundingBox, targetBoundingBox){
		var position = {};

		switch(type){
			case 'top':
				position.top = containedBoundingBox[1].y;
				position.left = targetBoundingBox.left + targetBoundingBox.width/2;
			break;
			case 'left':
				position.top = (containedBoundingBox[0].y + containedBoundingBox[1].y)/2 - ARROW_VERTICAL_HEIGHT/2;
				position.left = containedBoundingBox[1].x;
			break;
			case 'right':
				position.top = (containedBoundingBox[0].y + containedBoundingBox[1].y)/2 - ARROW_VERTICAL_HEIGHT/2;
				position.left = containedBoundingBox[0].x - ARROW_HORIZONTAL_WIDTH/2 + 1;
			break;
			case 'bottom':
				position.top = containedBoundingBox[0].y - ARROW_HORIZONTAL_HEIGHT + 1;
				position.left = (containedBoundingBox[0].x + containedBoundingBox[1].x)/2;
			break;
		}


		var arrow = this._element.querySelector('.inboxsdk__tooltip_arrow');
		arrow.style.left = position.left + 'px';
		arrow.style.top = position.top + 'px';
	}

});

module.exports = GmailTooltipView;

/*
<div class="T-P aRL" style="visibility: visible; left: 949px; top: 511px; opacity: 1;">
	<div class="T-P-Jz-UR">
		<div class="aRM" tabindex="0">
			<div class="aVn">
				<img src="//ssl.gstatic.com/ui/v1/icons/mail/payusprm_2x.png" width="410px" height="82px">
			</div>
		<div class="aRR">
			Send money for free with your debit card
		</div>
		<div class="aRQ">
			Attach money securely to any email. You can ask to be paid back too.
		</div>
		<div>
			<div class="T-I J-J5-Ji ztGYyc T-I-atl L3" role="button" tabindex="0" style="-webkit-user-select: none;">
				Get started
			</div>
		</div>
	</div>
</div>
<div class="T-P-aut-UR T-P-aut" aria-label="Close" role="button" tabindex="0"></div>
<div class="T-P-hFsbo-UR T-P-hFsbo T-P-atB" style="left: 130.5px;">
	<div class="T-P-atD"></div>
	<div class="T-P-atC"></div>
</div>
</div>


*/
