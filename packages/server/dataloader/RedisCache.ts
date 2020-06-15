import Redis from 'ioredis'
import ms from 'ms'
import {DBType} from '../database/rethinkDriver'
import RethinkDBCache, {Doc, RWrite} from './RethinkDBCache'

const TTL = ms('3h')

const msetpx = (key: string, value: object) => {
  return ['set', key, JSON.stringify(value), 'PX', TTL] as string[]
}
// type ClearLocal = (key: string) => void

export default class RedisCache<T extends keyof DBType> {
  rethinkDBCache = new RethinkDBCache()
  redis = new Redis(process.env.REDIS_URL)
  // remote invalidation is stuck on upgrading to Redis v6 in prod
  // invalidator = new Redis(process.env.REDIS_URL)
  cachedTypes = new Set<string>()
  invalidatorClientId!: string
  // constructor(clearLocal: ClearLocal) {
  //   this.initializeInvalidator(clearLocal)
  // }
  // private async initializeInvalidator(clearLocal: ClearLocal) {
  //   this.invalidator.subscribe('__redis__:invalidate')
  //   this.invalidator.on('message', (_channel, key) => {
  //     clearLocal(key)
  //   })
  //   this.invalidatorClientId = await this.redis.client('id')
  // }
  // private trackInvalidations(fetches: {table: T}[]) {
  //   // This O(N) operation could be O(1), but that requires updating the prefixes as we cache more things
  //   // the risk of an invalid cache hit isn't worth it
  //   for (let i = 0; i < fetches.length; i++) {
  //     const {table} = fetches[i]
  //     if (!this.cachedTypes.has(table)) {
  //       this.cachedTypes.add(table)
  //       // whenever any key starts with the ${table} prefix gets set, send an invalidation message to the invalidator
  //       // noloop is used to exclude sending the message to the client that called set
  //       this.redis.client('TRACKING', 'ON', 'REDIRECT', this.invalidatorClientId, 'BCAST', 'NOLOOP', 'PREFIX', table)
  //     }
  //   }
  // }
  read = async (fetches: {table: T; id: string}[]) => {
    // this.trackInvalidations(fetches)
    const keys = fetches.map(({table, id}) => `${table}:${id}`)
    const cachedDocs = await this.redis.mget(...keys)
    const missingKeys = [] as string[]
    const parsedDocs = [] as {id: string}[]
    for (let i = 0; i < cachedDocs.length; i++) {
      const cachedDoc = cachedDocs[i]
      if (cachedDoc === null) {
        missingKeys.push(keys[i])
      } else {
        parsedDocs.push(JSON.parse(cachedDoc))
      }
    }
    if (missingKeys.length === 0) return parsedDocs
    const docsByKey = await this.rethinkDBCache.read(missingKeys)
    const writes = [] as string[][]
    Object.keys(docsByKey).forEach((key) => {
      writes.push(msetpx(key, docsByKey[key]))
    })
    // don't wait for redis to populate the local cache
    this.redis.multi(writes).exec()
    return keys.map((key, idx) => {
      const cachedDoc = cachedDocs[idx]
      if (cachedDoc) return JSON.parse(cachedDoc)
      return docsByKey[key]
    })
  }

  write = async (writes: RWrite<T>[]) => {
    const results = await this.rethinkDBCache.write(writes)
    const redisWrites = [] as string[][]
    results.map((result, idx) => {
      if (!result) return
      const write = writes[idx]
      const {table} = write
      const {id} = result
      const key = `${table}:${id}`
      redisWrites.push(msetpx(key, result))
    })
    // awaiting redis isn't strictly required, can get speedboost by removing the wait
    await this.redis.multi(redisWrites).exec()
    return results
  }

  clear = async (key: string) => {
    return this.redis.del(key)
  }
  prime = async (table: T, docs: Doc[]) => {
    const writes = docs.map((doc) => {
      return msetpx(`${table}:${doc.id}`, doc)
    })
    await this.redis.multi(writes).exec()
  }
  writeTable = async (table: T, updater: Partial<DBType[T]>) => {
    // inefficient to not update rethink & redis in parallel, but writeTable is uncommon
    await this.rethinkDBCache.writeTable(table, updater)
    return new Promise((resolve) => {
      const stream = this.redis.scanStream({match: `${table}:*`, count: 100})
      stream.on('data', async (keys) => {
        stream.pause()
        const userStrs = await this.redis.mget(...keys)
        const writes = userStrs.map((userStr, idx) => {
          const user = JSON.parse(userStr!)
          Object.assign(user, updater)
          return msetpx(keys[idx], user)
        })
        await this.redis.multi(writes).exec()
        stream.resume()
      })
      stream.on('end', () => {
        resolve()
      })
    })
  }
}
