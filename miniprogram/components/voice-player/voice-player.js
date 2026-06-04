// components/voice-player/voice-player.js
const audio = require('../../utils/audio-manager.js')

Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    src: { type: String, value: '' },
    duration: { type: Number, value: 0 },
    playerId: { type: String, value: '' },
    width: { type: Number, value: 0 }
  },

  data: {
    isPlaying: false
  },

  lifetimes: {
    attached() {
      this._listener = (currentId) => {
        const playing = currentId === this.data.playerId && !!this.data.playerId
        if (playing !== this.data.isPlaying) {
          this.setData({ isPlaying: playing })
        }
      }
      audio.subscribe(this._listener)
    },
    detached() {
      if (this._listener) audio.unsubscribe(this._listener)
    }
  },

  methods: {
    onTap() {
      const { src, playerId } = this.data
      if (!src) return

      if (audio.isPlaying(playerId)) {
        audio.stop()
        return
      }

      audio.play(src, {
        id: playerId,
        onError: () => {
          wx.showToast({ title: '播放失败', icon: 'none' })
        }
      })
    }
  }
})
