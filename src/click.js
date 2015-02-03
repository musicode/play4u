/**
 * @file 点击事件，如果是移动平台，切换 touch 事件
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    var touch = {
        click: 'touchstart',
        pageX: function (e) {
            return e.originalEvent.touches[0].pageX;
        },
        pageY: function (e) {
            return e.originalEvent.touches[0].pageY;
        }
    };

    var click = {
        click: 'click',
        pageX: function (e) {
            return e.pageX;
        },
        pageY: function (e) {
            return e.pageY;
        }
    };

    return 'ontouchstart' in document.body ? touch : click;

});