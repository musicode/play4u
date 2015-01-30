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

            me.initShared();
            me.initPlayer();

            me.initMain();

            var hasTitle = me.title;
            var hasCredit = me.credit;

            if (hasTitle) {
                me.initTitle();
            }
            if (hasCredit) {
                me.initCredit();
            }

            me.setActiveVideo(
                hasTitle ? PART_TITLE : PART_MAIN
            );

            if (hasTitle && me.autoplay) {
                me.titleVideo.prop('autoplay', true);
            }

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
             * @inner
             * @type {Object}
             */
            var shared = {
                controls: false
            };

            $.each(
                [ 'width', 'height' ],
                function (index, name) {
                    if (me[name] != null) {
                        shared[name] = me[name];
                    }
                }
            );

            me.shared = shared;

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
        initTitle: function () {

            var me = this;

            var titleVideo = lib.createVideo(me.title, me.shared);

            me.mainVideo.after(titleVideo);

            me.titleVideo = titleVideo;

        },

        /**
         * 初始化正片
         */
        initMain: function () {

            var me = this;

            var element = me.element;

            // 正片
            var mainVideo = element.find('video');

            // 应用于正片的属性
            var props = lib.fetch(me, [ 'src', 'poster', 'autoplay', 'loop' ]);

            $.extend(props, me.shared);

            if (me.title && props.autoplay) {
                // 先播放片头
                props.autoplay = false;
            }

            mainVideo.prop(props);

            me.mainVideo = mainVideo;

        },

        /**
         * 初始化片尾
         */
        initCredit: function () {

            var me = this;

            var creditVideo = lib.createVideo(me.credit, me.shared);

            me.mainVideo.after(creditVideo);

            me.creditVideo = creditVideo;

        },


        /**
         * 获得当前激活状态的视频
         *
         * @return {string} 返回值有三个：title main credit
         */
        getActiveVideo: function () {

            var me = this;
            var video = me.video;

            if (video === me.mainVideo[0]) {
                return PART_TITLE;
            }
            else if (video === me.titleVideo[0]) {
                return PART_MAIN;
            }
            else if (video === me.creditVideo[0]) {
                return PART_CREDIT;
            }

        },

        /**
         * 设置当前激活的视频
         *
         * @param {string} video 可选值有三个：title main credit
         */
        setActiveVideo: function (video) {

            var me = this;
            var name = video;

            var map = { }

            map[PART_TITLE] = me.titleVideo;
            map[PART_MAIN] = me.mainVideo;
            map[PART_CREDIT] = me.creditVideo;

            $.each(map, function (key, element) {

                if (element) {
                    if (key === video) {
                        element.show();
                        video = element;
                    }
                    else {
                        element.hide();
                    }
                }

            });

            if (!video.jquery) {
                throw new Error('setActiveVideo 参数错误');
            }

            me.applyShared(video);

            if (me.video) {
                me.video.off();
            }

            listen(
                $.extend(
                    {
                        player: me,
                        video: video
                    },
                    videoListener[name]
                )
            );

            me.video = video;

        },

        /**
         * 播放视频
         */
        play: function () {

            var me = this;

            if (me.isCreditPlayed) {
                me.setActiveVideo(PART_MAIN);
            }

            me.video[0].play();
        },

        /**
         * 暂停视频
         */
        pause: function () {
            this.mainVideo[0].pause();
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
         * 视频文件是否可播放
         *
         * @return {boolean}
         */
        canPlayType: function () {
            return this.mainVideo[0].canPlayType;
        },

        /**
         * 获取音量
         *
         * @return {number}
         */
        getVolume: function () {
            return this.video[0].volume;
        },

        /**
         * 设置音量
         *
         * @param {number} value 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (value) {
            if (value >= 0 && value <= 1) {
                var me = this;
                me.video[0].volume =
                me.shared.volume = value;
            }
        },

        /**
         * 是否暂停
         *
         * @return {boolean}
         */
        isPaused: function () {
            return this.mainVideo[0].paused;
        },

        /**
         * 是否播放结束
         *
         * @return {boolean}
         */
        isPlayCompleted: function () {
            return this.mainVideo[0].ended;
        },

        /**
         * 是否静音
         *
         * @return {boolean}
         */
        isMuted: function () {
            return this.video[0].muted;
        },

        /**
         * 设置是否为静音
         *
         * @param {boolean} muted
         */
        setMute: function (muted) {

            var me = this;

            me.video[0].muted =
            me.shared.muted = muted;

        },

        /**
         * 获取视频的长度，以秒为单位
         *
         * @return {number}
         */
        getDuration: function () {
            return this.mainVideo[0].duration;
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
            return this.mainVideo[0].currentTime;
        },

        /**
         * 设置视频当前播放位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        setCurrentTime: function (time) {

            var me = this;

            me.mainVideo[0].currentTime = time;
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

    /**
     * 片头常量名
     *
     * @inner
     * @type {string}
     */
    var PART_TITLE = 'title';

    /**
     * 正片常量名
     *
     * @inner
     * @type {string}
     */
    var PART_MAIN = 'main';

    /**
     * 片尾常量名
     *
     * @inner
     * @type {string}
     */
    var PART_CREDIT = 'credit';



    var videoListener = { };

    videoListener[PART_TITLE] = {
        onPlayComplete: function () {
            this.setActiveVideo(PART_MAIN);
            this.play();
        }
    };

    videoListener[PART_MAIN] = {
        onLoadProgress: function (loaded) {
            this.element
            .find(selector.LOAD_PROGRESS)
            .width(
                lib.percent(loaded, this.getDuration())
            );
        },
        onPlayProgress: function () {
            this.seek(
                this.getCurrentTime()
            );
        },
        onPlayComplete: function () {
            if (this.credit) {
                this.setActiveVideo(PART_CREDIT);
                this.play();
            }
        }
    };

    videoListener[PART_CREDIT] = {
        onPlayComplete: function () {
            this.isCreditPlayed = true;
            this.pause();
        }
    };

    /**
     * 提供一个工具函数，用于统一处理视频事件
     *
     * @inner
     * @param {Object} options
     * @property {jQuery} options.video 视频元素
     * @property {VideoPlayer} options.player 播放器实例
     * @property {Function=} options.onLoadMetaComplete
     * @property {Function=} options.onLoadProgress
     * @property {Function=} options.onPlayProgress
     * @property {Function=} options.onPlayComplete
     *
     */
    function listen(options) {

        var player = options.player;
        var video = options.video;
        var element = player.element;

        var errorHandler = function (e) {
            console.log('error');
        };

        video
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
        .on(VideoEvent.PLAY_WAITING, function (e) {
            element.find(selector.LOADING).show();
        })
        .on(VideoEvent.CAN_PLAY, function (e) {
            element.find(selector.LOADING).hide();
        })
        .on(VideoEvent.VOLUME_CHANGE, function () {

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
        .on(VideoEvent.LOAD_ABORT, errorHandler)
        .on(VideoEvent.LOAD_ERROR, errorHandler)
        .on(VideoEvent.LOAD_STALLED, errorHandler);

        var onLoadProgress = options.onLoadProgress;
        if ($.isFunction(onLoadProgress)) {
            video.on(VideoEvent.LOAD_PROGRESS, function (e) {
                var buffer = this.buffered;
                if (buffer.length > 0) {
                    var end = buffer.end(0);
                    onLoadProgress.call(player, end);
                }
            });
        }

        var onLoadMetaComplete = options.onLoadMetaComplete;
        if ($.isFunction(onLoadMetaComplete)) {
            video.on(
                VideoEvent.LOAD_META_COMPLETE,
                $.proxy(onLoadMetaComplete, player)
            );
        }

        var onPlayProgress = options.onPlayProgress;
        if ($.isFunction(onPlayProgress)) {
            video.on(
                VideoEvent.PLAY_PROGRESS,
                $.proxy(onPlayProgress, player)
            );
        }

        var onPlayComplete = options.onPlayComplete;
        if ($.isFunction(onPlayComplete)) {
            video.on(
                VideoEvent.PLAY_COMPLETE,
                $.proxy(onPlayComplete, player)
            );
        }

    };


    return VideoPlayer;

});