/**
 * @file 点击或触摸事件
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    var touch = {
        type: 'touchstart',
        pageX: function (e) {
            return e.originalEvent.touches[0].pageX;
        },
        pageY: function (e) {
            return e.originalEvent.touches[0].pageY;
        }
    };

    var click = {
        type: 'click',
        pageX: function (e) {
            return e.pageX;
        },
        pageY: function (e) {
            return e.pageY;
        }
    };

    return 'ontouchstart' in document.body ? touch : click;

});