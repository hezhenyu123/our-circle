// pages/mine/mine.js - 个人主页
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

Page({
  _pendingDeletePostId: '',

  data: {
    currentChild: null,
    myPosts: [],
    postCount: 0,
    totalLikes: 0,
    achievements: [],
    unlockedCount: 0,
    totalAchievements: 0,
    showAllAchievements: false,
    showParentModal: false,
    parentCode: '',
    parentCodeError: ''
  },

  onShow() {
    this.initPage()
  },

  async initPage() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) {
      wx.navigateTo({ url: '/pages/create-identity/create-identity' })
      return
    }
    await this.loadProfile()
  },

  async loadProfile() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return

    try {
      const allPosts = await cloudData.getPosts()
      // 缓存供成就系统使用
      wx.setStorageSync('postsCache', allPosts)

      const myPosts = []
      for (const post of allPosts.filter(p => p.child_id === currentChild._id)) {
        const comments = await cloudData.getComments(post._id)
        // 获取图片临时链接
        let imageUrl = post.content.image_url || ''
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          imageUrl = await cloudData.getTempFileURL(imageUrl)
        }
        myPosts.push({
          ...post,
          content: { ...post.content, image_url: imageUrl },
          commentCount: comments.length,
          isLiked: currentChild && (post.likes || []).includes(currentChild._id),
          timeText: util.formatTime(post.created_at)
        })
      }

      const totalLikes = myPosts.reduce((sum, p) => sum + (p.likes ? p.likes.length : 0), 0)
      const achievements = app.getAchievements(currentChild._id)
      const unlockedCount = achievements.filter(a => a.unlocked).length

      this.setData({
        currentChild,
        myPosts,
        postCount: myPosts.length,
        totalLikes,
        achievements,
        unlockedCount,
        totalAchievements: achievements.length
      })
    } catch (e) {
      console.error('加载个人主页失败', e)
    }
  },

  onToggleAchievements() {
    this.setData({ showAllAchievements: !this.data.showAllAchievements })
  },

  onTapPost(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onLongPressPost(e) {
    this._pendingDeletePostId = e.currentTarget.dataset.id
    this.setData({ showParentModal: true, parentCode: '', parentCodeError: '' })
  },

  async onTapLike(e) {
    const postId = e.currentTarget.dataset.id
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) return
    await cloudData.toggleLike(postId, currentChild._id)
    await this.loadProfile()
  },

  onSwitchIdentity() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onCreateIdentity() {
    wx.navigateTo({ url: '/pages/create-identity/create-identity' })
  },

  onResetData() {
    this.setData({ showParentModal: true, parentCode: '', parentCodeError: '' })
  },

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
                await this.loadProfile()
              } catch (e) {
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            }
          }
        })
        return
      }

      // 重置数据
      wx.showModal({
        title: '重置数据',
        content: '将清除所有数据恢复初始状态，确定吗？',
        confirmColor: '#FF6B6B',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 删除云端所有数据
              const posts = await cloudData.getPosts()
              for (const p of posts) {
                await cloudData.deletePost(p._id)
              }
              const children = cloudData.getChildren()
              for (const c of children) {
                await cloudData.deleteChild(c._id)
              }
              // 清除本地缓存
              const code = wx.getStorageSync('parentCode')
              wx.removeStorageSync('childrenCache')
              wx.removeStorageSync('postsCache')
              wx.removeStorageSync('commentsCache')
              wx.removeStorageSync('currentChildId')
              if (code) wx.setStorageSync('parentCode', code)

              wx.showToast({ title: '已重置', icon: 'success' })
              setTimeout(() => { this.initPage() }, 1000)
            } catch (e) {
              wx.showToast({ title: '重置失败', icon: 'none' })
            }
          }
        }
      })
    } else {
      this.setData({ parentCodeError: '验证码不正确' })
    }
  },

  onCancelParentCode() {
    this.setData({ showParentModal: false })
  }
})
