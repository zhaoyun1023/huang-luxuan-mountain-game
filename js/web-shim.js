(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  var touchHandler = null;

  function pointerEvent(event) {
    if (!touchHandler) return;
    event.preventDefault();
    var source = event.touches ? event.touches[0] : event;
    touchHandler({
      touches: [{
        clientX: source.clientX,
        clientY: source.clientY
      }]
    });
  }

  window.wx = {
    getSystemInfoSync: function () {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1
      };
    },
    createCanvas: function () {
      return canvas;
    },
    getStorageSync: function (key) {
      try { return window.localStorage.getItem(key) || ''; }
      catch (error) { return ''; }
    },
    setStorageSync: function (key, value) {
      try { window.localStorage.setItem(key, String(value)); }
      catch (error) { /* Private browsing may disable storage. */ }
    },
    onTouchStart: function (handler) {
      touchHandler = handler;
      canvas.addEventListener('touchstart', pointerEvent, { passive: false });
      canvas.addEventListener('mousedown', pointerEvent);
    },
    onShareAppMessage: function () {}
  };

  window.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  window.addEventListener('load', function () {
    document.documentElement.classList.add('ready');
  });
}());
