/**
 * SVG Media Controller - Wrapper for SVG API
 * @param {vjs.Player|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
vjs.Svg = function (player, options, ready) {
  this.embed = player.options_['svgEmbed'];

  goog.base(this, player, options, ready);

  var source = options['source'];
  this.isReady_ = false;
  this.svgRoot = null;
  this.pauseTime = 0;
  // If the element source is already set, we may have missed the loadstart event, and want to trigger it.
  // We don't want to set the source again and interrupt playback.
  if (source && this.el_.currentSrc == source.src) {
    player.trigger('loadstart');
    // Otherwise set the source if one was provided.
  } else if (source) {
    this.el_.src = source.src;
    this.load();
  }
  player.ready(function () {
    if (this.options_['autoplay'] && this.paused()) {
      this.play();
    }
  });

  this.on('click', this.onClick);

  this.setupTriggers();
  //this.triggerReady();
};
goog.inherits(vjs.Svg, vjs.MediaTechController);

vjs.Svg.prototype.dispose = function () {
  goog.base(this, 'dispose');
};
vjs.Svg.prototype.createEl = function () {
  var player = this.player_,
      el = player.tag;

  // If the original tag is still there, remove it.
  if (el) {
    player.el().removeChild(el);
    el = el.cloneNode(false);
  }
  el = vjs.createEl('div', {
    id: player.id() + '_svg_api',
    className: 'vjs-tech'
  });
  if (this.embed) {
    this.iframeEl = null;
  } else {
    this.iframeEl = vjs.createEl('iframe', { width: '100%', height: '100%', seamless: 'seamless' });
    el.appendChild(this.iframeEl);
  }
  // associate the player with the new tag
  el['player'] = player;

  vjs.insertFirst(el, player.el());

  // Update specific tag settings, in case they were overridden
  var attrs = ['autoplay', 'preload', 'loop', 'muted'];
  for (var i = attrs.length - 1; i >= 0; i--) {
    var attr = attrs[i];
    if (player.options_[attr] !== null) {
      el[attr] = player.options_[attr];
    }
  }

  return el;
};
// Make video events trigger player events
// May seem verbose here, but makes other APIs possible.
vjs.Svg.prototype.setupTriggers = function () {
  for (var i = vjs.Svg.Events.length - 1; i >= 0; i--) {
    vjs.on(this.el_, vjs.Svg.Events[i], vjs.bind(this.player_, this.eventHandler));
  }
};
// Triggers removed using this.off when disposed
vjs.Svg.prototype.eventHandler = function (e) {
  this.trigger(e);
  // No need for media events to bubble up.
  e.stopPropagation();
};
vjs.Svg.prototype.src = function (src) {
  this.el_.src = src;
  this.isReady_ = false;
  this.svgRoot = null;
  this.load();
};
vjs.Svg.prototype.load = function () {
  if (this.svgRoot === null) {
    this.el_.currentSrc = this.el_.src;
    this.trigger('loadstart');
    this.trigger('waiting');
    if (this.embed) {
      vjs.get(this.el_.src, vjs.bind(this, this.setup), vjs.bind(this, this.onError), vjs.bind(this.onProgress));
    } else {
      this.iframeEl.setAttribute('src', this.el_.src);
      this.iframeEl.addEventListener('load', vjs.bind(this, this.setup));
    }
  }
};
vjs.Svg.prototype.setup = function (srcContent, svgDoc) {
  if (this.embed) {
    if (!!svgDoc && !!svgDoc.documentElement) {
      this.svgRoot = this.el_.ownerDocument.adoptNode(svgDoc.documentElement);
      this.el_.innerHTML = '';
      this.el_.appendChild(this.svgRoot);
    } else {
      this.trigger('error');
      return;
    }
  } else {
    if (this.iframeEl) {
      this.svgRoot = this.iframeEl.contentDocument.documentElement;
    } else {
      this.trigger('error');
      return;
    }
  }
  this.svgRoot.setAttribute('width', '100%');
  this.svgRoot.setAttribute('height', '100%');
  this.svgRoot.pauseAnimations();
  this.isReady_ = true;
  this.trigger('loaded');
  this.trigger('playing');
  this.trigger('durationchange');
  this.player_.manualProgressOn();
  this.player_.manualTimeUpdatesOn();
  this.triggerReady();
};
vjs.Svg.prototype.onError = function (err) {
  this.error = err;
  this.trigger('error');
};
vjs.Svg.prototype.onProgress = function (e) {
  this.trigger('progress');
};
vjs.Svg.prototype.play = function () {
  this.player_.trigger('play');
  //this.svgRoot.setCurrentTime(this.pauseTime);
  this.svgRoot.unpauseAnimations();
  this.player_.manualTimeUpdatesOn();
  this.player_.trigger('playing');
};
vjs.Svg.prototype.pause = function () {
  this.player_.trigger('pause');
  this.svgRoot.pauseAnimations();
  this.pauseTime = this.svgRoot.getCurrentTime();
  this.player_.manualTimeUpdatesOff();
  this.player_.trigger('paused');
};
vjs.Svg.prototype.paused = function () {
  return this.svgRoot.animationsPaused();
};
vjs.Svg.prototype.currentTime = function () {
  if (this.ended()) {
    this.pause();
    this.trigger('ended');
    return this.duration();
  } else if (this.svgRoot.animationsPaused()) {
    return this.pauseTime;
  } else {
    return this.svgRoot.getCurrentTime();
  }
};
vjs.Svg.prototype.setCurrentTime = function (seconds) {
  this.player_.trigger('seeking');
  this.svgRoot.setCurrentTime(seconds);
  this.play();
  this.player_.trigger('seeked');
};
vjs.Svg.prototype.duration = function () {
  return (this.svgRoot.getAttribute('duration') || 0);
};
vjs.Svg.prototype.buffered = function () {
  return vjs.createTimeRange(0, this.duration());
};
vjs.Svg.prototype.ended = function () {
  return (this.svgRoot.getCurrentTime() >= this.duration());
};
vjs.Svg.prototype.volume = function () {
  return this.el_.volume;
};
vjs.Svg.prototype.setVolume = function (percentAsDecimal) {
  this.el_.volume = percentAsDecimal;
};
vjs.Svg.prototype.muted = function () {
  return this.el_.muted;
};
vjs.Svg.prototype.setMuted = function (muted) {
  this.el_.muted = muted;
};
vjs.Svg.prototype.width = function () {
  return this.el_.offsetWidth;
};
vjs.Svg.prototype.height = function () {
  return this.el_.offsetHeight;
};
vjs.Svg.prototype.supportsFullScreen = function () {
  if (typeof this.el_.webkitEnterFullScreen == 'function') {
    // Seems to be broken in Chromium/Chrome && Safari in Leopard
    if (!navigator.userAgent.match('Chrome') && !navigator.userAgent.match('Mac OS X 10.5')) {
      return true;
    }
  }
  return false;
};
vjs.Svg.prototype.enterFullScreen = function () {
  try {
    this.el_.webkitEnterFullScreen();
  } catch (e) {
    if (e.code == 11) {
      // this.warning(VideoJS.warnings.videoNotReady);
      vjs.log('Video.js: Video not ready.');
    }
  }
};
vjs.Svg.prototype.exitFullScreen = function () {
  try {
    this.el_.webkitExitFullScreen();
  } catch (e) {
    if (e.code == 11) {
      // this.warning(VideoJS.warnings.videoNotReady);
      vjs.log('Video.js: Video not ready.');
    }
  }
};
vjs.Svg.prototype.currentSrc = function () {
  return this.el_.currentSrc;
};
vjs.Svg.prototype.preload = function () {
  return this.el_.preload;
};
vjs.Svg.prototype.setPreload = function (val) {
  this.el_.preload = val;
};
vjs.Svg.prototype.autoplay = function () {
  return this.el_.autoplay;
};
vjs.Svg.prototype.setAutoplay = function (val) {
  this.el_.autoplay = val;
};
vjs.Svg.prototype.loop = function () {
  return this.el_.loop;
};
vjs.Svg.prototype.setLoop = function (val) {
  this.el_.loop = val;
};
vjs.Svg.prototype.error = function () {
  return this.el_.error;
};
vjs.Svg.prototype.seeking = function () {
  return this.el_.seeking;
};
vjs.Svg.prototype.defaultMuted = function () {
  return this.el_.defaultMuted;
};
/* SVG Support Testing ---------------------------------------------------- */
vjs.Svg.isSupported = function () {
  return true;
};
vjs.Svg.canPlaySource = function (srcObj) {
  if (srcObj.type === 'image/svg+xml') { return 'maybe'; }
};
// List of all HTML5 events (various uses).
vjs.Svg.Events = 'loadstart,suspend,abort,error,emptied,stalled,loadedmetadata,loadeddata,canplay,canplaythrough,playing,waiting,seeking,seeked,ended,durationchange,timeupdate,progress,play,pause,ratechange,volumechange'.split(',');
// SVG Feature detection and Device Fixes --------------------------------- //
vjs.Svg.prototype.features = {
  fullscreen: true,
  progressEvents: true,
  timeupdateEvents: false,
  volumeControl: false
};
