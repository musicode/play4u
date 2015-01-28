define(function (require, exports) {

    'use strict';

    /**
     * 实现以下功能：
     *
     * * 自定义控件，如播放、暂停按钮、进度条、音量条
     * * 自定义右键菜单
     * * 多终端自适应
     * * 解析 m3u8、mp4、flv（需平台支持，组件不做 fallback 处理）
     *
     * 组件采用 AMD 形式加载，不存在 domready 之后再执行的需求，
     * 如果非要强求顺序，可在业务代码中控制
     *
     * 视频播放产生的事件顺序：
     *
     * 1. progress（只要在缓冲就会触发此事件）
     * 2. play
     * 3. timeupdate
     * 5. pause
     * 6. ended
     *
     * https://msdn.microsoft.com/zh-cn/library/hh924822
     */

    var VideoEvent = require('./VideoEvent');
    var lib = require('./lib');
    var selector = require('./selector');

    var Draggable = require('cobble/helper/Draggable');
    var fullScreen = require('cobble/util/fullScreen');
    var eventOffset = require('cobble/function/eventOffset');

    /**
     * @param {Object} options
     * @property {jQuery} options.element
     * @property {string} options.src
     * @property {string} options.poster
     * @property {boolean} options.autoplay
     * @property {boolean} options.loop 是否循环播放
     * @property {number} options.width
     * @property {number} options.height
     *
     * @property {string=} options.title 片头视频地址
     * @property {string=} options.credit 片尾视频地址
     */
    function VideoPlayer(options) {
        $.extend(this, VideoPlayer.defaultOptions, options);
        this.init();
    }

    VideoPlayer.prototype = {

        constructor: VideoPlayer,

        init: function () {

            var me = this;

            var video = me.element.find('video');

            // controls 必须为 false，不然怎么自定义...
            var property = {
                controls: false
            };

            $.each(
                [ 'src', 'poster', 'autoplay', 'loop', 'width', 'height' ],
                function (index, name) {
                    if (me[name] != null) {
                        property[name] = me[name];
                    }
                }
            );

            video.prop(property);

            me.property = property;

            me.$video = video;
            me.video = video[0];

            me.bindPlayer();
            me.bindVideo();

        },

        bindPlayer: function () {

            var me = this;
            var element = me.element;

            var progressBar = element.find(selector.SELECTOR_PROGRESS_BAR);
            var progressBarWidth;

            var pos2Time = function (pos) {
                var percent = pos / progressBarWidth;
                var time = percent * me.getDuration();
                me.setCurrentTime(time);
            };

            element
            .on('click', '.' + selector.CLASS_PLAY, function () {
                me.play();
            })
            .on('click', '.' + selector.CLASS_PAUSE, function () {
                me.pause();
            })
            .on('click', '.' + selector.CLASS_MUTED, function () {
                me.setMute(false);
            })
            .on('click', '.' + selector.CLASS_UNMUTED, function () {
                me.setMute(true);
            })
            .on('click', selector.SELECTOR_FULLSCREEN, function () {
                fullScreen.enter();
            })
            .on('click', selector.SELECTOR_PROGRESS_BAR, function (e) {

                progressBarWidth = progressBar.width();

                var data = eventOffset(e);
                pos2Time(data.x);

            })
            .on('input', selector.SELECTOR_VOLUME, function () {
                me.setVolume(this.value);
            });

            new Draggable({
                element: element.find(selector.SELECTOR_SEEK_HANDLE),
                container: progressBar,
                axis: 'x',
                onBeforeDrag: function () {
                    progressBarWidth = progressBar.width();
                },
                onDrag: function (e, data) {
                    pos2Time(data.left);
                }
            });

        },

        bindVideo: function () {

            var me = this;

            var element = me.element;

            me.$video
            .on(VideoEvent.CAN_PLAY_THROUGH, function (e) {
                console.log(e);
            })
            .on(VideoEvent.LOAD_PROGRESS, function (e) {

                var buffer = me.video.buffered;

                if (buffer.length > 0) {

                    var end = buffer.end(0);

                    element
                    .find(selector.SELECTOR_LOAD_PROGRESS)
                    .width(
                        lib.percent(end, me.getDuration())
                    );
                }

            })
            .on(VideoEvent.LOAD_META_COMPLETE, function (e) {
                me.setDuration(
                    me.getDuration()
                );
            })
            .on(VideoEvent.LOAD_ABORT, function (e) {
                console.log('abort');
            })
            .on(VideoEvent.LOAD_ERROR, function (e) {
                console.log('error');
            })
            .on(VideoEvent.LOAD_STALLED, function (e) {
                console.log('stalled');
            })
            .on(VideoEvent.PLAY_WAITING, function (e) {
                element.find(selector.SELECTOR_LOADING).show();
            })
            .on(VideoEvent.CAN_PLAY, function (e) {
                element.find(selector.SELECTOR_LOADING).hide();
            })
            .on(VideoEvent.PLAY, function (e) {
                element
                    .find('.' + selector.CLASS_PLAY)
                    .removeClass(selector.CLASS_PLAY)
                    .addClass(selector.CLASS_PAUSE);
            })
            .on(VideoEvent.PAUSE, function (e) {
                element
                    .find('.' + selector.CLASS_PAUSE)
                    .removeClass(selector.CLASS_PAUSE)
                    .addClass(selector.CLASS_PLAY);
            })
            .on(VideoEvent.PLAY_PROGRESS, function (e) {
                me.seek(
                    me.getCurrentTime()
                );
            })
            .on(VideoEvent.PLAY_COMPLETE, function (e) {
                me.seek(0);
            })
            .on(VideoEvent.VOLUME_CHANGE, function () {
                me.refreshVolume();
            });
        },

        bindTitle: function () {

            var me = this;

            me.titleVideo
            .on(VideoEvent.PLAY_COMPLETE, function () {
                me.play();
            })
            .on(VideoEvent.VOLUME_CHANGE, function () {
                me.refreshVolume();
            });
        },

        load: function () {
            this.video.load();
        },

        /**
         * 播放视频
         *
         * @param {string} url 视频 url
         */
        play: function () {
            this.video.play();
        },

        pause: function () {
            this.video.pause();
        },

        /**
         * 跳到某位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        seek: function (time) {

            var me = this;
            var element = me.element;
            var playProgress = element.find(selector.SELECTOR_PLAY_PROGRESS);
            var currentTime = element.find(selector.SELECTOR_CURRENT_TIME);
            var seekHandle = element.find(selector.SELECTOR_SEEK_HANDLE);

            var percent = lib.percent(time, me.getDuration());

            playProgress.width(
                percent
            );

            currentTime.text(
                me.formatTime(time)
            );

            seekHandle.css({
                left: percent
            });
        },

        /**
         * 加载片头
         */
        loadTitle: function () {

            var me = this;
            var titleVideo = cloneVideo(me.title, me.property);

            me.$video.hide().after(titleVideo);

            me.titleVideo = titleVideo;


        },

        /**
         * 播放片头
         */
        playTitle: function () {
            this.titleVideo[0].play();
        },

        /**
         * 加载片尾
         */
        loadCredit: function () {

            var me = this;

            var creditVideo = cloneVideo(me.credit, me.property);

            creditVideo.hide();

            me.$video.after(creditVideo);

        },

        playCredit: function () {
            this.creditVideo[0].play();
        },

        canPlayType: function () {
            return this.video[0].canPlayType;
        },

        /**
         * 获取音量
         *
         * @return {number}
         */
        getVolume: function (value) {
            return this.video.volume;
        },

        /**
         * 设置音量
         *
         * @param {number} value 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (value) {
            if (value >= 0 && value <= 1) {
                this.video.volume = value;
            }
        },

        /**
         * 是否暂停
         *
         * @return {boolean}
         */
        isPaused: function () {
            return this.video.paused;
        },

        /**
         * 是否播放结束
         *
         * @return {boolean}
         */
        isPlayCompleted: function () {
            return this.video.ended;
        },

        /**
         * 是否静音
         *
         * @return {boolean}
         */
        isMuted: function () {
            return this.video.muted;
        },

        /**
         * 设置是否为静音
         *
         * @param {boolean} muted
         */
        setMute: function (muted) {
            this.video.muted = muted;
            this.refreshVolume();
        },

        /**
         * muted 和 volume 是不联动的
         *
         * 如 video.muted = true 并不会导致 video.volume 变为 0
         * 反之亦然
         *
         * 所以用一个函数来统一处理刷新
         */
        refreshVolume: function () {

            var me = this;
            var element = me.element;

            var mutedClass = selector.CLASS_MUTED;
            var unmutedClass = selector.CLASS_UNMUTED;

            if (me.isMuted() || me.getVolume() === 0) {
                element
                    .find('.' + unmutedClass)
                    .addClass(mutedClass)
                    .removeClass(unmutedClass);

            }
            else {
                element
                    .find('.' + mutedClass)
                    .addClass(unmutedClass)
                    .removeClass(mutedClass);
            }
        },

        /**
         * 获取视频的长度，以秒为单位
         *
         * @return {number}
         */
        getDuration: function () {
            return this.video.duration;
        },

        /**
         * 设置总时长
         *
         * duration 无法被修改，此函数只是修改 DOM 展现
         *
         * @param {number} value 总时长，单位为秒
         */
        setDuration: function (value) {

            var me = this;
            var target = me.element.find(selector.SELECTOR_DURATION);

            target.text(
                me.formatTime(value)
            );
        },

        /**
         * 获取视频当前播放位置
         *
         * @return {number}  播放位置，单位为秒
         */
        getCurrentTime: function () {
            return this.video.currentTime;
        },

        /**
         * 设置视频当前播放位置
         *
         * @param {number} value 播放位置，单位为秒
         */
        setCurrentTime: function (value) {
            this.video.currentTime = value;
            this.seek(value);
        },

        /**
         * 格式化时间，显示格式为 00:00
         *
         * @inner
         * @param {number} seconds
         * @return {string}
         */
        formatTime: function (seconds) {

            var result = [ ];

            // 如果总时长包含小时，则显示格式必须有小时
            if (this.getDuration() / TIME_HOUR >= 1) {

                var hours = Math.floor(seconds / TIME_HOUR);
                result.push(hours);

                seconds -= hours * TIME_HOUR;
            }

            var minutes = Math.floor(seconds / TIME_MINUTE);
            result.push(minutes);

            seconds = Math.floor(seconds - minutes * TIME_MINUTE);
            result.push(seconds);

            return result.map(lib.lpad).join(':');

        },

        dispose: function () {

            var me = this;

            me.element.off();
            me.$video.off();

            me.element =
            me.$video =
            me.video = null;

        }

    };

    /**
     * 默认配置
     *
     * @static
     * @type {Object}
     */
    VideoPlayer.defaultOptions = {

    };




    /**
     * 分钟的秒数
     *
     * @type {number}
     */
    var TIME_MINUTE = 60;

    /**
     * 小时的秒数
     *
     * @type {number}
     */
    var TIME_HOUR = 60 * TIME_MINUTE;

    /**
     * 复制一个相同属性的视频
     *
     * @inner
     * @param {string} url
     * @param {Object} property
     * @return {jQuery}
     */
    function cloneVideo(url, property) {

        var video = $('<video></video>');

        property = $.extend(true, { }, property);
        property.src = url;
        property.autoplay = false;

        video.prop(property);

        return video;

    }



    return VideoPlayer;

});