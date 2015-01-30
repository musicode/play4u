define(function (require, exports) {

    'use strict';

    /**
     * 分钟的秒数
     *
     * @inner
     * @type {number}
     */
    var TIME_MINUTE = 60;

    /**
     * 小时的秒数
     *
     * @inner
     * @type {number}
     */
    var TIME_HOUR = 60 * TIME_MINUTE;

    /**
     * 数字左边补零，如 1 补为 01，用于显示时间
     *
     * @inner
     * @param {number} num
     * @return {string}
     */
    function lpad(num) {
        if (num < 10) {
            return '0' + num;
        }
        return num;
    }

    /**
     * 格式化为百分比形式，以 % 结尾
     *
     * @param {number} current
     * @param {number} total
     * @return {string}
     */
    exports.percent = function (current, total) {
        var result = (current / total).toFixed(3);
        return result * 100 + '%';
    };

    /**
     * 提取 source 的 props 属性
     *
     * @param {Object} source 源对象
     * @param {Array.<string>} props 属性列表
     * @return {Object}
     */
    exports.fetch = function (source, props) {

        var result = { };

        $.each(
            props,
            function (index, name) {
                if (source[name] != null) {
                    result[name] = source[name];
                }
            }
        );

        return result;

    };

    /**
     * 复制一个相同属性的视频
     *
     * @inner
     * @param {string} url
     * @param {Object} property
     * @return {jQuery}
     */
    exports.createVideo = function (url, property) {

        var video = $('<video style="display: none;"></video>');

        property = $.extend(true, { }, property);
        property.src = url;

        video.prop(property);

        return video;

    };

    /**
     * 格式化时间为 00:00:00 的格式
     *
     * @param {number} time 时间，单位为秒
     * @param {boolean} includeHour 是否包含小时
     * @return {string}
     */
    exports.formatTime = function (time, includeHour) {

        var result = [ ];

        if (includeHour) {

            var hours = Math.floor(time / TIME_HOUR);
            result.push(hours);

            time -= hours * TIME_HOUR;
        }

        var minutes = Math.floor(time / TIME_MINUTE);
        result.push(minutes);

        var seconds = Math.floor(time - minutes * TIME_MINUTE);
        result.push(seconds);

        return result.map(lpad).join(':');

    };

    /**
     * 把 value 转成数组
     *
     * @param {Array|string} value
     * @return {Array}
     */
    exports.toArray = function (value) {
        if ($.type(value) === 'string') {
            value = [ value ];
        }
        return $.isArray(value) ? value : [ ];
    };

    /**
     * 小时的秒数
     *
     * @type {number}
     */
    exports.TIME_HOUR = TIME_HOUR;


});