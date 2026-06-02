// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: 'our-circle-d9gt0jxep2588303b',
      traceUser: true
    })

    // 云开发初始化完成
    this.cloudReady = true

    // 设置当前账户
    const currentChildId = wx.getStorageSync('currentChildId')
    if (!currentChildId) {
      const children = wx.getStorageSync('childrenCache') || []
      if (children.length > 0) {
        wx.setStorageSync('currentChildId', children[0]._id)
      }
    }
  },

  // ============ 同步版（本地缓存，用于快速读取） ============

  // 获取当前孩子信息
  getCurrentChild() {
    const currentChildId = wx.getStorageSync('currentChildId')
    const children = wx.getStorageSync('childrenCache') || []
    return children.find(c => c._id === currentChildId) || children[0]
  },

  // 获取所有孩子
  getChildren() {
    return wx.getStorageSync('childrenCache') || []
  },

  // 切换账户
  switchChild(childId) {
    wx.setStorageSync('currentChildId', childId)
  },

  // ============ 成就系统（纯计算，不需要云） ============

  getAchievements(childId) {
    // 成就计算仍然基于同步数据，各页面 loadPosts 后已缓存
    const posts = wx.getStorageSync('postsCache') || []
    const comments = wx.getStorageSync('commentsCache') || []
    const myPosts = posts.filter(p => p.child_id === childId)
    const myComments = comments.filter(c => c.child_id === childId)
    const totalLikesReceived = myPosts.reduce((sum, p) => sum + (p.likes ? p.likes.length : 0), 0)

    const voicePosts = myPosts.filter(p => p.type === 'voice').length
    const textPosts = myPosts.filter(p => p.type === 'text').length
    const photoPosts = myPosts.filter(p => p.type === 'photo').length
    const drawingPosts = myPosts.filter(p => p.type === 'drawing').length

    const achievements = [
      { id: 'first_post', emoji: '🌟', name: '初来乍到', desc: '发布第一条动态', unlocked: myPosts.length >= 1, progress: Math.min(myPosts.length, 1), target: 1 },
      { id: 'chatterbox', emoji: '🎤', name: '话匣子', desc: '发3条语音动态', unlocked: voicePosts >= 3, progress: Math.min(voicePosts, 3), target: 3 },
      { id: 'writer', emoji: '✏️', name: '小作家', desc: '发3条文字动态', unlocked: textPosts >= 3, progress: Math.min(textPosts, 3), target: 3 },
      { id: 'photographer', emoji: '📸', name: '小摄影师', desc: '发3张照片', unlocked: photoPosts >= 3, progress: Math.min(photoPosts, 3), target: 3 },
      { id: 'artist', emoji: '🎨', name: '小画家', desc: '画3幅画', unlocked: drawingPosts >= 3, progress: Math.min(drawingPosts, 3), target: 3 },
      { id: 'popular', emoji: '❤️', name: '人气王', desc: '累计收到5个赞', unlocked: totalLikesReceived >= 5, progress: Math.min(totalLikesReceived, 5), target: 5 },
      { id: 'social', emoji: '💬', name: '社交达人', desc: '评论5次', unlocked: myComments.length >= 5, progress: Math.min(myComments.length, 5), target: 5 },
      { id: 'explorer', emoji: '🧭', name: '探索者', desc: '尝试3种发动态方式', unlocked: [voicePosts > 0, textPosts > 0, photoPosts > 0, drawingPosts > 0].filter(Boolean).length >= 3, progress: Math.min([voicePosts > 0, textPosts > 0, photoPosts > 0, drawingPosts > 0].filter(Boolean).length, 3), target: 3 },
      { id: 'prolific', emoji: '🏅', name: '高产创作者', desc: '发布10条动态', unlocked: myPosts.length >= 10, progress: Math.min(myPosts.length, 10), target: 10 },
      { id: 'super_star', emoji: '⭐', name: '超级明星', desc: '累计收到20个赞', unlocked: totalLikesReceived >= 20, progress: Math.min(totalLikesReceived, 20), target: 20 }
    ]

    return achievements
  },

  getUnlockedAchievementCount(childId) {
    return this.getAchievements(childId).filter(a => a.unlocked).length
  },

  globalData: {
    emojiMap: {
      '跳绳': '🤸', '跑步': '🏃', '游泳': '🏊', '画画': '🎨', '唱歌': '🎤',
      '跳舞': '💃', '乐高': '🧱', '积木': '🧱', '读书': '📚', '写字': '✏️',
      '吃饭': '🍚', '睡觉': '😴', '开心': '😄', '难过': '😢', '生气': '😡',
      '害怕': '😨', '学校': '🏫', '老师': '👩‍🏫', '朋友': '👫', '游戏': '🎮',
      '玩具': '🧸', '猫': '🐱', '狗': '🐶', '太阳': '☀️', '下雨': '🌧️',
      '花': '🌸', '冰淇淋': '🍦', '蛋糕': '🎂', '苹果': '🍎', '妈妈': '👩',
      '爸爸': '👨', '哥哥': '👦', '姐姐': '👧', '弟弟': '👶', '妹妹': '👶',
      '彩虹': '🌈', '星星': '⭐', '月亮': '🌙', '雪': '❄️', '生日': '🎂',
      '礼物': '🎁', '飞机': '✈️', '恐龙': '🦕', '公主': '👸', '城堡': '🏰',
      '足球': '⚽', '篮球': '🏀'
    }
  }
})
