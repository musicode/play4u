/**
 * @file 视频事件
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    function VideoEvent(type, data) {
        this.type = type;
        this.data = data;
    }

    VideoEvent.prototype = {

        constructor: VideoEvent

    };

    /**
     * 加载视频会依次触发以下事件：
     *
     * 1. loadstart
     * 2. durationchange
     * 3. loadedmetadata
     * 4. loadeddata
     * 5. progress
     * 6. canplay
     * 7. canplaythrough
     *
     */

    /**
     * 当浏览器开始寻找指定的视频时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_START = 'loadstart';

    /**
     * 当指定视频的时长数据发生变化时触发，这时 duration 还没有加载到
     *
     * @static
     * @type {string}
     */
    VideoEvent.DURATION_CHANGE = 'durationchange';

    /**
     * 当指定的视频的元数据已加载时触发
     *
     * 元数据包括：时长、尺寸以及文本轨道
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_META_COMPLETE = 'loadedmetadata';

    /**
     * 当当前帧的数据已加载，但没有足够的数据来播放指定视频的下一帧时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_COMPLETE = 'loadeddata';

    /**
     * 当浏览器正在下载指定的视频时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_PROGRESS = 'progress';

    /**
     * 当浏览器能够开始播放指定的视频时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.CAN_PLAY = 'canplay';

    /**
     * 当浏览器预计能够在不停下来进行缓冲的情况下持续播放指定的视频时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.CAN_PLAY_THROUGH = 'canplaythrough';

    /**
     * 中断请求数据
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_ABORT = 'abort';

    /**
     * 请求数据发生错误
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_ERROR = 'error';

    /**
     * 在下载被中断三秒以上时触发
     *
     * @static
     * @type {string}
     */
    VideoEvent.LOAD_STALLED = 'stalled';

    /**
     * 开始播放
     *
     * @static
     * @type {string}
     */
    VideoEvent.PLAY = 'play';

    /**
     * 暂停播放
     *
     * @static
     * @type {string}
     */
    VideoEvent.PAUSE = 'pause';

    /**
     * 播放时出现缓冲
     *
     * @static
     * @type {string}
     */
    VideoEvent.PLAY_WAITING = 'waiting';

    /**
     * 播放结束
     *
     * @static
     * @type {string}
     */
    VideoEvent.PLAY_COMPLETE = 'ended';

    /**
     * 正在播放
     *
     * @static
     * @type {string}
     */
    VideoEvent.PLAY_PROGRESS = 'timeupdate';

    /**
     * 音量发生改变
     *
     * @static
     * @type {string}
     */
    VideoEvent.VOLUME_CHANGE = 'volumechange';

    /**
     * 进入全屏
     *
     * @static
     * @type {string}
     */
    VideoEvent.ENTER_FULLSCREEN = 'enterfullscreen';

    /**
     * 退出全屏
     *
     * @static
     * @type {string}
     */
    VideoEvent.EXIT_FULLSCREEN = 'exitfullscreen';

    return VideoEvent;

});