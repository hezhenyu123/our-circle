// pages/create-identity/create-identity.js - 创建/编辑身份
const app = getApp()
const util = require('../../utils/util.js')
const cloudData = require('../../utils/cloud-data.js')

Page({
  data: {
    mode: 'create',
    editChildId: '',
    nickname: '',
    grade: 1,
    avatar: '🐰',
    avatarType: 'emoji',
    avatarImageUrl: '',
    color: '#4ECDC4',
    avatarOptions: ['🐰', '🦁', '🦋', '🐱', '🐶', '🦊', '🐻', '🐼', '🐸', '🦄', '🐧', '🐙'],
    gradeOptions: [1, 2, 3, 4, 5, 6],
    colorOptions: [
      { color: '#4ECDC4', name: '青' },
      { color: '#FF6B6B', name: '红' },
      { color: '#9B59B6', name: '紫' },
      { color: '#45B7D1', name: '蓝' },
      { color: '#F39C12', name: '橙' },
      { color: '#2ECC71', name: '绿' },
      { color: '#E91E63', name: '粉' },
      { color: '#FF8C00', name: '橘' }
    ],
    canSubmit: false
  },

  onLoad(options) {
    if (options.id) {
      const children = cloudData.getChildren()
      const child = children.find(c => c._id === options.id)
      if (child) {
        this.setData({
          mode: 'edit',
          editChildId: options.id,
          nickname: child.nickname,
          grade: child.grade,
          avatar: child.avatarType === 'image' ? '🐰' : child.avatar,
          avatarType: child.avatarType || 'emoji',
          avatarImageUrl: child.avatarImageUrl || '',
          color: child.color,
          canSubmit: true
        })
        wx.setNavigationBarTitle({ title: '编辑身份' })
      }
    }
  },

  onNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({ nickname, canSubmit: nickname.trim().length > 0 })
  },

  onSelectAvatar(e) {
    this.setData({ avatar: e.currentTarget.dataset.avatar, avatarType: 'emoji', avatarImageUrl: '' })
  },

  // 自定义头像
  onChooseCustomAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.processCustomAvatar(res.tempFiles[0].tempFilePath)
      }
    })
  },

  processCustomAvatar(filePath) {
    const fs = wx.getFileSystemManager()
    const fileName = 'avatar_' + Date.now() + '.jpg'
    const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`

    try {
      fs.saveFile({
        tempFilePath: filePath,
        filePath: savedPath,
        success: () => { this.cropCircleAvatar(savedPath) },
        fail: () => { this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' }) }
      })
    } catch (e) {
      this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' })
    }
  },

  cropCircleAvatar(filePath) {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const size = Math.min(info.width, info.height)
        const sysInfo = wx.getSystemInfoSync()

        const query = this.createSelectorQuery()
        query.select('#avatarCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res[0]) {
              this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' })
              return
            }
            const canvas = res[0].node
            const ctx = canvas.getContext('2d')
            const dpr = sysInfo.pixelRatio

            canvas.width = 200 * dpr
            canvas.height = 200 * dpr
            ctx.scale(dpr, dpr)

            const img = canvas.createImage()
            img.src = filePath
            img.onload = () => {
              ctx.clearRect(0, 0, 200, 200)
              ctx.save()
              ctx.beginPath()
              ctx.arc(100, 100, 100, 0, Math.PI * 2)
              ctx.clip()

              const sx = (info.width - size) / 2
              const sy = (info.height - size) / 2
              ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200)
              ctx.restore()

              wx.canvasToTempFilePath({
                canvas,
                success: (canvasRes) => {
                  const cropFileName = 'avatar_crop_' + Date.now() + '.png'
                  const cropSavedPath = `${wx.env.USER_DATA_PATH}/${cropFileName}`
                  try {
                    const fs = wx.getFileSystemManager()
                    fs.saveFile({
                      tempFilePath: canvasRes.tempFilePath,
                      filePath: cropSavedPath,
                      success: () => { this.setData({ avatarType: 'image', avatarImageUrl: cropSavedPath, avatar: '' }) },
                      fail: () => { this.setData({ avatarType: 'image', avatarImageUrl: canvasRes.tempFilePath, avatar: '' }) }
                    })
                  } catch (e) {
                    this.setData({ avatarType: 'image', avatarImageUrl: canvasRes.tempFilePath, avatar: '' })
                  }
                },
                fail: () => { this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' }) }
              })
            }
            img.onerror = () => { this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' }) }
          })
      },
      fail: () => { this.setData({ avatarType: 'image', avatarImageUrl: filePath, avatar: '' }) }
    })
  },

  onSelectGrade(e) { this.setData({ grade: e.currentTarget.dataset.grade }) },
  onSelectColor(e) { this.setData({ color: e.currentTarget.dataset.color }) },

  async onSubmit() {
    if (!this.data.canSubmit) return

    const childData = {
      nickname: this.data.nickname.trim(),
      avatar: this.data.avatarType === 'emoji' ? this.data.avatar : '',
      avatarType: this.data.avatarType,
      avatarImageUrl: this.data.avatarImageUrl,
      grade: this.data.grade,
      color: this.data.color
    }

    try {
      if (this.data.mode === 'edit') {
        await cloudData.updateChild(this.data.editChildId, childData)
        wx.showToast({ title: '保存成功！', icon: 'success' })
      } else {
        const child = await cloudData.createChild(childData)
        cloudData.switchChild(child._id)
        wx.showToast({ title: '创建成功！', icon: 'success' })
      }

      setTimeout(() => { wx.navigateBack() }, 1000)
    } catch (e) {
      console.error('保存身份失败', e)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  async onDelete() {
    const children = cloudData.getChildren()
    if (children.length <= 1) {
      wx.showToast({ title: '至少保留一个身份', icon: 'none' })
      return
    }

    wx.showModal({
      title: '删除身份',
      content: `确定要删除「${this.data.nickname}」吗？所有相关动态、评论和文件都会被删除。`,
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'delete-identity',
              data: { childId: this.data.editChildId }
            })
            const cloudResult = result && result.result ? result.result : null
            if (!cloudResult || cloudResult.code !== 0) {
              throw new Error(cloudResult && cloudResult.message ? cloudResult.message : '云函数执行失败')
            }

            let children = wx.getStorageSync('childrenCache') || []
            const child = children.find(c => c._id === this.data.editChildId)
            children = children.filter(c => c._id !== this.data.editChildId)
            wx.setStorageSync('childrenCache', children)

            const currentChildId = wx.getStorageSync('currentChildId')
            if (currentChildId === this.data.editChildId) {
              if (children.length > 0) {
                wx.setStorageSync('currentChildId', children[0]._id)
              } else {
                wx.removeStorageSync('currentChildId')
              }
            }

            wx.removeStorageSync('postsCache')
            wx.removeStorageSync('commentsCache')

            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => { wx.navigateBack() }, 1000)
          } catch (e) {
            console.error('删除身份失败', e)
            wx.showModal({
              title: '删除失败',
              content: (e && e.message) ? e.message : '请查看控制台日志',
              showCancel: false
            })
          }
        }
      }
    })
  }
})
