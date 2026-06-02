// pages/detail/detail.js - 动态详情页（含评论）
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

Page({
  data: {
    postId: '',
    post: null,
    childInfo: null,
    comments: [],
    commentCount: 0,
    isLiked: false,
    currentChild: null,
    timeText: '',
    showCommentInput: false,
    commentType: 'emoji',
    selectedEmoji: '',
    commentText: '',
    canSubmitComment: false,
    emojiOptions: ['👍', '❤️', '😄', '🎉', '😮', '😢', '😡', '🤔'],
    submitting: false,
    showParentModal: false,
    parentCode: '',
    parentCodeError: ''
  },

  onLoad(options) {
    this.setData({ postId: options.id, currentChild: cloudData.getCurrentChild() })
    this.loadPost()
  },

  onShow() {
    this.setData({ currentChild: cloudData.getCurrentChild() })
    this.loadPost()
  },

  async loadPost() {
    try {
      const posts = await cloudData.getPosts()
      const post = await cloudData.getPostById(this.data.postId)
      if (!post) {
        wx.showToast({ title: '动态不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      // 获取临时链接
      let imageUrl = post.content.image_url || ''
      let voiceUrl = post.content.voice_url || ''
      if (imageUrl && imageUrl.startsWith('cloud://')) {
        imageUrl = await cloudData.getTempFileURL(imageUrl)
      }
      if (voiceUrl && voiceUrl.startsWith('cloud://')) {
        voiceUrl = await cloudData.getTempFileURL(voiceUrl)
      }

      const childInfo = cloudData.getChildInfo(post.child_id) || { nickname: '未知', avatar: '❓', color: '#999', avatarType: 'emoji' }
      const comments = (await cloudData.getComments(post._id)).map(c => ({
        ...c,
        childInfo: cloudData.getChildInfo(c.child_id) || { nickname: '未知', avatar: '❓', color: '#999', avatarType: 'emoji' },
        timeText: util.formatTime(c.created_at)
      }))

      const currentChild = cloudData.getCurrentChild()
      const isLiked = currentChild && (post.likes || []).includes(currentChild._id)
      const isOwn = currentChild && post.child_id === currentChild._id
      const duration = (post.type === 'voice' && post.content.voice_duration) ? post.content.voice_duration : 0
      const voiceBubbleWidth = Math.min(480, Math.max(160, 160 + (duration / 60) * 320))
      const emojiStickers = (post.type === 'text') ? (post.content.emoji_stickers || []) : []

      this.setData({
        post: { ...post, emojiStickers, content: { ...post.content, image_url: imageUrl, voice_url: voiceUrl } },
        childInfo, comments, commentCount: comments.length, isLiked, isOwn,
        currentChild, voiceBubbleWidth, timeText: util.formatTime(post.created_at)
      })
    } catch (e) {
      console.error('加载详情失败', e)
    }
  },

  // 点赞
  async onTapLike() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return

    const wasLiked = this.data.isLiked
    try {
      await cloudData.toggleLike(this.data.postId, currentChild._id)

      if (!wasLiked && this.data.post.child_id !== currentChild._id) {
        await cloudData.addNotification({
          to_child_id: this.data.post.child_id,
          from_child_id: currentChild._id,
          post_id: this.data.postId,
          type: 'like'
        })
      }

      await this.loadPost()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onTapComment() { this.setData({ showCommentInput: true }) },
  onCloseCommentInput() { this.setData({ showCommentInput: false, selectedEmoji: '', commentText: '' }) },

  onSelectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    const newEmoji = this.data.selectedEmoji === emoji ? '' : emoji
    this.setData({ selectedEmoji: newEmoji, canSubmitComment: newEmoji.length > 0 || this.data.commentText.trim().length > 0 })
  },

  onCommentTextInput(e) {
    const text = e.detail.value
    this.setData({ commentText: text, canSubmitComment: text.trim().length > 0 || !!this.data.selectedEmoji })
  },

  // 发送评论
  async onSubmitComment() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild || this.data.submitting) return
    const { selectedEmoji, commentText } = this.data
    if (!selectedEmoji && !commentText.trim()) { wx.showToast({ title: '说点什么吧', icon: 'none' }); return }

    this.setData({ submitting: true })

    try {
      await cloudData.addComment({
        post_id: this.data.postId,
        child_id: currentChild._id,
        type: selectedEmoji ? 'emoji' : 'text',
        content: { emoji: selectedEmoji || '', text: commentText.trim(), voice_url: '', voice_text: '' }
      })

      if (this.data.post.child_id !== currentChild._id) {
        await cloudData.addNotification({
          to_child_id: this.data.post.child_id,
          from_child_id: currentChild._id,
          post_id: this.data.postId,
          type: 'comment'
        })
      }

      this.setData({ showCommentInput: false, selectedEmoji: '', commentText: '', canSubmitComment: false })
      await this.loadPost()
      wx.showToast({ title: '评论成功', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '评论失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 删除动态
  onDeletePost() {
    this.setData({ showParentModal: true, parentCode: '', parentCodeError: '' })
  },

  onParentCodeInput(e) { this.setData({ parentCode: e.detail.value, parentCodeError: '' }) },

  async onConfirmParentCode() {
    const savedCode = wx.getStorageSync('parentCode') || '1234'
    if (this.data.parentCode === savedCode) {
      this.setData({ showParentModal: false })
      wx.showModal({
        title: '删除动态',
        content: '确定要删除这条动态吗？',
        confirmColor: '#FF6B6B',
        success: async (res) => {
          if (res.confirm) {
            try {
              await cloudData.deletePost(this.data.postId)
              wx.showToast({ title: '已删除', icon: 'success' })
              setTimeout(() => wx.navigateBack(), 1000)
            } catch (e) {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    } else {
      this.setData({ parentCodeError: '验证码不正确' })
    }
  },

  onCancelParentCode() { this.setData({ showParentModal: false }) },

  // 语音播放
  _audioContext: null,
  isPlayingVoice: false,

  onTapVoice(e) {
    const voiceUrl = e.currentTarget.dataset.url
    if (!voiceUrl) return

    if (this._audioContext) {
      this._audioContext.stop()
      this._audioContext.destroy()
    }

    this.setData({ isPlayingVoice: true })

    const audio = wx.createInnerAudioContext()
    audio.src = voiceUrl
    this._audioContext = audio

    audio.onEnded(() => { this.setData({ isPlayingVoice: false }) })
    audio.onError(() => { this.setData({ isPlayingVoice: false }); wx.showToast({ title: '播放失败', icon: 'none' }) })
    audio.play()
  }
})
