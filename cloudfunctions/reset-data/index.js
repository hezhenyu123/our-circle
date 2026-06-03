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

exports.main = async () => {
  const version = 'reset-data-v2'
  const collections = ['notifications', 'comments', 'posts', 'children']
  const result = {}

  try {
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
