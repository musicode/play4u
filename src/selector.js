define(function (require, exports) {

    'use strict';

    /**
     * 播放按钮选择器
     *
     * @type {string}
     */
    exports.CLASS_PLAY = 'fa-play';

    /**
     * 暂停按钮选择器
     *
     * @type {string}
     */
    exports.CLASS_PAUSE = 'fa-pause';

    /**
     * 非静音状态选择器
     *
     * @type {string}
     */
    exports.CLASS_UNMUTED = 'fa-volume-up';

    /**
     * 静音状态选择器
     *
     * @type {string}
     */
    exports.CLASS_MUTED = 'fa-volume-off';

    /**
     * 显示当前时间选择器
     *
     * @type {string}
     */
    exports.SELECTOR_CURRENT_TIME = '.current-time';

    /**
     * 显示总时间选择器
     *
     * @type {string}
     */
    exports.SELECTOR_DURATION = '.duration';

    /**
     * 加载进度条选择器
     *
     * @type {string}
     */
    exports.SELECTOR_LOAD_PROGRESS = '.load-progress';

    /**
     * 播放进度条选择器
     *
     * @type {string}
     */
    exports.SELECTOR_PLAY_PROGRESS = '.play-progress';

    /**
     * 进度条选择器
     *
     * @type {string}
     */
    exports.SELECTOR_PROGRESS_BAR = '.progress-bar';

    /**
     * 进度拖拽手柄选择器
     *
     * @type {string}
     */
    exports.SELECTOR_SEEK_HANDLE = '.seek-handle';

    /**
     * 音量条选择器
     *
     * @type {string}
     */
    exports.SELECTOR_VOLUME = 'input[name="volume"]';

    /**
     * 加载动画选择器
     *
     * @type {string}
     */
    exports.SELECTOR_LOADING = '.load-spinner';

    /**
     * 加载动画选择器
     *
     * @type {string}
     */
    exports.SELECTOR_FULLSCREEN = '.fullscreen-control';

});