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
     *
     * https://msdn.microsoft.com/zh-cn/library/hh924822
     */

    /**
     * 技术难点在于有片头片尾的情况
     *
     * 为了流畅的切换，通常是三个视频同时加载，同一时间只显示一个，隐藏其他两个
     *
     * 初始化时，如果 autoplay 为 true，会自动播放片头
     *
     * 播放片头时，只能控制音量，修改后的音量要应用到 正片 和 片尾，
     * 触发 ended 事件自动播放正片
     *
     * 播放正片时，所有功能可用，触发 ended 事件自动播放片尾
     *
     * 播放片尾时，只能控制音量，修改后的音量要应用到 正片 和 片头
     *
     *
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

            var progressBar = element.find(selector.PROGRESS_BAR);

            var progressBarWidth;

            // 为了提升性能，progressBarWidth 在使用前会计算一次
            // 同时能保证取到的值是最新的
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
            .on('click', selector.FULLSCREEN, function () {
                fullScreen.enter();
            })
            .on('click', selector.PROGRESS_BAR, function (e) {
                progressBarWidth = progressBar.width();
                pos2Time(eventOffset(e).x);
            });

            new Draggable({
                element: element.find(selector.SEEK_HANDLE),
                container: progressBar,
                axis: 'x',
                silence: true,
                onBeforeDrag: function () {
                    progressBarWidth = progressBar.width();
                },
                onDrag: function (e, data) {
                    pos2Time(data.left);
                }
            });

            var volume = element.find(selector.VOLUME);
            var volumeHandle = element.find(selector.VOLUME_HANDLE);
            var volumeWidth = volume.width();
            var volumeHandleWidth = volumeHandle.width();

            new Draggable({
                element: volumeHandle,
                container: volume,
                axis: 'x',
                silence: true,
                onDrag: function (e, data) {
                    var value = data.left / (volumeWidth - volumeHandleWidth);
                    me.setVolume(value);
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
         * @param {number} index
         */
        setActiveVideo: function (index) {

            var me = this;

            // 解绑事件，为了以后各种广告考虑
            var prev = me.video;
            if (prev) {
                prev.hide();
                prev.off(VIDEO_EVENT);
            }

            if (index.jquery) {
                $.each(
                    me.list,
                    function (i, video) {
                        if (video === index) {
                            index = i;
                            return false;
                        }
                    }
                );
            }

            var video = me.list[index];

            me.applyShared(video);

            video.show();

            // 绑定事件
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

            this.video[0].play();
        },

        /**
         * 暂停视频
         */
        pause: function () {
            this.video[0].pause();
        },

        /**
         * 跳到某位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        seek: function (time) {

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

            var progressBar = element.find(selector.PROGRESS_BAR);
            var seekHandle = element.find(selector.SEEK_HANDLE);
            var width = progressBar.width() - seekHandle.width();
            seekHandle.css({
                left: (time / duration) * width
            });
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
            if (value >= 0 && value <= 1) {
                var me = this;
                me.video.prop('volume', value);
                me.shared.volume = value;
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
            return this.video.prop('currentTime');
        },

        /**
         * 设置视频当前播放位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        setCurrentTime: function (time) {

            var me = this;

            me.video.prop('currentTime', time);
            me.seek(time);

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