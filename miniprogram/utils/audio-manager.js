// utils/audio-manager.js
// 全局单例语音播放管理器
// 保证全 App 同时只有一个语音在播放，跨页/跨组件切换会自动停止上一个
//
// 用法：
//   const audio = require('utils/audio-manager.js')
//   audio.play('cloud://xxx.mp3', { id: 'post-123', onEnded: fn, onError: fn })
//   audio.stop()                  // 停止当前
//   audio.isPlaying('post-123')   // 查询某个 id 是否正在播放
//   audio.subscribe(listener)     // 订阅播放状态变化，回调 (currentId|null)
//   audio.unsubscribe(listener)

let _ctx = null
let _currentId = null
const _listeners = new Set()

function _notify() {
  _listeners.forEach(fn => {
    try { fn(_currentId) } catch (e) {}
  })
}

function _destroyCtx() {
  if (_ctx) {
    try {
      _ctx.stop()
      _ctx.destroy()
    } catch (e) {}
    _ctx = null
  }
}

function play(src, options = {}) {
  if (!src) return
  const { id = '', onEnded, onError } = options

  _destroyCtx()
  _currentId = id
  _notify()

  const ctx = wx.createInnerAudioContext()
  ctx.src = src
  _ctx = ctx

  ctx.onEnded(() => {
    if (_ctx === ctx) {
      _currentId = null
      _destroyCtx()
      _notify()
    }
    if (typeof onEnded === 'function') onEnded()
  })

  ctx.onError((err) => {
    if (_ctx === ctx) {
      _currentId = null
      _destroyCtx()
      _notify()
    }
    if (typeof onError === 'function') onError(err)
  })

  ctx.play()
}

function stop() {
  if (!_ctx) return
  _destroyCtx()
  _currentId = null
  _notify()
}

function isPlaying(id) {
  return _currentId !== null && (id === undefined || _currentId === id)
}

function currentId() {
  return _currentId
}

function subscribe(fn) {
  if (typeof fn === 'function') _listeners.add(fn)
}

function unsubscribe(fn) {
  _listeners.delete(fn)
}

module.exports = {
  play,
  stop,
  isPlaying,
  currentId,
  subscribe,
  unsubscribe
}
