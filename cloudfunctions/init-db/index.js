// cloudfunctions/init-db/index.js
// 云函数：初始化数据库集合
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const collections = ['children', 'posts', 'comments', 'notifications']
  const results = {}

  for (const name of collections) {
    try {
      // 尝试创建集合（已存在会报错，忽略）
      await db.createCollection(name)
      results[name] = 'created'
    } catch (e) {
      results[name] = 'exists'
    }
  }

  return { code: 0, data: results }
}
