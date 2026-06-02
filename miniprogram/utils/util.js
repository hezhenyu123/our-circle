// utils/util.js - 工具函数

/**
 * 格式化时间为友好显示
 */
function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60 * 1000) {
    return '刚刚'
  } else if (diff < 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 1000)) + '分钟前'
  } else if (diff < 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
  } else if (diff < 2 * 24 * 60 * 60 * 1000) {
    return '昨天'
  } else {
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return month + '月' + day + '日'
  }
}

/**
 * 生成唯一ID
 */
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 关键词匹配emoji贴纸
 * 从转写文字中匹配关键词，返回匹配到的emoji列表
 */
function matchEmoji(text, emojiMap) {
  if (!text) return []
  const emojis = []
  for (const keyword in emojiMap) {
    if (text.includes(keyword)) {
      emojis.push({
        keyword: keyword,
        emoji: emojiMap[keyword]
      })
    }
  }
  return emojis
}

/**
 * 获取孩子信息（从云数据缓存）
 */
function getChildInfo(childId) {
  const children = wx.getStorageSync('childrenCache') || []
  return children.find(c => c._id === childId)
}

/**
 * 语音时长格式化
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return seconds + '"'
  }
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return min + "'" + sec + '"'
}

module.exports = {
  formatTime,
  generateId,
  matchEmoji,
  getChildInfo,
  formatDuration
}
