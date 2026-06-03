const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

async function collectFileIDs(childId) {
  const fileIDs = []

  while (true) {
    const { data } = await db.collection('posts')
      .where({ child_id: childId })
      .limit(100)
      .get()
    if (!data.length) break

    for (const post of data) {
      const content = post.content || {}
      if (content.image_url && content.image_url.startsWith('cloud://')) {
        fileIDs.push(content.image_url)
      }
      if (content.voice_url && content.voice_url.startsWith('cloud://')) {
        fileIDs.push(content.voice_url)
      }
    }

    if (data.length < 100) break
  }

  return fileIDs
}

async function deleteCloudFiles(fileIDs) {
  if (!fileIDs.length) return 0

  let deleted = 0

  for (let i = 0; i < fileIDs.length; i += 50) {
    const batch = fileIDs.slice(i, i + 50)
    try {
      const { fileList } = await cloud.deleteFile({ fileList: batch })
      deleted += fileList.filter(f => f.status === 0).length
    } catch (e) {
      console.error('deleteFile batch failed', e)
    }
  }

  return deleted
}

async function deleteByChildId(collection, childId) {
  let removed = 0

  while (true) {
    const { data } = await db.collection(collection)
      .where({ child_id: childId })
      .limit(100)
      .get()
    if (!data.length) break

    await Promise.all(
      data.map(item => db.collection(collection).doc(item._id).remove())
    )
    removed += data.length

    if (data.length < 100) break
  }

  return removed
}

async function deleteNotificationsByChildId(childId) {
  let removed = 0

  while (true) {
    const { data } = await db.collection('notifications')
      .where(_.or([
        { to_child_id: childId },
        { from_child_id: childId }
      ]))
      .limit(100)
      .get()
    if (!data.length) break

    await Promise.all(
      data.map(item => db.collection('notifications').doc(item._id).remove())
    )
    removed += data.length

    if (data.length < 100) break
  }

  return removed
}

async function removeLikesByChildId(childId) {
  let updated = 0

  while (true) {
    const { data } = await db.collection('posts')
      .where({ likes: childId })
      .limit(100)
      .get()
    if (!data.length) break

    await Promise.all(
      data.map(post => db.collection('posts').doc(post._id).update({
        data: { likes: _.pull(childId) }
      }))
    )
    updated += data.length

    if (data.length < 100) break
  }

  return updated
}

exports.main = async (event) => {
  const { childId } = event
  if (!childId) {
    return { code: -1, message: '缺少 childId 参数' }
  }

  const result = {}

  try {
    const fileIDs = await collectFileIDs(childId)
    result.filesDeleted = await deleteCloudFiles(fileIDs)

    result.commentsDeleted = await deleteByChildId('comments', childId)
    result.notificationsDeleted = await deleteNotificationsByChildId(childId)
    result.postsDeleted = await deleteByChildId('posts', childId)
    result.likesRemoved = await removeLikesByChildId(childId)

    await db.collection('children').doc(childId).remove()
    result.childDeleted = 1
  } catch (error) {
    console.error('delete-identity failed', error)
    return {
      code: -1,
      message: error && error.message ? error.message : 'delete-identity failed',
      stack: error && error.stack ? error.stack : '',
      data: result
    }
  }

  return {
    code: 0,
    message: 'delete identity success',
    data: result
  }
}
