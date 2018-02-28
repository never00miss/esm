import { inspect, promisify, types } from "util"

import PREFIX from "./constant/prefix.js"

import binding from "./binding.js"
import encodeId from "./util/encode-id.js"
import md5 from "./util/md5.js"
import satisfies from "./util/satisfies.js"
import setDeferred from "./util/set-deferred.js"

const {
  STD_ESM
} = PREFIX

let shared

if (__shared__) {
  shared = __shared__
} else {
  const runtimeName = encodeId("_" + md5(Date.now().toString()).slice(0, 3))
  const { versions } = process

  const fastPath = { __proto__: null }
  const support = { __proto__: null }

  const symbol = {
    __proto__: null,
    _compile: Symbol.for(STD_ESM + ":module._compile"),
    inspect: inspect.custom,
    mjs: Symbol.for(STD_ESM + ':Module._extensions[".mjs"]'),
    wrapper: Symbol.for(STD_ESM + ":wrapper")
  }

  shared = {
    __proto__: null,
    binding,
    cjs: {
      __proto__: null,
      resolveFilename: { __proto__: null }
    },
    entry: {
      __proto__: null,
      cache: new WeakMap,
      skipExports: { __proto__: null }
    },
    env: {
      __proto__: null,
      win32: process.platform === "win32"
    },
    esm: {
      __proto__: null,
      resolveFilename: { __proto__: null }
    },
    exportProxy: new WeakMap,
    fastPath,
    findPath: { __proto__: null },
    generic: { __proto__: null },
    getProxyDetails: new WeakMap,
    inited: false,
    inspect,
    maskFunction: new WeakMap,
    maxSatisfying: { __proto__: null },
    own: { __proto__: null },
    package: {
      __proto__: null,
      cache: { __proto__: null },
      default: null,
      dir: { __proto__: null },
      root: { __proto__: null }
    },
    parseURL: { __proto__: null },
    pendingMetas: { __proto__: null },
    pendingWrites: { __proto__: null },
    process: {
      __proto__: null,
      dlopen: process.dlopen,
      pid: process.pid,
      release: {
        __proto__: null,
        name: process.release.name
      },
      version: process.version.replace(/[^\d.]/g, ""),
      versions: {
        __proto__: null,
        chakracore: versions.chakracore,
        v8: versions.v8
      }
    },
    readPackage: { __proto__: null },
    runtimeName,
    safe: { __proto__: null },
    safeContext: Function("return this")(),
    satisfies: { __proto__: null },
    shim: { __proto__: null },
    support,
    symbol,
    unsafeContext: global,
    unwrapProxy: new WeakMap
  }

  setDeferred(shared, "arrowSymbol", () => {
    return satisfies(shared.process.version, "<7.0.0")
      ? "node:arrowMessage"
      : binding.util.arrow_message_private_symbol
  })

  setDeferred(shared, "decoratedSymbol", () => {
    return satisfies(shared.process.version, "<7.0.0")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(shared, "hiddenKeyType", () =>
    satisfies(shared.process.version, "<7.0.0")
      ? "string"
      : typeof shared.arrowSymbol
  )

  setDeferred(shared, "statValues", () =>
    shared.support.getStatValues
      ? binding.fs.getStatValues()
      : new Float64Array(14)
  )

  setDeferred(fastPath, "mtime", () =>
    typeof binding.fs.stat === "function" &&
      satisfies(shared.process.version, "^6.10.1||>=7.7")
  )

  setDeferred(fastPath, "readFile", () =>
    support.internalModuleReadFile
  )

  setDeferred(fastPath, "readFileFast", () =>
    support.internalModuleReadJSON ||
      support.internalModuleReadFile
  )

  setDeferred(fastPath, "stat", () =>
    typeof binding.fs.internalModuleStat === "function"
  )

  setDeferred(support, "await", () => {
    try {
      Function("async()=>await 1")()
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "blockScopedDeclarations", () => {
    try {
      (0, eval)("let a")
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "getProxyDetails", () =>
    typeof binding.util.getProxyDetails === "function"
  )

  setDeferred(support, "getStatValues", () =>
    typeof binding.fs.getStatValues === "function"
  )

  setDeferred(support, "inspectProxies", () => {
    const proxy = new Proxy({ __proto__: null }, { __proto__: null, [STD_ESM]: 1 })
    const inspected = shared.inspect(proxy, { __proto__: null, showProxy: true })

    return inspected.startsWith("Proxy") &&
      inspected.indexOf(STD_ESM) !== -1
  })

  setDeferred(support, "internalModuleReadFile", () =>
    typeof binding.fs.internalModuleReadFile === "function"
  )

  setDeferred(support, "internalModuleReadJSON", () =>
    typeof binding.fs.internalModuleReadJSON === "function"
  )

  setDeferred(support, "isProxy", () =>
    typeof (types && types.isProxy) === "function"
  )

  setDeferred(support, "proxiedClasses", () => {
    class A {}

    Reflect.setPrototypeOf(A.prototype, null)

    const proxy = new Proxy(A, { __proto__: null })

    class B extends proxy {
      b() {}
    }

    Reflect.setPrototypeOf(B.prototype, null)

    return new B().b !== void 0
  })

  setDeferred(support, "proxiedFunctions", () =>
    support.proxiedClasses &&
      support.proxiedFunctionToStringTag
  )

  setDeferred(support, "proxiedFunctionToStringTag", () => {
    const { toString } = Object.prototype
    const proxy = new Proxy(toString, { __proto__: null })

    return toString.call(proxy) === "[object Function]"
  })

  setDeferred(support, "replShowProxy", () =>
    satisfies(shared.process.version, ">=10")
  )

  setDeferred(support, "safeGetEnv", () =>
    typeof binding.util.safeGetenv === "function"
  )

  setDeferred(support, "safeToString", () =>
    typeof binding.util.safeToString === "function"
  )

  setDeferred(support, "setHiddenValue", () =>
    typeof binding.util.setHiddenValue === "function"
  )

  setDeferred(support, "wasm", () =>
    typeof WebAssembly === "object" &&
      WebAssembly !== null
  )

  setDeferred(symbol, "errorCode", () => {
    let error

    try {
      promisify()
    } catch (e) {
      error = e
    }

    const symbols = error
      ? Object.getOwnPropertySymbols(error)
      : []

    return symbols.length
      ? symbols[0]
      : Symbol.for(STD_ESM + ":errorCode")
  })
}

export default shared
