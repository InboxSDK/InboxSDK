/* @flow */
//jshint ignore:start

var _ = require('lodash');

type Position = 'top'|'bottom'|'left'|'right';
type HAlign = 'center'|'left'|'right';
type VAlign = 'center'|'top'|'bottom';

// see src/docs/position-options.js for a description
export type Options = {
  position?: ?Position;
  forcePosition?: ?boolean;
  hAlign?: ?HAlign;
  forceHAlign?: ?boolean;
  vAlign?: ?VAlign;
  forceVAlign?: ?boolean;
  buffer?: ?number;
  topBuffer?: ?number;
  bottomBuffer?: ?number;
  leftBuffer?: ?number;
  rightBuffer?: ?number;
};

type Rect = { // Similar to ClientRect
  top: number;
  bottom: number;
  height: number;
  left: number;
  right: number;
  width: number;
};

export default function containByScreen(element: HTMLElement, anchorPoint: HTMLElement, options: Options):
{position: Position, hAlign: HAlign, vAlign: VAlign} {
  if (process.env.NODE_ENV !== 'production') {
    var style = window.getComputedStyle(element);
    if (style.position !== 'fixed') {
      console.error('containByScreen only works on fixed position elements', element);
    }
  }

  var elRect: Rect = element.getBoundingClientRect();
  var anchorRect: Rect = anchorPoint.getBoundingClientRect();

  const buffer = options.buffer || 0;
  const topBuffer = options.topBuffer || 0;
  const bottomBuffer = options.bottomBuffer || 0;
  const leftBuffer = options.leftBuffer || 0;
  const rightBuffer = options.rightBuffer || 0;

  anchorRect = {
    top: anchorRect.top-buffer-topBuffer,
    bottom: anchorRect.bottom+buffer+bottomBuffer,
    height: anchorRect.height+2*buffer+topBuffer+bottomBuffer,
    left: anchorRect.left-buffer-leftBuffer,
    right: anchorRect.right+buffer+rightBuffer,
    width: anchorRect.width+2*buffer+leftBuffer+rightBuffer
  };

  var positions: Position[] = options.position && options.forcePosition ?
    [options.position] :
    _.uniq([options.position].concat(['top','bottom','left','right']).filter(Boolean));
  var hAligns: HAlign[] = options.hAlign && options.forceHAlign ?
    [options.hAlign] :
    _.uniq([options.hAlign].concat(['center','left','right']).filter(Boolean));
  var vAligns: VAlign[] = options.vAlign && options.forceVAlign ?
    [options.vAlign] :
    _.uniq([options.vAlign].concat(['center','top','bottom']).filter(Boolean));

  var choiceAndCoord = _.chain(positions)
    .map(position =>
      position === 'top' || position === 'bottom' ?
        hAligns.map(hAlign => ({position, hAlign})) :
        [{position, hAlign: 'center'}]
    )
    .flatten()
    .map(({position, hAlign}) =>
      position === 'top' || position === 'bottom' ?
        [{position, hAlign, vAlign: 'center'}] :
        vAligns.map(vAlign => ({position, hAlign, vAlign}))
    )
    .flatten()
    // We've got an array of all sensible {position, hAlign, vAlign} combinations
    .map(({position, hAlign, vAlign}) => ({
      choice: {position, hAlign, vAlign},
      coord: positionAndAlign(elRect, anchorRect, position, hAlign, vAlign)
    }))
    .filter(({choice, coord: {top, left}}) =>
      top >= 0 && left >= 0 &&
      top+elRect.height <= window.innerHeight &&
      left+elRect.width <= window.innerWidth
    )
    .first()
    .value();

  // Fallback if we failed to find a position that fit on the screen.
  if (!choiceAndCoord) {
    var choice = {
      position: options.position||'top',
      hAlign: options.hAlign||'center',
      vAlign: options.vAlign||'center'
    };
    choiceAndCoord = {
      choice,
      coord: positionAndAlign(elRect, anchorRect, choice.position, choice.hAlign, choice.vAlign)
    };
  }

  element.style.top = `${choiceAndCoord.coord.top + buffer + topBuffer}px`;
  element.style.left = `${choiceAndCoord.coord.left + buffer + leftBuffer}px`;

  return choiceAndCoord.choice;
}

function positionAndAlign(elRect: Rect, anchorRect: Rect, position: Position, hAlign: HAlign, vAlign: VAlign): {top: number, left: number} {
  var top=0, left=0;
  if (position === 'top' || position === 'bottom') {
    switch (position) {
      case 'top':
        top = _.floor(anchorRect.top - elRect.height);
        break;
      case 'bottom':
        top = _.ceil(anchorRect.bottom);
        break;
      default: throw new Error("Should not happen");
    }
    switch (hAlign) {
      case 'center':
        left = _.round((anchorRect.left + anchorRect.right - elRect.width)/2);
        break;
      case 'left':
        left = _.round(anchorRect.left);
        break;
      case 'right':
        left = _.round(anchorRect.right - elRect.width);
        break;
      default: throw new Error("Should not happen");
    }
  } else {
    switch (position) {
      case 'left':
        left = _.floor(anchorRect.left - elRect.width);
        break;
      case 'right':
        left = _.ceil(anchorRect.right);
        break;
      default: throw new Error("Should not happen");
    }
    switch (vAlign) {
      case 'center':
        top = _.round((anchorRect.top + anchorRect.bottom - elRect.height)/2);
        break;
      case 'top':
        top = _.round(anchorRect.top);
        break;
      case 'bottom':
        top = _.round(anchorRect.bottom - elRect.height);
        break;
      default: throw new Error("Should not happen");
    }
  }
  return {top, left};
}
