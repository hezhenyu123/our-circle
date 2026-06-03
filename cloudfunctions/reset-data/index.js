const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function clearCollection(name) {
  let removed = 0

  while (true) {
    const { data } = await db.collection(name).limit(100).get()
    if (!data.length) break

    await Promise.all(
      data.map(item => db.collection(name).doc(item._id).remove())
    )
    removed += data.length

    if (data.length < 100) break
  }

  return removed
}

async function collectFileIDs() {
  const fileIDs = []

  while (true) {
    const { data } = await db.collection('posts').limit(100).get()
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

exports.main = async () => {
  const version = 'reset-data-v3'
  const collections = ['notifications', 'comments', 'posts', 'children']
  const result = {}

  try {
    const fileIDs = await collectFileIDs()
    result.filesDeleted = await deleteCloudFiles(fileIDs)

    for (const name of collections) {
      result[name] = await clearCollection(name)
    }
  } catch (error) {
    console.error('reset-data failed', error)
    return {
      code: -1,
      message: error && error.message ? error.message : 'reset-data failed',
      stack: error && error.stack ? error.stack : '',
      version,
      data: result
    }
  }

  return {
    code: 0,
    message: 'reset success',
    version,
    data: result
  }
}
