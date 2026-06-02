// pages/post/post.js - 发动态页面
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

let recorderManager = null

Page({
  data: {
    showTypeSelector: true,
    postType: '',
    isRecording: false,
    recordDuration: 0,
    recordTimer: null,
    voiceTempPath: '',
    voiceRecorded: false,
    photoPath: '',
    moodEmoji: '',
    moodOptions: ['😄', '😢', '😡', '😮', '😍'],
    photoText: '',
    drawingPath: '',
    textContent: '',
    textEmojiStickers: [],
    textSelectedEmoji: '',
    quickEmojis: ['😄', '😢', '😡', '😮', '😍', '🤗', '😴', '🤔', '👍', '❤️', '🎉', '✨'],
    canSubmitText: false,
    currentChild: null,
    submitting: false
  },

  onLoad() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) {
      wx.showToast({ title: '请先创建身份', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ currentChild })

    recorderManager = wx.getRecorderManager()
    recorderManager.onStart(() => {})
    recorderManager.onStop((res) => {
      this.setData({
        voiceTempPath: res.tempFilePath,
        recordDuration: Math.max(1, Math.round(res.duration / 1000)),
        voiceRecorded: true
      })
    })
    recorderManager.onError(() => {
      wx.showToast({ title: '录音失败，请重试', icon: 'none' })
      this.stopRecording()
    })
  },

  onUnload() {
    this.stopRecording()
  },

  onShow() {
    if (this.data.postType === 'drawing' && !this.data.drawingPath) {
      this.setData({ showTypeSelector: true, postType: '' })
    }
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ showTypeSelector: false, postType: type })
    if (type === 'photo') {
      this.takePhoto()
    } else if (type === 'drawing') {
      wx.navigateTo({ url: '/pages/draw/draw' })
    }
  },

  // ============ 语音动态 ============

  startRecording() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ isRecording: true, recordDuration: 0, voiceTempPath: '', voiceRecorded: false })
        this.data.recordTimer = setInterval(() => {
          const duration = this.data.recordDuration + 1
          if (duration >= 60) { this.stopRecording(); return }
          this.setData({ recordDuration: duration })
        }, 1000)
        recorderManager.start({ duration: 60000, sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 96000, format: 'mp3' })
      },
      fail: () => { wx.showToast({ title: '需要录音权限才能发语音', icon: 'none' }) }
    })
  },

  stopRecording() {
    if (!this.data.isRecording) return
    clearInterval(this.data.recordTimer)
    this.setData({ isRecording: false })
    wx.vibrateShort({ type: 'light' })
    try { recorderManager.stop() } catch (e) {}
  },

  onRecordStart() {
    wx.vibrateShort({ type: 'medium' })
    this.startRecording()
  },

  onRecordEnd() { this.stopRecording() },

  onRedo() {
    this.setData({ voiceTempPath: '', recordDuration: 0, voiceRecorded: false })
  },

  onRedoDrawing() {
    this.setData({ drawingPath: '' })
    wx.navigateTo({ url: '/pages/draw/draw' })
  },

  // ============ 文字动态 ============

  onTextInput(e) {
    const text = e.detail.value
    const emojiMap = app.globalData.emojiMap
    const stickers = util.matchEmoji(text, emojiMap)
    const canSubmit = text.trim().length > 0 || !!this.data.textSelectedEmoji
    this.setData({ textContent: text, textEmojiStickers: stickers, canSubmitText: canSubmit })
  },

  onSelectQuickEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    if (this.data.textSelectedEmoji === emoji) {
      this.setData({ textSelectedEmoji: '', canSubmitText: this.data.textContent.trim().length > 0 })
    } else {
      this.setData({ textSelectedEmoji: emoji, canSubmitText: true })
    }
  },

  // ============ 拍照动态 ============

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => { this.setData({ photoPath: res.tempFiles[0].tempFilePath }) },
      fail: () => { this.setData({ showTypeSelector: true, postType: '' }) }
    })
  },

  onSelectMood(e) { this.setData({ moodEmoji: e.currentTarget.dataset.emoji }) },
  onPhotoTextInput(e) { this.setData({ photoText: e.detail.value }) },

  // ============ 发送 ============

  async onSubmit() {
    if (this.data.submitting) return
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return

    this.setData({ submitting: true })

    let post = {
      child_id: currentChild._id,
      type: this.data.postType,
      content: {},
      likes: [],
      created_at: Date.now()
    }

    if (this.data.postType === 'voice') {
      if (!this.data.voiceRecorded || !this.data.voiceTempPath) {
        wx.showToast({ title: '请先录音', icon: 'none' })
        this.setData({ submitting: false })
        return
      }
      post.content = {
        text: '', image_url: '', voice_url: this.data.voiceTempPath,
        voice_duration: this.data.recordDuration, mood_emoji: '', emoji_stickers: []
      }
    } else if (this.data.postType === 'photo') {
      if (!this.data.photoPath) {
        wx.showToast({ title: '请先拍照', icon: 'none' })
        this.setData({ submitting: false })
        return
      }
      post.content = {
        text: this.data.photoText, image_url: this.data.photoPath,
        voice_url: '', voice_duration: 0, mood_emoji: this.data.moodEmoji
      }
    } else if (this.data.postType === 'drawing') {
      if (!this.data.drawingPath) {
        wx.showToast({ title: '请先画一幅画', icon: 'none' })
        this.setData({ submitting: false })
        return
      }
      post.content = {
        text: '', image_url: this.data.drawingPath,
        voice_url: '', voice_duration: 0, mood_emoji: '', emoji_stickers: []
      }
    } else if (this.data.postType === 'text') {
      if (!this.data.textContent.trim() && !this.data.textSelectedEmoji) {
        wx.showToast({ title: '写点什么吧', icon: 'none' })
        this.setData({ submitting: false })
        return
      }
      post.content = {
        text: this.data.textContent, image_url: '', voice_url: '',
        voice_duration: 0, mood_emoji: this.data.textSelectedEmoji,
        emoji_stickers: this.data.textEmojiStickers
      }
    }

    try {
      const savedPost = await cloudData.addPost(post)

      // 给其他孩子创建通知
      const children = cloudData.getChildren()
      for (const child of children) {
        if (child._id !== currentChild._id) {
          await cloudData.addNotification({
            to_child_id: child._id,
            from_child_id: currentChild._id,
            post_id: savedPost._id,
            type: 'new_post'
          })
        }
      }

      wx.vibrateShort({ type: 'heavy' })
      wx.showToast({ title: '发出去了！🎉', icon: 'none', duration: 1500 })
      setTimeout(() => { wx.navigateBack() }, 1500)
    } catch (e) {
      console.error('发送失败', e)
      wx.showToast({ title: '发送失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onBack() { wx.navigateBack() }
})
