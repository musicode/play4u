define(function (require, exports) {

    'use strict';

    var Player = require('./VideoPlayer');
    var Event = require('./VideoEvent');
    var lib = require('./lib');

    var cookie = require('cobble/util/cookie');

    //var deviceWidth = require('common/function/deviceWidth');

    var userAgent = navigator.userAgent.toLowerCase();

    var browsers = {
        msie: [ /msie ([\d.]+)/, 1 ],
        firefox: [ /firefox\/([\d.]+)/, 1 ],
        b360: [ /360browser/, 1 ],
        bqq: [ /qqbrowser\/([\d.]+)/, 1 ],
        buc: [ /ucbrowser\/([\d.]+)/, 1 ],
        bbaidu: [ /baidubrowser\/([\d.]+)/, 1 ],
        bsgm: [ /sogoumobilebrowser\/([\d.]+)/, 1 ],
        blbfast: [ /liebaofast\/([\d.]+)/, 1 ],
        b2345: [ /mb2345browser\/([\d.]+)/, 1 ],
        b4g: [ /4g explorer\/([\d.]+)/, 1 ],
        bhuohou: [ /huohoubrowser\/([\d.]+)/, 1 ],
        maxthon: [ /maxthon[\/ ]([\d.]+)/, 1 ],
        opera: [ /(opera)|(opr)\/([\d.]+)/, 3 ],
        chrome: [ /chrome\/([\d.]+)/, 1 ],
        safari: [ /version\/([\d.]+).*safari/, 1 ]
    };

    function getBrowserVersion() {

        var result;
        var browser;

        $.each(browsers, function (name, item) {
            var match = userAgent.match(item[0]);
            if (match) {
                browser = name;
                result = name + match[item[1]];
                return false;
            }
        });

        if (!result) {
            result = 'other-';
        }

        if (browser === 'bqq' || browser === 'buc') {

            $('.video-player').css('padding-bottom', 0);
            $('.control-bar').hide();
        }

        return result;
    }

    function decode (h) {
        var d = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var c, b, a, m, l, k, j, n, g = 0, o = 0, e = "", f = [];
        if (!h) {
            return h
        }
        h += "";
        do {
            m = d.indexOf(h.charAt(g++));
            l = d.indexOf(h.charAt(g++));
            k = d.indexOf(h.charAt(g++));
            j = d.indexOf(h.charAt(g++));
            n = m << 18 | l << 12 | k << 6 | j;
            c = n >> 16 & 255;
            b = n >> 8 & 255;
            a = n & 255;
            if (k == 64) {
                f[o++] = String.fromCharCode(c)
            } else {
                if (j == 64) {
                    f[o++] = String.fromCharCode(c, b)
                } else {
                    f[o++] = String.fromCharCode(c, b, a)
                }
            }
        } while (g < h.length);
        e = f.join("");
        return e
    }

    function getUUID() {
        return '1' + String((new Date()).getTime()).slice(4) + String(Math.random()).slice(-6);
    }


    exports.init = function () {

        var options = {
            width: letvcloud_player_conf.width,
            height: letvcloud_player_conf.height,
            vu: letvcloud_player_conf.vu,
            uu: letvcloud_player_conf.uu,
            autoplay: letvcloud_player_conf.auto_play,
            title: letvcloud_player_conf.start,
            credit: letvcloud_player_conf.end,
            uuid: getUUID(),
            cf: 'html5'
/**
            /iPhone|iPad/i.test(userAgent)
              ? 'html_ios'
              : 'html5'
*/
        };

        if (options.width == null) {
            options.width = '100%';
        }
        if (options.height == null) {
            options.height = '100%';
        }

        $
        .ajax({
            url: 'http://api.letvcloud.com/gpc.php',
            dataType: 'jsonp',
            data: {
                cf: options.cf,
                sign: 'signxxxxx',
                ver: '2.1',
                format: 'jsonp',
                pver: 'html5_1.1.1',
                bver: getBrowserVersion(),
                uuid: options.uuid,
                vu: options.vu,
                uu: options.uu
            }
        })
        .done(function (response) {
            if (response.code === 0) {

                var playInfo = response.data.play_info;
                var poster = playInfo.init_pic; // 封面
                var tailer = playInfo.end_pic;

                var videoInfo = response.data.video_info;
                var videoMap = videoInfo.media;

                // videoMap.low（标清） videoMap.high（高清） videoMap.super（超清）
                //
                //
                // 视频地址：videoMap.low.play_url.main_url
                //
                //
                //
                var url = decode(
                    videoMap.low.play_url.main_url
                );

                var player = new Player({
                    element: $('.video-player'),
                    poster: 'http://img.gsxservice.com/0cms/d/file/content/2015/01/54cb5240b5ed2.jpg',
                    src: url,
                    autoplay: options.autoplay,
                    titles: options.title,
                    credits: options.credit,
                    width: options.width,
                    height: options.height,
                    quality: {
                        low: {
                            text: '标清',
                            url: decode(videoMap.low.play_url.main_url)
                        },
                        high: {
                            text: '高清',
                            url: decode(videoMap.high.play_url.main_url)
                        },
                        super: {
                            text: '超清',
                            url: decode(videoMap.super.play_url.main_url)
                        }
                    }
                });

                var preventDefault = function (e) {
                    if (player.index !== player.mainIndex) {
                        e.preventDefault();
                    }
                };

                var video = $('<video></video>');

                video.on(Event.LOAD_META_COMPLETE, function () {

                    player.updateDuration(
                        video.prop('duration')
                    );

                    video.off();
                    video = null;

                });
                video.prop('src', url);
                video[0].load();

                var element = player.element;

                var videoElement = element.find('video');

                //videoElement.width(deviceWidth());

                window.onorientationchange = function () {

                    var width = deviceWidth();

                    videoElement.width(width);
                };

                element
                .on(Event.LOAD_META_COMPLETE, preventDefault)
                .on(Event.LOAD_PROGRESS, preventDefault)
                .on(Event.PLAY_PROGRESS, preventDefault)
                .on(Event.ENTER_FULLSCREEN, function () {
                    if (me.isPaused()) {
                        me.play();
                    }
                })
/**
                .on(Event.PLAY_COMPLETE, function () {
                    if (player.index === player.list.length - 1) {
                        setTimeout(
                            function () {

                                player.setActiveVideo(player.mainIndex);
                                player.pause();

                            },
                            5000
                        );
                    }
                });
*/

            }



        });

    };

});