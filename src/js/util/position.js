import $ from 'jquery';
import { each, isDocument, isUndefined, isVisible, isWindow, toFloat, toNode, ucfirst } from './index';

var dirs = {
        width: ['x', 'left', 'right'],
        height: ['y', 'top', 'bottom']
    };

export function positionAt(element, target, elAttach, targetAttach, elOffset, targetOffset, flip, boundary) {

    elAttach = getPos(elAttach);
    targetAttach = getPos(targetAttach);

    var flipped = {element: elAttach, target: targetAttach};

    if (!element) {
        return flipped;
    }

    var dim = getDimensions(element),
        targetDim = getDimensions(target),
        position = targetDim;

    moveTo(position, elAttach, dim, -1);
    moveTo(position, targetAttach, targetDim, 1);

    elOffset = getOffsets(elOffset, dim.width, dim.height);
    targetOffset = getOffsets(targetOffset, targetDim.width, targetDim.height);

    elOffset['x'] += targetOffset['x'];
    elOffset['y'] += targetOffset['y'];

    position.left += elOffset['x'];
    position.top += elOffset['y'];

    boundary = getDimensions(boundary || getWindow(element));

    if (flip) {
        each(dirs, (prop, [dir, align, alignFlip]) => {

            if (!(flip === true || ~flip.indexOf(dir))) {
                return;
            }

            var elemOffset = elAttach[dir] === align
                    ? -dim[prop]
                    : elAttach[dir] === alignFlip
                        ? dim[prop]
                        : 0,
                targetOffset = targetAttach[dir] === align
                    ? targetDim[prop]
                    : targetAttach[dir] === alignFlip
                        ? -targetDim[prop]
                        : 0;

            if (position[align] < boundary[align] || position[align] + dim[prop] > boundary[alignFlip]) {

                var centerOffset = dim[prop] / 2,
                    centerTargetOffset = targetAttach[dir] === 'center' ? -targetDim[prop] / 2 : 0;

                elAttach[dir] === 'center' && (
                    apply(centerOffset, centerTargetOffset)
                    || apply(-centerOffset, -centerTargetOffset)
                ) || apply(elemOffset, targetOffset);

            }

            function apply(elemOffset, targetOffset) {

                var newVal = position[align] + elemOffset + targetOffset - elOffset[dir] * 2;

                if (newVal >= boundary[align] && newVal + dim[prop] <= boundary[alignFlip]) {
                    position[align] = newVal;

                    ['element', 'target'].forEach((el) => {
                        flipped[el][dir] = !elemOffset
                            ? flipped[el][dir]
                            : flipped[el][dir] === dirs[prop][1]
                                ? dirs[prop][2]
                                : dirs[prop][1];
                    });

                    return true;
                }

            }

        });
    }

    offset(element, position);

    return flipped;
}

export function offset(element, coordinates) {

    element = toNode(element);

    if (coordinates) {

        var currentOffset = offset(element),
            pos = $(element).css('position');

        ['left', 'top'].forEach(prop => {
            if (prop in coordinates) {
                var value = $(element).css(prop);
                element.style[prop] = `${(coordinates[prop] - currentOffset[prop]) 
                    + toFloat(pos === 'absolute' && value === 'auto' ? position(element)[prop] : value)
                }px`;
            }
        });

        return;
    }

    return getDimensions(element);
}

function getDimensions(element) {

    element = toNode(element);

    var window = getWindow(element),
        {pageYOffset: top, pageXOffset: left} = window;

    if (!document(element)) {

        var {height, width} = window;

        return {
            top,
            left,
            height,
            width,
            bottom: top + height,
            right: left + width,
        }
    }

    var display = false;
    if (!isVisible(element)) {
        display = element.style.display;
        element.style.display = 'block';
    }

    var rect = element.getBoundingClientRect();

    if (display !== false) {
        element.style.display = display;
    }

    return {
        height: rect.height,
        width: rect.width,
        top: rect.top + top,
        left: rect.left + left,
        bottom: rect.bottom + top,
        right: rect.right + left,
    }
}

export function position(element) {
    element = $(element);

    var parent = offsetParent(element),
        parentOffset = parent === document(element).documentElement ? {top: 0, left: 0} : offset(parent);

    return ['top', 'left'].reduce((props, prop) => {
        var propName = ucfirst(prop);
        props[prop] -= parentOffset[prop]
            + (toFloat(element.css(`margin${propName}`)) || 0)
            + (toFloat($(parent).css(`border${propName}Width`)) || 0);
        return props;
    }, offset(element));
}

function offsetParent(element) {

    var parent = toNode(element).offsetParent;

    while (parent && $(parent).css('position') === 'static') {
        parent = parent.offsetParent;
    }

    return parent || document(element).documentElement;
}

export const height = dimension('height');
export const width = dimension('width');

function dimension(prop) {
    var propName = ucfirst(prop);
    return (element, value) => {

        element = toNode(element);

        if (isUndefined(value)) {

            if (isWindow(element)) {
                return element[`inner${propName}`];
            }

            if (isDocument(element)) {
                return Math.max(element.offsetHeight, element.scrollHeight);
            }

            value = $(element).css(prop);
            value = toFloat(value === 'auto' ? element[`offset${propName}`] : value) || 0;

            return getContentSize(prop, propName, element, value);

        } else {

            $(element).css(prop, !value && value !== 0
                ? ''
                : getContentSize(prop, propName, element, value) + 'px');

        }

    }
}

function getContentSize(prop, propName, element, value) {
    return $(element).css('boxSizing') === 'border-box' ? dirs[prop].slice(1).reduce((value, prop) =>
        value
            - toFloat($(element).css(`padding${propName}`))
            - toFloat($(element).css(`border${propName}Width`))
    , value) : value;
}

function getWindow(element) {
    var doc = document(element);
    return doc && doc.defaultView || window;
}

function moveTo(position, attach, dim, factor) {
    each(dirs, function (prop, [dir, align, alignFlip]) {
        if (attach[dir] === alignFlip) {
            position[align] += dim[prop] * factor;
        } else if (attach[dir] === 'center') {
            position[align] += dim[prop] * factor / 2;
        }
    });
}

function getPos(pos) {

    var x = /left|center|right/, y = /top|center|bottom/;

    pos = (pos || '').split(' ');

    if (pos.length === 1) {
        pos = x.test(pos[0])
            ? pos.concat(['center'])
            : y.test(pos[0])
                ? ['center'].concat(pos)
                : ['center', 'center'];
    }

    return {
        x: x.test(pos[0]) ? pos[0] : 'center',
        y: y.test(pos[1]) ? pos[1] : 'center'
    };
}

function getOffsets(offsets, width, height) {

    var [x, y] = (offsets || '').split(' ');

    return {
        x: x ? toFloat(x) * (x[x.length - 1] === '%' ? width / 100 : 1) : 0,
        y: y ? toFloat(y) * (y[y.length - 1] === '%' ? height / 100 : 1) : 0
    };
}

export function flipPosition(pos) {
    switch (pos) {
        case 'left':
            return 'right';
        case 'right':
            return 'left';
        case 'top':
            return 'bottom';
        case 'bottom':
            return 'top';
        default:
            return pos;
    }
}

function document(element) {
    element = toNode(element);
    return element && element.ownerDocument;
}