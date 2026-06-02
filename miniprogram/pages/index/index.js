// pages/index/index.js - 圈子首页（动态流）
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

Page({
  data: {
    currentChild: null,
    posts: [],
    showAccountSwitcher: false,
    children: [],
    refreshing: false,
    parentMode: false,
    showQuickReact: false,
    quickReactPostId: '',
    quickReactEmojis: ['👍', '❤️', '😄', '😢', '😮', '🎉'],
    loading: true,
    noIdentity: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.initPage()
  },

  async initPage() {
    // 同步孩子列表
    await cloudData.syncChildren()
    const currentChild = cloudData.getCurrentChild()
    const children = cloudData.getChildren()

    if (!currentChild || children.length === 0) {
      // 没有身份，显示引导页
      this.setData({ currentChild: null, children: [], posts: [], loading: false, noIdentity: true })
      return
    }

    this.setData({ currentChild, children: cloudData.getChildren(), noIdentity: false })
    await this.loadPosts()
    this.updateMessageBadge()
  },

  // 更新消息tab红点
  async updateMessageBadge() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return
    const notifications = await cloudData.getNotifications(currentChild._id)
    const lastSeen = wx.getStorageSync('lastNotificationSeenTime') || 0
    const unread = notifications.filter(n => {
      if (n.read) return false
      // 通知时间早于上次查看消息时间，视为已读
      const t = n.created_at instanceof Date ? n.created_at.getTime() : (typeof n.created_at === 'number' ? n.created_at : 0)
      return t > lastSeen
    }).length
    if (unread > 0) {
      wx.setTabBarBadge({ index: 1, text: String(unread) })
    } else {
      wx.removeTabBarBadge({ index: 1 })
    }
  },

  async onPullDownRefresh() {
    await this.initPage()
    wx.stopPullDownRefresh()
  },

  // 加载动态列表
  async loadPosts() {
    try {
      const posts = await cloudData.getPosts()
      // 缓存供成就系统使用
      wx.setStorageSync('postsCache', posts)

      // 获取文件临时链接
      const enrichedPosts = []
      for (const post of posts) {
        let imageUrl = post.content.image_url || ''
        let voiceUrl = post.content.voice_url || ''

        // 云存储文件需要获取临时链接
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          imageUrl = await cloudData.getTempFileURL(imageUrl)
        }
        if (voiceUrl && voiceUrl.startsWith('cloud://')) {
          voiceUrl = await cloudData.getTempFileURL(voiceUrl)
        }

        const child = cloudData.getChildInfo(post.child_id) || { nickname: '未知', avatar: '❓', color: '#999', avatarType: 'emoji' }
        const comments = await cloudData.getComments(post._id)
        const currentChild = cloudData.getCurrentChild()
        const isLiked = currentChild && (post.likes || []).includes(currentChild._id)
        const isOwn = currentChild && post.child_id === currentChild._id

        const emojiStickers = (post.type === 'text') ? (post.content.emoji_stickers || []) : []

        const duration = (post.type === 'voice' && post.content.voice_duration) ? post.content.voice_duration : 0
        const voiceBubbleWidth = Math.min(480, Math.max(160, 160 + (duration / 60) * 320))

        enrichedPosts.push({
          ...post,
          content: { ...post.content, image_url: imageUrl, voice_url: voiceUrl },
          childInfo: child,
          commentCount: comments.length,
          isLiked,
          isOwn,
          emojiStickers,
          voiceBubbleWidth,
          timeText: util.formatTime(post.created_at)
        })
      }

      // 缓存评论供成就系统使用
      const allComments = []
      for (const post of posts) {
        const cs = await cloudData.getComments(post._id)
        allComments.push(...cs)
      }
      wx.setStorageSync('commentsCache', allComments)

      this.setData({ posts: enrichedPosts, loading: false })
    } catch (e) {
      console.error('加载动态失败', e)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败，下拉刷新', icon: 'none' })
    }
  },

  // 切换账户
  onTapAccount() {
    this.setData({ showAccountSwitcher: !this.data.showAccountSwitcher })
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id
    cloudData.switchChild(childId)
    this.setData({ showAccountSwitcher: false })
    this.initPage()
  },

  onCloseSwitcher() {
    this.setData({ showAccountSwitcher: false })
  },

  onCreateIdentity() {
    this.setData({ showAccountSwitcher: false })
    wx.navigateTo({ url: '/pages/create-identity/create-identity' })
  },

  // 从无身份引导页跳转创建
  onGoCreateIdentity() {
    wx.navigateTo({ url: '/pages/create-identity/create-identity' })
  },

  onEditIdentity(e) {
    const childId = e.currentTarget.dataset.id
    this.setData({ showAccountSwitcher: false })
    wx.navigateTo({ url: `/pages/create-identity/create-identity?id=${childId}` })
  },

  // 点赞/取消点赞
  async onTapLike(e) {
    const postId = e.currentTarget.dataset.id
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return

    const wasLiked = this.data.posts.find(p => p._id === postId).isLiked

    try {
      const updatedPost = await cloudData.toggleLike(postId, currentChild._id)

      if (!wasLiked && updatedPost.child_id !== currentChild._id) {
        await cloudData.addNotification({
          to_child_id: updatedPost.child_id,
          from_child_id: currentChild._id,
          post_id: postId,
          type: 'like'
        })
      }

      if (!wasLiked) {
        const idx = this.data.posts.findIndex(p => p._id === postId)
        const animKey = `posts[${idx}].likeAnim`
        this.setData({ [animKey]: true })
        setTimeout(() => { this.setData({ [animKey]: false }) }, 400)
      }

      await this.loadPosts()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onTapCreate() {
    if (this.data.parentMode) {
      wx.showToast({ title: '家长模式下不能发动态', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/post/post' })
  },

  onToggleParentMode() {
    const parentMode = !this.data.parentMode
    this.setData({ parentMode })
    if (parentMode) wx.showToast({ title: '已进入家长旁观模式', icon: 'none' })
  },

  onTapPost(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${postId}` })
  },

  onTapComment(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${postId}&scrollToComment=1` })
  },

  // 长按
  onLongPressPost(e) {
    const postId = e.currentTarget.dataset.id
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return
    const post = this.data.posts.find(p => p._id === postId)
    if (!post) return

    if (post.isOwn) {
      this._pendingDeletePostId = postId
      this.setData({ showParentModal: true, parentCode: '', parentCodeError: '' })
      return
    }

    this.setData({ showQuickReact: true, quickReactPostId: postId })
  },

  // 快速emoji回应
  async onQuickReact(e) {
    const emoji = e.currentTarget.dataset.emoji
    const postId = this.data.quickReactPostId
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild || !postId) return

    try {
      await cloudData.addComment({
        post_id: postId,
        child_id: currentChild._id,
        type: 'emoji',
        content: { text: '', emoji: emoji }
      })

      // 获取动态作者
      const posts = await cloudData.getPosts()
      const post = posts.find(p => p._id === postId)
      if (post && post.child_id !== currentChild._id) {
        await cloudData.addNotification({
          to_child_id: post.child_id,
          from_child_id: currentChild._id,
          post_id: postId,
          type: 'comment'
        })
      }

      this.setData({ showQuickReact: false, quickReactPostId: '' })
      wx.showToast({ title: emoji, icon: 'none', duration: 800 })
      await this.loadPosts()
    } catch (e) {
      wx.showToast({ title: '回应失败', icon: 'none' })
    }
  },

  onCloseQuickReact() {
    this.setData({ showQuickReact: false, quickReactPostId: '' })
  },

  // 家长验证码
  _pendingDeletePostId: '',

  onParentCodeInput(e) {
    this.setData({ parentCode: e.detail.value, parentCodeError: '' })
  },

  async onConfirmParentCode() {
    const savedCode = wx.getStorageSync('parentCode') || '1234'
    if (this.data.parentCode === savedCode) {
      this.setData({ showParentModal: false })
      if (this._pendingDeletePostId) {
        const postId = this._pendingDeletePostId
        this._pendingDeletePostId = ''

        wx.showModal({
          title: '删除动态',
          content: '确定要删除这条动态吗？',
          confirmColor: '#FF6B6B',
          success: async (res) => {
            if (res.confirm) {
              try {
                await cloudData.deletePost(postId)
                wx.showToast({ title: '已删除', icon: 'success' })
                await this.loadPosts()
              } catch (e) {
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            }
          }
        })
      }
    } else {
      this.setData({ parentCodeError: '验证码不正确' })
    }
  },

  onCancelParentCode() {
    this.setData({ showParentModal: false })
    this._pendingDeletePostId = ''
  },

  // 播放语音
  _playingVoiceId: '',
  _audioContext: null,

  onTapVoice(e) {
    const voiceUrl = e.currentTarget.dataset.url
    const postId = e.currentTarget.dataset.id
    if (!voiceUrl) return

    if (this._audioContext) {
      this._audioContext.stop()
      this._audioContext.destroy()
    }

    if (this._playingVoiceId) {
      const oldIdx = this.data.posts.findIndex(p => p._id === this._playingVoiceId)
      if (oldIdx > -1) this.setData({ [`posts[${oldIdx}].isPlaying`]: false })
    }

    const idx = this.data.posts.findIndex(p => p._id === postId)
    if (idx > -1) this.setData({ [`posts[${idx}].isPlaying`]: true })
    this._playingVoiceId = postId

    const audio = wx.createInnerAudioContext()
    audio.src = voiceUrl
    this._audioContext = audio

    audio.onEnded(() => {
      const i = this.data.posts.findIndex(p => p._id === postId)
      if (i > -1) this.setData({ [`posts[${i}].isPlaying`]: false })
      this._playingVoiceId = ''
    })

    audio.onError(() => {
      const i = this.data.posts.findIndex(p => p._id === postId)
      if (i > -1) this.setData({ [`posts[${i}].isPlaying`]: false })
      this._playingVoiceId = ''
      wx.showToast({ title: '播放失败', icon: 'none' })
    })

    audio.play()
  }
})
