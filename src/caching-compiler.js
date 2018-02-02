import { extname, resolve } from "path"

import Compiler from "./compiler.js"
import NullObject from "./null-object.js"

import gzip from "./fs/gzip.js"
import mkdirp from "./fs/mkdirp.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import writeFile from "./fs/write-file.js"

const { concat } = Buffer
const { max } = Math
const { stringify } = JSON

class CachingCompiler {
  static compile(entry, code, options) {
    if (entry.module.filename &&
        entry.package.cachePath) {
      return compileAndWrite(entry, code, options)
    }

    return compileAndCache(entry, code, options)
  }

  static from(entry) {
    const { cache } = entry.package
    const { cacheName } = entry

    const metaMap =
      cache &&
      cache["data.json"] &&
      cache["data.json"][cacheName]

    if (! metaMap) {
      return null
    }

    const metaBuffer = cache["data.blob"]
    const exportNames = metaMap[3]
    const scriptData = metaBuffer
      ? metaBuffer.slice(metaMap[0], metaMap[1])
      : void 0

    const result = {
      changed: false,
      esm: metaMap[2],
      exportNames,
      exportSpecifiers: null,
      exportStars: metaMap[4],
      moduleSpecifiers: metaMap[5],
      scriptData,
      warnings: metaMap[6]
    }

    if (! result.esm) {
      return result
    }

    const exportSpecifiers = {}

    for (const exportName of exportNames) {
      exportSpecifiers[exportName] = 1
    }

    result.exportSpecifiers = exportSpecifiers
    return result
  }
}

function compileAndCache(entry, code, options) {
  const { cache } = entry.package
  const { cacheName } = entry

  const result =
  cache[cacheName] =
  Compiler.compile(code, toCompileOptions(entry, options))

  const exportSpecifiers =
  result.exportSpecifiers = new NullObject

  const { exportNames } = result

  for (const exportName of exportNames) {
    exportSpecifiers[exportName] = 1
  }

  // Add "main" to enable the `readFileFast` fast path of
  // `process.binding("fs").internalModuleReadJSON`.
  result.code = '"main";' + result.code

  return result
}

function compileAndWrite(entry, code, options) {
  const result = compileAndCache(entry, code, options)

  if (! result.changed) {
    return result
  }

  const { cachePath } = entry.package
  const content = result.code

  const pendingWrites =
    shared.pendingWrites[cachePath] ||
    (shared.pendingWrites[cachePath] = new NullObject)

  pendingWrites[entry.cacheName] = { content, entry }

  return result
}

function removeExpired(entry) {
  const { cache, cachePath } = entry.package
  const { cacheName } = entry
  const shortname = cacheName.slice(0, 8)

  for (const key in cache) {
    if (key !== cacheName &&
        key.startsWith(shortname)) {
      delete cache[cacheName]
      delete cache["data.json"][cacheName]
      removeFile(resolve(cachePath, key))
    }
  }
}

function toCompileOptions(entry, options) {
  return {
    cjs: entry.package.options.cjs,
    hint: options.hint,
    runtimeName: entry.runtimeName,
    type: options.type,
    var: options.var
  }
}

Object.setPrototypeOf(CachingCompiler.prototype, null)

if (! shared.inited) {
  process.setMaxListeners(process.getMaxListeners() + 1)

  process.once("exit", () => {
    const { pendingWrites } = shared

    for (const cachePath in pendingWrites) {
      if (! mkdirp(cachePath)) {
        continue
      }

      const cacheData = pendingWrites[cachePath]

      for (const cacheName in cacheData) {
        let { content, entry } = cacheData[cacheName]

        if (extname(cacheName) === ".gz") {
          content = gzip(content)
        }

        if (writeFile(resolve(cachePath, cacheName), content)) {
          removeExpired(entry)
        }
      }
    }

    const { pendingMetas } = shared

    for (const cachePath in pendingMetas) {
      if (! mkdirp(cachePath)) {
        continue
      }

      const buffers = []
      const cacheData = pendingMetas[cachePath]
      const map = new NullObject

      let offset = 0

      for (const cacheName in cacheData) {
        const { entry, scriptData } = cacheData[cacheName]

        let offsetStart = -1
        let offsetEnd = -1

        if (scriptData) {
          offsetStart = offset
          offsetEnd = offset += scriptData.length
          buffers.push(scriptData)
        }

        const { cache } = entry.package
        const cached = cache[cacheName]

        if (cached) {
          map[cacheName] = [
            offsetStart,
            offsetEnd,
            cached.esm,
            cached.exportNames,
            cached.exportStars,
            cached.moduleSpecifiers,
            cached.warnings
          ]
        } else {
          map[cacheName] = [offsetStart, offsetEnd]
        }
      }

      writeFile(resolve(cachePath, "data.blob"), concat(buffers))
      writeFile(resolve(cachePath, "data.json"), stringify(map))
    }

    process.setMaxListeners(max(process.getMaxListeners() - 1, 0))
  })
}

export default CachingCompiler
