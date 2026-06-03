const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { postId } = event
  if (!postId) {
    return { code: -1, message: '缺少 postId 参数' }
  }

  try {
    await db.collection('posts').doc(postId).remove()

    const comments = await db.collection('comments')
      .where({ post_id: postId })
      .limit(100)
      .get()
    await Promise.all(
      comments.data.map(c => db.collection('comments').doc(c._id).remove())
    )

    const notifs = await db.collection('notifications')
      .where({ post_id: postId })
      .limit(100)
      .get()
    await Promise.all(
      notifs.data.map(n => db.collection('notifications').doc(n._id).remove())
    )

    return { code: 0, message: 'ok' }
  } catch (error) {
    console.error('delete-post failed', error)
    return { code: -1, message: error.message || 'delete-post failed' }
  }
}
