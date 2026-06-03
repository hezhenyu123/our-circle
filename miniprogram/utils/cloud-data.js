// utils/cloud-data.js - 云开发数据层
// 统一封装云数据库操作，替代 localStorage

let _db = null
let _cmd = null

function getDb() {
  if (!_db) {
    _db = wx.cloud.database()
    _cmd = _db.command
  }
  return _db
}

function getCmd() {
  if (!_cmd) {
    getDb()
  }
  return _cmd
}

// ============ 身份管理 ============

/**
 * 获取当前孩子信息
 */
function getCurrentChild() {
  const currentChildId = wx.getStorageSync('currentChildId')
  if (!currentChildId) return null
  // 从本地缓存取（缓存由 syncChildren 维护）
  const children = wx.getStorageSync('childrenCache') || []
  return children.find(c => c._id === currentChildId) || null
}

/**
 * 获取所有孩子（当前用户的）
 */
function getChildren() {
  return wx.getStorageSync('childrenCache') || []
}

/**
 * 从云端同步孩子列表到本地缓存
 */
async function syncChildren() {
  const { data } = await getDb().collection('children').orderBy('createdAt', 'asc').get()
  wx.setStorageSync('childrenCache', data)
  return data
}

/**
 * 切换账户
 */
function switchChild(childId) {
  wx.setStorageSync('currentChildId', childId)
}

/**
 * 创建新身份
 */
async function createChild(childData) {
  const newChild = {
    nickname: childData.nickname,
    avatar: childData.avatarType === 'emoji' ? childData.avatar : '',
    avatarType: childData.avatarType || 'emoji',
    avatarImageUrl: childData.avatarImageUrl || '',
    grade: childData.grade,
    color: childData.color,
    createdAt: getDb().serverDate()
  }

  const { _id } = await getDb().collection('children').add({ data: newChild })
  newChild._id = _id

  // 更新本地缓存
  const children = wx.getStorageSync('childrenCache') || []
  children.push({ ...newChild, _id })
  wx.setStorageSync('childrenCache', children)

  return { ...newChild, _id }
}

/**
 * 更新身份信息
 */
async function updateChild(childId, data) {
  const updateData = {
    nickname: data.nickname,
    avatar: data.avatarType === 'emoji' ? data.avatar : '',
    avatarType: data.avatarType,
    avatarImageUrl: data.avatarImageUrl || '',
    grade: data.grade,
    color: data.color,
    updatedAt: getDb().serverDate()
  }

  await getDb().collection('children').doc(childId).update({ data: updateData })

  // 更新本地缓存
  const children = wx.getStorageSync('childrenCache') || []
  const child = children.find(c => c._id === childId)
  if (child) {
    Object.assign(child, updateData)
    wx.setStorageSync('childrenCache', children)
  }

  return { ...child, ...updateData }
}

/**
 * 删除身份
 */
async function deleteChild(childId) {
  await getDb().collection('children').doc(childId).remove()

  // 更新本地缓存
  let children = wx.getStorageSync('childrenCache') || []
  children = children.filter(c => c._id !== childId)
  wx.setStorageSync('childrenCache', children)

  const currentChildId = wx.getStorageSync('currentChildId')
  if (currentChildId === childId && children.length > 0) {
    wx.setStorageSync('currentChildId', children[0]._id)
  }
}

// ============ 动态管理 ============

/**
 * 获取单条动态
 */
async function getPostById(postId) {
  const { data } = await getDb().collection('posts').doc(postId).get()
  return data
}

/**
 * 获取动态列表
 */
async function getPosts(skip = 0, limit = 20) {
  const { data } = await getDb().collection('posts')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(limit)
    .get()
  return data
}

/**
 * 添加动态
 */
async function addPost(post) {
  const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 6)

  let imageUrl = post.content.image_url || ''
  let voiceUrl = post.content.voice_url || ''

  if (imageUrl && !imageUrl.startsWith('cloud://')) {
    imageUrl = await uploadFile(imageUrl, `posts/images/${fileId}`)
  }
  if (voiceUrl && !voiceUrl.startsWith('cloud://')) {
    voiceUrl = await uploadFile(voiceUrl, `posts/voices/${fileId}`)
  }

  const postData = {
    child_id: post.child_id,
    type: post.type,
    content: {
      ...post.content,
      image_url: imageUrl,
      voice_url: voiceUrl
    },
    likes: [],
    created_at: getDb().serverDate()
  }

  const { _id } = await getDb().collection('posts').add({ data: postData })
  return { ...postData, _id, created_at: Date.now() }
}

/**
 * 删除动态
 */
async function deletePost(postId) {
  const result = await wx.cloud.callFunction({
    name: 'delete-post',
    data: { postId }
  })
  const cloudResult = result && result.result ? result.result : null
  if (!cloudResult || cloudResult.code !== 0) {
    throw new Error(cloudResult && cloudResult.message ? cloudResult.message : '删除动态失败')
  }
}

/**
 * 切换点赞
 */
async function toggleLike(postId, childId) {
  const { data: post } = await getDb().collection('posts').doc(postId).get()

  const likes = post.likes || []
  const index = likes.indexOf(childId)

  if (index > -1) {
    likes.splice(index, 1)
  } else {
    likes.push(childId)
  }

  await getDb().collection('posts').doc(postId).update({
    data: { likes }
  })

  return { ...post, likes }
}

// ============ 评论管理 ============

/**
 * 添加评论
 */
async function addComment(comment) {
  const commentData = {
    post_id: comment.post_id,
    child_id: comment.child_id,
    type: comment.type,
    content: comment.content,
    created_at: getDb().serverDate()
  }

  const { _id } = await getDb().collection('comments').add({ data: commentData })
  return { ...commentData, _id, created_at: Date.now() }
}

/**
 * 获取某条动态的评论
 */
async function getComments(postId) {
  const { data } = await getDb().collection('comments')
    .where({ post_id: postId })
    .orderBy('created_at', 'asc')
    .get()
  return data
}

// ============ 通知管理 ============

/**
 * 添加通知
 */
async function addNotification(notification) {
  const notifData = {
    to_child_id: notification.to_child_id,
    from_child_id: notification.from_child_id,
    post_id: notification.post_id,
    type: notification.type,
    read: false,
    created_at: getDb().serverDate()
  }

  const { _id } = await getDb().collection('notifications').add({ data: notifData })
  return { ...notifData, _id }
}

/**
 * 获取通知
 */
async function getNotifications(childId) {
  const { data } = await getDb().collection('notifications')
    .where({ to_child_id: childId })
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()
  return data
}

/**
 * 标记通知已读
 */
async function markNotificationsRead(childId) {
  const { data } = await getDb().collection('notifications')
    .where({
      to_child_id: childId,
      read: false
    })
    .get()

  if (data.length === 0) return
  const tasks = data.map(n =>
    getDb().collection('notifications').doc(n._id).update({
      data: { read: true }
    }).catch(e => {
      console.error('标记通知已读失败', n._id, e)
    })
  )
  await Promise.all(tasks)
}

/**
 * 标记单条通知已读
 */
async function markNotificationRead(notificationId) {
  if (!notificationId) return
  await getDb().collection('notifications').doc(notificationId).update({
    data: { read: true }
  })
}

// ============ 文件上传 ============

/**
 * 上传文件到云存储
 */
async function uploadFile(filePath, cloudPath) {
  if (!filePath || filePath.startsWith('cloud://')) return filePath

  try {
    const { fileID } = await wx.cloud.uploadFile({
      cloudPath: cloudPath + '_' + Date.now(),
      filePath: filePath
    })
    return fileID
  } catch (e) {
    console.error('文件上传失败', e)
    return filePath // 上传失败返回原路径
  }
}

/**
 * 获取文件的临时链接
 */
async function getTempFileURL(fileID) {
  if (!fileID || !fileID.startsWith('cloud://')) return fileID
  try {
    const { fileList } = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    return fileList[0].tempFileURL || fileID
  } catch (e) {
    return fileID
  }
}

// ============ 辅助函数 ============


/**
 * 获取孩子信息（从缓存）
 */
function getChildInfo(childId) {
  const children = wx.getStorageSync('childrenCache') || []
  return children.find(c => c._id === childId)
}

/**
 * 初始化：确保有 currentChildId
 */
async function ensureCurrentChild() {
  let currentChildId = wx.getStorageSync('currentChildId')
  const children = await syncChildren()

  if (!currentChildId || !children.find(c => c._id === currentChildId)) {
    if (children.length > 0) {
      currentChildId = children[0]._id
      wx.setStorageSync('currentChildId', currentChildId)
    }
  }

  return currentChildId
}

/**
 * 初始化假数据到云数据库（仅首次）
 */
async function initMockDataToCloud() {
  if (wx.getStorageSync('cloudDataInitialized')) return

  const children = [
    {
      nickname: '豆豆',
      avatar: '🐰',
      grade: 1,
      color: '#4ECDC4',
      avatarType: 'emoji',
      avatarImageUrl: ''
    },
    {
      nickname: '小禾',
      avatar: '🦁',
      grade: 4,
      color: '#FF6B6B',
      avatarType: 'emoji',
      avatarImageUrl: ''
    },
    {
      nickname: '姐姐',
      avatar: '🦋',
      grade: 3,
      color: '#9B59B6',
      avatarType: 'emoji',
      avatarImageUrl: ''
    }
  ]

  // 创建身份
  const createdChildren = []
  for (const child of children) {
    const result = await createChild(child)
    createdChildren.push(result)
  }

  // 创建模拟动态
  const mockPosts = [
    {
      child_id: createdChildren[1]._id,
      type: 'photo',
      content: {
        text: '花了3个小时拼好的！',
        image_url: '',
        voice_url: '',
        voice_duration: 0,
        mood_emoji: '😎',
        emoji_stickers: []
      },
      likes: [createdChildren[0]._id, createdChildren[2]._id],
      created_at: Date.now() - 2 * 60 * 60 * 1000
    },
    {
      child_id: createdChildren[0]._id,
      type: 'voice',
      content: {
        text: '今天跳绳连跳20个！',
        image_url: '',
        voice_url: '',
        voice_duration: 5,
        mood_emoji: '',
        emoji_stickers: []
      },
      likes: [createdChildren[1]._id],
      created_at: Date.now() - 60 * 60 * 1000
    },
    {
      child_id: createdChildren[2]._id,
      type: 'drawing',
      content: {
        text: '',
        image_url: '',
        voice_url: '',
        voice_duration: 3,
        mood_emoji: '',
        emoji_stickers: []
      },
      likes: [createdChildren[0]._id, createdChildren[1]._id, createdChildren[2]._id],
      created_at: Date.now() - 24 * 60 * 60 * 1000
    }
  ]

  for (const post of mockPosts) {
    await getDb().collection('posts').add({ data: post })
  }

  wx.setStorageSync('cloudDataInitialized', true)
  return createdChildren
}

module.exports = {
  getCurrentChild,
  getChildren,
  syncChildren,
  switchChild,
  createChild,
  updateChild,
  deleteChild,
  getPosts,
  addPost,
  getPostById,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  addNotification,
  getNotifications,
  markNotificationsRead,
  markNotificationRead,
  uploadFile,
  getTempFileURL,
  getChildInfo,
  ensureCurrentChild,
  initMockDataToCloud
}
