/**
 * @file 视频播放器
 * @author musicode
 */
define(function (require, exports) {

    'use strict';

    /**
     * # 功能
     *
     * 1.自定义控件，如播放、暂停按钮、进度条、音量条
     * 2.自定义右键菜单（待实现）
     * 3.需支持平台支持的视频格式，不做 fallback 处理
     *
     * # 加载
     *
     * 组件采用 AMD 形式加载，不存在 domready 之后再执行的需求，
     * 如果非要强求顺序，可在业务代码中控制
     *
     * # 宽高
     *
     * 高宽最好通过样式控制，脚本操作终究少了一些灵活性，
     * 加上 css3 的全面支持，几乎可实现任何效果
     *
     * # 封面
     *
     * 封面有兼容问题，最好模拟实现
     *
     */

    var lib = require('./lib');
    var selector = require('./selector');
    var VideoEvent = require('./VideoEvent');
    var toggleClass = lib.toggleClass;

    var Popup = require('cobble/helper/Popup');
    var Draggable = require('cobble/helper/Draggable');
    var fullScreen = require('cobble/util/fullScreen');
    var supportEvents = require('cobble/util/mouse');

    var supportEvent = 'onorientationchange' in window
                     ? supportEvents.touch
                     : supportEvents.mouse;

    /**
     * 视频播放器
     *
     * @constructor
     * @param {Object} options
     * @property {jQuery} options.element 容器元素
     * @property {string} options.src 视频地址
     * @property {string=} options.poster 封面图片
     * @property {boolean=} options.autoplay 是否自动播放
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

            var titles = lib.toArray(me.titles);
            var credits = lib.toArray(me.credits);

            var url = me.src;

            /**
             * 播放的视频元素
             *
             * @type {jQuery}
             */
            me.video = me.element.find('video');

            /**
             * 当前播放列表
             *
             * @type {Array}
             */
            me.list = titles.concat([ url ], credits);

            /**
             * 正片的索引
             *
             * @type {number}
             */
            me.mainIndex = titles.length;

            /**
             * 正片的属性
             *
             * @type {Object}
             */
            me.mainProperty = lib.fetch(
                                me,
                                [ 'src', 'autoplay' ]
                              );


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
            me.sharedProperty = { controls: false };

        },

        /**
         * 给 video 元素应用共享属性
         *
         * @param {jQuery} video
         */
        applyShared: function (video) {
            video.prop(this.sharedProperty);
        },

        /**
         * 绑定播放器界面相关的交互事件
         */
        initPlayer: function () {

            var me = this;

            if (me.poster) {
                me.setPoster(me.poster);
            }

            var element = me.element;

            var quality = me.quality;

            var progressBar = element.find(selector.PROGRESS_BAR);
            var seekHandle = element.find(selector.SEEK_HANDLE);

            var volumeBar = element.find(selector.VOLUME_BAR);
            var volumeHandle = element.find(selector.VOLUME_HANDLE);

            var playVideo = function () {
                me.play();
            };

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

            var clickType = supportEvent.click;

            // 在大块面积上慎用 touch，因为一碰就会播放，无法平移操作
            element
            .on('click', 'video', function () {
                if (me.isPaused()) {
                    me.play();
                }
                else {
                    me.pause();
                }
            })
            .on('click', selector.POSTER, playVideo)
            .on(clickType, '.' + selector.CLASS_PLAY, playVideo)
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
            .on(clickType, '.' + selector.CLASS_EXPAND, function () {
                fullScreen.enter();
            })
            .on(clickType, '.' + selector.CLASS_COMPRESS, function () {
                fullScreen.exit();
            })
            .on(clickType, selector.PROGRESS_PANEL, function (e) {
                var progressPanel = element.find(selector.PROGRESS_PANEL);
                var x = supportEvent.pageX(e) - progressPanel.offset().left;
                pos2Time(x);
            })
            .on(clickType, selector.VOLUME_BAR, function (e) {
                var y = supportEvent.pageY(e) - volumeBar.offset().top;
                pos2Volume(y);
            })
            .on(clickType, selector.QUALITY_LOW, function () {
                me.setQuality('low');
            })
            .on(clickType, selector.QUALITY_HIGH, function () {
                me.setQuality('high');
            })
            .on(clickType, selector.QUALITY_SUPER, function () {
                me.setQuality('super');
            });

            fullScreen.change(function (isFullScreen) {

                if (isFullScreen) {
                    me.enterFullScreen();
                }
                else {
                    me.exitFullScreen();
                }

            });

            if (quality) {

                me.qualityPopup = new Popup({
                    element: element.find(selector.QUALITY),
                    layer: element.find(selector.QUALITY_PANEL),
                    show: {
                        trigger: 'click'
                    },
                    hide: {
                        trigger: 'click'
                    }
                });
            }

            new Popup({
                element: element.find(selector.MUTE),
                layer: element.find(selector.VOLUME_PANEL),
                show: {
                    trigger: 'click'
                },
                hide: {
                    trigger: 'click'
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
         * 进入全屏
         */
        enterFullScreen: function () {

            var me = this;
            var element = me.element;

            me.isFullscreen = false;

            toggleClass(element, selector.CLASS_COMPRESS, selector.CLASS_EXPAND);
            element.addClass(selector.CLASS_FULLSCREEN);

            element.trigger(VideoEvent.EXIT_FULLSCREEN);

        },

        /**
         * 退出全屏
         */
        exitFullScreen: function () {

            var me = this;
            var element = me.element;

            me.isFullscreen = true;

            toggleClass(element, selector.CLASS_EXPAND, selector.CLASS_COMPRESS);
            element.removeClass(selector.CLASS_FULLSCREEN);

            element.trigger(VideoEvent.ENTER_FULLSCREEN);

        },

        /**
         * 设置画质
         *
         * @param {string} type 可选值包括 low high super
         */
        setQuality: function (type) {

            var me = this;
            var quality = me.quality;

            if (!quality || !quality[ type ]) {
                throw new Error('[setQuality] 找不到 ' + type + ' 画质.');
            }

            var data = quality[ type ];

            me.setProperty('src', data.url);

            me.element
                .find(selector.CURRENT_QUALITY)
                .text(data.text);

            var qualityPopup = me.qualityPopup;

            var qualityPanel = qualityPopup.layer;
            var activeQualityClass = selector.CLASS_QUALITY_ACTIVE;

            qualityPanel
                .find('.' + activeQualityClass)
                .removeClass(activeQualityClass);

            qualityPanel
                .find(qualitySelector[ type ])
                .addClass(activeQualityClass);

            if (!qualityPopup.hidden) {
                qualityPopup.close();
            }

        },

        /**
         * 设置当前激活的视频
         *
         * @param {number} index
         */
        setActiveVideo: function (index) {

            var me = this;

            var video = me.video;

            video.off(videoNamespace);

            var mainProperty = me.mainProperty;
            var property = $.extend({ }, me.sharedProperty);

            if (index === me.mainIndex) {
                $.extend(property, mainProperty);
            }
            else {
                property.src = me.list[index];
                if (index === 0) {
                    property.poster = mainProperty.poster;
                }
            }

            video.prop(
                property
            );

            listen(me, video);

            me.index = index;

        },

        /**
         * 获取封面地址
         *
         * @return {string}
         */
        getPoster: function () {
            return this.poster || '';
        },

        /**
         * 设置封面地址
         *
         * @param {string} poster
         */
        setPoster: function (poster) {

            var me = this;

            me.poster = poster;

            var posterElement = me.element.find(selector.POSTER);

            posterElement.css(
                'background-image',
                'url(' + poster + ')'
            );

        },

        /**
         * 播放视频
         */
        play: function () {

            var me = this;

            if (me.index === me.list.length) {
                me.setActiveVideo(me.mainIndex);
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
         * 是否暂停播放
         *
         * @return {boolean}
         */
        isPaused: function () {
            return this.video.prop('paused');
        },

        /**
         * 更新加载进度条
         *
         * @param {number} time 已加载的时间
         */
        updateLoadProgress: function (time) {

            var me = this;
            var loadProgress = me.element.find(selector.LOAD_PROGRESS);

            loadProgress.width(
                lib.percent(
                    time,
                    me.getDuration()
                )
            );
        },

        /**
         * 获取音量
         *
         * @return {number}
         */
        getVolume: function () {
            return this.getProperty('volume');
        },

        /**
         * 设置音量
         *
         * @param {number} volume 音量值，从 0 到 1，0 表示静音
         */
        setVolume: function (volume) {

            var me = this;

            if (volume >= 0 && volume <= 1) {

                me.setProperty('volume', volume);

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
            return this.getProperty('muted');
        },

        /**
         * 设置是否为静音
         *
         * @param {boolean} muted
         */
        setMute: function (muted) {

            var me = this;

            me.setProperty('muted', muted);

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
            return this.getProperty('duration');
        },

        /**
         * 更新总时长的 DOM
         *
         * @param {number} time 总时长，单位为秒
         */
        updateDuration: function (time) {

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
            return this.getProperty('currentTime');
        },

        /**
         * 设置视频当前播放位置
         *
         * @param {number} time 播放位置，单位为秒
         */
        setCurrentTime: function (time) {

            var me = this;

            me.setProperty('currentTime', time);
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
         * 获取正片的属性
         *
         * @return {*}
         */
        getProperty: function (name) {
            var me = this;
            var value = me.mainProperty[ name ];
            if (value == null) {
                value = me.video.prop(name);
            }
            return value;
        },

        /**
         * 设置正片的属性
         *
         * @param {string} name
         * @param {*} value
         */
        setProperty: function (name, value) {

            var me = this;

            var isShared = sharedProperties.indexOf(name) > -1;

            var target = isShared ? 'sharedProperty' : 'mainProperty';

            me[ target ][ name ] = value;

            if (isShared || me.index === me.mainIndex) {
                me.video.prop(name, value);
            }

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
     * 可共享的元素
     *
     * @inner
     * @type {Array.<string>}
     */
    var sharedProperties = [ 'muted', 'volume' ];

    /**
     * 视频事件命名空间
     *
     * @inner
     * @type {string}
     */
    var videoNamespace = '.video_player';

    /**
     * 画质选择器
     *
     * @inner
     * @type {Object}
     */
    var qualitySelector = {
        low: selector.QUALITY_LOW,
        high: selector.QUALITY_HIGH,
        super: selector.QUALITY_SUPER
    };


    function listen(player, video) {

        var element = player.element;

        var playClass = selector.CLASS_PLAY;
        var pauseClass = selector.CLASS_PAUSE;

        var mutedClass = selector.CLASS_MUTED;
        var unmutedClass = selector.CLASS_UNMUTED;

        var dispatch = function (e) {
            console.log(e.type)
            element.trigger(e);
        };

        video
        .on(VideoEvent.LOAD_META_COMPLETE + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                player.updateDuration(
                    this.duration
                );
            }
        })
        .on(VideoEvent.LOAD_PROGRESS + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                player.updateLoadProgress(
                    lib.loaded(this)
                );
            }
        })
        .on(VideoEvent.PLAY_PROGRESS + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                player.updateCurrentTime(
                    this.currentTime
                );
            }
        })
        .on(VideoEvent.PLAY + videoNamespace, function (e) {

            dispatch(e);

            var posterElement = element.find(selector.POSTER);
            if (posterElement.is(':visible')) {
                posterElement.hide();
            }

            if (!e.isDefaultPrevented()) {
                toggleClass(element, pauseClass, playClass);
            }
        })
        .on(VideoEvent.PAUSE + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                toggleClass(element, playClass, pauseClass);
            }
        })
        .on(VideoEvent.PLAY_WAITING + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                element.find(selector.LOADING).show();
            }
        })
        .on(VideoEvent.CAN_PLAY + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {
                element.find(selector.LOADING).hide();
            }
        })
        .on(VideoEvent.VOLUME_CHANGE + videoNamespace, function (e) {

            dispatch(e);

            if (!e.isDefaultPrevented()) {

                if (player.isMuted() || player.getVolume() === 0) {
                    toggleClass(element, mutedClass, unmutedClass);
                }
                else {
                    toggleClass(element, unmutedClass, mutedClass);
                }

            }

        })
        .on(VideoEvent.PLAY_COMPLETE + videoNamespace, function (e) {

            var index = player.index;

            if (index === player.mainIndex) {
                player.setProperty('currentTime', 0);
            }

            dispatch(e);

            index++;

            if (index < player.list.length) {
                player.setActiveVideo(index);
                player.play();
            }

            player.index = index;

        })
        .on(VideoEvent.CAN_PLAY_THROUGH + videoNamespace, dispatch)
        .on(VideoEvent.LOAD_START + videoNamespace, dispatch)
        .on(VideoEvent.LOAD_ERROR + videoNamespace, dispatch)
        .on(VideoEvent.LOAD_ABORT + videoNamespace, dispatch)
        .on(VideoEvent.LOAD_STALLED + videoNamespace, dispatch);

    }


    return VideoPlayer;

});