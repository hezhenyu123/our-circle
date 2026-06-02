// pages/message/message.js - 消息通知页
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

Page({
  data: {
    notifications: [],
    currentChild: null
  },

  onShow() {
    // 立即清除红点，不等异步操作
    wx.removeTabBarBadge({ index: 1 })
    wx.setStorageSync('lastNotificationSeenTime', Date.now())
    this.loadNotifications()
  },

  async loadNotifications() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) {
      this.setData({ notifications: [], currentChild: null })
      return
    }

    try {
      let notifications = await cloudData.getNotifications(currentChild._id)

      // 附加触发者信息
      notifications = notifications.map(n => {
        const fromChild = cloudData.getChildInfo(n.from_child_id) || { nickname: '未知', avatar: '❓', color: '#999' }
        return {
          ...n,
          fromChild,
          timeText: util.formatTime(n.created_at),
          desc: n.type === 'like' ? '给你点了❤️' : n.type === 'new_post' ? '发了一条新动态' : '评论了你的动态'
        }
      })

      this.setData({ notifications, currentChild })

      // 标记已读（后台执行，不阻塞UI）
      cloudData.markNotificationsRead(currentChild._id).catch(e => {
        console.error('标记已读失败', e)
      })
    } catch (e) {
      console.error('加载通知失败', e)
    }
  },

  onTapNotification(e) {
    const postId = e.currentTarget.dataset.id
    if (!postId) return
    wx.navigateTo({ url: `/pages/detail/detail?id=${postId}` })
  },

  onGoCreate() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
