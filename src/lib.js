define(function (require, exports) {

    'use strict';

    /**
     * 数字左边补零，如 1 补为 01，用于显示时间
     *
     * @param {number} num
     * @return {string}
     */
    exports.lpad = function (num) {
        if (num < 10) {
            return '0' + num;
        }
        return num;
    };

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

});