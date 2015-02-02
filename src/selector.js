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
    exports.CLASS_PLAY = 'play-icon';

    /**
     * 暂停按钮  class
     *
     * @type {string}
     */
    exports.CLASS_PAUSE = 'pause-icon';

    /**
     * 非静音状态 class
     *
     * @type {string}
     */
    exports.CLASS_UNMUTED = 'volume-up-icon';

    /**
     * 静音状态 class
     *
     * @type {string}
     */
    exports.CLASS_MUTED = 'volume-off-icon';

    /**
     * 画质面板中的当前选中画质 class
     *
     * @type {string}
     */
    exports.CLASS_QUALITY_ACTIVE = 'active';

    /**
     * 进入全屏 class
     *
     * @type {string}
     */
    exports.CLASS_EXPAND = 'expand-icon';

    /**
     * 退出全屏 class
     *
     * @type {string}
     */
    exports.CLASS_COMPRESS = 'compress-icon';

    /**
     * 全屏状态给容器添加的 class
     *
     * @type {string}
     */
    exports.CLASS_FULLSCREEN = 'fullscreen';


    /**
     * 控件条选择器
     *
     * @type {string}
     */
    exports.CONTROL_BAR = '.control-bar';

    /**
     * 静音选择器
     *
     * @type {string}
     */
    exports.MUTE = '.mute-control';

    /**
     * 音量面板选择器
     *
     * @type {string}
     */
    exports.VOLUME_PANEL = '.volume-panel';

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
     * 音量进度条选择器
     *
     * @type {string}
     */
    exports.VOLUME_PROGRESS = '.volume-progress';

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
     * 显示画质选择器
     *
     * @type {string}
     */
    exports.CURRENT_QUALITY = '.current-quality';

    /**
     * 画质图标选择器
     *
     * @type {string}
     */
    exports.QUALITY = '.quality-control';

    /**
     * 画质面板选择器
     *
     * @type {string}
     */
    exports.QUALITY_PANEL = '.quality-control ul';

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