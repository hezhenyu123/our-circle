// pages/message/message.js - 消息通知页
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

function getReadNotificationStorageKey(childId) {
  return `readNotificationIds_${childId}`
}

function getLocalReadNotificationIds(childId) {
  if (!childId) return []
  return wx.getStorageSync(getReadNotificationStorageKey(childId)) || []
}

function saveLocalReadNotificationId(childId, notificationId) {
  if (!childId || !notificationId) return
  const currentIds = getLocalReadNotificationIds(childId)
  if (currentIds.includes(notificationId)) return
  wx.setStorageSync(getReadNotificationStorageKey(childId), currentIds.concat(notificationId))
}

Page({
  data: {
    notifications: [],
    currentChild: null
  },

  onShow() {
    this.loadNotifications()
  },

  updateTabBadge(notifications = this.data.notifications) {
    const unreadCount = notifications.filter(item => !item.read).length
    if (unreadCount > 0) {
      wx.setTabBarBadge({ index: 1, text: String(unreadCount) })
      return
    }
    wx.removeTabBarBadge({ index: 1 })
  },

  async loadNotifications() {
    const currentChild = cloudData.getCurrentChild()
    if (!currentChild) {
      this.setData({ notifications: [], currentChild: null })
      wx.removeTabBarBadge({ index: 1 })
      return
    }

    try {
      let notifications = await cloudData.getNotifications(currentChild._id)
      const localReadIds = getLocalReadNotificationIds(currentChild._id)

      // 附加触发者信息
      notifications = notifications.map(n => {
        const fromChild = cloudData.getChildInfo(n.from_child_id) || { nickname: '未知', avatar: '❓', color: '#999' }
        return {
          ...n,
          read: n.read || localReadIds.includes(n._id),
          fromChild,
          timeText: util.formatTime(n.created_at),
          desc: n.type === 'like' ? '给你点了❤️' : n.type === 'new_post' ? '发了一条新动态' : '评论了你的动态'
        }
      })

      this.setData({ notifications, currentChild })
      this.updateTabBadge(notifications)
    } catch (e) {
      console.error('加载通知失败', e)
    }
  },

  onTapNotification(e) {
    const postId = e.currentTarget.dataset.id
    const notificationId = e.currentTarget.dataset.notificationId
    if (!postId) return

    const index = this.data.notifications.findIndex(item => item._id === notificationId)
    if (index !== -1 && !this.data.notifications[index].read) {
      const notifications = this.data.notifications.slice()
      notifications[index] = {
        ...notifications[index],
        read: true
      }
      saveLocalReadNotificationId(this.data.currentChild && this.data.currentChild._id, notificationId)
      this.setData({ notifications })
      this.updateTabBadge(notifications)

      cloudData.markNotificationRead(notificationId).catch(err => {
        console.error('标记单条通知已读失败', err)
      })
    }

    wx.navigateTo({ url: `/pages/detail/detail?id=${postId}` })
  },

  onGoCreate() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
