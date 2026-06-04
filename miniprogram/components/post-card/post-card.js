// components/post-card/post-card.js
Component({
  options: {
    addGlobalClass: true,
    multipleSlots: false
  },

  properties: {
    post: { type: Object, value: {} },
    showActions: { type: Boolean, value: true },
    tintIndex: { type: Number, value: -1 }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { post: this.data.post })
    },
    onLongPress() {
      this.triggerEvent('longpress', { post: this.data.post })
    },
    onLike() {
      this.triggerEvent('like', { post: this.data.post })
    },
    onComment() {
      this.triggerEvent('comment', { post: this.data.post })
    }
  }
})
