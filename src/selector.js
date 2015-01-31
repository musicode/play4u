/**
 * @file 选择器，可配置
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    /**
     * 播放按钮 class
     *
     * @type {string}
     */
    exports.CLASS_PLAY = 'fa-play';

    /**
     * 暂停按钮  class
     *
     * @type {string}
     */
    exports.CLASS_PAUSE = 'fa-pause';

    /**
     * 非静音状态 class
     *
     * @type {string}
     */
    exports.CLASS_UNMUTED = 'fa-volume-up';

    /**
     * 静音状态 class
     *
     * @type {string}
     */
    exports.CLASS_MUTED = 'fa-volume-off';

    /**
     * 显示当前时间选择器
     *
     * @type {string}
     */
    exports.CURRENT_TIME = '.current-time';

    /**
     * 显示总时间选择器
     *
     * @type {string}
     */
    exports.DURATION = '.duration';

    /**
     * 加载进度条选择器
     *
     * @type {string}
     */
    exports.LOAD_PROGRESS = '.load-progress';

    /**
     * 播放进度条选择器
     *
     * @type {string}
     */
    exports.PLAY_PROGRESS = '.play-progress';

    /**
     * 进度条选择器
     *
     * @type {string}
     */
    exports.PROGRESS_BAR = '.progress-bar';

    /**
     * 进度拖拽手柄选择器
     *
     * @type {string}
     */
    exports.SEEK_HANDLE = '.seek-handle';

    /**
     * 音量条选择器
     *
     * @type {string}
     */
    exports.VOLUME_BAR = '.volume-bar';

    /**
     * 音量手柄选择器
     *
     * @type {string}
     */
    exports.VOLUME_HANDLE = '.volume-handle';

    /**
     * 加载动画选择器
     *
     * @type {string}
     */
    exports.LOADING = '.load-spinner';

    /**
     * 加载动画选择器
     *
     * @type {string}
     */
    exports.FULLSCREEN = '.fullscreen-control';

    /**
     * 画质图标选择器
     *
     * @type {string}
     */
    exports.QUALITY = '.quality-control';

    /**
     * 画质浮层选择器
     *
     * @type {string}
     */
    exports.QUALITY_LAYER = '.quality-control ul';

    /**
     * 标清画质选择器
     *
     * @type {string}
     */
    exports.QUALITY_LOW = '.quality-low';

    /**
     * 高清画质选择器
     *
     * @type {string}
     */
    exports.QUALITY_HIGH = '.quality-high';

    /**
     * 超清画质选择器
     *
     * @type {string}
     */
    exports.QUALITY_SUPER = '.quality-super';

});