/**
 * @file 视频播放器
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    /**
     * 具有以下功能：
     *
     * 1.自定义控件，如播放、暂停按钮、进度条、音量条
     * 2.自定义右键菜单（待实现）
     * 3.多终端自适应
     * 4.需支持平台支持的视频格式，不做 fallback 处理
     *
     * 组件采用 AMD 形式加载，不存在 domready 之后再执行的需求，
     * 如果非要强求顺序，可在业务代码中控制
     */

    var lib = require('./lib');
    var selector = require('./selector');
    var VideoEvent = require('./VideoEvent');

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
     * @property {(string|Array.<string>)=} options.titles 片头视频地址
     * @property {(string|Array.<string>)=} options.credits 片尾视频地址
     */
    function VideoPlayer(options) {
        $.extend(this, VideoPlayer.defaultOptions, options);
        this.init();
    }

    VideoPlayer.prototype = {

        constructor: VideoPlayer,

        /**
         * 初始化播放器
         */
        init: function () {

            var me = this;

            me.initShared();
            me.initPlayer();

            me.initMain();

            var mainVideo = me.mainVideo;

            me.titles = lib.toArray(me.titles);
            me.credits = lib.toArray(me.credits);

            var hasTitles = me.titles.length > 0;
            var hasCredits = me.credits.length > 0;

            if (hasTitles) {
                me.initTitles();
            }
            if (hasCredits) {
                me.initCredits();
            }

            if (hasTitles) {

                var first = me.titles[0];
                var props = { };

                if (me.autoplay) {
                    props.autoplay = true;
                    mainVideo.prop('autoplay', false);
                }
                if (me.poster) {
                    props.poster = me.poster;
                }

                first.prop(props);

                mainVideo.hide();
            }

            /**
             * 当前播放列表
             *
             * @type {Array}
             */
            me.list = me.titles.concat([ mainVideo ], me.credits);

            me.setActiveVideo(0);

        },

        /**
         * 初始化共享属性
         */
        initShared: function () {

            var me = this;

            /**
             * 片头、片尾、正片的共享属性
             *
             * 包括 controls width height volume muted
             *
             * @type {Object}
             */
            me.shared = $.extend(
                            {
                                controls: false
                            },
                            lib.fetch(me, [ 'width', 'height' ])
                        );

        },

        /**
         * 给 video 元素应用共享属性
         *
         * @param {jQuery} video
         */
        applyShared: function (video) {
            video.prop(this.shared);
        },

        /**
         * 绑定播放器界面相关的交互事件
         */
        initPlayer: function () {

            var me = this;
            var element = me.element;

            var shared = me.shared;
            element.css({
                width: shared.width,
                height: shared.height
            });

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
            .on('click', selector.FULLSCREEN, function () {
                fullScreen.enter();
            })
            .on('click', selector.PROGRESS_BAR, function (e) {
                me.setCurrentTime(eventOffset(e).x, true);
            })
            .on('click', selector.VOLUME_BAR, function (e) {
                me.setVolume(eventOffset(e).x, true);
            });

            new Draggable({
                element: element.find(selector.SEEK_HANDLE),
                container: element.find(selector.PROGRESS_BAR),
                axis: 'x',
                silence: true,
                onDrag: function (e, data) {
                    me.setCurrentTime(data.left, true);
                }
            });

            new Draggable({
                element: element.find(selector.VOLUME_HANDLE),
                container: element.find(selector.VOLUME_BAR),
                axis: 'x',
                silence: true,
                onDrag: function (e, data) {
                    me.setVolume(data.left, true);
                }
            });

        },

        /**
         * 初始化片头
         */
        initTitles: function () {

            var me = this;

            me.titles =

            me.titles.map(
                function (title) {
                    var video = lib.createVideo(title, me.shared);
                    me.mainVideo.after(video);
                    return video;
                }
            );

        },

        /**
         * 初始化正片
         */
        initMain: function () {

            var me = this;
            var element = me.element;
            var mainVideo = element.find('video');

            mainVideo.prop(
                $.extend(
                    lib.fetch(me, [ 'src', 'poster', 'autoplay', 'loop' ]),
                    me.shared
                )
            );

            var duration;

            mainVideo
            .one(VideoEvent.LOAD_META_COMPLETE, function () {
                duration = mainVideo.prop('duration');
                me.setDuration(duration);
            })
            .on(VideoEvent.LOAD_PROGRESS, function () {
                var buffer = this.buffered;
                if (buffer.length > 0) {
                    var end = buffer.end(0);
                    element
                        .find(selector.LOAD_PROGRESS)
                        .width(
                            lib.percent(end, duration)
                        );
                }
            })
            .on(VideoEvent.PLAY_PROGRESS, function () {
                me.seek(
                    me.getCurrentTime()
                );
            });

            me.mainVideo = mainVideo;

        },

        /**
         * 初始化片尾
         */
        initCredits: function () {

            var me = this;

            me.credits =

            me.credits.map(
                function (credit) {
                    var video = lib.createVideo(credit, me.shared);
                    me.mainVideo.after(video);
                    return video;
                }
            );

        },

        /**
         * 设置当前激活的视频
         *
         * @param {number|jQuery} index
         */
        setActiveVideo: function (index) {

            var me = this;

            var prev = me.video;
            if (prev) {
                prev.hide();
                prev.off(VIDEO_EVENT);
            }

            var list = me.list;

            if (index.jquery) {
                $.each(
                    list,
                    function (i, video) {
                        if (video === index) {
                            index = i;
                            return false;
                        }
                    }
                );
            }

            if ($.type(index) !== 'number') {
                throw new Error('setActiveVideo 参数错误');
            }

            var video = list[index];

            me.applyShared(video);

            video.show();

            listen(me, video);

            me.video = video;
            me.index = index;

        },

        /**
         * 播放视频
         */
        play: function () {

            var me = this;

            if (me.index === me.list.length) {
                me.setActiveVideo(me.mainVideo);
            }

            me.video[0].play();
        },

        /**
         * 暂停视频
         */
        pause: function () {
            this.video[0].pause();
        },

        /**
         * 获取音量
         *
         * @return {number}
         */
        getVolume: function () {
            return this.video.prop('volume');
        },

        /**
         * 设置音量
         *
         * @param {number} value 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (value) {

            var me = this;
            var element = me.element;

            var volumeBar = element.find(selector.VOLUME_BAR);
            var volumeHandle = element.find(selector.VOLUME_HANDLE);

            var volumeBarWidth = volumeBar.width();
            var volumeHandleWidth = volumeHandle.width();
            var width = volumeBarWidth - volumeHandleWidth;

            var left;

            if (arguments[1]) {
                left = value;
                value = left / width;
            }
            else {
                left = value * width;
            }

            if (value >= 0 && value <= 1) {

                me.video.prop('volume', value);
                me.shared.volume = value;

                volumeHandle.css('left', left);

            }
        },

        /**
         * 是否静音
         *
         * @return {boolean}
         */
        isMuted: function () {
            return this.video.prop('muted');
        },

        /**
         * 设置是否为静音
         *
         * @param {boolean} muted
         */
        setMute: function (muted) {

            var me = this;

            me.video.prop('muted', muted);
            me.shared.muted = muted;

        },

        /**
         * 获取视频的长度，以秒为单位
         *
         * @return {number}
         */
        getDuration: function () {
            return this.mainVideo.prop('duration');
        },

        /**
         * 设置总时长
         *
         * duration 无法被修改，此函数只是修改 DOM 展现
         *
         * @param {number} time 总时长，单位为秒
         */
        setDuration: function (time) {

            var me = this;

            var target = me.element.find(selector.DURATION);

            target.text(
                me.formatTime(time)
            );
        },

        /**
         * 获取视频当前播放位置
         *
         * @return {number}  播放位置，单位为秒
         */
        getCurrentTime: function () {
            return this.mainVideo.prop('currentTime');
        },

        /**
         * 设置视频当前播放位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        setCurrentTime: function (time) {

            var me = this;
            var element = me.element;
            var duration = me.getDuration();

            var progressBar = element.find(selector.PROGRESS_BAR);
            var seekHandle = element.find(selector.SEEK_HANDLE);
            var progressBarWidth = progressBar.width();
            var width = progressBarWidth - seekHandle.width();

            var percent;
            var left;

            if (arguments[1]) {

                left = time;

                percent = left / progressBarWidth;
                time = percent * duration;

            }
            else {
                percent = time / duration;
                left = percent * progressBarWidth;
            }

            me.mainVideo.prop('currentTime', time);
            me.seek(time, left);
        },

        /**
         * 跳到某位置
         *
         * @param {number} time 播放位置，单位为秒
         * @param {number=} left 播放头位置，不传会自动计算，传了可减少计算量
         */
        seek: function (time, left) {

            var me = this;
            var element = me.element;

            var currentTime = element.find(selector.CURRENT_TIME);
            currentTime.text(
                me.formatTime(time)
            );

            var duration = me.getDuration();
            var percent = lib.percent(time, duration);

            var playProgress = element.find(selector.PLAY_PROGRESS);
            playProgress.width(
                percent
            );

            if (left == null) {
                var progressBar = element.find(selector.PROGRESS_BAR);
                var seekHandle = element.find(selector.SEEK_HANDLE);
                var width = progressBar.width() - seekHandle.width();
                left = (time / duration) * width;
            }

            seekHandle.css({
                left: left
            });
        },

        /**
         * 格式化时间，显示格式为 00:00
         *
         * @param {number} time 时间，单位为秒
         * @return {string}
         */
        formatTime: function (time) {
            return lib.formatTime(
                time,
                this.getDuration() / lib.TIME_HOUR >= 1
            );
        },

        /**
         * 销毁对象
         */
        dispose: function () {

            var me = this;

            $.each(
                me,
                function (key) {
                    var target = me[key];
                    if (target.jquery) {
                        target.off();
                        me[key] = null;
                    }
                }
            );
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

    var VIDEO_EVENT = '.videoplayer';


    /**
     * 提供一个工具函数，用于统一处理视频事件
     *
     * @inner
     * @param {VideoPlayer} player 播放器实例
     * @param {jQuery} video 视频元素
     */
    function listen(player, video) {

        var element = player.element;

        var errorHandler = function (e) {
            console.log('error type：' + e.type);
        };

        video
        .on(VideoEvent.PLAY + VIDEO_EVENT, function () {
            element
                .find('.' + selector.CLASS_PLAY)
                .removeClass(selector.CLASS_PLAY)
                .addClass(selector.CLASS_PAUSE);
        })
        .on(VideoEvent.PAUSE + VIDEO_EVENT, function () {
            element
                .find('.' + selector.CLASS_PAUSE)
                .removeClass(selector.CLASS_PAUSE)
                .addClass(selector.CLASS_PLAY);
        })
        .on(VideoEvent.PLAY_WAITING + VIDEO_EVENT, function () {
            element.find(selector.LOADING).show();
        })
        .on(VideoEvent.CAN_PLAY + VIDEO_EVENT, function () {
            element.find(selector.LOADING).hide();
        })
        .on(VideoEvent.VOLUME_CHANGE + VIDEO_EVENT, function () {

            var mutedClass = selector.CLASS_MUTED;
            var unmutedClass = selector.CLASS_UNMUTED;

            if (player.isMuted() || player.getVolume() === 0) {
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

        })
        .on(VideoEvent.PLAY_COMPLETE + VIDEO_EVENT, function () {

            var index = player.index + 1;

            if (index < player.list.length) {
                player.setActiveVideo(index);
                player.play();
            }

            player.index = index;

        })
        .on(VideoEvent.LOAD_ABORT + VIDEO_EVENT, errorHandler)
        .on(VideoEvent.LOAD_ERROR + VIDEO_EVENT, errorHandler)
        .on(VideoEvent.LOAD_STALLED + VIDEO_EVENT, errorHandler);

    };


    return VideoPlayer;

});