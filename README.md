# play4u

M3U8也是一种M3U，只是它的编码格式是UTF-8格式。
1：M3U8是苹果专用的“视频格式”；HTML5是一种“网页编码格式”。两者属性不同
2：M3U8视频只能苹果设备访问，即苹果设备才能解码此类视频；而HTML5是开放的，苹果设备、安卓设备都能访问
3：“iPad模式”只是用“iPad的加载方式”来加载网页，因为屏蔽了flash，对方网站自然就推送HTML5页面（如果有的话）
4：对于含有M3U8视频的HTML5网页，安卓设备不能解析和播放M3U8视频，但可以访问该网页
5：HTML5并非苹果独占，苹果独占的是某些HTML5网页里面的U3M8视频
6：如果该HTML5网页里面没有M3U8视频，则安卓设备可以完美访问，即完美“伪装iPad”
7：结论：“伪装iPad”就是叫对方网站推送HTML5版的界面给我们，而不是访问iPad专用资源，如果对方资源全是M3U8，即便伪装iPad，安卓平板也不能拿下。

## m3u8

* [](http://camnpr.com/archives/943.html)
* [](http://www.cuplayer.com/player/PlayerCodeAs/2013/0524847.html)

## 可定制

.loading-spinner 用 CSS3 实现 loading
.progress-bar 可自定义进度条
