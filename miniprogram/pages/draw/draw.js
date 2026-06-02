// pages/draw/draw.js - 画板页面
const app = getApp()
const util = require("../../utils/util.js")

Page({
  data: {
    // 画笔颜色
    colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C00", "#333333"],
    currentColor: "#FF6B6B",
    // 画笔粗细
    sizes: [3, 6, 10, 16],
    currentSize: 6,
    sizeLabels: ["细", "中", "粗", "超粗"],
    currentSizeIndex: 1,
    // 橡皮擦
    isEraser: false,
    // 操作
    canUndo: false,
    canRedo: false,
    // 画布上下文
    canvasWidth: 0,
    canvasHeight: 0
  },

  // 历史记录
  history: [],
  historyIndex: -1,

  onLoad() {
    this.initCanvas()
  },

  initCanvas() {
    const sysInfo = wx.getSystemInfoSync()
    const canvasWidth = sysInfo.windowWidth
    const canvasHeight = sysInfo.windowHeight - 100 // 减去工具栏高度

    this.setData({ canvasWidth, canvasHeight })

    const query = wx.createSelectorQuery()
    query.select("#drawCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext("2d")
        const dpr = sysInfo.pixelRatio

        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        // 白色背景
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        this.canvas = canvas
        this.ctx = ctx

        // 保存初始状态
        this.saveHistory()
      })
  },

  // 触摸绘制
  onTouchStart(e) {
    if (!this.ctx) return
    const touch = e.touches[0]
    this.ctx.beginPath()
    this.ctx.moveTo(touch.x, touch.y)
    this.lastX = touch.x
    this.lastY = touch.y
    this.isDrawing = true
  },

  onTouchMove(e) {
    if (!this.ctx || !this.isDrawing) return
    const touch = e.touches[0]
    const ctx = this.ctx

    ctx.lineWidth = this.data.isEraser ? this.data.currentSize * 3 : this.data.currentSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = this.data.isEraser ? "#FFFFFF" : this.data.currentColor

    ctx.lineTo(touch.x, touch.y)
    ctx.stroke()

    this.lastX = touch.x
    this.lastY = touch.y
  },

  onTouchEnd() {
    if (!this.isDrawing) return
    this.isDrawing = false
    this.saveHistory()
  },

  // 保存历史
  saveHistory() {
    if (!this.canvas) return
    const imageData = this.canvas.toDataURL("image/png")
    // 截掉历史指针之后的记录
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(imageData)
    this.historyIndex = this.history.length - 1

    this.setData({
      canUndo: this.historyIndex > 0,
      canRedo: false
    })
  },

  // 撤销
  onUndo() {
    if (this.historyIndex <= 0) return
    this.historyIndex--
    this.restoreFromHistory()
  },

  // 重做
  onRedo() {
    if (this.historyIndex >= this.history.length - 1) return
    this.historyIndex++
    this.restoreFromHistory()
  },

  restoreFromHistory() {
    const img = this.canvas.createImage()
    img.src = this.history[this.historyIndex]
    img.onload = () => {
      this.ctx.fillStyle = "#FFFFFF"
      this.ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      this.ctx.drawImage(img, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
    }

    this.setData({
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1
    })
  },

  // 选择颜色
  onSelectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      currentColor: color,
      isEraser: false
    })
  },

  // 选择粗细
  onSelectSize(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentSizeIndex: index,
      currentSize: this.data.sizes[index],
      isEraser: false
    })
  },

  // 橡皮擦
  onToggleEraser() {
    this.setData({ isEraser: !this.data.isEraser })
  },

  // 清空画布
  onClear() {
    wx.showModal({
      title: "清空画布",
      content: "确定要清空吗？会丢失所有内容",
      confirmColor: "#FF6B6B",
      success: (res) => {
        if (res.confirm) {
          this.ctx.fillStyle = "#FFFFFF"
          this.ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
          this.saveHistory()
        }
      }
    })
  },

  // 完成并发送
  onFinish() {
    if (!this.canvas) return

    wx.showLoading({ title: "保存中..." })

    // 从canvas导出图片
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: (res) => {
        wx.hideLoading()
        // 把图片路径传回发帖页
        const pages = getCurrentPages()
        const postPage = pages[pages.length - 2]
        if (postPage && postPage.setData) {
          postPage.setData({
            drawingPath: res.tempFilePath,
            showTypeSelector: false,
            postType: "drawing"
          })
        }
        wx.navigateBack()
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: "保存失败", icon: "none" })
      }
    })
  },

  // 返回
  onBack() {
    wx.showModal({
      title: '离开画板',
      content: '还没画完，确定离开吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  }
})