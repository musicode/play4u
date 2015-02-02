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
     * 3.需支持平台支持的视频格式，不做 fallback 处理
     *
     * 组件采用 AMD 形式加载，不存在 domready 之后再执行的需求，
     * 如果非要强求顺序，可在业务代码中控制
     *
     * 高宽最好通过样式控制，脚本操作终究少了一些灵活性，
     * 加上 css3 的全面支持，几乎可实现任何效果
     */

    var lib = require('./lib');
    var selector = require('./selector');
    var VideoEvent = require('./VideoEvent');
    var toggleClass = lib.toggleClass;

    var Popup = require('cobble/helper/Popup');
    var Draggable = require('cobble/helper/Draggable');
    var fullScreen = require('cobble/util/fullScreen');

    /**
     * 视频播放器
     *
     * @constructor
     * @param {Object} options
     * @property {jQuery} options.element 容器元素
     * @property {string} options.src 视频地址
     * @property {string=} options.poster 封面图片
     * @property {boolean=} options.autoplay 是否自动播放
     * @property {boolean=} options.loop 是否循环播放
     * @property {Object=} options.quality 画质
     *
     * @property {Object=} options.quality.low 标清画质
     * @property {Object=} options.quality.low.text 标清画质文本，如“标清”
     * @property {Object=} options.quality.low.url 标清画质 url
     *
     * @property {Object=} options.quality.high 高清画质
     * @property {Object=} options.quality.high.text 高清画质文本，如“高清”
     * @property {Object=} options.quality.high.url 高清画质 url
     *
     * @property {Object=} options.quality.super 超清画质
     * @property {Object=} options.quality.super.text 超清画质文本，如“超清”
     * @property {Object=} options.quality.super.url 超清画质 url
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
             * 包括 controls volume muted
             *
             * @type {Object}
             */
            me.shared = { controls: false };

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

            var quality = me.quality;

            var progressBar = element.find(selector.PROGRESS_BAR);
            var seekHandle = element.find(selector.SEEK_HANDLE);

            var volumeBar = element.find(selector.VOLUME_BAR);
            var volumeHandle = element.find(selector.VOLUME_HANDLE);

            var currentQuality = element.find(selector.CURRENT_QUALITY);

            var expandClass = selector.CLASS_EXPAND;
            var compressClass = selector.CLASS_COMPRESS;
            var fullScreenClass = selector.CLASS_FULLSCREEN;
            var activeQualityClass = selector.CLASS_QUALITY_ACTIVE;

            var pos2Time = function (pos) {

                var progressBarWidth = progressBar.innerWidth();
                var seekHandleWidth = seekHandle.outerWidth(true);

                var max = progressBarWidth - seekHandleWidth;

                if (pos > max) {
                    pos = max;
                }

                me.setCurrentTime(
                    (pos / max) * me.getDuration()
                );
            };

            var pos2Volume = function (pos) {

                var volumeBarHeight = volumeBar.innerHeight();
                var volumeHandleHeight = volumeHandle.outerHeight(true);

                var max = volumeBarHeight - volumeHandleHeight;

                if (pos > max) {
                    pos = max;
                }

                pos = max - pos;

                me.setVolume(
                    pos / max
                );

            };

            var changeQuality = function (type, target) {

                var data = quality[type];

                me.mainVideo.prop('src', data.url);
                currentQuality.text(data.text);


                qualityPanel
                    .find('.' + activeQualityClass)
                    .removeClass(activeQualityClass);

                $(target).addClass(activeQualityClass);

                qualityPopup.close();

            };

            var clickType = 'click';

            element
            .on(clickType, '.' + selector.CLASS_PLAY, function () {
                me.play();
            })
            .on(clickType, '.' + selector.CLASS_PAUSE, function () {
                me.pause();
            })
/**
            .on(clickType, '.' + selector.CLASS_MUTED, function () {
                me.setMute(false);
            })
            .on(clickType, '.' + selector.CLASS_UNMUTED, function () {
                me.setMute(true);
            })
*/
            .on(clickType, '.' + expandClass, function () {
                fullScreen.enter();
            })
            .on(clickType, '.' + compressClass, function () {
                fullScreen.exit();
            })
            .on(clickType, selector.PROGRESS_BAR, function (e) {
                var x = e.pageX - progressBar.offset().left;
                pos2Time(x);
            })
            .on(clickType, selector.VOLUME_BAR, function (e) {
                var y = e.pageY - volumeBar.offset().top;
                pos2Volume(y);
            })
            .on(clickType, selector.QUALITY_LOW, function () {
                changeQuality('low', this);
            })
            .on(clickType, selector.QUALITY_HIGH, function () {
                changeQuality('high', this);
            })
            .on(clickType, selector.QUALITY_SUPER, function () {
                changeQuality('super', this);
            });

            fullScreen.change(function (isFullScreen) {

                if (isFullScreen) {

                    toggleClass(element, compressClass, expandClass);
                    element.addClass(fullScreenClass);

                }
                else {

                    toggleClass(element, expandClass, compressClass);
                    element.removeClass(fullScreenClass);

                }


            });

            if (quality) {

                var qualityPanel = element.find(selector.QUALITY_PANEL);

                var qualityPopup = new Popup({
                    element: element.find(selector.QUALITY),
                    layer: qualityPanel,
                    show: {
                        trigger: clickType
                    },
                    hide: {
                        trigger: clickType
                    }
                });
            }

            new Popup({
                element: element.find(selector.MUTE),
                layer: element.find(selector.VOLUME_PANEL),
                show: {
                    trigger: clickType
                },
                hide: {
                    trigger: clickType
                }
            });

            new Draggable({
                element: seekHandle,
                container: progressBar,
                axis: 'x',
                silence: true,
                onDrag: function (e, data) {
                    pos2Time(data.left);
                }
            });

            new Draggable({
                element: volumeHandle,
                container: volumeBar,
                axis: 'y',
                silence: true,
                onDrag: function (e, data) {
                    pos2Volume(data.top);
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
                me.updateCurrentTime(
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
         * @param {number} volume 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (volume) {

            var me = this;

            if (volume >= 0 && volume <= 1) {

                me.video.prop('volume', volume);
                me.shared.volume = volume;

                me.updateVolume(volume);

            }
        },

        /**
         * 更新音量的 DOM
         *
         * @param {number} volume 音量，0 - 1
         */
        updateVolume: function (volume) {

            var element = this.element;

            var volumeBar = element.find(selector.VOLUME_BAR);
            var volumeProgress = volumeBar.find(selector.VOLUME_PROGRESS);
            var volumeHandle = element.find(selector.VOLUME_HANDLE);

            var volumeBarHeight = volumeBar.innerHeight();
            var volumeHandleHeight = volumeHandle.outerHeight(true);

            var bottom = volume * volumeBarHeight;

            volumeProgress.height(bottom);

            bottom -= volumeHandleHeight;

            if (bottom < 0) {
                bottom = 0;
            }
            else if (bottom + volumeHandleHeight > volumeBarHeight) {
                bottom = volumeBarHeight - volumeHandleHeight;
            }

            volumeHandle.css({
                top: 'auto',
                bottom: bottom
            });

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

            me.updateVolume(
                muted ? 0 : me.getVolume()
            );

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

            me.mainVideo.prop('currentTime', time);
            me.updateCurrentTime(time);
        },

        /**
         * 更新当前播放时间的 DOM
         *
         * @param {number} time 播放位置，单位为秒
         */
        updateCurrentTime: function (time) {

            var me = this;
            var element = me.element;

            var currentTime = element.find(selector.CURRENT_TIME);
            currentTime.text(
                me.formatTime(time)
            );

            var duration = me.getDuration();

            var playProgress = element.find(selector.PLAY_PROGRESS);
            playProgress.width(
                lib.percent(time, duration)
            );

            var progressBar = element.find(selector.PROGRESS_BAR);
            var seekHandle = element.find(selector.SEEK_HANDLE);
            var progressBarWidth = progressBar.innerWidth();
            var seekHandleWidth = seekHandle.outerWidth(true);

            var left = (time / duration) * progressBarWidth;

            left -= seekHandleWidth;

            if (left < 0) {
                left = 0;
            }
            else if (progressBarWidth - left < seekHandleWidth) {
                left = progressBarWidth - seekHandleWidth;
            }

            seekHandle.css('left', left);

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
     * 视频事件，用于定义命名空间
     *
     * @inner
     * @type {string}
     */
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

        var playClass = selector.CLASS_PLAY;
        var pauseClass = selector.CLASS_PAUSE;

        var mutedClass = selector.CLASS_MUTED;
        var unmutedClass = selector.CLASS_UNMUTED;

        video
        .on(VideoEvent.PLAY + VIDEO_EVENT, function () {
            toggleClass(element, pauseClass, playClass);
        })
        .on(VideoEvent.PAUSE + VIDEO_EVENT, function () {
            toggleClass(element, playClass, pauseClass);
        })
        .on(VideoEvent.PLAY_WAITING + VIDEO_EVENT, function () {
            element.find(selector.LOADING).show();
        })
        .on(VideoEvent.CAN_PLAY + VIDEO_EVENT, function () {
            element.find(selector.LOADING).hide();
        })
        .on(VideoEvent.VOLUME_CHANGE + VIDEO_EVENT, function () {

            if (player.isMuted() || player.getVolume() === 0) {
                toggleClass(element, mutedClass, unmutedClass);
            }
            else {
                toggleClass(element, unmutedClass, mutedClass);
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
        .on(VideoEvent.LOAD_ABORT + VIDEO_EVENT, function () {
            player.play();
        })
        .on(VideoEvent.LOAD_ERROR + VIDEO_EVENT, errorHandler)
        .on(VideoEvent.LOAD_STALLED + VIDEO_EVENT, errorHandler);

    };


    return VideoPlayer;

});