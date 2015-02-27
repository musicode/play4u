# videoPlayer

## 可定制

```
<div class="video-player">

    <video></video>

    <div class="load-spinner">

    </div>

    <div class="video-poster">

    </div>

    <div class="control-bar">

        <a class="logo-control" href="" target="_blank">
        </a>

        <div class="fullscreen-control">
            <i class="expand-icon"></i>
        </div>

        <div class="quality-control">
            <span class="current-quality">标清</span>
            <ul>
                <li class="quality-low active">标清</li>
                <li class="quality-high">高清</li>
                <li class="quality-super">超清</li>
            </ul>
        </div>

        <div class="mute-control">
            <i class="volume-up-icon"></i>

            <div class="volume-panel">
                <div class="volume-bar">
                    <div class="volume-progress"></div>
                    <div class="volume-handle"></div>
                </div>
            </div>

        </div>

        <div class="button-control">
            <i class="play-icon"></i>
        </div>

        <div class="time-control">
            <span class="current-time">00:00</span>
            /
            <span class="duration">00:00</span>
        </div>

        <div class="progress-panel">
            <div class="progress-bar">
                <div class="load-progress"></div>
                <div class="play-progress"></div>
                <div class="seek-handle"></div>
            </div>
        </div>

    </div>

</div>
```

模板可按上面例子自己写，selector.js 可配置自定义的选择器