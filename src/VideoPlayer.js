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
                hasTitle ? 'title' : 'main'
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

            var seekHandle = element.find(selector.SEEK_HANDLE);
            var progressBar = element.find(selector.PROGRESS_BAR);

            var seekHandleWidth = seekHandle.width();
            var progressBarWidth;

            // 为了提升性能，progressBarWidth 在使用前会计算一次
            // 同时能保证取到的值是最新的
            var pos2Time = function (pos) {
                var percent = pos / (progressBarWidth - seekHandleWidth);
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

            })
            .on('input', selector.VOLUME, function () {
                me.setVolume(this.value);
            });

            new Draggable({
                element: seekHandle,
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

        /**
         * 初始化片头
         */
        initTitle: function () {

            var me = this;
            var mainVideo = me.mainVideo;

            var titleVideo =
            me.titleVideo = lib.createVideo(me.title, me.shared);

            mainVideo.hide().after(titleVideo);

            titleVideo
            .on(VideoEvent.PLAY_COMPLETE, function () {
                me.isTitlePlayed = true;
                me.setActiveVideo('main');
                me.play();
            })
            .on(VideoEvent.VOLUME_CHANGE, function () {
                me.refreshVolume();
            });

            me.bindPlayPause(titleVideo);

        },

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

            mainVideo
            .on(VideoEvent.CAN_PLAY_THROUGH, function (e) {
                console.log(e);
            })
            .on(VideoEvent.LOAD_PROGRESS, function (e) {

                var buffer = this.buffered;

                if (buffer.length > 0) {

                    var end = buffer.end(0);

                    element
                    .find(selector.LOAD_PROGRESS)
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
                element.find(selector.LOADING).show();
            })
            .on(VideoEvent.CAN_PLAY, function (e) {
                element.find(selector.LOADING).hide();
            })
            .on(VideoEvent.PLAY_PROGRESS, function (e) {
                me.seek(
                    me.getCurrentTime()
                );
            })
            .on(VideoEvent.PLAY_COMPLETE, function (e) {
                if (me.credit) {
                    me.setActiveVideo('credit');
                    me.play();
                }
            })
            .on(VideoEvent.VOLUME_CHANGE, function () {
                me.refreshVolume();
            });

            me.bindPlayPause(mainVideo);

        },

        /**
         * 初始化片尾
         */
        initCredit: function () {

            var me = this;

            var mainVideo = me.mainVideo;
            var creditVideo =
            me.creditVideo = lib.createVideo(me.credit, me.shared);

            creditVideo.hide();

            mainVideo.after(creditVideo);

            creditVideo
            .on(VideoEvent.PLAY_COMPLETE, function () {
                me.pause();
            })
            .on(VideoEvent.VOLUME_CHANGE, function () {
                me.refreshVolume();
            });

            me.bindPlayPause(creditVideo);

        },

        bindPlayPause: function (video) {

            var element = this.element;

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
            });

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
                return 'main';
            }
            else if (video === me.titleVideo[0]) {
                return 'title';
            }
            else if (video === me.creditVideo[0]) {
                return 'credit';
            }

        },

        /**
         * 设置当前激活的视频
         *
         * @param {string} video 可选值有三个：title main credit
         */
        setActiveVideo: function (video) {

            var me = this;

            var map = {
                title: me.titleVideo,
                main: me.mainVideo,
                credit: me.creditVideo
            };

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

            me.video = video[0];

        },

        /**
         * 播放视频
         */
        play: function () {

            var me = this;
            var video;

            if (me.title && !me.isTitlePlayed) {
                video = me.titleVideo;
            }
            else {
                video = me.mainVideo;
            }

            video[0].play();

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
            var playProgress = element.find(selector.PLAY_PROGRESS);
            var currentTime = element.find(selector.CURRENT_TIME);
            var seekHandle = element.find(selector.SEEK_HANDLE);

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
            return this.video.volume;
        },

        /**
         * 设置音量
         *
         * @param {number} value 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (value) {
            if (value >= 0 && value <= 1) {
                var me = this;
                me.video.volume =
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
            return this.video.muted;
        },

        /**
         * 设置是否为静音
         *
         * @param {boolean} muted
         */
        setMute: function (muted) {

            var me = this;

            me.video.muted =
            me.shared.muted = muted;

            me.refreshVolume();

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
         * @param {number} seconds
         * @return {string}
         */
        formatTime: function (seconds) {

            return lib.formatTime(
                seconds,
                this.getDuration() / lib.TIME_HOUR >= 1
            );

        },

        dispose: function () {

            var me = this;

            me.element.off();
            me.main.off();

            me.element =
            me.main =
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









    return VideoPlayer;

});