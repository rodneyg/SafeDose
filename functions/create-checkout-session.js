"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/stripe/cjs/crypto/CryptoProvider.js
var require_CryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/CryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CryptoProviderOnlySupportsAsyncError = exports2.CryptoProvider = void 0;
    var CryptoProvider = class {
      computeHMACSignature(payload, secret) {
        throw new Error("computeHMACSignature not implemented.");
      }
      computeHMACSignatureAsync(payload, secret) {
        throw new Error("computeHMACSignatureAsync not implemented.");
      }
      computeSHA256Async(data) {
        throw new Error("computeSHA256 not implemented.");
      }
    };
    exports2.CryptoProvider = CryptoProvider;
    var CryptoProviderOnlySupportsAsyncError = class extends Error {
    };
    exports2.CryptoProviderOnlySupportsAsyncError = CryptoProviderOnlySupportsAsyncError;
  }
});

// node_modules/stripe/cjs/crypto/NodeCryptoProvider.js
var require_NodeCryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/NodeCryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodeCryptoProvider = void 0;
    var crypto2 = require("crypto");
    var CryptoProvider_js_1 = require_CryptoProvider();
    var NodeCryptoProvider = class extends CryptoProvider_js_1.CryptoProvider {
      computeHMACSignature(payload, secret) {
        return crypto2.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
      }
      async computeHMACSignatureAsync(payload, secret) {
        const signature = await this.computeHMACSignature(payload, secret);
        return signature;
      }
      async computeSHA256Async(data) {
        return new Uint8Array(await crypto2.createHash("sha256").update(data).digest());
      }
    };
    exports2.NodeCryptoProvider = NodeCryptoProvider;
  }
});

// node_modules/stripe/cjs/net/HttpClient.js
var require_HttpClient = __commonJS({
  "node_modules/stripe/cjs/net/HttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.HttpClientResponse = exports2.HttpClient = void 0;
    var HttpClient = class {
      getClientName() {
        throw new Error("getClientName not implemented.");
      }
      makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        throw new Error("makeRequest not implemented.");
      }
      static makeTimeoutError() {
        const timeoutErr = new TypeError(HttpClient.TIMEOUT_ERROR_CODE);
        timeoutErr.code = HttpClient.TIMEOUT_ERROR_CODE;
        return timeoutErr;
      }
    };
    exports2.HttpClient = HttpClient;
    HttpClient.CONNECTION_CLOSED_ERROR_CODES = ["ECONNRESET", "EPIPE"];
    HttpClient.TIMEOUT_ERROR_CODE = "ETIMEDOUT";
    var HttpClientResponse = class {
      constructor(statusCode, headers) {
        this._statusCode = statusCode;
        this._headers = headers;
      }
      getStatusCode() {
        return this._statusCode;
      }
      getHeaders() {
        return this._headers;
      }
      getRawResponse() {
        throw new Error("getRawResponse not implemented.");
      }
      toStream(streamCompleteCallback) {
        throw new Error("toStream not implemented.");
      }
      toJSON() {
        throw new Error("toJSON not implemented.");
      }
    };
    exports2.HttpClientResponse = HttpClientResponse;
  }
});

// node_modules/stripe/cjs/net/NodeHttpClient.js
var require_NodeHttpClient = __commonJS({
  "node_modules/stripe/cjs/net/NodeHttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodeHttpClientResponse = exports2.NodeHttpClient = void 0;
    var http_ = require("http");
    var https_ = require("https");
    var HttpClient_js_1 = require_HttpClient();
    var http = http_.default || http_;
    var https = https_.default || https_;
    var defaultHttpAgent = new http.Agent({ keepAlive: true });
    var defaultHttpsAgent = new https.Agent({ keepAlive: true });
    var NodeHttpClient = class extends HttpClient_js_1.HttpClient {
      constructor(agent) {
        super();
        this._agent = agent;
      }
      getClientName() {
        return "node";
      }
      makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        const isInsecureConnection = protocol === "http";
        let agent = this._agent;
        if (!agent) {
          agent = isInsecureConnection ? defaultHttpAgent : defaultHttpsAgent;
        }
        const requestPromise = new Promise((resolve, reject) => {
          const req = (isInsecureConnection ? http : https).request({
            host,
            port,
            path,
            method,
            agent,
            headers,
            ciphers: "DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5"
          });
          req.setTimeout(timeout, () => {
            req.destroy(HttpClient_js_1.HttpClient.makeTimeoutError());
          });
          req.on("response", (res) => {
            resolve(new NodeHttpClientResponse(res));
          });
          req.on("error", (error) => {
            reject(error);
          });
          req.once("socket", (socket) => {
            if (socket.connecting) {
              socket.once(isInsecureConnection ? "connect" : "secureConnect", () => {
                req.write(requestData);
                req.end();
              });
            } else {
              req.write(requestData);
              req.end();
            }
          });
        });
        return requestPromise;
      }
    };
    exports2.NodeHttpClient = NodeHttpClient;
    var NodeHttpClientResponse = class extends HttpClient_js_1.HttpClientResponse {
      constructor(res) {
        super(res.statusCode, res.headers || {});
        this._res = res;
      }
      getRawResponse() {
        return this._res;
      }
      toStream(streamCompleteCallback) {
        this._res.once("end", () => streamCompleteCallback());
        return this._res;
      }
      toJSON() {
        return new Promise((resolve, reject) => {
          let response = "";
          this._res.setEncoding("utf8");
          this._res.on("data", (chunk) => {
            response += chunk;
          });
          this._res.once("end", () => {
            try {
              resolve(JSON.parse(response));
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    };
    exports2.NodeHttpClientResponse = NodeHttpClientResponse;
  }
});

// node_modules/stripe/cjs/net/FetchHttpClient.js
var require_FetchHttpClient = __commonJS({
  "node_modules/stripe/cjs/net/FetchHttpClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FetchHttpClientResponse = exports2.FetchHttpClient = void 0;
    var HttpClient_js_1 = require_HttpClient();
    var FetchHttpClient = class extends HttpClient_js_1.HttpClient {
      constructor(fetchFn) {
        super();
        if (!fetchFn) {
          if (!globalThis.fetch) {
            throw new Error("fetch() function not provided and is not defined in the global scope. You must provide a fetch implementation.");
          }
          fetchFn = globalThis.fetch;
        }
        if (globalThis.AbortController) {
          this._fetchFn = FetchHttpClient.makeFetchWithAbortTimeout(fetchFn);
        } else {
          this._fetchFn = FetchHttpClient.makeFetchWithRaceTimeout(fetchFn);
        }
      }
      static makeFetchWithRaceTimeout(fetchFn) {
        return (url, init, timeout) => {
          let pendingTimeoutId;
          const timeoutPromise = new Promise((_, reject) => {
            pendingTimeoutId = setTimeout(() => {
              pendingTimeoutId = null;
              reject(HttpClient_js_1.HttpClient.makeTimeoutError());
            }, timeout);
          });
          const fetchPromise = fetchFn(url, init);
          return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
            if (pendingTimeoutId) {
              clearTimeout(pendingTimeoutId);
            }
          });
        };
      }
      static makeFetchWithAbortTimeout(fetchFn) {
        return async (url, init, timeout) => {
          const abort = new AbortController();
          let timeoutId = setTimeout(() => {
            timeoutId = null;
            abort.abort(HttpClient_js_1.HttpClient.makeTimeoutError());
          }, timeout);
          try {
            return await fetchFn(url, Object.assign(Object.assign({}, init), { signal: abort.signal }));
          } catch (err) {
            if (err.name === "AbortError") {
              throw HttpClient_js_1.HttpClient.makeTimeoutError();
            } else {
              throw err;
            }
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        };
      }
      getClientName() {
        return "fetch";
      }
      async makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
        const isInsecureConnection = protocol === "http";
        const url = new URL(path, `${isInsecureConnection ? "http" : "https"}://${host}`);
        url.port = port;
        const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
        const body = requestData || (methodHasPayload ? "" : void 0);
        const res = await this._fetchFn(url.toString(), {
          method,
          headers,
          body
        }, timeout);
        return new FetchHttpClientResponse(res);
      }
    };
    exports2.FetchHttpClient = FetchHttpClient;
    var FetchHttpClientResponse = class extends HttpClient_js_1.HttpClientResponse {
      constructor(res) {
        super(res.status, FetchHttpClientResponse._transformHeadersToObject(res.headers));
        this._res = res;
      }
      getRawResponse() {
        return this._res;
      }
      toStream(streamCompleteCallback) {
        streamCompleteCallback();
        return this._res.body;
      }
      toJSON() {
        return this._res.json();
      }
      static _transformHeadersToObject(headers) {
        const headersObj = {};
        for (const entry of headers) {
          if (!Array.isArray(entry) || entry.length != 2) {
            throw new Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
          }
          headersObj[entry[0]] = entry[1];
        }
        return headersObj;
      }
    };
    exports2.FetchHttpClientResponse = FetchHttpClientResponse;
  }
});

// node_modules/stripe/cjs/crypto/SubtleCryptoProvider.js
var require_SubtleCryptoProvider = __commonJS({
  "node_modules/stripe/cjs/crypto/SubtleCryptoProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubtleCryptoProvider = void 0;
    var CryptoProvider_js_1 = require_CryptoProvider();
    var SubtleCryptoProvider = class extends CryptoProvider_js_1.CryptoProvider {
      constructor(subtleCrypto) {
        super();
        this.subtleCrypto = subtleCrypto || crypto.subtle;
      }
      computeHMACSignature(payload, secret) {
        throw new CryptoProvider_js_1.CryptoProviderOnlySupportsAsyncError("SubtleCryptoProvider cannot be used in a synchronous context.");
      }
      async computeHMACSignatureAsync(payload, secret) {
        const encoder = new TextEncoder();
        const key = await this.subtleCrypto.importKey("raw", encoder.encode(secret), {
          name: "HMAC",
          hash: { name: "SHA-256" }
        }, false, ["sign"]);
        const signatureBuffer = await this.subtleCrypto.sign("hmac", key, encoder.encode(payload));
        const signatureBytes = new Uint8Array(signatureBuffer);
        const signatureHexCodes = new Array(signatureBytes.length);
        for (let i = 0; i < signatureBytes.length; i++) {
          signatureHexCodes[i] = byteHexMapping[signatureBytes[i]];
        }
        return signatureHexCodes.join("");
      }
      async computeSHA256Async(data) {
        return new Uint8Array(await this.subtleCrypto.digest("SHA-256", data));
      }
    };
    exports2.SubtleCryptoProvider = SubtleCryptoProvider;
    var byteHexMapping = new Array(256);
    for (let i = 0; i < byteHexMapping.length; i++) {
      byteHexMapping[i] = i.toString(16).padStart(2, "0");
    }
  }
});

// node_modules/stripe/cjs/platform/PlatformFunctions.js
var require_PlatformFunctions = __commonJS({
  "node_modules/stripe/cjs/platform/PlatformFunctions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PlatformFunctions = void 0;
    var FetchHttpClient_js_1 = require_FetchHttpClient();
    var SubtleCryptoProvider_js_1 = require_SubtleCryptoProvider();
    var PlatformFunctions = class {
      constructor() {
        this._fetchFn = null;
        this._agent = null;
      }
      getUname() {
        throw new Error("getUname not implemented.");
      }
      uuid4() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === "x" ? r : r & 3 | 8;
          return v.toString(16);
        });
      }
      secureCompare(a, b) {
        if (a.length !== b.length) {
          return false;
        }
        const len = a.length;
        let result = 0;
        for (let i = 0; i < len; ++i) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      }
      createEmitter() {
        throw new Error("createEmitter not implemented.");
      }
      tryBufferData(data) {
        throw new Error("tryBufferData not implemented.");
      }
      createNodeHttpClient(agent) {
        throw new Error("createNodeHttpClient not implemented.");
      }
      createFetchHttpClient(fetchFn) {
        return new FetchHttpClient_js_1.FetchHttpClient(fetchFn);
      }
      createDefaultHttpClient() {
        throw new Error("createDefaultHttpClient not implemented.");
      }
      createNodeCryptoProvider() {
        throw new Error("createNodeCryptoProvider not implemented.");
      }
      createSubtleCryptoProvider(subtleCrypto) {
        return new SubtleCryptoProvider_js_1.SubtleCryptoProvider(subtleCrypto);
      }
      createDefaultCryptoProvider() {
        throw new Error("createDefaultCryptoProvider not implemented.");
      }
    };
    exports2.PlatformFunctions = PlatformFunctions;
  }
});

// node_modules/stripe/cjs/Error.js
var require_Error = __commonJS({
  "node_modules/stripe/cjs/Error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TemporarySessionExpiredError = exports2.StripeUnknownError = exports2.StripeInvalidGrantError = exports2.StripeIdempotencyError = exports2.StripeSignatureVerificationError = exports2.StripeConnectionError = exports2.StripeRateLimitError = exports2.StripePermissionError = exports2.StripeAuthenticationError = exports2.StripeAPIError = exports2.StripeInvalidRequestError = exports2.StripeCardError = exports2.StripeError = exports2.generateV2Error = exports2.generateV1Error = void 0;
    var generateV1Error = (rawStripeError) => {
      switch (rawStripeError.type) {
        case "card_error":
          return new StripeCardError(rawStripeError);
        case "invalid_request_error":
          return new StripeInvalidRequestError(rawStripeError);
        case "api_error":
          return new StripeAPIError(rawStripeError);
        case "authentication_error":
          return new StripeAuthenticationError(rawStripeError);
        case "rate_limit_error":
          return new StripeRateLimitError(rawStripeError);
        case "idempotency_error":
          return new StripeIdempotencyError(rawStripeError);
        case "invalid_grant":
          return new StripeInvalidGrantError(rawStripeError);
        default:
          return new StripeUnknownError(rawStripeError);
      }
    };
    exports2.generateV1Error = generateV1Error;
    var generateV2Error = (rawStripeError) => {
      switch (rawStripeError.type) {
        case "temporary_session_expired":
          return new TemporarySessionExpiredError(rawStripeError);
      }
      switch (rawStripeError.code) {
        case "invalid_fields":
          return new StripeInvalidRequestError(rawStripeError);
      }
      return (0, exports2.generateV1Error)(rawStripeError);
    };
    exports2.generateV2Error = generateV2Error;
    var StripeError = class extends Error {
      constructor(raw = {}, type = null) {
        super(raw.message);
        this.type = type || this.constructor.name;
        this.raw = raw;
        this.rawType = raw.type;
        this.code = raw.code;
        this.doc_url = raw.doc_url;
        this.param = raw.param;
        this.detail = raw.detail;
        this.headers = raw.headers;
        this.requestId = raw.requestId;
        this.statusCode = raw.statusCode;
        this.message = raw.message;
        this.userMessage = raw.user_message;
        this.charge = raw.charge;
        this.decline_code = raw.decline_code;
        this.payment_intent = raw.payment_intent;
        this.payment_method = raw.payment_method;
        this.payment_method_type = raw.payment_method_type;
        this.setup_intent = raw.setup_intent;
        this.source = raw.source;
      }
    };
    exports2.StripeError = StripeError;
    StripeError.generate = exports2.generateV1Error;
    var StripeCardError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeCardError");
      }
    };
    exports2.StripeCardError = StripeCardError;
    var StripeInvalidRequestError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidRequestError");
      }
    };
    exports2.StripeInvalidRequestError = StripeInvalidRequestError;
    var StripeAPIError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeAPIError");
      }
    };
    exports2.StripeAPIError = StripeAPIError;
    var StripeAuthenticationError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeAuthenticationError");
      }
    };
    exports2.StripeAuthenticationError = StripeAuthenticationError;
    var StripePermissionError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripePermissionError");
      }
    };
    exports2.StripePermissionError = StripePermissionError;
    var StripeRateLimitError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeRateLimitError");
      }
    };
    exports2.StripeRateLimitError = StripeRateLimitError;
    var StripeConnectionError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeConnectionError");
      }
    };
    exports2.StripeConnectionError = StripeConnectionError;
    var StripeSignatureVerificationError = class extends StripeError {
      constructor(header, payload, raw = {}) {
        super(raw, "StripeSignatureVerificationError");
        this.header = header;
        this.payload = payload;
      }
    };
    exports2.StripeSignatureVerificationError = StripeSignatureVerificationError;
    var StripeIdempotencyError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeIdempotencyError");
      }
    };
    exports2.StripeIdempotencyError = StripeIdempotencyError;
    var StripeInvalidGrantError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeInvalidGrantError");
      }
    };
    exports2.StripeInvalidGrantError = StripeInvalidGrantError;
    var StripeUnknownError = class extends StripeError {
      constructor(raw = {}) {
        super(raw, "StripeUnknownError");
      }
    };
    exports2.StripeUnknownError = StripeUnknownError;
    var TemporarySessionExpiredError = class extends StripeError {
      constructor(rawStripeError = {}) {
        super(rawStripeError, "TemporarySessionExpiredError");
      }
    };
    exports2.TemporarySessionExpiredError = TemporarySessionExpiredError;
  }
});

// node_modules/es-errors/type.js
var require_type = __commonJS({
  "node_modules/es-errors/type.js"(exports2, module2) {
    "use strict";
    module2.exports = TypeError;
  }
});

// node_modules/object-inspect/util.inspect.js
var require_util_inspect = __commonJS({
  "node_modules/object-inspect/util.inspect.js"(exports2, module2) {
    module2.exports = require("util").inspect;
  }
});

// node_modules/object-inspect/index.js
var require_object_inspect = __commonJS({
  "node_modules/object-inspect/index.js"(exports2, module2) {
    var hasMap = typeof Map === "function" && Map.prototype;
    var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, "size") : null;
    var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === "function" ? mapSizeDescriptor.get : null;
    var mapForEach = hasMap && Map.prototype.forEach;
    var hasSet = typeof Set === "function" && Set.prototype;
    var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, "size") : null;
    var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === "function" ? setSizeDescriptor.get : null;
    var setForEach = hasSet && Set.prototype.forEach;
    var hasWeakMap = typeof WeakMap === "function" && WeakMap.prototype;
    var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
    var hasWeakSet = typeof WeakSet === "function" && WeakSet.prototype;
    var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
    var hasWeakRef = typeof WeakRef === "function" && WeakRef.prototype;
    var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
    var booleanValueOf = Boolean.prototype.valueOf;
    var objectToString = Object.prototype.toString;
    var functionToString = Function.prototype.toString;
    var $match = String.prototype.match;
    var $slice = String.prototype.slice;
    var $replace = String.prototype.replace;
    var $toUpperCase = String.prototype.toUpperCase;
    var $toLowerCase = String.prototype.toLowerCase;
    var $test = RegExp.prototype.test;
    var $concat = Array.prototype.concat;
    var $join = Array.prototype.join;
    var $arrSlice = Array.prototype.slice;
    var $floor = Math.floor;
    var bigIntValueOf = typeof BigInt === "function" ? BigInt.prototype.valueOf : null;
    var gOPS = Object.getOwnPropertySymbols;
    var symToString = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol.prototype.toString : null;
    var hasShammedSymbols = typeof Symbol === "function" && typeof Symbol.iterator === "object";
    var toStringTag = typeof Symbol === "function" && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? "object" : "symbol") ? Symbol.toStringTag : null;
    var isEnumerable = Object.prototype.propertyIsEnumerable;
    var gPO = (typeof Reflect === "function" ? Reflect.getPrototypeOf : Object.getPrototypeOf) || ([].__proto__ === Array.prototype ? function(O) {
      return O.__proto__;
    } : null);
    function addNumericSeparator(num, str) {
      if (num === Infinity || num === -Infinity || num !== num || num && num > -1e3 && num < 1e3 || $test.call(/e/, str)) {
        return str;
      }
      var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
      if (typeof num === "number") {
        var int = num < 0 ? -$floor(-num) : $floor(num);
        if (int !== num) {
          var intStr = String(int);
          var dec = $slice.call(str, intStr.length + 1);
          return $replace.call(intStr, sepRegex, "$&_") + "." + $replace.call($replace.call(dec, /([0-9]{3})/g, "$&_"), /_$/, "");
        }
      }
      return $replace.call(str, sepRegex, "$&_");
    }
    var utilInspect = require_util_inspect();
    var inspectCustom = utilInspect.custom;
    var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;
    var quotes = {
      __proto__: null,
      "double": '"',
      single: "'"
    };
    var quoteREs = {
      __proto__: null,
      "double": /(["\\])/g,
      single: /(['\\])/g
    };
    module2.exports = function inspect_(obj, options, depth, seen) {
      var opts = options || {};
      if (has(opts, "quoteStyle") && !has(quotes, opts.quoteStyle)) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
      }
      if (has(opts, "maxStringLength") && (typeof opts.maxStringLength === "number" ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity : opts.maxStringLength !== null)) {
        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
      }
      var customInspect = has(opts, "customInspect") ? opts.customInspect : true;
      if (typeof customInspect !== "boolean" && customInspect !== "symbol") {
        throw new TypeError("option \"customInspect\", if provided, must be `true`, `false`, or `'symbol'`");
      }
      if (has(opts, "indent") && opts.indent !== null && opts.indent !== "	" && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)) {
        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
      }
      if (has(opts, "numericSeparator") && typeof opts.numericSeparator !== "boolean") {
        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
      }
      var numericSeparator = opts.numericSeparator;
      if (typeof obj === "undefined") {
        return "undefined";
      }
      if (obj === null) {
        return "null";
      }
      if (typeof obj === "boolean") {
        return obj ? "true" : "false";
      }
      if (typeof obj === "string") {
        return inspectString(obj, opts);
      }
      if (typeof obj === "number") {
        if (obj === 0) {
          return Infinity / obj > 0 ? "0" : "-0";
        }
        var str = String(obj);
        return numericSeparator ? addNumericSeparator(obj, str) : str;
      }
      if (typeof obj === "bigint") {
        var bigIntStr = String(obj) + "n";
        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
      }
      var maxDepth = typeof opts.depth === "undefined" ? 5 : opts.depth;
      if (typeof depth === "undefined") {
        depth = 0;
      }
      if (depth >= maxDepth && maxDepth > 0 && typeof obj === "object") {
        return isArray(obj) ? "[Array]" : "[Object]";
      }
      var indent = getIndent(opts, depth);
      if (typeof seen === "undefined") {
        seen = [];
      } else if (indexOf(seen, obj) >= 0) {
        return "[Circular]";
      }
      function inspect(value, from, noIndent) {
        if (from) {
          seen = $arrSlice.call(seen);
          seen.push(from);
        }
        if (noIndent) {
          var newOpts = {
            depth: opts.depth
          };
          if (has(opts, "quoteStyle")) {
            newOpts.quoteStyle = opts.quoteStyle;
          }
          return inspect_(value, newOpts, depth + 1, seen);
        }
        return inspect_(value, opts, depth + 1, seen);
      }
      if (typeof obj === "function" && !isRegExp(obj)) {
        var name = nameOf(obj);
        var keys = arrObjKeys(obj, inspect);
        return "[Function" + (name ? ": " + name : " (anonymous)") + "]" + (keys.length > 0 ? " { " + $join.call(keys, ", ") + " }" : "");
      }
      if (isSymbol(obj)) {
        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, "$1") : symToString.call(obj);
        return typeof obj === "object" && !hasShammedSymbols ? markBoxed(symString) : symString;
      }
      if (isElement(obj)) {
        var s = "<" + $toLowerCase.call(String(obj.nodeName));
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
          s += " " + attrs[i].name + "=" + wrapQuotes(quote(attrs[i].value), "double", opts);
        }
        s += ">";
        if (obj.childNodes && obj.childNodes.length) {
          s += "...";
        }
        s += "</" + $toLowerCase.call(String(obj.nodeName)) + ">";
        return s;
      }
      if (isArray(obj)) {
        if (obj.length === 0) {
          return "[]";
        }
        var xs = arrObjKeys(obj, inspect);
        if (indent && !singleLineValues(xs)) {
          return "[" + indentedJoin(xs, indent) + "]";
        }
        return "[ " + $join.call(xs, ", ") + " ]";
      }
      if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (!("cause" in Error.prototype) && "cause" in obj && !isEnumerable.call(obj, "cause")) {
          return "{ [" + String(obj) + "] " + $join.call($concat.call("[cause]: " + inspect(obj.cause), parts), ", ") + " }";
        }
        if (parts.length === 0) {
          return "[" + String(obj) + "]";
        }
        return "{ [" + String(obj) + "] " + $join.call(parts, ", ") + " }";
      }
      if (typeof obj === "object" && customInspect) {
        if (inspectSymbol && typeof obj[inspectSymbol] === "function" && utilInspect) {
          return utilInspect(obj, { depth: maxDepth - depth });
        } else if (customInspect !== "symbol" && typeof obj.inspect === "function") {
          return obj.inspect();
        }
      }
      if (isMap(obj)) {
        var mapParts = [];
        if (mapForEach) {
          mapForEach.call(obj, function(value, key) {
            mapParts.push(inspect(key, obj, true) + " => " + inspect(value, obj));
          });
        }
        return collectionOf("Map", mapSize.call(obj), mapParts, indent);
      }
      if (isSet(obj)) {
        var setParts = [];
        if (setForEach) {
          setForEach.call(obj, function(value) {
            setParts.push(inspect(value, obj));
          });
        }
        return collectionOf("Set", setSize.call(obj), setParts, indent);
      }
      if (isWeakMap(obj)) {
        return weakCollectionOf("WeakMap");
      }
      if (isWeakSet(obj)) {
        return weakCollectionOf("WeakSet");
      }
      if (isWeakRef(obj)) {
        return weakCollectionOf("WeakRef");
      }
      if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
      }
      if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
      }
      if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
      }
      if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
      }
      if (typeof window !== "undefined" && obj === window) {
        return "{ [object Window] }";
      }
      if (typeof globalThis !== "undefined" && obj === globalThis || typeof global !== "undefined" && obj === global) {
        return "{ [object globalThis] }";
      }
      if (!isDate(obj) && !isRegExp(obj)) {
        var ys = arrObjKeys(obj, inspect);
        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
        var protoTag = obj instanceof Object ? "" : "null prototype";
        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? "Object" : "";
        var constructorTag = isPlainObject || typeof obj.constructor !== "function" ? "" : obj.constructor.name ? obj.constructor.name + " " : "";
        var tag = constructorTag + (stringTag || protoTag ? "[" + $join.call($concat.call([], stringTag || [], protoTag || []), ": ") + "] " : "");
        if (ys.length === 0) {
          return tag + "{}";
        }
        if (indent) {
          return tag + "{" + indentedJoin(ys, indent) + "}";
        }
        return tag + "{ " + $join.call(ys, ", ") + " }";
      }
      return String(obj);
    };
    function wrapQuotes(s, defaultStyle, opts) {
      var style = opts.quoteStyle || defaultStyle;
      var quoteChar = quotes[style];
      return quoteChar + s + quoteChar;
    }
    function quote(s) {
      return $replace.call(String(s), /"/g, "&quot;");
    }
    function canTrustToString(obj) {
      return !toStringTag || !(typeof obj === "object" && (toStringTag in obj || typeof obj[toStringTag] !== "undefined"));
    }
    function isArray(obj) {
      return toStr(obj) === "[object Array]" && canTrustToString(obj);
    }
    function isDate(obj) {
      return toStr(obj) === "[object Date]" && canTrustToString(obj);
    }
    function isRegExp(obj) {
      return toStr(obj) === "[object RegExp]" && canTrustToString(obj);
    }
    function isError(obj) {
      return toStr(obj) === "[object Error]" && canTrustToString(obj);
    }
    function isString(obj) {
      return toStr(obj) === "[object String]" && canTrustToString(obj);
    }
    function isNumber(obj) {
      return toStr(obj) === "[object Number]" && canTrustToString(obj);
    }
    function isBoolean(obj) {
      return toStr(obj) === "[object Boolean]" && canTrustToString(obj);
    }
    function isSymbol(obj) {
      if (hasShammedSymbols) {
        return obj && typeof obj === "object" && obj instanceof Symbol;
      }
      if (typeof obj === "symbol") {
        return true;
      }
      if (!obj || typeof obj !== "object" || !symToString) {
        return false;
      }
      try {
        symToString.call(obj);
        return true;
      } catch (e) {
      }
      return false;
    }
    function isBigInt(obj) {
      if (!obj || typeof obj !== "object" || !bigIntValueOf) {
        return false;
      }
      try {
        bigIntValueOf.call(obj);
        return true;
      } catch (e) {
      }
      return false;
    }
    var hasOwn = Object.prototype.hasOwnProperty || function(key) {
      return key in this;
    };
    function has(obj, key) {
      return hasOwn.call(obj, key);
    }
    function toStr(obj) {
      return objectToString.call(obj);
    }
    function nameOf(f) {
      if (f.name) {
        return f.name;
      }
      var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
      if (m) {
        return m[1];
      }
      return null;
    }
    function indexOf(xs, x) {
      if (xs.indexOf) {
        return xs.indexOf(x);
      }
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) {
          return i;
        }
      }
      return -1;
    }
    function isMap(x) {
      if (!mapSize || !x || typeof x !== "object") {
        return false;
      }
      try {
        mapSize.call(x);
        try {
          setSize.call(x);
        } catch (s) {
          return true;
        }
        return x instanceof Map;
      } catch (e) {
      }
      return false;
    }
    function isWeakMap(x) {
      if (!weakMapHas || !x || typeof x !== "object") {
        return false;
      }
      try {
        weakMapHas.call(x, weakMapHas);
        try {
          weakSetHas.call(x, weakSetHas);
        } catch (s) {
          return true;
        }
        return x instanceof WeakMap;
      } catch (e) {
      }
      return false;
    }
    function isWeakRef(x) {
      if (!weakRefDeref || !x || typeof x !== "object") {
        return false;
      }
      try {
        weakRefDeref.call(x);
        return true;
      } catch (e) {
      }
      return false;
    }
    function isSet(x) {
      if (!setSize || !x || typeof x !== "object") {
        return false;
      }
      try {
        setSize.call(x);
        try {
          mapSize.call(x);
        } catch (m) {
          return true;
        }
        return x instanceof Set;
      } catch (e) {
      }
      return false;
    }
    function isWeakSet(x) {
      if (!weakSetHas || !x || typeof x !== "object") {
        return false;
      }
      try {
        weakSetHas.call(x, weakSetHas);
        try {
          weakMapHas.call(x, weakMapHas);
        } catch (s) {
          return true;
        }
        return x instanceof WeakSet;
      } catch (e) {
      }
      return false;
    }
    function isElement(x) {
      if (!x || typeof x !== "object") {
        return false;
      }
      if (typeof HTMLElement !== "undefined" && x instanceof HTMLElement) {
        return true;
      }
      return typeof x.nodeName === "string" && typeof x.getAttribute === "function";
    }
    function inspectString(str, opts) {
      if (str.length > opts.maxStringLength) {
        var remaining = str.length - opts.maxStringLength;
        var trailer = "... " + remaining + " more character" + (remaining > 1 ? "s" : "");
        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
      }
      var quoteRE = quoteREs[opts.quoteStyle || "single"];
      quoteRE.lastIndex = 0;
      var s = $replace.call($replace.call(str, quoteRE, "\\$1"), /[\x00-\x1f]/g, lowbyte);
      return wrapQuotes(s, "single", opts);
    }
    function lowbyte(c) {
      var n = c.charCodeAt(0);
      var x = {
        8: "b",
        9: "t",
        10: "n",
        12: "f",
        13: "r"
      }[n];
      if (x) {
        return "\\" + x;
      }
      return "\\x" + (n < 16 ? "0" : "") + $toUpperCase.call(n.toString(16));
    }
    function markBoxed(str) {
      return "Object(" + str + ")";
    }
    function weakCollectionOf(type) {
      return type + " { ? }";
    }
    function collectionOf(type, size, entries, indent) {
      var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ", ");
      return type + " (" + size + ") {" + joinedEntries + "}";
    }
    function singleLineValues(xs) {
      for (var i = 0; i < xs.length; i++) {
        if (indexOf(xs[i], "\n") >= 0) {
          return false;
        }
      }
      return true;
    }
    function getIndent(opts, depth) {
      var baseIndent;
      if (opts.indent === "	") {
        baseIndent = "	";
      } else if (typeof opts.indent === "number" && opts.indent > 0) {
        baseIndent = $join.call(Array(opts.indent + 1), " ");
      } else {
        return null;
      }
      return {
        base: baseIndent,
        prev: $join.call(Array(depth + 1), baseIndent)
      };
    }
    function indentedJoin(xs, indent) {
      if (xs.length === 0) {
        return "";
      }
      var lineJoiner = "\n" + indent.prev + indent.base;
      return lineJoiner + $join.call(xs, "," + lineJoiner) + "\n" + indent.prev;
    }
    function arrObjKeys(obj, inspect) {
      var isArr = isArray(obj);
      var xs = [];
      if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
          xs[i] = has(obj, i) ? inspect(obj[i], obj) : "";
        }
      }
      var syms = typeof gOPS === "function" ? gOPS(obj) : [];
      var symMap;
      if (hasShammedSymbols) {
        symMap = {};
        for (var k = 0; k < syms.length; k++) {
          symMap["$" + syms[k]] = syms[k];
        }
      }
      for (var key in obj) {
        if (!has(obj, key)) {
          continue;
        }
        if (isArr && String(Number(key)) === key && key < obj.length) {
          continue;
        }
        if (hasShammedSymbols && symMap["$" + key] instanceof Symbol) {
          continue;
        } else if ($test.call(/[^\w$]/, key)) {
          xs.push(inspect(key, obj) + ": " + inspect(obj[key], obj));
        } else {
          xs.push(key + ": " + inspect(obj[key], obj));
        }
      }
      if (typeof gOPS === "function") {
        for (var j = 0; j < syms.length; j++) {
          if (isEnumerable.call(obj, syms[j])) {
            xs.push("[" + inspect(syms[j]) + "]: " + inspect(obj[syms[j]], obj));
          }
        }
      }
      return xs;
    }
  }
});

// node_modules/side-channel-list/index.js
var require_side_channel_list = __commonJS({
  "node_modules/side-channel-list/index.js"(exports2, module2) {
    "use strict";
    var inspect = require_object_inspect();
    var $TypeError = require_type();
    var listGetNode = function(list, key, isDelete) {
      var prev = list;
      var curr;
      for (; (curr = prev.next) != null; prev = curr) {
        if (curr.key === key) {
          prev.next = curr.next;
          if (!isDelete) {
            curr.next = list.next;
            list.next = curr;
          }
          return curr;
        }
      }
    };
    var listGet = function(objects, key) {
      if (!objects) {
        return void 0;
      }
      var node = listGetNode(objects, key);
      return node && node.value;
    };
    var listSet = function(objects, key, value) {
      var node = listGetNode(objects, key);
      if (node) {
        node.value = value;
      } else {
        objects.next = {
          key,
          next: objects.next,
          value
        };
      }
    };
    var listHas = function(objects, key) {
      if (!objects) {
        return false;
      }
      return !!listGetNode(objects, key);
    };
    var listDelete = function(objects, key) {
      if (objects) {
        return listGetNode(objects, key, true);
      }
    };
    module2.exports = function getSideChannelList() {
      var $o;
      var channel = {
        assert: function(key) {
          if (!channel.has(key)) {
            throw new $TypeError("Side channel does not contain " + inspect(key));
          }
        },
        "delete": function(key) {
          var root = $o && $o.next;
          var deletedNode = listDelete($o, key);
          if (deletedNode && root && root === deletedNode) {
            $o = void 0;
          }
          return !!deletedNode;
        },
        get: function(key) {
          return listGet($o, key);
        },
        has: function(key) {
          return listHas($o, key);
        },
        set: function(key, value) {
          if (!$o) {
            $o = {
              next: void 0
            };
          }
          listSet($o, key, value);
        }
      };
      return channel;
    };
  }
});

// node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS({
  "node_modules/es-object-atoms/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Object;
  }
});

// node_modules/es-errors/index.js
var require_es_errors = __commonJS({
  "node_modules/es-errors/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Error;
  }
});

// node_modules/es-errors/eval.js
var require_eval = __commonJS({
  "node_modules/es-errors/eval.js"(exports2, module2) {
    "use strict";
    module2.exports = EvalError;
  }
});

// node_modules/es-errors/range.js
var require_range = __commonJS({
  "node_modules/es-errors/range.js"(exports2, module2) {
    "use strict";
    module2.exports = RangeError;
  }
});

// node_modules/es-errors/ref.js
var require_ref = __commonJS({
  "node_modules/es-errors/ref.js"(exports2, module2) {
    "use strict";
    module2.exports = ReferenceError;
  }
});

// node_modules/es-errors/syntax.js
var require_syntax = __commonJS({
  "node_modules/es-errors/syntax.js"(exports2, module2) {
    "use strict";
    module2.exports = SyntaxError;
  }
});

// node_modules/es-errors/uri.js
var require_uri = __commonJS({
  "node_modules/es-errors/uri.js"(exports2, module2) {
    "use strict";
    module2.exports = URIError;
  }
});

// node_modules/math-intrinsics/abs.js
var require_abs = __commonJS({
  "node_modules/math-intrinsics/abs.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.abs;
  }
});

// node_modules/math-intrinsics/floor.js
var require_floor = __commonJS({
  "node_modules/math-intrinsics/floor.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.floor;
  }
});

// node_modules/math-intrinsics/max.js
var require_max = __commonJS({
  "node_modules/math-intrinsics/max.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.max;
  }
});

// node_modules/math-intrinsics/min.js
var require_min = __commonJS({
  "node_modules/math-intrinsics/min.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.min;
  }
});

// node_modules/math-intrinsics/pow.js
var require_pow = __commonJS({
  "node_modules/math-intrinsics/pow.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.pow;
  }
});

// node_modules/math-intrinsics/round.js
var require_round = __commonJS({
  "node_modules/math-intrinsics/round.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.round;
  }
});

// node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS({
  "node_modules/math-intrinsics/isNaN.js"(exports2, module2) {
    "use strict";
    module2.exports = Number.isNaN || function isNaN2(a) {
      return a !== a;
    };
  }
});

// node_modules/math-intrinsics/sign.js
var require_sign = __commonJS({
  "node_modules/math-intrinsics/sign.js"(exports2, module2) {
    "use strict";
    var $isNaN = require_isNaN();
    module2.exports = function sign(number) {
      if ($isNaN(number) || number === 0) {
        return number;
      }
      return number < 0 ? -1 : 1;
    };
  }
});

// node_modules/gopd/gOPD.js
var require_gOPD = __commonJS({
  "node_modules/gopd/gOPD.js"(exports2, module2) {
    "use strict";
    module2.exports = Object.getOwnPropertyDescriptor;
  }
});

// node_modules/gopd/index.js
var require_gopd = __commonJS({
  "node_modules/gopd/index.js"(exports2, module2) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD) {
      try {
        $gOPD([], "length");
      } catch (e) {
        $gOPD = null;
      }
    }
    module2.exports = $gOPD;
  }
});

// node_modules/es-define-property/index.js
var require_es_define_property = __commonJS({
  "node_modules/es-define-property/index.js"(exports2, module2) {
    "use strict";
    var $defineProperty = Object.defineProperty || false;
    if ($defineProperty) {
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch (e) {
        $defineProperty = false;
      }
    }
    module2.exports = $defineProperty;
  }
});

// node_modules/has-symbols/shams.js
var require_shams = __commonJS({
  "node_modules/has-symbols/shams.js"(exports2, module2) {
    "use strict";
    module2.exports = function hasSymbols() {
      if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
        return false;
      }
      if (typeof Symbol.iterator === "symbol") {
        return true;
      }
      var obj = {};
      var sym = Symbol("test");
      var symObj = Object(sym);
      if (typeof sym === "string") {
        return false;
      }
      if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
        return false;
      }
      if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
        return false;
      }
      var symVal = 42;
      obj[sym] = symVal;
      for (var _ in obj) {
        return false;
      }
      if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
        return false;
      }
      if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
        return false;
      }
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === "function") {
        var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
        if (descriptor.value !== symVal || descriptor.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/has-symbols/index.js
var require_has_symbols = __commonJS({
  "node_modules/has-symbols/index.js"(exports2, module2) {
    "use strict";
    var origSymbol = typeof Symbol !== "undefined" && Symbol;
    var hasSymbolSham = require_shams();
    module2.exports = function hasNativeSymbols() {
      if (typeof origSymbol !== "function") {
        return false;
      }
      if (typeof Symbol !== "function") {
        return false;
      }
      if (typeof origSymbol("foo") !== "symbol") {
        return false;
      }
      if (typeof Symbol("bar") !== "symbol") {
        return false;
      }
      return hasSymbolSham();
    };
  }
});

// node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS({
  "node_modules/get-proto/Reflect.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  }
});

// node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS({
  "node_modules/get-proto/Object.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    var $Object = require_es_object_atoms();
    module2.exports = $Object.getPrototypeOf || null;
  }
});

// node_modules/function-bind/implementation.js
var require_implementation = __commonJS({
  "node_modules/function-bind/implementation.js"(exports2, module2) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
    var toStr = Object.prototype.toString;
    var max = Math.max;
    var funcType = "[object Function]";
    var concatty = function concatty2(a, b) {
      var arr = [];
      for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
      }
      for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
      }
      return arr;
    };
    var slicy = function slicy2(arrLike, offset) {
      var arr = [];
      for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
      }
      return arr;
    };
    var joiny = function(arr, joiner) {
      var str = "";
      for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
          str += joiner;
        }
      }
      return str;
    };
    module2.exports = function bind(that) {
      var target = this;
      if (typeof target !== "function" || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
      }
      var args = slicy(arguments, 1);
      var bound;
      var binder = function() {
        if (this instanceof bound) {
          var result = target.apply(this, concatty(args, arguments));
          if (Object(result) === result) {
            return result;
          }
          return this;
        }
        return target.apply(that, concatty(args, arguments));
      };
      var boundLength = max(0, target.length - args.length);
      var boundArgs = [];
      for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = "$" + i;
      }
      bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
      if (target.prototype) {
        var Empty = function Empty2() {
        };
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
      }
      return bound;
    };
  }
});

// node_modules/function-bind/index.js
var require_function_bind = __commonJS({
  "node_modules/function-bind/index.js"(exports2, module2) {
    "use strict";
    var implementation = require_implementation();
    module2.exports = Function.prototype.bind || implementation;
  }
});

// node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS({
  "node_modules/call-bind-apply-helpers/functionCall.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.call;
  }
});

// node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS({
  "node_modules/call-bind-apply-helpers/functionApply.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.apply;
  }
});

// node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS({
  "node_modules/call-bind-apply-helpers/reflectApply.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  }
});

// node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS({
  "node_modules/call-bind-apply-helpers/actualApply.js"(exports2, module2) {
    "use strict";
    var bind = require_function_bind();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var $reflectApply = require_reflectApply();
    module2.exports = $reflectApply || bind.call($call, $apply);
  }
});

// node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS({
  "node_modules/call-bind-apply-helpers/index.js"(exports2, module2) {
    "use strict";
    var bind = require_function_bind();
    var $TypeError = require_type();
    var $call = require_functionCall();
    var $actualApply = require_actualApply();
    module2.exports = function callBindBasic(args) {
      if (args.length < 1 || typeof args[0] !== "function") {
        throw new $TypeError("a function is required");
      }
      return $actualApply(bind, $call, args);
    };
  }
});

// node_modules/dunder-proto/get.js
var require_get = __commonJS({
  "node_modules/dunder-proto/get.js"(exports2, module2) {
    "use strict";
    var callBind = require_call_bind_apply_helpers();
    var gOPD = require_gopd();
    var hasProtoAccessor;
    try {
      hasProtoAccessor = [].__proto__ === Array.prototype;
    } catch (e) {
      if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
        throw e;
      }
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, "__proto__");
    var $Object = Object;
    var $getPrototypeOf = $Object.getPrototypeOf;
    module2.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? function getDunder(value) {
      return $getPrototypeOf(value == null ? value : $Object(value));
    } : false;
  }
});

// node_modules/get-proto/index.js
var require_get_proto = __commonJS({
  "node_modules/get-proto/index.js"(exports2, module2) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf();
    var originalGetProto = require_Object_getPrototypeOf();
    var getDunderProto = require_get();
    module2.exports = reflectGetProto ? function getProto(O) {
      return reflectGetProto(O);
    } : originalGetProto ? function getProto(O) {
      if (!O || typeof O !== "object" && typeof O !== "function") {
        throw new TypeError("getProto: not an object");
      }
      return originalGetProto(O);
    } : getDunderProto ? function getProto(O) {
      return getDunderProto(O);
    } : null;
  }
});

// node_modules/hasown/index.js
var require_hasown = __commonJS({
  "node_modules/hasown/index.js"(exports2, module2) {
    "use strict";
    var call = Function.prototype.call;
    var $hasOwn = Object.prototype.hasOwnProperty;
    var bind = require_function_bind();
    module2.exports = bind.call(call, $hasOwn);
  }
});

// node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS({
  "node_modules/get-intrinsic/index.js"(exports2, module2) {
    "use strict";
    var undefined2;
    var $Object = require_es_object_atoms();
    var $Error = require_es_errors();
    var $EvalError = require_eval();
    var $RangeError = require_range();
    var $ReferenceError = require_ref();
    var $SyntaxError = require_syntax();
    var $TypeError = require_type();
    var $URIError = require_uri();
    var abs = require_abs();
    var floor = require_floor();
    var max = require_max();
    var min = require_min();
    var pow = require_pow();
    var round = require_round();
    var sign = require_sign();
    var $Function = Function;
    var getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch (e) {
      }
    };
    var $gOPD = require_gopd();
    var $defineProperty = require_es_define_property();
    var throwTypeError = function() {
      throw new $TypeError();
    };
    var ThrowTypeError = $gOPD ? function() {
      try {
        arguments.callee;
        return throwTypeError;
      } catch (calleeThrows) {
        try {
          return $gOPD(arguments, "callee").get;
        } catch (gOPDthrows) {
          return throwTypeError;
        }
      }
    }() : throwTypeError;
    var hasSymbols = require_has_symbols()();
    var getProto = require_get_proto();
    var $ObjectGPO = require_Object_getPrototypeOf();
    var $ReflectGPO = require_Reflect_getPrototypeOf();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var needsEval = {};
    var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
    var INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON === "object" ? JSON : undefined2,
      "%Map%": typeof Map === "undefined" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set === "undefined" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto) {
      try {
        null.error;
      } catch (e) {
        errorProto = getProto(getProto(e));
        INTRINSICS["%Error.prototype%"] = errorProto;
      }
    }
    var errorProto;
    var doEval = function doEval2(name) {
      var value;
      if (name === "%AsyncFunction%") {
        value = getEvalledConstructor("async function () {}");
      } else if (name === "%GeneratorFunction%") {
        value = getEvalledConstructor("function* () {}");
      } else if (name === "%AsyncGeneratorFunction%") {
        value = getEvalledConstructor("async function* () {}");
      } else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        if (fn) {
          value = fn.prototype;
        }
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        if (gen && getProto) {
          value = getProto(gen.prototype);
        }
      }
      INTRINSICS[name] = value;
      return value;
    };
    var LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    };
    var bind = require_function_bind();
    var hasOwn = require_hasown();
    var $concat = bind.call($call, Array.prototype.concat);
    var $spliceApply = bind.call($apply, Array.prototype.splice);
    var $replace = bind.call($call, String.prototype.replace);
    var $strSlice = bind.call($call, String.prototype.slice);
    var $exec = bind.call($call, RegExp.prototype.exec);
    var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var reEscapeChar = /\\(\\)?/g;
    var stringToPath = function stringToPath2(string) {
      var first = $strSlice(string, 0, 1);
      var last = $strSlice(string, -1);
      if (first === "%" && last !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      } else if (last === "%" && first !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      }
      var result = [];
      $replace(string, rePropName, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
      });
      return result;
    };
    var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
      var intrinsicName = name;
      var alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
        alias = LEGACY_ALIASES[intrinsicName];
        intrinsicName = "%" + alias[0] + "%";
      }
      if (hasOwn(INTRINSICS, intrinsicName)) {
        var value = INTRINSICS[intrinsicName];
        if (value === needsEval) {
          value = doEval(intrinsicName);
        }
        if (typeof value === "undefined" && !allowMissing) {
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        }
        return {
          alias,
          name: intrinsicName,
          value
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module2.exports = function GetIntrinsic(name, allowMissing) {
      if (typeof name !== "string" || name.length === 0) {
        throw new $TypeError("intrinsic name must be a non-empty string");
      }
      if (arguments.length > 1 && typeof allowMissing !== "boolean") {
        throw new $TypeError('"allowMissing" argument must be a boolean');
      }
      if ($exec(/^%?[^%]*%?$/, name) === null) {
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      }
      var parts = stringToPath(name);
      var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
      var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
      var intrinsicRealName = intrinsic.name;
      var value = intrinsic.value;
      var skipFurtherCaching = false;
      var alias = intrinsic.alias;
      if (alias) {
        intrinsicBaseName = alias[0];
        $spliceApply(parts, $concat([0, 1], alias));
      }
      for (var i = 1, isOwn = true; i < parts.length; i += 1) {
        var part = parts[i];
        var first = $strSlice(part, 0, 1);
        var last = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
          throw new $SyntaxError("property names with quotes must have matching quotes");
        }
        if (part === "constructor" || !isOwn) {
          skipFurtherCaching = true;
        }
        intrinsicBaseName += "." + part;
        intrinsicRealName = "%" + intrinsicBaseName + "%";
        if (hasOwn(INTRINSICS, intrinsicRealName)) {
          value = INTRINSICS[intrinsicRealName];
        } else if (value != null) {
          if (!(part in value)) {
            if (!allowMissing) {
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            }
            return void 0;
          }
          if ($gOPD && i + 1 >= parts.length) {
            var desc = $gOPD(value, part);
            isOwn = !!desc;
            if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
              value = desc.get;
            } else {
              value = value[part];
            }
          } else {
            isOwn = hasOwn(value, part);
            value = value[part];
          }
          if (isOwn && !skipFurtherCaching) {
            INTRINSICS[intrinsicRealName] = value;
          }
        }
      }
      return value;
    };
  }
});

// node_modules/call-bound/index.js
var require_call_bound = __commonJS({
  "node_modules/call-bound/index.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var callBindBasic = require_call_bind_apply_helpers();
    var $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
    module2.exports = function callBoundIntrinsic(name, allowMissing) {
      var intrinsic = GetIntrinsic(name, !!allowMissing);
      if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
        return callBindBasic([intrinsic]);
      }
      return intrinsic;
    };
  }
});

// node_modules/side-channel-map/index.js
var require_side_channel_map = __commonJS({
  "node_modules/side-channel-map/index.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var callBound = require_call_bound();
    var inspect = require_object_inspect();
    var $TypeError = require_type();
    var $Map = GetIntrinsic("%Map%", true);
    var $mapGet = callBound("Map.prototype.get", true);
    var $mapSet = callBound("Map.prototype.set", true);
    var $mapHas = callBound("Map.prototype.has", true);
    var $mapDelete = callBound("Map.prototype.delete", true);
    var $mapSize = callBound("Map.prototype.size", true);
    module2.exports = !!$Map && function getSideChannelMap() {
      var $m;
      var channel = {
        assert: function(key) {
          if (!channel.has(key)) {
            throw new $TypeError("Side channel does not contain " + inspect(key));
          }
        },
        "delete": function(key) {
          if ($m) {
            var result = $mapDelete($m, key);
            if ($mapSize($m) === 0) {
              $m = void 0;
            }
            return result;
          }
          return false;
        },
        get: function(key) {
          if ($m) {
            return $mapGet($m, key);
          }
        },
        has: function(key) {
          if ($m) {
            return $mapHas($m, key);
          }
          return false;
        },
        set: function(key, value) {
          if (!$m) {
            $m = new $Map();
          }
          $mapSet($m, key, value);
        }
      };
      return channel;
    };
  }
});

// node_modules/side-channel-weakmap/index.js
var require_side_channel_weakmap = __commonJS({
  "node_modules/side-channel-weakmap/index.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var callBound = require_call_bound();
    var inspect = require_object_inspect();
    var getSideChannelMap = require_side_channel_map();
    var $TypeError = require_type();
    var $WeakMap = GetIntrinsic("%WeakMap%", true);
    var $weakMapGet = callBound("WeakMap.prototype.get", true);
    var $weakMapSet = callBound("WeakMap.prototype.set", true);
    var $weakMapHas = callBound("WeakMap.prototype.has", true);
    var $weakMapDelete = callBound("WeakMap.prototype.delete", true);
    module2.exports = $WeakMap ? function getSideChannelWeakMap() {
      var $wm;
      var $m;
      var channel = {
        assert: function(key) {
          if (!channel.has(key)) {
            throw new $TypeError("Side channel does not contain " + inspect(key));
          }
        },
        "delete": function(key) {
          if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
            if ($wm) {
              return $weakMapDelete($wm, key);
            }
          } else if (getSideChannelMap) {
            if ($m) {
              return $m["delete"](key);
            }
          }
          return false;
        },
        get: function(key) {
          if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
            if ($wm) {
              return $weakMapGet($wm, key);
            }
          }
          return $m && $m.get(key);
        },
        has: function(key) {
          if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
            if ($wm) {
              return $weakMapHas($wm, key);
            }
          }
          return !!$m && $m.has(key);
        },
        set: function(key, value) {
          if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
            if (!$wm) {
              $wm = new $WeakMap();
            }
            $weakMapSet($wm, key, value);
          } else if (getSideChannelMap) {
            if (!$m) {
              $m = getSideChannelMap();
            }
            $m.set(key, value);
          }
        }
      };
      return channel;
    } : getSideChannelMap;
  }
});

// node_modules/side-channel/index.js
var require_side_channel = __commonJS({
  "node_modules/side-channel/index.js"(exports2, module2) {
    "use strict";
    var $TypeError = require_type();
    var inspect = require_object_inspect();
    var getSideChannelList = require_side_channel_list();
    var getSideChannelMap = require_side_channel_map();
    var getSideChannelWeakMap = require_side_channel_weakmap();
    var makeChannel = getSideChannelWeakMap || getSideChannelMap || getSideChannelList;
    module2.exports = function getSideChannel() {
      var $channelData;
      var channel = {
        assert: function(key) {
          if (!channel.has(key)) {
            throw new $TypeError("Side channel does not contain " + inspect(key));
          }
        },
        "delete": function(key) {
          return !!$channelData && $channelData["delete"](key);
        },
        get: function(key) {
          return $channelData && $channelData.get(key);
        },
        has: function(key) {
          return !!$channelData && $channelData.has(key);
        },
        set: function(key, value) {
          if (!$channelData) {
            $channelData = makeChannel();
          }
          $channelData.set(key, value);
        }
      };
      return channel;
    };
  }
});

// node_modules/qs/lib/formats.js
var require_formats = __commonJS({
  "node_modules/qs/lib/formats.js"(exports2, module2) {
    "use strict";
    var replace = String.prototype.replace;
    var percentTwenties = /%20/g;
    var Format = {
      RFC1738: "RFC1738",
      RFC3986: "RFC3986"
    };
    module2.exports = {
      "default": Format.RFC3986,
      formatters: {
        RFC1738: function(value) {
          return replace.call(value, percentTwenties, "+");
        },
        RFC3986: function(value) {
          return String(value);
        }
      },
      RFC1738: Format.RFC1738,
      RFC3986: Format.RFC3986
    };
  }
});

// node_modules/qs/lib/utils.js
var require_utils = __commonJS({
  "node_modules/qs/lib/utils.js"(exports2, module2) {
    "use strict";
    var formats = require_formats();
    var has = Object.prototype.hasOwnProperty;
    var isArray = Array.isArray;
    var hexTable = function() {
      var array = [];
      for (var i = 0; i < 256; ++i) {
        array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
      }
      return array;
    }();
    var compactQueue = function compactQueue2(queue) {
      while (queue.length > 1) {
        var item = queue.pop();
        var obj = item.obj[item.prop];
        if (isArray(obj)) {
          var compacted = [];
          for (var j = 0; j < obj.length; ++j) {
            if (typeof obj[j] !== "undefined") {
              compacted.push(obj[j]);
            }
          }
          item.obj[item.prop] = compacted;
        }
      }
    };
    var arrayToObject = function arrayToObject2(source, options) {
      var obj = options && options.plainObjects ? { __proto__: null } : {};
      for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== "undefined") {
          obj[i] = source[i];
        }
      }
      return obj;
    };
    var merge = function merge2(target, source, options) {
      if (!source) {
        return target;
      }
      if (typeof source !== "object" && typeof source !== "function") {
        if (isArray(target)) {
          target.push(source);
        } else if (target && typeof target === "object") {
          if (options && (options.plainObjects || options.allowPrototypes) || !has.call(Object.prototype, source)) {
            target[source] = true;
          }
        } else {
          return [target, source];
        }
        return target;
      }
      if (!target || typeof target !== "object") {
        return [target].concat(source);
      }
      var mergeTarget = target;
      if (isArray(target) && !isArray(source)) {
        mergeTarget = arrayToObject(target, options);
      }
      if (isArray(target) && isArray(source)) {
        source.forEach(function(item, i) {
          if (has.call(target, i)) {
            var targetItem = target[i];
            if (targetItem && typeof targetItem === "object" && item && typeof item === "object") {
              target[i] = merge2(targetItem, item, options);
            } else {
              target.push(item);
            }
          } else {
            target[i] = item;
          }
        });
        return target;
      }
      return Object.keys(source).reduce(function(acc, key) {
        var value = source[key];
        if (has.call(acc, key)) {
          acc[key] = merge2(acc[key], value, options);
        } else {
          acc[key] = value;
        }
        return acc;
      }, mergeTarget);
    };
    var assign = function assignSingleSource(target, source) {
      return Object.keys(source).reduce(function(acc, key) {
        acc[key] = source[key];
        return acc;
      }, target);
    };
    var decode = function(str, defaultDecoder, charset) {
      var strWithoutPlus = str.replace(/\+/g, " ");
      if (charset === "iso-8859-1") {
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
      }
      try {
        return decodeURIComponent(strWithoutPlus);
      } catch (e) {
        return strWithoutPlus;
      }
    };
    var limit = 1024;
    var encode = function encode2(str, defaultEncoder, charset, kind, format) {
      if (str.length === 0) {
        return str;
      }
      var string = str;
      if (typeof str === "symbol") {
        string = Symbol.prototype.toString.call(str);
      } else if (typeof str !== "string") {
        string = String(str);
      }
      if (charset === "iso-8859-1") {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
          return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
        });
      }
      var out = "";
      for (var j = 0; j < string.length; j += limit) {
        var segment = string.length >= limit ? string.slice(j, j + limit) : string;
        var arr = [];
        for (var i = 0; i < segment.length; ++i) {
          var c = segment.charCodeAt(i);
          if (c === 45 || c === 46 || c === 95 || c === 126 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || format === formats.RFC1738 && (c === 40 || c === 41)) {
            arr[arr.length] = segment.charAt(i);
            continue;
          }
          if (c < 128) {
            arr[arr.length] = hexTable[c];
            continue;
          }
          if (c < 2048) {
            arr[arr.length] = hexTable[192 | c >> 6] + hexTable[128 | c & 63];
            continue;
          }
          if (c < 55296 || c >= 57344) {
            arr[arr.length] = hexTable[224 | c >> 12] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
            continue;
          }
          i += 1;
          c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
          arr[arr.length] = hexTable[240 | c >> 18] + hexTable[128 | c >> 12 & 63] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
        }
        out += arr.join("");
      }
      return out;
    };
    var compact = function compact2(value) {
      var queue = [{ obj: { o: value }, prop: "o" }];
      var refs = [];
      for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];
        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
          var key = keys[j];
          var val = obj[key];
          if (typeof val === "object" && val !== null && refs.indexOf(val) === -1) {
            queue.push({ obj, prop: key });
            refs.push(val);
          }
        }
      }
      compactQueue(queue);
      return value;
    };
    var isRegExp = function isRegExp2(obj) {
      return Object.prototype.toString.call(obj) === "[object RegExp]";
    };
    var isBuffer = function isBuffer2(obj) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };
    var combine = function combine2(a, b) {
      return [].concat(a, b);
    };
    var maybeMap = function maybeMap2(val, fn) {
      if (isArray(val)) {
        var mapped = [];
        for (var i = 0; i < val.length; i += 1) {
          mapped.push(fn(val[i]));
        }
        return mapped;
      }
      return fn(val);
    };
    module2.exports = {
      arrayToObject,
      assign,
      combine,
      compact,
      decode,
      encode,
      isBuffer,
      isRegExp,
      maybeMap,
      merge
    };
  }
});

// node_modules/qs/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/qs/lib/stringify.js"(exports2, module2) {
    "use strict";
    var getSideChannel = require_side_channel();
    var utils = require_utils();
    var formats = require_formats();
    var has = Object.prototype.hasOwnProperty;
    var arrayPrefixGenerators = {
      brackets: function brackets(prefix) {
        return prefix + "[]";
      },
      comma: "comma",
      indices: function indices(prefix, key) {
        return prefix + "[" + key + "]";
      },
      repeat: function repeat(prefix) {
        return prefix;
      }
    };
    var isArray = Array.isArray;
    var push = Array.prototype.push;
    var pushToArray = function(arr, valueOrArray) {
      push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
    };
    var toISO = Date.prototype.toISOString;
    var defaultFormat = formats["default"];
    var defaults = {
      addQueryPrefix: false,
      allowDots: false,
      allowEmptyArrays: false,
      arrayFormat: "indices",
      charset: "utf-8",
      charsetSentinel: false,
      commaRoundTrip: false,
      delimiter: "&",
      encode: true,
      encodeDotInKeys: false,
      encoder: utils.encode,
      encodeValuesOnly: false,
      filter: void 0,
      format: defaultFormat,
      formatter: formats.formatters[defaultFormat],
      indices: false,
      serializeDate: function serializeDate(date) {
        return toISO.call(date);
      },
      skipNulls: false,
      strictNullHandling: false
    };
    var isNonNullishPrimitive = function isNonNullishPrimitive2(v) {
      return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
    };
    var sentinel = {};
    var stringify = function stringify2(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
      var obj = object;
      var tmpSc = sideChannel;
      var step = 0;
      var findFlag = false;
      while ((tmpSc = tmpSc.get(sentinel)) !== void 0 && !findFlag) {
        var pos = tmpSc.get(object);
        step += 1;
        if (typeof pos !== "undefined") {
          if (pos === step) {
            throw new RangeError("Cyclic object value");
          } else {
            findFlag = true;
          }
        }
        if (typeof tmpSc.get(sentinel) === "undefined") {
          step = 0;
        }
      }
      if (typeof filter === "function") {
        obj = filter(prefix, obj);
      } else if (obj instanceof Date) {
        obj = serializeDate(obj);
      } else if (generateArrayPrefix === "comma" && isArray(obj)) {
        obj = utils.maybeMap(obj, function(value2) {
          if (value2 instanceof Date) {
            return serializeDate(value2);
          }
          return value2;
        });
      }
      if (obj === null) {
        if (strictNullHandling) {
          return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, "key", format) : prefix;
        }
        obj = "";
      }
      if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
        if (encoder) {
          var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
          return [formatter(keyValue) + "=" + formatter(encoder(obj, defaults.encoder, charset, "value", format))];
        }
        return [formatter(prefix) + "=" + formatter(String(obj))];
      }
      var values = [];
      if (typeof obj === "undefined") {
        return values;
      }
      var objKeys;
      if (generateArrayPrefix === "comma" && isArray(obj)) {
        if (encodeValuesOnly && encoder) {
          obj = utils.maybeMap(obj, encoder);
        }
        objKeys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
      } else if (isArray(filter)) {
        objKeys = filter;
      } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
      }
      var encodedPrefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
      var adjustedPrefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encodedPrefix + "[]" : encodedPrefix;
      if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
        return adjustedPrefix + "[]";
      }
      for (var j = 0; j < objKeys.length; ++j) {
        var key = objKeys[j];
        var value = typeof key === "object" && key && typeof key.value !== "undefined" ? key.value : obj[key];
        if (skipNulls && value === null) {
          continue;
        }
        var encodedKey = allowDots && encodeDotInKeys ? String(key).replace(/\./g, "%2E") : String(key);
        var keyPrefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjustedPrefix, encodedKey) : adjustedPrefix : adjustedPrefix + (allowDots ? "." + encodedKey : "[" + encodedKey + "]");
        sideChannel.set(object, step);
        var valueSideChannel = getSideChannel();
        valueSideChannel.set(sentinel, sideChannel);
        pushToArray(values, stringify2(value, keyPrefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
      }
      return values;
    };
    var normalizeStringifyOptions = function normalizeStringifyOptions2(opts) {
      if (!opts) {
        return defaults;
      }
      if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
        throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
      }
      if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
        throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
      }
      if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
        throw new TypeError("Encoder has to be a function.");
      }
      var charset = opts.charset || defaults.charset;
      if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
      }
      var format = formats["default"];
      if (typeof opts.format !== "undefined") {
        if (!has.call(formats.formatters, opts.format)) {
          throw new TypeError("Unknown format option provided.");
        }
        format = opts.format;
      }
      var formatter = formats.formatters[format];
      var filter = defaults.filter;
      if (typeof opts.filter === "function" || isArray(opts.filter)) {
        filter = opts.filter;
      }
      var arrayFormat;
      if (opts.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = opts.arrayFormat;
      } else if ("indices" in opts) {
        arrayFormat = opts.indices ? "indices" : "repeat";
      } else {
        arrayFormat = defaults.arrayFormat;
      }
      if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
        throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
      }
      var allowDots = typeof opts.allowDots === "undefined" ? opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
      return {
        addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
        allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        arrayFormat,
        charset,
        charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
        commaRoundTrip: !!opts.commaRoundTrip,
        delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
        encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter,
        format,
        formatter,
        serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
        sort: typeof opts.sort === "function" ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
      };
    };
    module2.exports = function(object, opts) {
      var obj = object;
      var options = normalizeStringifyOptions(opts);
      var objKeys;
      var filter;
      if (typeof options.filter === "function") {
        filter = options.filter;
        obj = filter("", obj);
      } else if (isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
      }
      var keys = [];
      if (typeof obj !== "object" || obj === null) {
        return "";
      }
      var generateArrayPrefix = arrayPrefixGenerators[options.arrayFormat];
      var commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
      if (!objKeys) {
        objKeys = Object.keys(obj);
      }
      if (options.sort) {
        objKeys.sort(options.sort);
      }
      var sideChannel = getSideChannel();
      for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];
        var value = obj[key];
        if (options.skipNulls && value === null) {
          continue;
        }
        pushToArray(keys, stringify(value, key, generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
      }
      var joined = keys.join(options.delimiter);
      var prefix = options.addQueryPrefix === true ? "?" : "";
      if (options.charsetSentinel) {
        if (options.charset === "iso-8859-1") {
          prefix += "utf8=%26%2310003%3B&";
        } else {
          prefix += "utf8=%E2%9C%93&";
        }
      }
      return joined.length > 0 ? prefix + joined : "";
    };
  }
});

// node_modules/qs/lib/parse.js
var require_parse = __commonJS({
  "node_modules/qs/lib/parse.js"(exports2, module2) {
    "use strict";
    var utils = require_utils();
    var has = Object.prototype.hasOwnProperty;
    var isArray = Array.isArray;
    var defaults = {
      allowDots: false,
      allowEmptyArrays: false,
      allowPrototypes: false,
      allowSparse: false,
      arrayLimit: 20,
      charset: "utf-8",
      charsetSentinel: false,
      comma: false,
      decodeDotInKeys: false,
      decoder: utils.decode,
      delimiter: "&",
      depth: 5,
      duplicates: "combine",
      ignoreQueryPrefix: false,
      interpretNumericEntities: false,
      parameterLimit: 1e3,
      parseArrays: true,
      plainObjects: false,
      strictDepth: false,
      strictNullHandling: false,
      throwOnLimitExceeded: false
    };
    var interpretNumericEntities = function(str) {
      return str.replace(/&#(\d+);/g, function($0, numberStr) {
        return String.fromCharCode(parseInt(numberStr, 10));
      });
    };
    var parseArrayValue = function(val, options, currentArrayLength) {
      if (val && typeof val === "string" && options.comma && val.indexOf(",") > -1) {
        return val.split(",");
      }
      if (options.throwOnLimitExceeded && currentArrayLength >= options.arrayLimit) {
        throw new RangeError("Array limit exceeded. Only " + options.arrayLimit + " element" + (options.arrayLimit === 1 ? "" : "s") + " allowed in an array.");
      }
      return val;
    };
    var isoSentinel = "utf8=%26%2310003%3B";
    var charsetSentinel = "utf8=%E2%9C%93";
    var parseValues = function parseQueryStringValues(str, options) {
      var obj = { __proto__: null };
      var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, "") : str;
      cleanStr = cleanStr.replace(/%5B/gi, "[").replace(/%5D/gi, "]");
      var limit = options.parameterLimit === Infinity ? void 0 : options.parameterLimit;
      var parts = cleanStr.split(options.delimiter, options.throwOnLimitExceeded ? limit + 1 : limit);
      if (options.throwOnLimitExceeded && parts.length > limit) {
        throw new RangeError("Parameter limit exceeded. Only " + limit + " parameter" + (limit === 1 ? "" : "s") + " allowed.");
      }
      var skipIndex = -1;
      var i;
      var charset = options.charset;
      if (options.charsetSentinel) {
        for (i = 0; i < parts.length; ++i) {
          if (parts[i].indexOf("utf8=") === 0) {
            if (parts[i] === charsetSentinel) {
              charset = "utf-8";
            } else if (parts[i] === isoSentinel) {
              charset = "iso-8859-1";
            }
            skipIndex = i;
            i = parts.length;
          }
        }
      }
      for (i = 0; i < parts.length; ++i) {
        if (i === skipIndex) {
          continue;
        }
        var part = parts[i];
        var bracketEqualsPos = part.indexOf("]=");
        var pos = bracketEqualsPos === -1 ? part.indexOf("=") : bracketEqualsPos + 1;
        var key;
        var val;
        if (pos === -1) {
          key = options.decoder(part, defaults.decoder, charset, "key");
          val = options.strictNullHandling ? null : "";
        } else {
          key = options.decoder(part.slice(0, pos), defaults.decoder, charset, "key");
          val = utils.maybeMap(parseArrayValue(part.slice(pos + 1), options, isArray(obj[key]) ? obj[key].length : 0), function(encodedVal) {
            return options.decoder(encodedVal, defaults.decoder, charset, "value");
          });
        }
        if (val && options.interpretNumericEntities && charset === "iso-8859-1") {
          val = interpretNumericEntities(String(val));
        }
        if (part.indexOf("[]=") > -1) {
          val = isArray(val) ? [val] : val;
        }
        var existing = has.call(obj, key);
        if (existing && options.duplicates === "combine") {
          obj[key] = utils.combine(obj[key], val);
        } else if (!existing || options.duplicates === "last") {
          obj[key] = val;
        }
      }
      return obj;
    };
    var parseObject = function(chain, val, options, valuesParsed) {
      var currentArrayLength = 0;
      if (chain.length > 0 && chain[chain.length - 1] === "[]") {
        var parentKey = chain.slice(0, -1).join("");
        currentArrayLength = Array.isArray(val) && val[parentKey] ? val[parentKey].length : 0;
      }
      var leaf = valuesParsed ? val : parseArrayValue(val, options, currentArrayLength);
      for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];
        if (root === "[]" && options.parseArrays) {
          obj = options.allowEmptyArrays && (leaf === "" || options.strictNullHandling && leaf === null) ? [] : utils.combine([], leaf);
        } else {
          obj = options.plainObjects ? { __proto__: null } : {};
          var cleanRoot = root.charAt(0) === "[" && root.charAt(root.length - 1) === "]" ? root.slice(1, -1) : root;
          var decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, ".") : cleanRoot;
          var index = parseInt(decodedRoot, 10);
          if (!options.parseArrays && decodedRoot === "") {
            obj = { 0: leaf };
          } else if (!isNaN(index) && root !== decodedRoot && String(index) === decodedRoot && index >= 0 && (options.parseArrays && index <= options.arrayLimit)) {
            obj = [];
            obj[index] = leaf;
          } else if (decodedRoot !== "__proto__") {
            obj[decodedRoot] = leaf;
          }
        }
        leaf = obj;
      }
      return leaf;
    };
    var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
      if (!givenKey) {
        return;
      }
      var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, "[$1]") : givenKey;
      var brackets = /(\[[^[\]]*])/;
      var child = /(\[[^[\]]*])/g;
      var segment = options.depth > 0 && brackets.exec(key);
      var parent = segment ? key.slice(0, segment.index) : key;
      var keys = [];
      if (parent) {
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
          if (!options.allowPrototypes) {
            return;
          }
        }
        keys.push(parent);
      }
      var i = 0;
      while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
          if (!options.allowPrototypes) {
            return;
          }
        }
        keys.push(segment[1]);
      }
      if (segment) {
        if (options.strictDepth === true) {
          throw new RangeError("Input depth exceeded depth option of " + options.depth + " and strictDepth is true");
        }
        keys.push("[" + key.slice(segment.index) + "]");
      }
      return parseObject(keys, val, options, valuesParsed);
    };
    var normalizeParseOptions = function normalizeParseOptions2(opts) {
      if (!opts) {
        return defaults;
      }
      if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
        throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
      }
      if (typeof opts.decodeDotInKeys !== "undefined" && typeof opts.decodeDotInKeys !== "boolean") {
        throw new TypeError("`decodeDotInKeys` option can only be `true` or `false`, when provided");
      }
      if (opts.decoder !== null && typeof opts.decoder !== "undefined" && typeof opts.decoder !== "function") {
        throw new TypeError("Decoder has to be a function.");
      }
      if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
      }
      if (typeof opts.throwOnLimitExceeded !== "undefined" && typeof opts.throwOnLimitExceeded !== "boolean") {
        throw new TypeError("`throwOnLimitExceeded` option must be a boolean");
      }
      var charset = typeof opts.charset === "undefined" ? defaults.charset : opts.charset;
      var duplicates = typeof opts.duplicates === "undefined" ? defaults.duplicates : opts.duplicates;
      if (duplicates !== "combine" && duplicates !== "first" && duplicates !== "last") {
        throw new TypeError("The duplicates option must be either combine, first, or last");
      }
      var allowDots = typeof opts.allowDots === "undefined" ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
      return {
        allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        allowPrototypes: typeof opts.allowPrototypes === "boolean" ? opts.allowPrototypes : defaults.allowPrototypes,
        allowSparse: typeof opts.allowSparse === "boolean" ? opts.allowSparse : defaults.allowSparse,
        arrayLimit: typeof opts.arrayLimit === "number" ? opts.arrayLimit : defaults.arrayLimit,
        charset,
        charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
        comma: typeof opts.comma === "boolean" ? opts.comma : defaults.comma,
        decodeDotInKeys: typeof opts.decodeDotInKeys === "boolean" ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
        decoder: typeof opts.decoder === "function" ? opts.decoder : defaults.decoder,
        delimiter: typeof opts.delimiter === "string" || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
        depth: typeof opts.depth === "number" || opts.depth === false ? +opts.depth : defaults.depth,
        duplicates,
        ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
        interpretNumericEntities: typeof opts.interpretNumericEntities === "boolean" ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
        parameterLimit: typeof opts.parameterLimit === "number" ? opts.parameterLimit : defaults.parameterLimit,
        parseArrays: opts.parseArrays !== false,
        plainObjects: typeof opts.plainObjects === "boolean" ? opts.plainObjects : defaults.plainObjects,
        strictDepth: typeof opts.strictDepth === "boolean" ? !!opts.strictDepth : defaults.strictDepth,
        strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling,
        throwOnLimitExceeded: typeof opts.throwOnLimitExceeded === "boolean" ? opts.throwOnLimitExceeded : false
      };
    };
    module2.exports = function(str, opts) {
      var options = normalizeParseOptions(opts);
      if (str === "" || str === null || typeof str === "undefined") {
        return options.plainObjects ? { __proto__: null } : {};
      }
      var tempObj = typeof str === "string" ? parseValues(str, options) : str;
      var obj = options.plainObjects ? { __proto__: null } : {};
      var keys = Object.keys(tempObj);
      for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options, typeof str === "string");
        obj = utils.merge(obj, newObj, options);
      }
      if (options.allowSparse === true) {
        return obj;
      }
      return utils.compact(obj);
    };
  }
});

// node_modules/qs/lib/index.js
var require_lib = __commonJS({
  "node_modules/qs/lib/index.js"(exports2, module2) {
    "use strict";
    var stringify = require_stringify();
    var parse = require_parse();
    var formats = require_formats();
    module2.exports = {
      formats,
      parse,
      stringify
    };
  }
});

// node_modules/stripe/cjs/utils.js
var require_utils2 = __commonJS({
  "node_modules/stripe/cjs/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getAPIMode = exports2.jsonStringifyRequestData = exports2.concat = exports2.createApiKeyAuthenticator = exports2.determineProcessUserAgentProperties = exports2.validateInteger = exports2.flattenAndStringify = exports2.isObject = exports2.emitWarning = exports2.pascalToCamelCase = exports2.callbackifyPromiseWithTimeout = exports2.normalizeHeader = exports2.normalizeHeaders = exports2.removeNullish = exports2.protoExtend = exports2.getOptionsFromArgs = exports2.getDataFromArgs = exports2.extractUrlParams = exports2.makeURLInterpolator = exports2.queryStringifyRequestData = exports2.isOptionsHash = void 0;
    var qs = require_lib();
    var OPTIONS_KEYS = [
      "apiKey",
      "idempotencyKey",
      "stripeAccount",
      "apiVersion",
      "maxNetworkRetries",
      "timeout",
      "host",
      "authenticator",
      "stripeContext",
      "additionalHeaders"
    ];
    function isOptionsHash(o) {
      return o && typeof o === "object" && OPTIONS_KEYS.some((prop) => Object.prototype.hasOwnProperty.call(o, prop));
    }
    exports2.isOptionsHash = isOptionsHash;
    function queryStringifyRequestData(data, apiMode) {
      return qs.stringify(data, {
        serializeDate: (d) => Math.floor(d.getTime() / 1e3).toString(),
        arrayFormat: apiMode == "v2" ? "repeat" : "indices"
      }).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    exports2.queryStringifyRequestData = queryStringifyRequestData;
    exports2.makeURLInterpolator = (() => {
      const rc = {
        "\n": "\\n",
        '"': '\\"',
        "\u2028": "\\u2028",
        "\u2029": "\\u2029"
      };
      return (str) => {
        const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0]);
        return (outputs) => {
          return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) => encodeURIComponent(outputs[$1] || ""));
        };
      };
    })();
    function extractUrlParams(path) {
      const params = path.match(/\{\w+\}/g);
      if (!params) {
        return [];
      }
      return params.map((param) => param.replace(/[{}]/g, ""));
    }
    exports2.extractUrlParams = extractUrlParams;
    function getDataFromArgs(args) {
      if (!Array.isArray(args) || !args[0] || typeof args[0] !== "object") {
        return {};
      }
      if (!isOptionsHash(args[0])) {
        return args.shift();
      }
      const argKeys = Object.keys(args[0]);
      const optionKeysInArgs = argKeys.filter((key) => OPTIONS_KEYS.includes(key));
      if (optionKeysInArgs.length > 0 && optionKeysInArgs.length !== argKeys.length) {
        emitWarning(`Options found in arguments (${optionKeysInArgs.join(", ")}). Did you mean to pass an options object? See https://github.com/stripe/stripe-node/wiki/Passing-Options.`);
      }
      return {};
    }
    exports2.getDataFromArgs = getDataFromArgs;
    function getOptionsFromArgs(args) {
      const opts = {
        host: null,
        headers: {},
        settings: {}
      };
      if (args.length > 0) {
        const arg = args[args.length - 1];
        if (typeof arg === "string") {
          opts.authenticator = createApiKeyAuthenticator(args.pop());
        } else if (isOptionsHash(arg)) {
          const params = Object.assign({}, args.pop());
          const extraKeys = Object.keys(params).filter((key) => !OPTIONS_KEYS.includes(key));
          if (extraKeys.length) {
            emitWarning(`Invalid options found (${extraKeys.join(", ")}); ignoring.`);
          }
          if (params.apiKey) {
            opts.authenticator = createApiKeyAuthenticator(params.apiKey);
          }
          if (params.idempotencyKey) {
            opts.headers["Idempotency-Key"] = params.idempotencyKey;
          }
          if (params.stripeAccount) {
            opts.headers["Stripe-Account"] = params.stripeAccount;
          }
          if (params.stripeContext) {
            if (opts.headers["Stripe-Account"]) {
              throw new Error("Can't specify both stripeAccount and stripeContext.");
            }
            opts.headers["Stripe-Context"] = params.stripeContext;
          }
          if (params.apiVersion) {
            opts.headers["Stripe-Version"] = params.apiVersion;
          }
          if (Number.isInteger(params.maxNetworkRetries)) {
            opts.settings.maxNetworkRetries = params.maxNetworkRetries;
          }
          if (Number.isInteger(params.timeout)) {
            opts.settings.timeout = params.timeout;
          }
          if (params.host) {
            opts.host = params.host;
          }
          if (params.authenticator) {
            if (params.apiKey) {
              throw new Error("Can't specify both apiKey and authenticator.");
            }
            if (typeof params.authenticator !== "function") {
              throw new Error("The authenticator must be a function receiving a request as the first parameter.");
            }
            opts.authenticator = params.authenticator;
          }
          if (params.additionalHeaders) {
            opts.headers = params.additionalHeaders;
          }
        }
      }
      return opts;
    }
    exports2.getOptionsFromArgs = getOptionsFromArgs;
    function protoExtend(sub) {
      const Super = this;
      const Constructor = Object.prototype.hasOwnProperty.call(sub, "constructor") ? sub.constructor : function(...args) {
        Super.apply(this, args);
      };
      Object.assign(Constructor, Super);
      Constructor.prototype = Object.create(Super.prototype);
      Object.assign(Constructor.prototype, sub);
      return Constructor;
    }
    exports2.protoExtend = protoExtend;
    function removeNullish(obj) {
      if (typeof obj !== "object") {
        throw new Error("Argument must be an object");
      }
      return Object.keys(obj).reduce((result, key) => {
        if (obj[key] != null) {
          result[key] = obj[key];
        }
        return result;
      }, {});
    }
    exports2.removeNullish = removeNullish;
    function normalizeHeaders(obj) {
      if (!(obj && typeof obj === "object")) {
        return obj;
      }
      return Object.keys(obj).reduce((result, header) => {
        result[normalizeHeader(header)] = obj[header];
        return result;
      }, {});
    }
    exports2.normalizeHeaders = normalizeHeaders;
    function normalizeHeader(header) {
      return header.split("-").map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase()).join("-");
    }
    exports2.normalizeHeader = normalizeHeader;
    function callbackifyPromiseWithTimeout(promise, callback) {
      if (callback) {
        return promise.then((res) => {
          setTimeout(() => {
            callback(null, res);
          }, 0);
        }, (err) => {
          setTimeout(() => {
            callback(err, null);
          }, 0);
        });
      }
      return promise;
    }
    exports2.callbackifyPromiseWithTimeout = callbackifyPromiseWithTimeout;
    function pascalToCamelCase(name) {
      if (name === "OAuth") {
        return "oauth";
      } else {
        return name[0].toLowerCase() + name.substring(1);
      }
    }
    exports2.pascalToCamelCase = pascalToCamelCase;
    function emitWarning(warning) {
      if (typeof process.emitWarning !== "function") {
        return console.warn(`Stripe: ${warning}`);
      }
      return process.emitWarning(warning, "Stripe");
    }
    exports2.emitWarning = emitWarning;
    function isObject(obj) {
      const type = typeof obj;
      return (type === "function" || type === "object") && !!obj;
    }
    exports2.isObject = isObject;
    function flattenAndStringify(data) {
      const result = {};
      const step = (obj, prevKey) => {
        Object.entries(obj).forEach(([key, value]) => {
          const newKey = prevKey ? `${prevKey}[${key}]` : key;
          if (isObject(value)) {
            if (!(value instanceof Uint8Array) && !Object.prototype.hasOwnProperty.call(value, "data")) {
              return step(value, newKey);
            } else {
              result[newKey] = value;
            }
          } else {
            result[newKey] = String(value);
          }
        });
      };
      step(data, null);
      return result;
    }
    exports2.flattenAndStringify = flattenAndStringify;
    function validateInteger(name, n, defaultVal) {
      if (!Number.isInteger(n)) {
        if (defaultVal !== void 0) {
          return defaultVal;
        } else {
          throw new Error(`${name} must be an integer`);
        }
      }
      return n;
    }
    exports2.validateInteger = validateInteger;
    function determineProcessUserAgentProperties() {
      return typeof process === "undefined" ? {} : {
        lang_version: process.version,
        platform: process.platform
      };
    }
    exports2.determineProcessUserAgentProperties = determineProcessUserAgentProperties;
    function createApiKeyAuthenticator(apiKey) {
      const authenticator = (request) => {
        request.headers.Authorization = "Bearer " + apiKey;
        return Promise.resolve();
      };
      authenticator._apiKey = apiKey;
      return authenticator;
    }
    exports2.createApiKeyAuthenticator = createApiKeyAuthenticator;
    function concat(arrays) {
      const totalLength = arrays.reduce((len, array) => len + array.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      arrays.forEach((array) => {
        merged.set(array, offset);
        offset += array.length;
      });
      return merged;
    }
    exports2.concat = concat;
    function dateTimeReplacer(key, value) {
      if (this[key] instanceof Date) {
        return Math.floor(this[key].getTime() / 1e3).toString();
      }
      return value;
    }
    function jsonStringifyRequestData(data) {
      return JSON.stringify(data, dateTimeReplacer);
    }
    exports2.jsonStringifyRequestData = jsonStringifyRequestData;
    function getAPIMode(path) {
      if (!path) {
        return "v1";
      }
      return path.startsWith("/v2") ? "v2" : "v1";
    }
    exports2.getAPIMode = getAPIMode;
  }
});

// node_modules/stripe/cjs/platform/NodePlatformFunctions.js
var require_NodePlatformFunctions = __commonJS({
  "node_modules/stripe/cjs/platform/NodePlatformFunctions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NodePlatformFunctions = void 0;
    var crypto2 = require("crypto");
    var events_1 = require("events");
    var NodeCryptoProvider_js_1 = require_NodeCryptoProvider();
    var NodeHttpClient_js_1 = require_NodeHttpClient();
    var PlatformFunctions_js_1 = require_PlatformFunctions();
    var Error_js_1 = require_Error();
    var utils_js_1 = require_utils2();
    var child_process_1 = require("child_process");
    var StreamProcessingError = class extends Error_js_1.StripeError {
    };
    var NodePlatformFunctions = class extends PlatformFunctions_js_1.PlatformFunctions {
      constructor() {
        super();
        this._exec = child_process_1.exec;
        this._UNAME_CACHE = null;
      }
      uuid4() {
        if (crypto2.randomUUID) {
          return crypto2.randomUUID();
        }
        return super.uuid4();
      }
      getUname() {
        if (!this._UNAME_CACHE) {
          this._UNAME_CACHE = new Promise((resolve, reject) => {
            try {
              this._exec("uname -a", (err, uname) => {
                if (err) {
                  return resolve(null);
                }
                resolve(uname);
              });
            } catch (e) {
              resolve(null);
            }
          });
        }
        return this._UNAME_CACHE;
      }
      secureCompare(a, b) {
        if (!a || !b) {
          throw new Error("secureCompare must receive two arguments");
        }
        if (a.length !== b.length) {
          return false;
        }
        if (crypto2.timingSafeEqual) {
          const textEncoder = new TextEncoder();
          const aEncoded = textEncoder.encode(a);
          const bEncoded = textEncoder.encode(b);
          return crypto2.timingSafeEqual(aEncoded, bEncoded);
        }
        return super.secureCompare(a, b);
      }
      createEmitter() {
        return new events_1.EventEmitter();
      }
      tryBufferData(data) {
        if (!(data.file.data instanceof events_1.EventEmitter)) {
          return Promise.resolve(data);
        }
        const bufferArray = [];
        return new Promise((resolve, reject) => {
          data.file.data.on("data", (line) => {
            bufferArray.push(line);
          }).once("end", () => {
            const bufferData = Object.assign({}, data);
            bufferData.file.data = (0, utils_js_1.concat)(bufferArray);
            resolve(bufferData);
          }).on("error", (err) => {
            reject(new StreamProcessingError({
              message: "An error occurred while attempting to process the file for upload.",
              detail: err
            }));
          });
        });
      }
      createNodeHttpClient(agent) {
        return new NodeHttpClient_js_1.NodeHttpClient(agent);
      }
      createDefaultHttpClient() {
        return new NodeHttpClient_js_1.NodeHttpClient();
      }
      createNodeCryptoProvider() {
        return new NodeCryptoProvider_js_1.NodeCryptoProvider();
      }
      createDefaultCryptoProvider() {
        return this.createNodeCryptoProvider();
      }
    };
    exports2.NodePlatformFunctions = NodePlatformFunctions;
  }
});

// node_modules/stripe/cjs/RequestSender.js
var require_RequestSender = __commonJS({
  "node_modules/stripe/cjs/RequestSender.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RequestSender = void 0;
    var Error_js_1 = require_Error();
    var HttpClient_js_1 = require_HttpClient();
    var utils_js_1 = require_utils2();
    var MAX_RETRY_AFTER_WAIT = 60;
    var RequestSender = class {
      constructor(stripe2, maxBufferedRequestMetric) {
        this._stripe = stripe2;
        this._maxBufferedRequestMetric = maxBufferedRequestMetric;
      }
      _addHeadersDirectlyToObject(obj, headers) {
        obj.requestId = headers["request-id"];
        obj.stripeAccount = obj.stripeAccount || headers["stripe-account"];
        obj.apiVersion = obj.apiVersion || headers["stripe-version"];
        obj.idempotencyKey = obj.idempotencyKey || headers["idempotency-key"];
      }
      _makeResponseEvent(requestEvent, statusCode, headers) {
        const requestEndTime = Date.now();
        const requestDurationMs = requestEndTime - requestEvent.request_start_time;
        return (0, utils_js_1.removeNullish)({
          api_version: headers["stripe-version"],
          account: headers["stripe-account"],
          idempotency_key: headers["idempotency-key"],
          method: requestEvent.method,
          path: requestEvent.path,
          status: statusCode,
          request_id: this._getRequestId(headers),
          elapsed: requestDurationMs,
          request_start_time: requestEvent.request_start_time,
          request_end_time: requestEndTime
        });
      }
      _getRequestId(headers) {
        return headers["request-id"];
      }
      _streamingResponseHandler(requestEvent, usage, callback) {
        return (res) => {
          const headers = res.getHeaders();
          const streamCompleteCallback = () => {
            const responseEvent = this._makeResponseEvent(requestEvent, res.getStatusCode(), headers);
            this._stripe._emitter.emit("response", responseEvent);
            this._recordRequestMetrics(this._getRequestId(headers), responseEvent.elapsed, usage);
          };
          const stream = res.toStream(streamCompleteCallback);
          this._addHeadersDirectlyToObject(stream, headers);
          return callback(null, stream);
        };
      }
      _jsonResponseHandler(requestEvent, apiMode, usage, callback) {
        return (res) => {
          const headers = res.getHeaders();
          const requestId = this._getRequestId(headers);
          const statusCode = res.getStatusCode();
          const responseEvent = this._makeResponseEvent(requestEvent, statusCode, headers);
          this._stripe._emitter.emit("response", responseEvent);
          res.toJSON().then((jsonResponse) => {
            if (jsonResponse.error) {
              let err;
              if (typeof jsonResponse.error === "string") {
                jsonResponse.error = {
                  type: jsonResponse.error,
                  message: jsonResponse.error_description
                };
              }
              jsonResponse.error.headers = headers;
              jsonResponse.error.statusCode = statusCode;
              jsonResponse.error.requestId = requestId;
              if (statusCode === 401) {
                err = new Error_js_1.StripeAuthenticationError(jsonResponse.error);
              } else if (statusCode === 403) {
                err = new Error_js_1.StripePermissionError(jsonResponse.error);
              } else if (statusCode === 429) {
                err = new Error_js_1.StripeRateLimitError(jsonResponse.error);
              } else if (apiMode === "v2") {
                err = (0, Error_js_1.generateV2Error)(jsonResponse.error);
              } else {
                err = (0, Error_js_1.generateV1Error)(jsonResponse.error);
              }
              throw err;
            }
            return jsonResponse;
          }, (e) => {
            throw new Error_js_1.StripeAPIError({
              message: "Invalid JSON received from the Stripe API",
              exception: e,
              requestId: headers["request-id"]
            });
          }).then((jsonResponse) => {
            this._recordRequestMetrics(requestId, responseEvent.elapsed, usage);
            const rawResponse = res.getRawResponse();
            this._addHeadersDirectlyToObject(rawResponse, headers);
            Object.defineProperty(jsonResponse, "lastResponse", {
              enumerable: false,
              writable: false,
              value: rawResponse
            });
            callback(null, jsonResponse);
          }, (e) => callback(e, null));
        };
      }
      static _generateConnectionErrorMessage(requestRetries) {
        return `An error occurred with our connection to Stripe.${requestRetries > 0 ? ` Request was retried ${requestRetries} times.` : ""}`;
      }
      static _shouldRetry(res, numRetries, maxRetries, error) {
        if (error && numRetries === 0 && HttpClient_js_1.HttpClient.CONNECTION_CLOSED_ERROR_CODES.includes(error.code)) {
          return true;
        }
        if (numRetries >= maxRetries) {
          return false;
        }
        if (!res) {
          return true;
        }
        if (res.getHeaders()["stripe-should-retry"] === "false") {
          return false;
        }
        if (res.getHeaders()["stripe-should-retry"] === "true") {
          return true;
        }
        if (res.getStatusCode() === 409) {
          return true;
        }
        if (res.getStatusCode() >= 500) {
          return true;
        }
        return false;
      }
      _getSleepTimeInMS(numRetries, retryAfter = null) {
        const initialNetworkRetryDelay = this._stripe.getInitialNetworkRetryDelay();
        const maxNetworkRetryDelay = this._stripe.getMaxNetworkRetryDelay();
        let sleepSeconds = Math.min(initialNetworkRetryDelay * Math.pow(2, numRetries - 1), maxNetworkRetryDelay);
        sleepSeconds *= 0.5 * (1 + Math.random());
        sleepSeconds = Math.max(initialNetworkRetryDelay, sleepSeconds);
        if (Number.isInteger(retryAfter) && retryAfter <= MAX_RETRY_AFTER_WAIT) {
          sleepSeconds = Math.max(sleepSeconds, retryAfter);
        }
        return sleepSeconds * 1e3;
      }
      _getMaxNetworkRetries(settings = {}) {
        return settings.maxNetworkRetries !== void 0 && Number.isInteger(settings.maxNetworkRetries) ? settings.maxNetworkRetries : this._stripe.getMaxNetworkRetries();
      }
      _defaultIdempotencyKey(method, settings, apiMode) {
        const maxRetries = this._getMaxNetworkRetries(settings);
        const genKey = () => `stripe-node-retry-${this._stripe._platformFunctions.uuid4()}`;
        if (apiMode === "v2") {
          if (method === "POST" || method === "DELETE") {
            return genKey();
          }
        } else if (apiMode === "v1") {
          if (method === "POST" && maxRetries > 0) {
            return genKey();
          }
        }
        return null;
      }
      _makeHeaders({ contentType, contentLength, apiVersion, clientUserAgent, method, userSuppliedHeaders, userSuppliedSettings, stripeAccount, stripeContext, apiMode }) {
        const defaultHeaders = {
          Accept: "application/json",
          "Content-Type": contentType,
          "User-Agent": this._getUserAgentString(apiMode),
          "X-Stripe-Client-User-Agent": clientUserAgent,
          "X-Stripe-Client-Telemetry": this._getTelemetryHeader(),
          "Stripe-Version": apiVersion,
          "Stripe-Account": stripeAccount,
          "Stripe-Context": stripeContext,
          "Idempotency-Key": this._defaultIdempotencyKey(method, userSuppliedSettings, apiMode)
        };
        const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
        if (methodHasPayload || contentLength) {
          if (!methodHasPayload) {
            (0, utils_js_1.emitWarning)(`${method} method had non-zero contentLength but no payload is expected for this verb`);
          }
          defaultHeaders["Content-Length"] = contentLength;
        }
        return Object.assign((0, utils_js_1.removeNullish)(defaultHeaders), (0, utils_js_1.normalizeHeaders)(userSuppliedHeaders));
      }
      _getUserAgentString(apiMode) {
        const packageVersion = this._stripe.getConstant("PACKAGE_VERSION");
        const appInfo = this._stripe._appInfo ? this._stripe.getAppInfoAsString() : "";
        return `Stripe/${apiMode} NodeBindings/${packageVersion} ${appInfo}`.trim();
      }
      _getTelemetryHeader() {
        if (this._stripe.getTelemetryEnabled() && this._stripe._prevRequestMetrics.length > 0) {
          const metrics = this._stripe._prevRequestMetrics.shift();
          return JSON.stringify({
            last_request_metrics: metrics
          });
        }
      }
      _recordRequestMetrics(requestId, requestDurationMs, usage) {
        if (this._stripe.getTelemetryEnabled() && requestId) {
          if (this._stripe._prevRequestMetrics.length > this._maxBufferedRequestMetric) {
            (0, utils_js_1.emitWarning)("Request metrics buffer is full, dropping telemetry message.");
          } else {
            const m = {
              request_id: requestId,
              request_duration_ms: requestDurationMs
            };
            if (usage && usage.length > 0) {
              m.usage = usage;
            }
            this._stripe._prevRequestMetrics.push(m);
          }
        }
      }
      _rawRequest(method, path, params, options) {
        const requestPromise = new Promise((resolve, reject) => {
          let opts;
          try {
            const requestMethod = method.toUpperCase();
            if (requestMethod !== "POST" && params && Object.keys(params).length !== 0) {
              throw new Error("rawRequest only supports params on POST requests. Please pass null and add your parameters to path.");
            }
            const args = [].slice.call([params, options]);
            const dataFromArgs = (0, utils_js_1.getDataFromArgs)(args);
            const data = Object.assign({}, dataFromArgs);
            const calculatedOptions = (0, utils_js_1.getOptionsFromArgs)(args);
            const headers2 = calculatedOptions.headers;
            const authenticator2 = calculatedOptions.authenticator;
            opts = {
              requestMethod,
              requestPath: path,
              bodyData: data,
              queryData: {},
              authenticator: authenticator2,
              headers: headers2,
              host: null,
              streaming: false,
              settings: {},
              usage: ["raw_request"]
            };
          } catch (err) {
            reject(err);
            return;
          }
          function requestCallback(err, response) {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          }
          const { headers, settings } = opts;
          const authenticator = opts.authenticator;
          this._request(opts.requestMethod, opts.host, path, opts.bodyData, authenticator, { headers, settings, streaming: opts.streaming }, opts.usage, requestCallback);
        });
        return requestPromise;
      }
      _request(method, host, path, data, authenticator, options, usage = [], callback, requestDataProcessor = null) {
        var _a;
        let requestData;
        authenticator = (_a = authenticator !== null && authenticator !== void 0 ? authenticator : this._stripe._authenticator) !== null && _a !== void 0 ? _a : null;
        const apiMode = (0, utils_js_1.getAPIMode)(path);
        const retryRequest = (requestFn, apiVersion, headers, requestRetries, retryAfter) => {
          return setTimeout(requestFn, this._getSleepTimeInMS(requestRetries, retryAfter), apiVersion, headers, requestRetries + 1);
        };
        const makeRequest = (apiVersion, headers, numRetries) => {
          const timeout = options.settings && options.settings.timeout && Number.isInteger(options.settings.timeout) && options.settings.timeout >= 0 ? options.settings.timeout : this._stripe.getApiField("timeout");
          const request = {
            host: host || this._stripe.getApiField("host"),
            port: this._stripe.getApiField("port"),
            path,
            method,
            headers: Object.assign({}, headers),
            body: requestData,
            protocol: this._stripe.getApiField("protocol")
          };
          authenticator(request).then(() => {
            const req = this._stripe.getApiField("httpClient").makeRequest(request.host, request.port, request.path, request.method, request.headers, request.body, request.protocol, timeout);
            const requestStartTime = Date.now();
            const requestEvent = (0, utils_js_1.removeNullish)({
              api_version: apiVersion,
              account: headers["Stripe-Account"],
              idempotency_key: headers["Idempotency-Key"],
              method,
              path,
              request_start_time: requestStartTime
            });
            const requestRetries = numRetries || 0;
            const maxRetries = this._getMaxNetworkRetries(options.settings || {});
            this._stripe._emitter.emit("request", requestEvent);
            req.then((res) => {
              if (RequestSender._shouldRetry(res, requestRetries, maxRetries)) {
                return retryRequest(makeRequest, apiVersion, headers, requestRetries, res.getHeaders()["retry-after"]);
              } else if (options.streaming && res.getStatusCode() < 400) {
                return this._streamingResponseHandler(requestEvent, usage, callback)(res);
              } else {
                return this._jsonResponseHandler(requestEvent, apiMode, usage, callback)(res);
              }
            }).catch((error) => {
              if (RequestSender._shouldRetry(null, requestRetries, maxRetries, error)) {
                return retryRequest(makeRequest, apiVersion, headers, requestRetries, null);
              } else {
                const isTimeoutError = error.code && error.code === HttpClient_js_1.HttpClient.TIMEOUT_ERROR_CODE;
                return callback(new Error_js_1.StripeConnectionError({
                  message: isTimeoutError ? `Request aborted due to timeout being reached (${timeout}ms)` : RequestSender._generateConnectionErrorMessage(requestRetries),
                  detail: error
                }));
              }
            });
          }).catch((e) => {
            throw new Error_js_1.StripeError({
              message: "Unable to authenticate the request",
              exception: e
            });
          });
        };
        const prepareAndMakeRequest = (error, data2) => {
          if (error) {
            return callback(error);
          }
          requestData = data2;
          this._stripe.getClientUserAgent((clientUserAgent) => {
            const apiVersion = this._stripe.getApiField("version");
            const headers = this._makeHeaders({
              contentType: apiMode == "v2" ? "application/json" : "application/x-www-form-urlencoded",
              contentLength: requestData.length,
              apiVersion,
              clientUserAgent,
              method,
              userSuppliedHeaders: options.headers,
              userSuppliedSettings: options.settings,
              stripeAccount: apiMode == "v2" ? null : this._stripe.getApiField("stripeAccount"),
              stripeContext: apiMode == "v2" ? this._stripe.getApiField("stripeContext") : null,
              apiMode
            });
            makeRequest(apiVersion, headers, 0);
          });
        };
        if (requestDataProcessor) {
          requestDataProcessor(method, data, options.headers, prepareAndMakeRequest);
        } else {
          let stringifiedData;
          if (apiMode == "v2") {
            stringifiedData = data ? (0, utils_js_1.jsonStringifyRequestData)(data) : "";
          } else {
            stringifiedData = (0, utils_js_1.queryStringifyRequestData)(data || {}, apiMode);
          }
          prepareAndMakeRequest(null, stringifiedData);
        }
      }
    };
    exports2.RequestSender = RequestSender;
  }
});

// node_modules/stripe/cjs/autoPagination.js
var require_autoPagination = __commonJS({
  "node_modules/stripe/cjs/autoPagination.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeAutoPaginationMethods = void 0;
    var utils_js_1 = require_utils2();
    var V1Iterator = class {
      constructor(firstPagePromise, requestArgs, spec, stripeResource) {
        this.index = 0;
        this.pagePromise = firstPagePromise;
        this.promiseCache = { currentPromise: null };
        this.requestArgs = requestArgs;
        this.spec = spec;
        this.stripeResource = stripeResource;
      }
      async iterate(pageResult) {
        if (!(pageResult && pageResult.data && typeof pageResult.data.length === "number")) {
          throw Error("Unexpected: Stripe API response does not have a well-formed `data` array.");
        }
        const reverseIteration = isReverseIteration(this.requestArgs);
        if (this.index < pageResult.data.length) {
          const idx = reverseIteration ? pageResult.data.length - 1 - this.index : this.index;
          const value = pageResult.data[idx];
          this.index += 1;
          return { value, done: false };
        } else if (pageResult.has_more) {
          this.index = 0;
          this.pagePromise = this.getNextPage(pageResult);
          const nextPageResult = await this.pagePromise;
          return this.iterate(nextPageResult);
        }
        return { done: true, value: void 0 };
      }
      getNextPage(_pageResult) {
        throw new Error("Unimplemented");
      }
      async _next() {
        return this.iterate(await this.pagePromise);
      }
      next() {
        if (this.promiseCache.currentPromise) {
          return this.promiseCache.currentPromise;
        }
        const nextPromise = (async () => {
          const ret = await this._next();
          this.promiseCache.currentPromise = null;
          return ret;
        })();
        this.promiseCache.currentPromise = nextPromise;
        return nextPromise;
      }
    };
    var V1ListIterator = class extends V1Iterator {
      getNextPage(pageResult) {
        const reverseIteration = isReverseIteration(this.requestArgs);
        const lastId = getLastId(pageResult, reverseIteration);
        return this.stripeResource._makeRequest(this.requestArgs, this.spec, {
          [reverseIteration ? "ending_before" : "starting_after"]: lastId
        });
      }
    };
    var V1SearchIterator = class extends V1Iterator {
      getNextPage(pageResult) {
        if (!pageResult.next_page) {
          throw Error("Unexpected: Stripe API response does not have a well-formed `next_page` field, but `has_more` was true.");
        }
        return this.stripeResource._makeRequest(this.requestArgs, this.spec, {
          page: pageResult.next_page
        });
      }
    };
    var V2ListIterator = class {
      constructor(firstPagePromise, requestArgs, spec, stripeResource) {
        this.currentPageIterator = (async () => {
          const page = await firstPagePromise;
          return page.data[Symbol.iterator]();
        })();
        this.nextPageUrl = (async () => {
          const page = await firstPagePromise;
          return page.next_page_url || null;
        })();
        this.requestArgs = requestArgs;
        this.spec = spec;
        this.stripeResource = stripeResource;
      }
      async turnPage() {
        const nextPageUrl = await this.nextPageUrl;
        if (!nextPageUrl)
          return null;
        this.spec.fullPath = nextPageUrl;
        const page = await this.stripeResource._makeRequest([], this.spec, {});
        this.nextPageUrl = Promise.resolve(page.next_page_url);
        this.currentPageIterator = Promise.resolve(page.data[Symbol.iterator]());
        return this.currentPageIterator;
      }
      async next() {
        {
          const result2 = (await this.currentPageIterator).next();
          if (!result2.done)
            return { done: false, value: result2.value };
        }
        const nextPageIterator = await this.turnPage();
        if (!nextPageIterator) {
          return { done: true, value: void 0 };
        }
        const result = nextPageIterator.next();
        if (!result.done)
          return { done: false, value: result.value };
        return { done: true, value: void 0 };
      }
    };
    var makeAutoPaginationMethods = (stripeResource, requestArgs, spec, firstPagePromise) => {
      const apiMode = (0, utils_js_1.getAPIMode)(spec.fullPath || spec.path);
      if (apiMode !== "v2" && spec.methodType === "search") {
        return makeAutoPaginationMethodsFromIterator(new V1SearchIterator(firstPagePromise, requestArgs, spec, stripeResource));
      }
      if (apiMode !== "v2" && spec.methodType === "list") {
        return makeAutoPaginationMethodsFromIterator(new V1ListIterator(firstPagePromise, requestArgs, spec, stripeResource));
      }
      if (apiMode === "v2" && spec.methodType === "list") {
        return makeAutoPaginationMethodsFromIterator(new V2ListIterator(firstPagePromise, requestArgs, spec, stripeResource));
      }
      return null;
    };
    exports2.makeAutoPaginationMethods = makeAutoPaginationMethods;
    var makeAutoPaginationMethodsFromIterator = (iterator) => {
      const autoPagingEach = makeAutoPagingEach((...args) => iterator.next(...args));
      const autoPagingToArray = makeAutoPagingToArray(autoPagingEach);
      const autoPaginationMethods = {
        autoPagingEach,
        autoPagingToArray,
        next: () => iterator.next(),
        return: () => {
          return {};
        },
        [getAsyncIteratorSymbol()]: () => {
          return autoPaginationMethods;
        }
      };
      return autoPaginationMethods;
    };
    function getAsyncIteratorSymbol() {
      if (typeof Symbol !== "undefined" && Symbol.asyncIterator) {
        return Symbol.asyncIterator;
      }
      return "@@asyncIterator";
    }
    function getDoneCallback(args) {
      if (args.length < 2) {
        return null;
      }
      const onDone = args[1];
      if (typeof onDone !== "function") {
        throw Error(`The second argument to autoPagingEach, if present, must be a callback function; received ${typeof onDone}`);
      }
      return onDone;
    }
    function getItemCallback(args) {
      if (args.length === 0) {
        return void 0;
      }
      const onItem = args[0];
      if (typeof onItem !== "function") {
        throw Error(`The first argument to autoPagingEach, if present, must be a callback function; received ${typeof onItem}`);
      }
      if (onItem.length === 2) {
        return onItem;
      }
      if (onItem.length > 2) {
        throw Error(`The \`onItem\` callback function passed to autoPagingEach must accept at most two arguments; got ${onItem}`);
      }
      return function _onItem(item, next) {
        const shouldContinue = onItem(item);
        next(shouldContinue);
      };
    }
    function getLastId(listResult, reverseIteration) {
      const lastIdx = reverseIteration ? 0 : listResult.data.length - 1;
      const lastItem = listResult.data[lastIdx];
      const lastId = lastItem && lastItem.id;
      if (!lastId) {
        throw Error("Unexpected: No `id` found on the last item while auto-paging a list.");
      }
      return lastId;
    }
    function makeAutoPagingEach(asyncIteratorNext) {
      return function autoPagingEach() {
        const args = [].slice.call(arguments);
        const onItem = getItemCallback(args);
        const onDone = getDoneCallback(args);
        if (args.length > 2) {
          throw Error(`autoPagingEach takes up to two arguments; received ${args}`);
        }
        const autoPagePromise = wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem);
        return (0, utils_js_1.callbackifyPromiseWithTimeout)(autoPagePromise, onDone);
      };
    }
    function makeAutoPagingToArray(autoPagingEach) {
      return function autoPagingToArray(opts, onDone) {
        const limit = opts && opts.limit;
        if (!limit) {
          throw Error("You must pass a `limit` option to autoPagingToArray, e.g., `autoPagingToArray({limit: 1000});`.");
        }
        if (limit > 1e4) {
          throw Error("You cannot specify a limit of more than 10,000 items to fetch in `autoPagingToArray`; use `autoPagingEach` to iterate through longer lists.");
        }
        const promise = new Promise((resolve, reject) => {
          const items = [];
          autoPagingEach((item) => {
            items.push(item);
            if (items.length >= limit) {
              return false;
            }
          }).then(() => {
            resolve(items);
          }).catch(reject);
        });
        return (0, utils_js_1.callbackifyPromiseWithTimeout)(promise, onDone);
      };
    }
    function wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem) {
      return new Promise((resolve, reject) => {
        function handleIteration(iterResult) {
          if (iterResult.done) {
            resolve();
            return;
          }
          const item = iterResult.value;
          return new Promise((next) => {
            onItem(item, next);
          }).then((shouldContinue) => {
            if (shouldContinue === false) {
              return handleIteration({ done: true, value: void 0 });
            } else {
              return asyncIteratorNext().then(handleIteration);
            }
          });
        }
        asyncIteratorNext().then(handleIteration).catch(reject);
      });
    }
    function isReverseIteration(requestArgs) {
      const args = [].slice.call(requestArgs);
      const dataFromArgs = (0, utils_js_1.getDataFromArgs)(args);
      return !!dataFromArgs.ending_before;
    }
  }
});

// node_modules/stripe/cjs/StripeMethod.js
var require_StripeMethod = __commonJS({
  "node_modules/stripe/cjs/StripeMethod.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.stripeMethod = void 0;
    var utils_js_1 = require_utils2();
    var autoPagination_js_1 = require_autoPagination();
    function stripeMethod(spec) {
      if (spec.path !== void 0 && spec.fullPath !== void 0) {
        throw new Error(`Method spec specified both a 'path' (${spec.path}) and a 'fullPath' (${spec.fullPath}).`);
      }
      return function(...args) {
        const callback = typeof args[args.length - 1] == "function" && args.pop();
        spec.urlParams = (0, utils_js_1.extractUrlParams)(spec.fullPath || this.createResourcePathWithSymbols(spec.path || ""));
        const requestPromise = (0, utils_js_1.callbackifyPromiseWithTimeout)(this._makeRequest(args, spec, {}), callback);
        Object.assign(requestPromise, (0, autoPagination_js_1.makeAutoPaginationMethods)(this, args, spec, requestPromise));
        return requestPromise;
      };
    }
    exports2.stripeMethod = stripeMethod;
  }
});

// node_modules/stripe/cjs/StripeResource.js
var require_StripeResource = __commonJS({
  "node_modules/stripe/cjs/StripeResource.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StripeResource = void 0;
    var utils_js_1 = require_utils2();
    var StripeMethod_js_1 = require_StripeMethod();
    StripeResource.extend = utils_js_1.protoExtend;
    StripeResource.method = StripeMethod_js_1.stripeMethod;
    StripeResource.MAX_BUFFERED_REQUEST_METRICS = 100;
    function StripeResource(stripe2, deprecatedUrlData) {
      this._stripe = stripe2;
      if (deprecatedUrlData) {
        throw new Error("Support for curried url params was dropped in stripe-node v7.0.0. Instead, pass two ids.");
      }
      this.basePath = (0, utils_js_1.makeURLInterpolator)(this.basePath || stripe2.getApiField("basePath"));
      this.resourcePath = this.path;
      this.path = (0, utils_js_1.makeURLInterpolator)(this.path);
      this.initialize(...arguments);
    }
    exports2.StripeResource = StripeResource;
    StripeResource.prototype = {
      _stripe: null,
      path: "",
      resourcePath: "",
      basePath: null,
      initialize() {
      },
      requestDataProcessor: null,
      validateRequest: null,
      createFullPath(commandPath, urlData) {
        const urlParts = [this.basePath(urlData), this.path(urlData)];
        if (typeof commandPath === "function") {
          const computedCommandPath = commandPath(urlData);
          if (computedCommandPath) {
            urlParts.push(computedCommandPath);
          }
        } else {
          urlParts.push(commandPath);
        }
        return this._joinUrlParts(urlParts);
      },
      createResourcePathWithSymbols(pathWithSymbols) {
        if (pathWithSymbols) {
          return `/${this._joinUrlParts([this.resourcePath, pathWithSymbols])}`;
        } else {
          return `/${this.resourcePath}`;
        }
      },
      _joinUrlParts(parts) {
        return parts.join("/").replace(/\/{2,}/g, "/");
      },
      _getRequestOpts(requestArgs, spec, overrideData) {
        var _a;
        const requestMethod = (spec.method || "GET").toUpperCase();
        const usage = spec.usage || [];
        const urlParams = spec.urlParams || [];
        const encode = spec.encode || ((data2) => data2);
        const isUsingFullPath = !!spec.fullPath;
        const commandPath = (0, utils_js_1.makeURLInterpolator)(isUsingFullPath ? spec.fullPath : spec.path || "");
        const path = isUsingFullPath ? spec.fullPath : this.createResourcePathWithSymbols(spec.path);
        const args = [].slice.call(requestArgs);
        const urlData = urlParams.reduce((urlData2, param) => {
          const arg = args.shift();
          if (typeof arg !== "string") {
            throw new Error(`Stripe: Argument "${param}" must be a string, but got: ${arg} (on API request to \`${requestMethod} ${path}\`)`);
          }
          urlData2[param] = arg;
          return urlData2;
        }, {});
        const dataFromArgs = (0, utils_js_1.getDataFromArgs)(args);
        const data = encode(Object.assign({}, dataFromArgs, overrideData));
        const options = (0, utils_js_1.getOptionsFromArgs)(args);
        const host = options.host || spec.host;
        const streaming = !!spec.streaming;
        if (args.filter((x) => x != null).length) {
          throw new Error(`Stripe: Unknown arguments (${args}). Did you mean to pass an options object? See https://github.com/stripe/stripe-node/wiki/Passing-Options. (on API request to ${requestMethod} \`${path}\`)`);
        }
        const requestPath = isUsingFullPath ? commandPath(urlData) : this.createFullPath(commandPath, urlData);
        const headers = Object.assign(options.headers, spec.headers);
        if (spec.validator) {
          spec.validator(data, { headers });
        }
        const dataInQuery = spec.method === "GET" || spec.method === "DELETE";
        const bodyData = dataInQuery ? null : data;
        const queryData = dataInQuery ? data : {};
        return {
          requestMethod,
          requestPath,
          bodyData,
          queryData,
          authenticator: (_a = options.authenticator) !== null && _a !== void 0 ? _a : null,
          headers,
          host: host !== null && host !== void 0 ? host : null,
          streaming,
          settings: options.settings,
          usage
        };
      },
      _makeRequest(requestArgs, spec, overrideData) {
        return new Promise((resolve, reject) => {
          var _a;
          let opts;
          try {
            opts = this._getRequestOpts(requestArgs, spec, overrideData);
          } catch (err) {
            reject(err);
            return;
          }
          function requestCallback(err, response) {
            if (err) {
              reject(err);
            } else {
              resolve(spec.transformResponseData ? spec.transformResponseData(response) : response);
            }
          }
          const emptyQuery = Object.keys(opts.queryData).length === 0;
          const path = [
            opts.requestPath,
            emptyQuery ? "" : "?",
            (0, utils_js_1.queryStringifyRequestData)(opts.queryData, (0, utils_js_1.getAPIMode)(opts.requestPath))
          ].join("");
          const { headers, settings } = opts;
          this._stripe._requestSender._request(opts.requestMethod, opts.host, path, opts.bodyData, opts.authenticator, {
            headers,
            settings,
            streaming: opts.streaming
          }, opts.usage, requestCallback, (_a = this.requestDataProcessor) === null || _a === void 0 ? void 0 : _a.bind(this));
        });
      }
    };
  }
});

// node_modules/stripe/cjs/Webhooks.js
var require_Webhooks = __commonJS({
  "node_modules/stripe/cjs/Webhooks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createWebhooks = void 0;
    var Error_js_1 = require_Error();
    var CryptoProvider_js_1 = require_CryptoProvider();
    function createWebhooks(platformFunctions) {
      const Webhook = {
        DEFAULT_TOLERANCE: 300,
        signature: null,
        constructEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
          try {
            this.signature.verifyHeader(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
          } catch (e) {
            if (e instanceof CryptoProvider_js_1.CryptoProviderOnlySupportsAsyncError) {
              e.message += "\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`";
            }
            throw e;
          }
          const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
          return jsonPayload;
        },
        async constructEventAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
          await this.signature.verifyHeaderAsync(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
          const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
          return jsonPayload;
        },
        generateTestHeaderString: function(opts) {
          const preparedOpts = prepareOptions(opts);
          const signature2 = preparedOpts.signature || preparedOpts.cryptoProvider.computeHMACSignature(preparedOpts.payloadString, preparedOpts.secret);
          return preparedOpts.generateHeaderString(signature2);
        },
        generateTestHeaderStringAsync: async function(opts) {
          const preparedOpts = prepareOptions(opts);
          const signature2 = preparedOpts.signature || await preparedOpts.cryptoProvider.computeHMACSignatureAsync(preparedOpts.payloadString, preparedOpts.secret);
          return preparedOpts.generateHeaderString(signature2);
        }
      };
      const signature = {
        EXPECTED_SCHEME: "v1",
        verifyHeader(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
          const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
          const secretContainsWhitespace = /\s/.test(secret);
          cryptoProvider = cryptoProvider || getCryptoProvider();
          const expectedSignature = cryptoProvider.computeHMACSignature(makeHMACContent(payload, details), secret);
          validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt);
          return true;
        },
        async verifyHeaderAsync(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
          const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
          const secretContainsWhitespace = /\s/.test(secret);
          cryptoProvider = cryptoProvider || getCryptoProvider();
          const expectedSignature = await cryptoProvider.computeHMACSignatureAsync(makeHMACContent(payload, details), secret);
          return validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt);
        }
      };
      function makeHMACContent(payload, details) {
        return `${details.timestamp}.${payload}`;
      }
      function parseEventDetails(encodedPayload, encodedHeader, expectedScheme) {
        if (!encodedPayload) {
          throw new Error_js_1.StripeSignatureVerificationError(encodedHeader, encodedPayload, {
            message: "No webhook payload was provided."
          });
        }
        const suspectPayloadType = typeof encodedPayload != "string" && !(encodedPayload instanceof Uint8Array);
        const textDecoder = new TextDecoder("utf8");
        const decodedPayload = encodedPayload instanceof Uint8Array ? textDecoder.decode(encodedPayload) : encodedPayload;
        if (Array.isArray(encodedHeader)) {
          throw new Error("Unexpected: An array was passed as a header, which should not be possible for the stripe-signature header.");
        }
        if (encodedHeader == null || encodedHeader == "") {
          throw new Error_js_1.StripeSignatureVerificationError(encodedHeader, encodedPayload, {
            message: "No stripe-signature header value was provided."
          });
        }
        const decodedHeader = encodedHeader instanceof Uint8Array ? textDecoder.decode(encodedHeader) : encodedHeader;
        const details = parseHeader(decodedHeader, expectedScheme);
        if (!details || details.timestamp === -1) {
          throw new Error_js_1.StripeSignatureVerificationError(decodedHeader, decodedPayload, {
            message: "Unable to extract timestamp and signatures from header"
          });
        }
        if (!details.signatures.length) {
          throw new Error_js_1.StripeSignatureVerificationError(decodedHeader, decodedPayload, {
            message: "No signatures found with expected scheme"
          });
        }
        return {
          decodedPayload,
          decodedHeader,
          details,
          suspectPayloadType
        };
      }
      function validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt) {
        const signatureFound = !!details.signatures.filter(platformFunctions.secureCompare.bind(platformFunctions, expectedSignature)).length;
        const docsLocation = "\nLearn more about webhook signing and explore webhook integration examples for various frameworks at https://docs.stripe.com/webhooks/signature";
        const whitespaceMessage = secretContainsWhitespace ? "\n\nNote: The provided signing secret contains whitespace. This often indicates an extra newline or space is in the value" : "";
        if (!signatureFound) {
          if (suspectPayloadType) {
            throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
              message: "Webhook payload must be provided as a string or a Buffer (https://nodejs.org/api/buffer.html) instance representing the _raw_ request body.Payload was provided as a parsed JavaScript object instead. \nSignature verification is impossible without access to the original signed material. \n" + docsLocation + "\n" + whitespaceMessage
            });
          }
          throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
            message: "No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe? \n If a webhook request is being forwarded by a third-party tool, ensure that the exact request body, including JSON formatting and new line style, is preserved.\n" + docsLocation + "\n" + whitespaceMessage
          });
        }
        const timestampAge = Math.floor((typeof receivedAt === "number" ? receivedAt : Date.now()) / 1e3) - details.timestamp;
        if (tolerance > 0 && timestampAge > tolerance) {
          throw new Error_js_1.StripeSignatureVerificationError(header, payload, {
            message: "Timestamp outside the tolerance zone"
          });
        }
        return true;
      }
      function parseHeader(header, scheme) {
        if (typeof header !== "string") {
          return null;
        }
        return header.split(",").reduce((accum, item) => {
          const kv = item.split("=");
          if (kv[0] === "t") {
            accum.timestamp = parseInt(kv[1], 10);
          }
          if (kv[0] === scheme) {
            accum.signatures.push(kv[1]);
          }
          return accum;
        }, {
          timestamp: -1,
          signatures: []
        });
      }
      let webhooksCryptoProviderInstance = null;
      function getCryptoProvider() {
        if (!webhooksCryptoProviderInstance) {
          webhooksCryptoProviderInstance = platformFunctions.createDefaultCryptoProvider();
        }
        return webhooksCryptoProviderInstance;
      }
      function prepareOptions(opts) {
        if (!opts) {
          throw new Error_js_1.StripeError({
            message: "Options are required"
          });
        }
        const timestamp = Math.floor(opts.timestamp) || Math.floor(Date.now() / 1e3);
        const scheme = opts.scheme || signature.EXPECTED_SCHEME;
        const cryptoProvider = opts.cryptoProvider || getCryptoProvider();
        const payloadString = `${timestamp}.${opts.payload}`;
        const generateHeaderString = (signature2) => {
          return `t=${timestamp},${scheme}=${signature2}`;
        };
        return Object.assign(Object.assign({}, opts), {
          timestamp,
          scheme,
          cryptoProvider,
          payloadString,
          generateHeaderString
        });
      }
      Webhook.signature = signature;
      return Webhook;
    }
    exports2.createWebhooks = createWebhooks;
  }
});

// node_modules/stripe/cjs/apiVersion.js
var require_apiVersion = __commonJS({
  "node_modules/stripe/cjs/apiVersion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApiVersion = void 0;
    exports2.ApiVersion = "2025-03-31.basil";
  }
});

// node_modules/stripe/cjs/ResourceNamespace.js
var require_ResourceNamespace = __commonJS({
  "node_modules/stripe/cjs/ResourceNamespace.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resourceNamespace = void 0;
    function ResourceNamespace(stripe2, resources) {
      for (const name in resources) {
        if (!Object.prototype.hasOwnProperty.call(resources, name)) {
          continue;
        }
        const camelCaseName = name[0].toLowerCase() + name.substring(1);
        const resource = new resources[name](stripe2);
        this[camelCaseName] = resource;
      }
    }
    function resourceNamespace(namespace, resources) {
      return function(stripe2) {
        return new ResourceNamespace(stripe2, resources);
      };
    }
    exports2.resourceNamespace = resourceNamespace;
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Accounts.js
var require_Accounts = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Accounts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Accounts = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/accounts/{account}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/accounts",
        methodType: "list"
      }),
      disconnect: stripeMethod({
        method: "POST",
        fullPath: "/v1/financial_connections/accounts/{account}/disconnect"
      }),
      listOwners: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/accounts/{account}/owners",
        methodType: "list"
      }),
      refresh: stripeMethod({
        method: "POST",
        fullPath: "/v1/financial_connections/accounts/{account}/refresh"
      }),
      subscribe: stripeMethod({
        method: "POST",
        fullPath: "/v1/financial_connections/accounts/{account}/subscribe"
      }),
      unsubscribe: stripeMethod({
        method: "POST",
        fullPath: "/v1/financial_connections/accounts/{account}/unsubscribe"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Entitlements/ActiveEntitlements.js
var require_ActiveEntitlements = __commonJS({
  "node_modules/stripe/cjs/resources/Entitlements/ActiveEntitlements.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ActiveEntitlements = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ActiveEntitlements = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/entitlements/active_entitlements/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/entitlements/active_entitlements",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/Alerts.js
var require_Alerts = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/Alerts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Alerts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Alerts = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/billing/alerts" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/billing/alerts/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/alerts",
        methodType: "list"
      }),
      activate: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/alerts/{id}/activate"
      }),
      archive: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/alerts/{id}/archive"
      }),
      deactivate: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/alerts/{id}/deactivate"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Authorizations.js
var require_Authorizations = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Authorizations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Authorizations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Authorizations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations"
      }),
      capture: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/capture"
      }),
      expire: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/expire"
      }),
      finalizeAmount: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/finalize_amount"
      }),
      increment: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/increment"
      }),
      respond: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/fraud_challenges/respond"
      }),
      reverse: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/reverse"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Authorizations.js
var require_Authorizations2 = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Authorizations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Authorizations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Authorizations = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/authorizations/{authorization}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/authorizations/{authorization}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/authorizations",
        methodType: "list"
      }),
      approve: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/authorizations/{authorization}/approve"
      }),
      decline: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/authorizations/{authorization}/decline"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Tax/Calculations.js
var require_Calculations = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Calculations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Calculations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Calculations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/tax/calculations" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/calculations/{calculation}"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/calculations/{calculation}/line_items",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Cardholders.js
var require_Cardholders = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Cardholders.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Cardholders = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Cardholders = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/issuing/cardholders" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/cardholders/{cardholder}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/cardholders/{cardholder}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/cardholders",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Cards.js
var require_Cards = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Cards.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Cards = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Cards = StripeResource_js_1.StripeResource.extend({
      deliverCard: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/deliver"
      }),
      failCard: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/fail"
      }),
      returnCard: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/return"
      }),
      shipCard: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/ship"
      }),
      submitCard: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/submit"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Cards.js
var require_Cards2 = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Cards.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Cards = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Cards = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/issuing/cards" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/issuing/cards/{card}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/issuing/cards/{card}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/cards",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/BillingPortal/Configurations.js
var require_Configurations = __commonJS({
  "node_modules/stripe/cjs/resources/BillingPortal/Configurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Configurations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Configurations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing_portal/configurations"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing_portal/configurations/{configuration}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing_portal/configurations/{configuration}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing_portal/configurations",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Terminal/Configurations.js
var require_Configurations2 = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Configurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Configurations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Configurations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/configurations"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/configurations/{configuration}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/configurations/{configuration}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/configurations",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/terminal/configurations/{configuration}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/ConfirmationTokens.js
var require_ConfirmationTokens = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/ConfirmationTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfirmationTokens = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ConfirmationTokens = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/confirmation_tokens"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Terminal/ConnectionTokens.js
var require_ConnectionTokens = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/ConnectionTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConnectionTokens = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ConnectionTokens = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/connection_tokens"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditBalanceSummary.js
var require_CreditBalanceSummary = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditBalanceSummary.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditBalanceSummary = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CreditBalanceSummary = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/credit_balance_summary"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditBalanceTransactions.js
var require_CreditBalanceTransactions = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditBalanceTransactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditBalanceTransactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CreditBalanceTransactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/credit_balance_transactions/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/credit_balance_transactions",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/CreditGrants.js
var require_CreditGrants = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/CreditGrants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditGrants = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CreditGrants = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/billing/credit_grants" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/credit_grants/{id}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/credit_grants/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/credit_grants",
        methodType: "list"
      }),
      expire: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/credit_grants/{id}/expire"
      }),
      voidGrant: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/credit_grants/{id}/void"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/CreditReversals.js
var require_CreditReversals = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/CreditReversals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditReversals = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CreditReversals = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/credit_reversals"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/credit_reversals/{credit_reversal}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/credit_reversals",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Customers.js
var require_Customers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Customers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Customers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Customers = StripeResource_js_1.StripeResource.extend({
      fundCashBalance: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/customers/{customer}/fund_cash_balance"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/DebitReversals.js
var require_DebitReversals = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/DebitReversals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebitReversals = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.DebitReversals = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/debit_reversals"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/debit_reversals/{debit_reversal}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/debit_reversals",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Disputes.js
var require_Disputes = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Disputes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Disputes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Disputes = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/issuing/disputes" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/disputes/{dispute}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/disputes/{dispute}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/disputes",
        methodType: "list"
      }),
      submit: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/disputes/{dispute}/submit"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Radar/EarlyFraudWarnings.js
var require_EarlyFraudWarnings = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/EarlyFraudWarnings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EarlyFraudWarnings = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.EarlyFraudWarnings = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/early_fraud_warnings/{early_fraud_warning}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/early_fraud_warnings",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Core/EventDestinations.js
var require_EventDestinations = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/EventDestinations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EventDestinations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.EventDestinations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v2/core/event_destinations"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v2/core/event_destinations/{id}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v2/core/event_destinations/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v2/core/event_destinations",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v2/core/event_destinations/{id}"
      }),
      disable: stripeMethod({
        method: "POST",
        fullPath: "/v2/core/event_destinations/{id}/disable"
      }),
      enable: stripeMethod({
        method: "POST",
        fullPath: "/v2/core/event_destinations/{id}/enable"
      }),
      ping: stripeMethod({
        method: "POST",
        fullPath: "/v2/core/event_destinations/{id}/ping"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Core/Events.js
var require_Events = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Core/Events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Events = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Events = StripeResource_js_1.StripeResource.extend({
      retrieve(...args) {
        const transformResponseData = (response) => {
          return this.addFetchRelatedObjectIfNeeded(response);
        };
        return stripeMethod({
          method: "GET",
          fullPath: "/v2/core/events/{id}",
          transformResponseData
        }).apply(this, args);
      },
      list(...args) {
        const transformResponseData = (response) => {
          return Object.assign(Object.assign({}, response), { data: response.data.map(this.addFetchRelatedObjectIfNeeded.bind(this)) });
        };
        return stripeMethod({
          method: "GET",
          fullPath: "/v2/core/events",
          methodType: "list",
          transformResponseData
        }).apply(this, args);
      },
      addFetchRelatedObjectIfNeeded(pulledEvent) {
        if (!pulledEvent.related_object || !pulledEvent.related_object.url) {
          return pulledEvent;
        }
        return Object.assign(Object.assign({}, pulledEvent), { fetchRelatedObject: () => stripeMethod({
          method: "GET",
          fullPath: pulledEvent.related_object.url
        }).apply(this, [
          {
            stripeAccount: pulledEvent.context
          }
        ]) });
      }
    });
  }
});

// node_modules/stripe/cjs/resources/Entitlements/Features.js
var require_Features = __commonJS({
  "node_modules/stripe/cjs/resources/Entitlements/Features.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Features = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Features = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/entitlements/features" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/entitlements/features/{id}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/entitlements/features/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/entitlements/features",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/FinancialAccounts.js
var require_FinancialAccounts = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/FinancialAccounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FinancialAccounts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.FinancialAccounts = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/financial_accounts"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/financial_accounts/{financial_account}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/financial_accounts/{financial_account}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/financial_accounts",
        methodType: "list"
      }),
      close: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/financial_accounts/{financial_account}/close"
      }),
      retrieveFeatures: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/financial_accounts/{financial_account}/features"
      }),
      updateFeatures: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/financial_accounts/{financial_account}/features"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/InboundTransfers.js
var require_InboundTransfers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/InboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InboundTransfers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.InboundTransfers = StripeResource_js_1.StripeResource.extend({
      fail: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/fail"
      }),
      returnInboundTransfer: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/return"
      }),
      succeed: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/succeed"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/InboundTransfers.js
var require_InboundTransfers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/InboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InboundTransfers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.InboundTransfers = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/inbound_transfers"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/inbound_transfers/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/inbound_transfers",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/inbound_transfers/{inbound_transfer}/cancel"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Terminal/Locations.js
var require_Locations = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Locations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Locations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Locations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/terminal/locations" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/locations/{location}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/locations/{location}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/locations",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/terminal/locations/{location}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/MeterEventAdjustments.js
var require_MeterEventAdjustments = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/MeterEventAdjustments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventAdjustments = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEventAdjustments = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/meter_event_adjustments"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventAdjustments.js
var require_MeterEventAdjustments2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventAdjustments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventAdjustments = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEventAdjustments = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v2/billing/meter_event_adjustments"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventSession.js
var require_MeterEventSession = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventSession = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEventSession = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v2/billing/meter_event_session"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEventStream.js
var require_MeterEventStream = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEventStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEventStream = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEventStream = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v2/billing/meter_event_stream",
        host: "meter-events.stripe.com"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/MeterEvents.js
var require_MeterEvents = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/MeterEvents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEvents = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEvents = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/billing/meter_events" })
    });
  }
});

// node_modules/stripe/cjs/resources/V2/Billing/MeterEvents.js
var require_MeterEvents2 = __commonJS({
  "node_modules/stripe/cjs/resources/V2/Billing/MeterEvents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MeterEvents = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.MeterEvents = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v2/billing/meter_events" })
    });
  }
});

// node_modules/stripe/cjs/resources/Billing/Meters.js
var require_Meters = __commonJS({
  "node_modules/stripe/cjs/resources/Billing/Meters.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Meters = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Meters = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/billing/meters" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/billing/meters/{id}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/billing/meters/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/meters",
        methodType: "list"
      }),
      deactivate: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/meters/{id}/deactivate"
      }),
      listEventSummaries: stripeMethod({
        method: "GET",
        fullPath: "/v1/billing/meters/{id}/event_summaries",
        methodType: "list"
      }),
      reactivate: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing/meters/{id}/reactivate"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Climate/Orders.js
var require_Orders = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Orders.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Orders = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Orders = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/climate/orders" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/orders/{order}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/climate/orders/{order}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/orders",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/climate/orders/{order}/cancel"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundPayments.js
var require_OutboundPayments = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundPayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundPayments = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.OutboundPayments = StripeResource_js_1.StripeResource.extend({
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}"
      }),
      fail: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/fail"
      }),
      post: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/post"
      }),
      returnOutboundPayment: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/return"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/OutboundPayments.js
var require_OutboundPayments2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/OutboundPayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundPayments = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.OutboundPayments = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/outbound_payments"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/outbound_payments/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/outbound_payments",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/outbound_payments/{id}/cancel"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundTransfers.js
var require_OutboundTransfers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/OutboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundTransfers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.OutboundTransfers = StripeResource_js_1.StripeResource.extend({
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}"
      }),
      fail: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/fail"
      }),
      post: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/post"
      }),
      returnOutboundTransfer: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/return"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/OutboundTransfers.js
var require_OutboundTransfers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/OutboundTransfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutboundTransfers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.OutboundTransfers = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/outbound_transfers"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/outbound_transfers/{outbound_transfer}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/outbound_transfers",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/treasury/outbound_transfers/{outbound_transfer}/cancel"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/PersonalizationDesigns.js
var require_PersonalizationDesigns = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/PersonalizationDesigns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonalizationDesigns = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PersonalizationDesigns = StripeResource_js_1.StripeResource.extend({
      activate: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/activate"
      }),
      deactivate: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/deactivate"
      }),
      reject: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/reject"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/PersonalizationDesigns.js
var require_PersonalizationDesigns2 = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/PersonalizationDesigns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PersonalizationDesigns = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PersonalizationDesigns = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/personalization_designs"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/personalization_designs/{personalization_design}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/personalization_designs/{personalization_design}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/personalization_designs",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/PhysicalBundles.js
var require_PhysicalBundles = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/PhysicalBundles.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PhysicalBundles = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PhysicalBundles = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/physical_bundles/{physical_bundle}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/physical_bundles",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Climate/Products.js
var require_Products = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Products.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Products = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Products = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/products/{product}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/products",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Terminal/Readers.js
var require_Readers = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Terminal/Readers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Readers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Readers = StripeResource_js_1.StripeResource.extend({
      presentPaymentMethod: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/terminal/readers/{reader}/present_payment_method"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Terminal/Readers.js
var require_Readers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Terminal/Readers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Readers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Readers = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/terminal/readers" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/readers/{reader}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/terminal/readers",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/terminal/readers/{reader}"
      }),
      cancelAction: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}/cancel_action"
      }),
      processPaymentIntent: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}/process_payment_intent"
      }),
      processSetupIntent: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}/process_setup_intent"
      }),
      refundPayment: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}/refund_payment"
      }),
      setReaderDisplay: stripeMethod({
        method: "POST",
        fullPath: "/v1/terminal/readers/{reader}/set_reader_display"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedCredits.js
var require_ReceivedCredits = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedCredits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedCredits = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReceivedCredits = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/received_credits"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/ReceivedCredits.js
var require_ReceivedCredits2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/ReceivedCredits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedCredits = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReceivedCredits = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/received_credits/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/received_credits",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedDebits.js
var require_ReceivedDebits = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Treasury/ReceivedDebits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedDebits = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReceivedDebits = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/treasury/received_debits"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/ReceivedDebits.js
var require_ReceivedDebits2 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/ReceivedDebits.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReceivedDebits = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReceivedDebits = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/received_debits/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/received_debits",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Refunds.js
var require_Refunds = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Refunds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Refunds = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Refunds = StripeResource_js_1.StripeResource.extend({
      expire: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/refunds/{refund}/expire"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Tax/Registrations.js
var require_Registrations = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Registrations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Registrations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Registrations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/tax/registrations" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/registrations/{id}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/tax/registrations/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/registrations",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Reporting/ReportRuns.js
var require_ReportRuns = __commonJS({
  "node_modules/stripe/cjs/resources/Reporting/ReportRuns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReportRuns = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReportRuns = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/reporting/report_runs" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/reporting/report_runs/{report_run}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/reporting/report_runs",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Reporting/ReportTypes.js
var require_ReportTypes = __commonJS({
  "node_modules/stripe/cjs/resources/Reporting/ReportTypes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReportTypes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ReportTypes = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/reporting/report_types/{report_type}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/reporting/report_types",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Forwarding/Requests.js
var require_Requests = __commonJS({
  "node_modules/stripe/cjs/resources/Forwarding/Requests.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Requests = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Requests = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/forwarding/requests" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/forwarding/requests/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/forwarding/requests",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Sigma/ScheduledQueryRuns.js
var require_ScheduledQueryRuns = __commonJS({
  "node_modules/stripe/cjs/resources/Sigma/ScheduledQueryRuns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ScheduledQueryRuns = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ScheduledQueryRuns = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/sigma/scheduled_query_runs/{scheduled_query_run}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/sigma/scheduled_query_runs",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Apps/Secrets.js
var require_Secrets = __commonJS({
  "node_modules/stripe/cjs/resources/Apps/Secrets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Secrets = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Secrets = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/apps/secrets" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/apps/secrets",
        methodType: "list"
      }),
      deleteWhere: stripeMethod({
        method: "POST",
        fullPath: "/v1/apps/secrets/delete"
      }),
      find: stripeMethod({ method: "GET", fullPath: "/v1/apps/secrets/find" })
    });
  }
});

// node_modules/stripe/cjs/resources/BillingPortal/Sessions.js
var require_Sessions = __commonJS({
  "node_modules/stripe/cjs/resources/BillingPortal/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Sessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Sessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/billing_portal/sessions"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Checkout/Sessions.js
var require_Sessions2 = __commonJS({
  "node_modules/stripe/cjs/resources/Checkout/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Sessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Sessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/checkout/sessions" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/checkout/sessions/{session}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/checkout/sessions/{session}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/checkout/sessions",
        methodType: "list"
      }),
      expire: stripeMethod({
        method: "POST",
        fullPath: "/v1/checkout/sessions/{session}/expire"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/checkout/sessions/{session}/line_items",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Sessions.js
var require_Sessions3 = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Sessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Sessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/financial_connections/sessions"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/sessions/{session}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Tax/Settings.js
var require_Settings = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Settings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Settings = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Settings = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/tax/settings" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/tax/settings" })
    });
  }
});

// node_modules/stripe/cjs/resources/Climate/Suppliers.js
var require_Suppliers = __commonJS({
  "node_modules/stripe/cjs/resources/Climate/Suppliers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Suppliers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Suppliers = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/suppliers/{supplier}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/climate/suppliers",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/TestClocks.js
var require_TestClocks = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/TestClocks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TestClocks = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.TestClocks = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/test_clocks"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/test_helpers/test_clocks/{test_clock}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/test_helpers/test_clocks",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/test_helpers/test_clocks/{test_clock}"
      }),
      advance: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/test_clocks/{test_clock}/advance"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Tokens.js
var require_Tokens = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Tokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Tokens = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Tokens = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/tokens/{token}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/tokens/{token}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/tokens",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/TransactionEntries.js
var require_TransactionEntries = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/TransactionEntries.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TransactionEntries = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.TransactionEntries = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/transaction_entries/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/transaction_entries",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TestHelpers/Issuing/Transactions.js
var require_Transactions = __commonJS({
  "node_modules/stripe/cjs/resources/TestHelpers/Issuing/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transactions = StripeResource_js_1.StripeResource.extend({
      createForceCapture: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/transactions/create_force_capture"
      }),
      createUnlinkedRefund: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/transactions/create_unlinked_refund"
      }),
      refund: stripeMethod({
        method: "POST",
        fullPath: "/v1/test_helpers/issuing/transactions/{transaction}/refund"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/FinancialConnections/Transactions.js
var require_Transactions2 = __commonJS({
  "node_modules/stripe/cjs/resources/FinancialConnections/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/transactions/{transaction}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/financial_connections/transactions",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Issuing/Transactions.js
var require_Transactions3 = __commonJS({
  "node_modules/stripe/cjs/resources/Issuing/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/transactions/{transaction}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/issuing/transactions/{transaction}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/issuing/transactions",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Tax/Transactions.js
var require_Transactions4 = __commonJS({
  "node_modules/stripe/cjs/resources/Tax/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/transactions/{transaction}"
      }),
      createFromCalculation: stripeMethod({
        method: "POST",
        fullPath: "/v1/tax/transactions/create_from_calculation"
      }),
      createReversal: stripeMethod({
        method: "POST",
        fullPath: "/v1/tax/transactions/create_reversal"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax/transactions/{transaction}/line_items",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Treasury/Transactions.js
var require_Transactions5 = __commonJS({
  "node_modules/stripe/cjs/resources/Treasury/Transactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/transactions/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/treasury/transactions",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Radar/ValueListItems.js
var require_ValueListItems = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/ValueListItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueListItems = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ValueListItems = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/radar/value_list_items"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/value_list_items/{item}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/value_list_items",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/radar/value_list_items/{item}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Radar/ValueLists.js
var require_ValueLists = __commonJS({
  "node_modules/stripe/cjs/resources/Radar/ValueLists.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueLists = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ValueLists = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/radar/value_lists" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/value_lists/{value_list}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/radar/value_lists/{value_list}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/radar/value_lists",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/radar/value_lists/{value_list}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Identity/VerificationReports.js
var require_VerificationReports = __commonJS({
  "node_modules/stripe/cjs/resources/Identity/VerificationReports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VerificationReports = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.VerificationReports = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/identity/verification_reports/{report}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/identity/verification_reports",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Identity/VerificationSessions.js
var require_VerificationSessions = __commonJS({
  "node_modules/stripe/cjs/resources/Identity/VerificationSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VerificationSessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.VerificationSessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/identity/verification_sessions"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/identity/verification_sessions/{session}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/identity/verification_sessions/{session}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/identity/verification_sessions",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/identity/verification_sessions/{session}/cancel"
      }),
      redact: stripeMethod({
        method: "POST",
        fullPath: "/v1/identity/verification_sessions/{session}/redact"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Accounts.js
var require_Accounts2 = __commonJS({
  "node_modules/stripe/cjs/resources/Accounts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Accounts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Accounts = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/accounts" }),
      retrieve(id, ...args) {
        if (typeof id === "string") {
          return stripeMethod({
            method: "GET",
            fullPath: "/v1/accounts/{id}"
          }).apply(this, [id, ...args]);
        } else {
          if (id === null || id === void 0) {
            [].shift.apply([id, ...args]);
          }
          return stripeMethod({
            method: "GET",
            fullPath: "/v1/account"
          }).apply(this, [id, ...args]);
        }
      },
      update: stripeMethod({ method: "POST", fullPath: "/v1/accounts/{account}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/accounts/{account}" }),
      createExternalAccount: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/external_accounts"
      }),
      createLoginLink: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/login_links"
      }),
      createPerson: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/persons"
      }),
      deleteExternalAccount: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/accounts/{account}/external_accounts/{id}"
      }),
      deletePerson: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/accounts/{account}/persons/{person}"
      }),
      listCapabilities: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/capabilities",
        methodType: "list"
      }),
      listExternalAccounts: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/external_accounts",
        methodType: "list"
      }),
      listPersons: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/persons",
        methodType: "list"
      }),
      reject: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/reject"
      }),
      retrieveCurrent: stripeMethod({ method: "GET", fullPath: "/v1/account" }),
      retrieveCapability: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/capabilities/{capability}"
      }),
      retrieveExternalAccount: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/external_accounts/{id}"
      }),
      retrievePerson: stripeMethod({
        method: "GET",
        fullPath: "/v1/accounts/{account}/persons/{person}"
      }),
      updateCapability: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/capabilities/{capability}"
      }),
      updateExternalAccount: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/external_accounts/{id}"
      }),
      updatePerson: stripeMethod({
        method: "POST",
        fullPath: "/v1/accounts/{account}/persons/{person}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/AccountLinks.js
var require_AccountLinks = __commonJS({
  "node_modules/stripe/cjs/resources/AccountLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountLinks = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.AccountLinks = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/account_links" })
    });
  }
});

// node_modules/stripe/cjs/resources/AccountSessions.js
var require_AccountSessions = __commonJS({
  "node_modules/stripe/cjs/resources/AccountSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountSessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.AccountSessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/account_sessions" })
    });
  }
});

// node_modules/stripe/cjs/resources/ApplePayDomains.js
var require_ApplePayDomains = __commonJS({
  "node_modules/stripe/cjs/resources/ApplePayDomains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApplePayDomains = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ApplePayDomains = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/apple_pay/domains" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/apple_pay/domains/{domain}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/apple_pay/domains",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/apple_pay/domains/{domain}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/ApplicationFees.js
var require_ApplicationFees = __commonJS({
  "node_modules/stripe/cjs/resources/ApplicationFees.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ApplicationFees = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ApplicationFees = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/application_fees/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/application_fees",
        methodType: "list"
      }),
      createRefund: stripeMethod({
        method: "POST",
        fullPath: "/v1/application_fees/{id}/refunds"
      }),
      listRefunds: stripeMethod({
        method: "GET",
        fullPath: "/v1/application_fees/{id}/refunds",
        methodType: "list"
      }),
      retrieveRefund: stripeMethod({
        method: "GET",
        fullPath: "/v1/application_fees/{fee}/refunds/{id}"
      }),
      updateRefund: stripeMethod({
        method: "POST",
        fullPath: "/v1/application_fees/{fee}/refunds/{id}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Balance.js
var require_Balance = __commonJS({
  "node_modules/stripe/cjs/resources/Balance.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Balance = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Balance = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/balance" })
    });
  }
});

// node_modules/stripe/cjs/resources/BalanceTransactions.js
var require_BalanceTransactions = __commonJS({
  "node_modules/stripe/cjs/resources/BalanceTransactions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BalanceTransactions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.BalanceTransactions = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/balance_transactions/{id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/balance_transactions",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Charges.js
var require_Charges = __commonJS({
  "node_modules/stripe/cjs/resources/Charges.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Charges = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Charges = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/charges" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/charges/{charge}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/charges/{charge}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/charges",
        methodType: "list"
      }),
      capture: stripeMethod({
        method: "POST",
        fullPath: "/v1/charges/{charge}/capture"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/charges/search",
        methodType: "search"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/ConfirmationTokens.js
var require_ConfirmationTokens2 = __commonJS({
  "node_modules/stripe/cjs/resources/ConfirmationTokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConfirmationTokens = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ConfirmationTokens = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/confirmation_tokens/{confirmation_token}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/CountrySpecs.js
var require_CountrySpecs = __commonJS({
  "node_modules/stripe/cjs/resources/CountrySpecs.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CountrySpecs = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CountrySpecs = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/country_specs/{country}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/country_specs",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Coupons.js
var require_Coupons = __commonJS({
  "node_modules/stripe/cjs/resources/Coupons.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Coupons = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Coupons = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/coupons" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/coupons/{coupon}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/coupons/{coupon}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/coupons",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/coupons/{coupon}" })
    });
  }
});

// node_modules/stripe/cjs/resources/CreditNotes.js
var require_CreditNotes = __commonJS({
  "node_modules/stripe/cjs/resources/CreditNotes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CreditNotes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CreditNotes = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/credit_notes" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/credit_notes/{id}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/credit_notes/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/credit_notes",
        methodType: "list"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/credit_notes/{credit_note}/lines",
        methodType: "list"
      }),
      listPreviewLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/credit_notes/preview/lines",
        methodType: "list"
      }),
      preview: stripeMethod({ method: "GET", fullPath: "/v1/credit_notes/preview" }),
      voidCreditNote: stripeMethod({
        method: "POST",
        fullPath: "/v1/credit_notes/{id}/void"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/CustomerSessions.js
var require_CustomerSessions = __commonJS({
  "node_modules/stripe/cjs/resources/CustomerSessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomerSessions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.CustomerSessions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/customer_sessions" })
    });
  }
});

// node_modules/stripe/cjs/resources/Customers.js
var require_Customers2 = __commonJS({
  "node_modules/stripe/cjs/resources/Customers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Customers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Customers = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/customers" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/customers/{customer}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/customers/{customer}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/customers/{customer}" }),
      createBalanceTransaction: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/balance_transactions"
      }),
      createFundingInstructions: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/funding_instructions"
      }),
      createSource: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/sources"
      }),
      createTaxId: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/tax_ids"
      }),
      deleteDiscount: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/customers/{customer}/discount"
      }),
      deleteSource: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/customers/{customer}/sources/{id}"
      }),
      deleteTaxId: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/customers/{customer}/tax_ids/{id}"
      }),
      listBalanceTransactions: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/balance_transactions",
        methodType: "list"
      }),
      listCashBalanceTransactions: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/cash_balance_transactions",
        methodType: "list"
      }),
      listPaymentMethods: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/payment_methods",
        methodType: "list"
      }),
      listSources: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/sources",
        methodType: "list"
      }),
      listTaxIds: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/tax_ids",
        methodType: "list"
      }),
      retrieveBalanceTransaction: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/balance_transactions/{transaction}"
      }),
      retrieveCashBalance: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/cash_balance"
      }),
      retrieveCashBalanceTransaction: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/cash_balance_transactions/{transaction}"
      }),
      retrievePaymentMethod: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/payment_methods/{payment_method}"
      }),
      retrieveSource: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/sources/{id}"
      }),
      retrieveTaxId: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/{customer}/tax_ids/{id}"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/customers/search",
        methodType: "search"
      }),
      updateBalanceTransaction: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/balance_transactions/{transaction}"
      }),
      updateCashBalance: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/cash_balance"
      }),
      updateSource: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/sources/{id}"
      }),
      verifySource: stripeMethod({
        method: "POST",
        fullPath: "/v1/customers/{customer}/sources/{id}/verify"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Disputes.js
var require_Disputes2 = __commonJS({
  "node_modules/stripe/cjs/resources/Disputes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Disputes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Disputes = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/disputes/{dispute}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/disputes/{dispute}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/disputes",
        methodType: "list"
      }),
      close: stripeMethod({
        method: "POST",
        fullPath: "/v1/disputes/{dispute}/close"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/EphemeralKeys.js
var require_EphemeralKeys = __commonJS({
  "node_modules/stripe/cjs/resources/EphemeralKeys.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EphemeralKeys = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.EphemeralKeys = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/ephemeral_keys",
        validator: (data, options) => {
          if (!options.headers || !options.headers["Stripe-Version"]) {
            throw new Error("Passing apiVersion in a separate options hash is required to create an ephemeral key. See https://stripe.com/docs/api/versioning?lang=node");
          }
        }
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/ephemeral_keys/{key}" })
    });
  }
});

// node_modules/stripe/cjs/resources/Events.js
var require_Events2 = __commonJS({
  "node_modules/stripe/cjs/resources/Events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Events = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Events = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/events/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/events",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/ExchangeRates.js
var require_ExchangeRates = __commonJS({
  "node_modules/stripe/cjs/resources/ExchangeRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ExchangeRates = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ExchangeRates = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/exchange_rates/{rate_id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/exchange_rates",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/FileLinks.js
var require_FileLinks = __commonJS({
  "node_modules/stripe/cjs/resources/FileLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileLinks = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.FileLinks = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/file_links" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/file_links/{link}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/file_links/{link}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/file_links",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/multipart.js
var require_multipart = __commonJS({
  "node_modules/stripe/cjs/multipart.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.multipartRequestDataProcessor = void 0;
    var utils_js_1 = require_utils2();
    var multipartDataGenerator = (method, data, headers) => {
      const segno = (Math.round(Math.random() * 1e16) + Math.round(Math.random() * 1e16)).toString();
      headers["Content-Type"] = `multipart/form-data; boundary=${segno}`;
      const textEncoder = new TextEncoder();
      let buffer = new Uint8Array(0);
      const endBuffer = textEncoder.encode("\r\n");
      function push(l) {
        const prevBuffer = buffer;
        const newBuffer = l instanceof Uint8Array ? l : new Uint8Array(textEncoder.encode(l));
        buffer = new Uint8Array(prevBuffer.length + newBuffer.length + 2);
        buffer.set(prevBuffer);
        buffer.set(newBuffer, prevBuffer.length);
        buffer.set(endBuffer, buffer.length - 2);
      }
      function q(s) {
        return `"${s.replace(/"|"/g, "%22").replace(/\r\n|\r|\n/g, " ")}"`;
      }
      const flattenedData = (0, utils_js_1.flattenAndStringify)(data);
      for (const k in flattenedData) {
        if (!Object.prototype.hasOwnProperty.call(flattenedData, k)) {
          continue;
        }
        const v = flattenedData[k];
        push(`--${segno}`);
        if (Object.prototype.hasOwnProperty.call(v, "data")) {
          const typedEntry = v;
          push(`Content-Disposition: form-data; name=${q(k)}; filename=${q(typedEntry.name || "blob")}`);
          push(`Content-Type: ${typedEntry.type || "application/octet-stream"}`);
          push("");
          push(typedEntry.data);
        } else {
          push(`Content-Disposition: form-data; name=${q(k)}`);
          push("");
          push(v);
        }
      }
      push(`--${segno}--`);
      return buffer;
    };
    function multipartRequestDataProcessor(method, data, headers, callback) {
      data = data || {};
      if (method !== "POST") {
        return callback(null, (0, utils_js_1.queryStringifyRequestData)(data));
      }
      this._stripe._platformFunctions.tryBufferData(data).then((bufferedData) => {
        const buffer = multipartDataGenerator(method, bufferedData, headers);
        return callback(null, buffer);
      }).catch((err) => callback(err, null));
    }
    exports2.multipartRequestDataProcessor = multipartRequestDataProcessor;
  }
});

// node_modules/stripe/cjs/resources/Files.js
var require_Files = __commonJS({
  "node_modules/stripe/cjs/resources/Files.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Files = void 0;
    var multipart_js_1 = require_multipart();
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Files = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/files",
        headers: {
          "Content-Type": "multipart/form-data"
        },
        host: "files.stripe.com"
      }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/files/{file}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/files",
        methodType: "list"
      }),
      requestDataProcessor: multipart_js_1.multipartRequestDataProcessor
    });
  }
});

// node_modules/stripe/cjs/resources/InvoiceItems.js
var require_InvoiceItems = __commonJS({
  "node_modules/stripe/cjs/resources/InvoiceItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoiceItems = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.InvoiceItems = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/invoiceitems" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoiceitems/{invoiceitem}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoiceitems/{invoiceitem}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoiceitems",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/invoiceitems/{invoiceitem}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/InvoicePayments.js
var require_InvoicePayments = __commonJS({
  "node_modules/stripe/cjs/resources/InvoicePayments.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoicePayments = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.InvoicePayments = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoice_payments/{invoice_payment}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoice_payments",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/InvoiceRenderingTemplates.js
var require_InvoiceRenderingTemplates = __commonJS({
  "node_modules/stripe/cjs/resources/InvoiceRenderingTemplates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InvoiceRenderingTemplates = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.InvoiceRenderingTemplates = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoice_rendering_templates/{template}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoice_rendering_templates",
        methodType: "list"
      }),
      archive: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoice_rendering_templates/{template}/archive"
      }),
      unarchive: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoice_rendering_templates/{template}/unarchive"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Invoices.js
var require_Invoices = __commonJS({
  "node_modules/stripe/cjs/resources/Invoices.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Invoices = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Invoices = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/invoices" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/invoices/{invoice}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/invoices/{invoice}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoices",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/invoices/{invoice}" }),
      addLines: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/add_lines"
      }),
      createPreview: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/create_preview"
      }),
      finalizeInvoice: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/finalize"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoices/{invoice}/lines",
        methodType: "list"
      }),
      markUncollectible: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/mark_uncollectible"
      }),
      pay: stripeMethod({ method: "POST", fullPath: "/v1/invoices/{invoice}/pay" }),
      removeLines: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/remove_lines"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/invoices/search",
        methodType: "search"
      }),
      sendInvoice: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/send"
      }),
      updateLines: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/update_lines"
      }),
      updateLineItem: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/lines/{line_item_id}"
      }),
      voidInvoice: stripeMethod({
        method: "POST",
        fullPath: "/v1/invoices/{invoice}/void"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Mandates.js
var require_Mandates = __commonJS({
  "node_modules/stripe/cjs/resources/Mandates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Mandates = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Mandates = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/mandates/{mandate}" })
    });
  }
});

// node_modules/stripe/cjs/resources/OAuth.js
var require_OAuth = __commonJS({
  "node_modules/stripe/cjs/resources/OAuth.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OAuth = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var utils_js_1 = require_utils2();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    var oAuthHost = "connect.stripe.com";
    exports2.OAuth = StripeResource_js_1.StripeResource.extend({
      basePath: "/",
      authorizeUrl(params, options) {
        params = params || {};
        options = options || {};
        let path = "oauth/authorize";
        if (options.express) {
          path = `express/${path}`;
        }
        if (!params.response_type) {
          params.response_type = "code";
        }
        if (!params.client_id) {
          params.client_id = this._stripe.getClientId();
        }
        if (!params.scope) {
          params.scope = "read_write";
        }
        return `https://${oAuthHost}/${path}?${(0, utils_js_1.queryStringifyRequestData)(params)}`;
      },
      token: stripeMethod({
        method: "POST",
        path: "oauth/token",
        host: oAuthHost
      }),
      deauthorize(spec, ...args) {
        if (!spec.client_id) {
          spec.client_id = this._stripe.getClientId();
        }
        return stripeMethod({
          method: "POST",
          path: "oauth/deauthorize",
          host: oAuthHost
        }).apply(this, [spec, ...args]);
      }
    });
  }
});

// node_modules/stripe/cjs/resources/PaymentIntents.js
var require_PaymentIntents = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentIntents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentIntents = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PaymentIntents = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/payment_intents" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_intents/{intent}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_intents",
        methodType: "list"
      }),
      applyCustomerBalance: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/apply_customer_balance"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/cancel"
      }),
      capture: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/capture"
      }),
      confirm: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/confirm"
      }),
      incrementAuthorization: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/increment_authorization"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_intents/search",
        methodType: "search"
      }),
      verifyMicrodeposits: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_intents/{intent}/verify_microdeposits"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/PaymentLinks.js
var require_PaymentLinks = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentLinks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentLinks = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PaymentLinks = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/payment_links" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_links/{payment_link}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_links/{payment_link}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_links",
        methodType: "list"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_links/{payment_link}/line_items",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/PaymentMethodConfigurations.js
var require_PaymentMethodConfigurations = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethodConfigurations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethodConfigurations = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PaymentMethodConfigurations = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_method_configurations"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_method_configurations/{configuration}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_method_configurations/{configuration}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_method_configurations",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/PaymentMethodDomains.js
var require_PaymentMethodDomains = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethodDomains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethodDomains = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PaymentMethodDomains = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_method_domains"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_method_domains/{payment_method_domain}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_method_domains/{payment_method_domain}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_method_domains",
        methodType: "list"
      }),
      validate: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_method_domains/{payment_method_domain}/validate"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/PaymentMethods.js
var require_PaymentMethods = __commonJS({
  "node_modules/stripe/cjs/resources/PaymentMethods.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PaymentMethods = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PaymentMethods = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/payment_methods" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_methods/{payment_method}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_methods/{payment_method}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payment_methods",
        methodType: "list"
      }),
      attach: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_methods/{payment_method}/attach"
      }),
      detach: stripeMethod({
        method: "POST",
        fullPath: "/v1/payment_methods/{payment_method}/detach"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Payouts.js
var require_Payouts = __commonJS({
  "node_modules/stripe/cjs/resources/Payouts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Payouts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Payouts = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/payouts" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/payouts/{payout}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/payouts/{payout}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/payouts",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/payouts/{payout}/cancel"
      }),
      reverse: stripeMethod({
        method: "POST",
        fullPath: "/v1/payouts/{payout}/reverse"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Plans.js
var require_Plans = __commonJS({
  "node_modules/stripe/cjs/resources/Plans.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Plans = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Plans = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/plans" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/plans/{plan}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/plans/{plan}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/plans",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/plans/{plan}" })
    });
  }
});

// node_modules/stripe/cjs/resources/Prices.js
var require_Prices = __commonJS({
  "node_modules/stripe/cjs/resources/Prices.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Prices = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Prices = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/prices" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/prices/{price}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/prices/{price}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/prices",
        methodType: "list"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/prices/search",
        methodType: "search"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Products.js
var require_Products2 = __commonJS({
  "node_modules/stripe/cjs/resources/Products.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Products = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Products = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/products" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/products/{id}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/products/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/products",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/products/{id}" }),
      createFeature: stripeMethod({
        method: "POST",
        fullPath: "/v1/products/{product}/features"
      }),
      deleteFeature: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/products/{product}/features/{id}"
      }),
      listFeatures: stripeMethod({
        method: "GET",
        fullPath: "/v1/products/{product}/features",
        methodType: "list"
      }),
      retrieveFeature: stripeMethod({
        method: "GET",
        fullPath: "/v1/products/{product}/features/{id}"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/products/search",
        methodType: "search"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/PromotionCodes.js
var require_PromotionCodes = __commonJS({
  "node_modules/stripe/cjs/resources/PromotionCodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PromotionCodes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.PromotionCodes = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/promotion_codes" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/promotion_codes/{promotion_code}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/promotion_codes/{promotion_code}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/promotion_codes",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Quotes.js
var require_Quotes = __commonJS({
  "node_modules/stripe/cjs/resources/Quotes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Quotes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Quotes = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/quotes" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/quotes/{quote}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/quotes/{quote}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/quotes",
        methodType: "list"
      }),
      accept: stripeMethod({ method: "POST", fullPath: "/v1/quotes/{quote}/accept" }),
      cancel: stripeMethod({ method: "POST", fullPath: "/v1/quotes/{quote}/cancel" }),
      finalizeQuote: stripeMethod({
        method: "POST",
        fullPath: "/v1/quotes/{quote}/finalize"
      }),
      listComputedUpfrontLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/quotes/{quote}/computed_upfront_line_items",
        methodType: "list"
      }),
      listLineItems: stripeMethod({
        method: "GET",
        fullPath: "/v1/quotes/{quote}/line_items",
        methodType: "list"
      }),
      pdf: stripeMethod({
        method: "GET",
        fullPath: "/v1/quotes/{quote}/pdf",
        host: "files.stripe.com",
        streaming: true
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Refunds.js
var require_Refunds2 = __commonJS({
  "node_modules/stripe/cjs/resources/Refunds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Refunds = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Refunds = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/refunds" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/refunds/{refund}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/refunds/{refund}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/refunds",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/refunds/{refund}/cancel"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Reviews.js
var require_Reviews = __commonJS({
  "node_modules/stripe/cjs/resources/Reviews.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Reviews = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Reviews = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/reviews/{review}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/reviews",
        methodType: "list"
      }),
      approve: stripeMethod({
        method: "POST",
        fullPath: "/v1/reviews/{review}/approve"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/SetupAttempts.js
var require_SetupAttempts = __commonJS({
  "node_modules/stripe/cjs/resources/SetupAttempts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SetupAttempts = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.SetupAttempts = StripeResource_js_1.StripeResource.extend({
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/setup_attempts",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/SetupIntents.js
var require_SetupIntents = __commonJS({
  "node_modules/stripe/cjs/resources/SetupIntents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SetupIntents = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.SetupIntents = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/setup_intents" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/setup_intents/{intent}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/setup_intents/{intent}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/setup_intents",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/setup_intents/{intent}/cancel"
      }),
      confirm: stripeMethod({
        method: "POST",
        fullPath: "/v1/setup_intents/{intent}/confirm"
      }),
      verifyMicrodeposits: stripeMethod({
        method: "POST",
        fullPath: "/v1/setup_intents/{intent}/verify_microdeposits"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/ShippingRates.js
var require_ShippingRates = __commonJS({
  "node_modules/stripe/cjs/resources/ShippingRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ShippingRates = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.ShippingRates = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/shipping_rates" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/shipping_rates/{shipping_rate_token}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/shipping_rates/{shipping_rate_token}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/shipping_rates",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Sources.js
var require_Sources = __commonJS({
  "node_modules/stripe/cjs/resources/Sources.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Sources = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Sources = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/sources" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/sources/{source}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/sources/{source}" }),
      listSourceTransactions: stripeMethod({
        method: "GET",
        fullPath: "/v1/sources/{source}/source_transactions",
        methodType: "list"
      }),
      verify: stripeMethod({
        method: "POST",
        fullPath: "/v1/sources/{source}/verify"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/SubscriptionItems.js
var require_SubscriptionItems = __commonJS({
  "node_modules/stripe/cjs/resources/SubscriptionItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionItems = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.SubscriptionItems = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/subscription_items" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscription_items/{item}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscription_items/{item}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscription_items",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/subscription_items/{item}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/SubscriptionSchedules.js
var require_SubscriptionSchedules = __commonJS({
  "node_modules/stripe/cjs/resources/SubscriptionSchedules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SubscriptionSchedules = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.SubscriptionSchedules = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscription_schedules"
      }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscription_schedules/{schedule}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscription_schedules/{schedule}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscription_schedules",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscription_schedules/{schedule}/cancel"
      }),
      release: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscription_schedules/{schedule}/release"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Subscriptions.js
var require_Subscriptions = __commonJS({
  "node_modules/stripe/cjs/resources/Subscriptions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Subscriptions = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Subscriptions = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/subscriptions" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscriptions/{subscription_exposed_id}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscriptions/{subscription_exposed_id}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscriptions",
        methodType: "list"
      }),
      cancel: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/subscriptions/{subscription_exposed_id}"
      }),
      deleteDiscount: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/subscriptions/{subscription_exposed_id}/discount"
      }),
      resume: stripeMethod({
        method: "POST",
        fullPath: "/v1/subscriptions/{subscription}/resume"
      }),
      search: stripeMethod({
        method: "GET",
        fullPath: "/v1/subscriptions/search",
        methodType: "search"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TaxCodes.js
var require_TaxCodes = __commonJS({
  "node_modules/stripe/cjs/resources/TaxCodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxCodes = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.TaxCodes = StripeResource_js_1.StripeResource.extend({
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/tax_codes/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax_codes",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/TaxIds.js
var require_TaxIds = __commonJS({
  "node_modules/stripe/cjs/resources/TaxIds.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxIds = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.TaxIds = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/tax_ids" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/tax_ids/{id}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax_ids",
        methodType: "list"
      }),
      del: stripeMethod({ method: "DELETE", fullPath: "/v1/tax_ids/{id}" })
    });
  }
});

// node_modules/stripe/cjs/resources/TaxRates.js
var require_TaxRates = __commonJS({
  "node_modules/stripe/cjs/resources/TaxRates.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxRates = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.TaxRates = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/tax_rates" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/tax_rates/{tax_rate}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/tax_rates/{tax_rate}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/tax_rates",
        methodType: "list"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/Tokens.js
var require_Tokens2 = __commonJS({
  "node_modules/stripe/cjs/resources/Tokens.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Tokens = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Tokens = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/tokens" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/tokens/{token}" })
    });
  }
});

// node_modules/stripe/cjs/resources/Topups.js
var require_Topups = __commonJS({
  "node_modules/stripe/cjs/resources/Topups.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Topups = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Topups = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/topups" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/topups/{topup}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/topups/{topup}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/topups",
        methodType: "list"
      }),
      cancel: stripeMethod({ method: "POST", fullPath: "/v1/topups/{topup}/cancel" })
    });
  }
});

// node_modules/stripe/cjs/resources/Transfers.js
var require_Transfers = __commonJS({
  "node_modules/stripe/cjs/resources/Transfers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transfers = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.Transfers = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/transfers" }),
      retrieve: stripeMethod({ method: "GET", fullPath: "/v1/transfers/{transfer}" }),
      update: stripeMethod({ method: "POST", fullPath: "/v1/transfers/{transfer}" }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/transfers",
        methodType: "list"
      }),
      createReversal: stripeMethod({
        method: "POST",
        fullPath: "/v1/transfers/{id}/reversals"
      }),
      listReversals: stripeMethod({
        method: "GET",
        fullPath: "/v1/transfers/{id}/reversals",
        methodType: "list"
      }),
      retrieveReversal: stripeMethod({
        method: "GET",
        fullPath: "/v1/transfers/{transfer}/reversals/{id}"
      }),
      updateReversal: stripeMethod({
        method: "POST",
        fullPath: "/v1/transfers/{transfer}/reversals/{id}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources/WebhookEndpoints.js
var require_WebhookEndpoints = __commonJS({
  "node_modules/stripe/cjs/resources/WebhookEndpoints.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebhookEndpoints = void 0;
    var StripeResource_js_1 = require_StripeResource();
    var stripeMethod = StripeResource_js_1.StripeResource.method;
    exports2.WebhookEndpoints = StripeResource_js_1.StripeResource.extend({
      create: stripeMethod({ method: "POST", fullPath: "/v1/webhook_endpoints" }),
      retrieve: stripeMethod({
        method: "GET",
        fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
      }),
      update: stripeMethod({
        method: "POST",
        fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
      }),
      list: stripeMethod({
        method: "GET",
        fullPath: "/v1/webhook_endpoints",
        methodType: "list"
      }),
      del: stripeMethod({
        method: "DELETE",
        fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
      })
    });
  }
});

// node_modules/stripe/cjs/resources.js
var require_resources = __commonJS({
  "node_modules/stripe/cjs/resources.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TaxRates = exports2.TaxIds = exports2.TaxCodes = exports2.Subscriptions = exports2.SubscriptionSchedules = exports2.SubscriptionItems = exports2.Sources = exports2.ShippingRates = exports2.SetupIntents = exports2.SetupAttempts = exports2.Reviews = exports2.Refunds = exports2.Quotes = exports2.PromotionCodes = exports2.Products = exports2.Prices = exports2.Plans = exports2.Payouts = exports2.PaymentMethods = exports2.PaymentMethodDomains = exports2.PaymentMethodConfigurations = exports2.PaymentLinks = exports2.PaymentIntents = exports2.OAuth = exports2.Mandates = exports2.Invoices = exports2.InvoiceRenderingTemplates = exports2.InvoicePayments = exports2.InvoiceItems = exports2.Files = exports2.FileLinks = exports2.ExchangeRates = exports2.Events = exports2.EphemeralKeys = exports2.Disputes = exports2.Customers = exports2.CustomerSessions = exports2.CreditNotes = exports2.Coupons = exports2.CountrySpecs = exports2.ConfirmationTokens = exports2.Charges = exports2.BalanceTransactions = exports2.Balance = exports2.ApplicationFees = exports2.ApplePayDomains = exports2.Accounts = exports2.AccountSessions = exports2.AccountLinks = exports2.Account = void 0;
    exports2.V2 = exports2.Treasury = exports2.TestHelpers = exports2.Terminal = exports2.Tax = exports2.Sigma = exports2.Reporting = exports2.Radar = exports2.Issuing = exports2.Identity = exports2.Forwarding = exports2.FinancialConnections = exports2.Entitlements = exports2.Climate = exports2.Checkout = exports2.BillingPortal = exports2.Billing = exports2.Apps = exports2.WebhookEndpoints = exports2.Transfers = exports2.Topups = exports2.Tokens = void 0;
    var ResourceNamespace_js_1 = require_ResourceNamespace();
    var Accounts_js_1 = require_Accounts();
    var ActiveEntitlements_js_1 = require_ActiveEntitlements();
    var Alerts_js_1 = require_Alerts();
    var Authorizations_js_1 = require_Authorizations();
    var Authorizations_js_2 = require_Authorizations2();
    var Calculations_js_1 = require_Calculations();
    var Cardholders_js_1 = require_Cardholders();
    var Cards_js_1 = require_Cards();
    var Cards_js_2 = require_Cards2();
    var Configurations_js_1 = require_Configurations();
    var Configurations_js_2 = require_Configurations2();
    var ConfirmationTokens_js_1 = require_ConfirmationTokens();
    var ConnectionTokens_js_1 = require_ConnectionTokens();
    var CreditBalanceSummary_js_1 = require_CreditBalanceSummary();
    var CreditBalanceTransactions_js_1 = require_CreditBalanceTransactions();
    var CreditGrants_js_1 = require_CreditGrants();
    var CreditReversals_js_1 = require_CreditReversals();
    var Customers_js_1 = require_Customers();
    var DebitReversals_js_1 = require_DebitReversals();
    var Disputes_js_1 = require_Disputes();
    var EarlyFraudWarnings_js_1 = require_EarlyFraudWarnings();
    var EventDestinations_js_1 = require_EventDestinations();
    var Events_js_1 = require_Events();
    var Features_js_1 = require_Features();
    var FinancialAccounts_js_1 = require_FinancialAccounts();
    var InboundTransfers_js_1 = require_InboundTransfers();
    var InboundTransfers_js_2 = require_InboundTransfers2();
    var Locations_js_1 = require_Locations();
    var MeterEventAdjustments_js_1 = require_MeterEventAdjustments();
    var MeterEventAdjustments_js_2 = require_MeterEventAdjustments2();
    var MeterEventSession_js_1 = require_MeterEventSession();
    var MeterEventStream_js_1 = require_MeterEventStream();
    var MeterEvents_js_1 = require_MeterEvents();
    var MeterEvents_js_2 = require_MeterEvents2();
    var Meters_js_1 = require_Meters();
    var Orders_js_1 = require_Orders();
    var OutboundPayments_js_1 = require_OutboundPayments();
    var OutboundPayments_js_2 = require_OutboundPayments2();
    var OutboundTransfers_js_1 = require_OutboundTransfers();
    var OutboundTransfers_js_2 = require_OutboundTransfers2();
    var PersonalizationDesigns_js_1 = require_PersonalizationDesigns();
    var PersonalizationDesigns_js_2 = require_PersonalizationDesigns2();
    var PhysicalBundles_js_1 = require_PhysicalBundles();
    var Products_js_1 = require_Products();
    var Readers_js_1 = require_Readers();
    var Readers_js_2 = require_Readers2();
    var ReceivedCredits_js_1 = require_ReceivedCredits();
    var ReceivedCredits_js_2 = require_ReceivedCredits2();
    var ReceivedDebits_js_1 = require_ReceivedDebits();
    var ReceivedDebits_js_2 = require_ReceivedDebits2();
    var Refunds_js_1 = require_Refunds();
    var Registrations_js_1 = require_Registrations();
    var ReportRuns_js_1 = require_ReportRuns();
    var ReportTypes_js_1 = require_ReportTypes();
    var Requests_js_1 = require_Requests();
    var ScheduledQueryRuns_js_1 = require_ScheduledQueryRuns();
    var Secrets_js_1 = require_Secrets();
    var Sessions_js_1 = require_Sessions();
    var Sessions_js_2 = require_Sessions2();
    var Sessions_js_3 = require_Sessions3();
    var Settings_js_1 = require_Settings();
    var Suppliers_js_1 = require_Suppliers();
    var TestClocks_js_1 = require_TestClocks();
    var Tokens_js_1 = require_Tokens();
    var TransactionEntries_js_1 = require_TransactionEntries();
    var Transactions_js_1 = require_Transactions();
    var Transactions_js_2 = require_Transactions2();
    var Transactions_js_3 = require_Transactions3();
    var Transactions_js_4 = require_Transactions4();
    var Transactions_js_5 = require_Transactions5();
    var ValueListItems_js_1 = require_ValueListItems();
    var ValueLists_js_1 = require_ValueLists();
    var VerificationReports_js_1 = require_VerificationReports();
    var VerificationSessions_js_1 = require_VerificationSessions();
    var Accounts_js_2 = require_Accounts2();
    Object.defineProperty(exports2, "Account", { enumerable: true, get: function() {
      return Accounts_js_2.Accounts;
    } });
    var AccountLinks_js_1 = require_AccountLinks();
    Object.defineProperty(exports2, "AccountLinks", { enumerable: true, get: function() {
      return AccountLinks_js_1.AccountLinks;
    } });
    var AccountSessions_js_1 = require_AccountSessions();
    Object.defineProperty(exports2, "AccountSessions", { enumerable: true, get: function() {
      return AccountSessions_js_1.AccountSessions;
    } });
    var Accounts_js_3 = require_Accounts2();
    Object.defineProperty(exports2, "Accounts", { enumerable: true, get: function() {
      return Accounts_js_3.Accounts;
    } });
    var ApplePayDomains_js_1 = require_ApplePayDomains();
    Object.defineProperty(exports2, "ApplePayDomains", { enumerable: true, get: function() {
      return ApplePayDomains_js_1.ApplePayDomains;
    } });
    var ApplicationFees_js_1 = require_ApplicationFees();
    Object.defineProperty(exports2, "ApplicationFees", { enumerable: true, get: function() {
      return ApplicationFees_js_1.ApplicationFees;
    } });
    var Balance_js_1 = require_Balance();
    Object.defineProperty(exports2, "Balance", { enumerable: true, get: function() {
      return Balance_js_1.Balance;
    } });
    var BalanceTransactions_js_1 = require_BalanceTransactions();
    Object.defineProperty(exports2, "BalanceTransactions", { enumerable: true, get: function() {
      return BalanceTransactions_js_1.BalanceTransactions;
    } });
    var Charges_js_1 = require_Charges();
    Object.defineProperty(exports2, "Charges", { enumerable: true, get: function() {
      return Charges_js_1.Charges;
    } });
    var ConfirmationTokens_js_2 = require_ConfirmationTokens2();
    Object.defineProperty(exports2, "ConfirmationTokens", { enumerable: true, get: function() {
      return ConfirmationTokens_js_2.ConfirmationTokens;
    } });
    var CountrySpecs_js_1 = require_CountrySpecs();
    Object.defineProperty(exports2, "CountrySpecs", { enumerable: true, get: function() {
      return CountrySpecs_js_1.CountrySpecs;
    } });
    var Coupons_js_1 = require_Coupons();
    Object.defineProperty(exports2, "Coupons", { enumerable: true, get: function() {
      return Coupons_js_1.Coupons;
    } });
    var CreditNotes_js_1 = require_CreditNotes();
    Object.defineProperty(exports2, "CreditNotes", { enumerable: true, get: function() {
      return CreditNotes_js_1.CreditNotes;
    } });
    var CustomerSessions_js_1 = require_CustomerSessions();
    Object.defineProperty(exports2, "CustomerSessions", { enumerable: true, get: function() {
      return CustomerSessions_js_1.CustomerSessions;
    } });
    var Customers_js_2 = require_Customers2();
    Object.defineProperty(exports2, "Customers", { enumerable: true, get: function() {
      return Customers_js_2.Customers;
    } });
    var Disputes_js_2 = require_Disputes2();
    Object.defineProperty(exports2, "Disputes", { enumerable: true, get: function() {
      return Disputes_js_2.Disputes;
    } });
    var EphemeralKeys_js_1 = require_EphemeralKeys();
    Object.defineProperty(exports2, "EphemeralKeys", { enumerable: true, get: function() {
      return EphemeralKeys_js_1.EphemeralKeys;
    } });
    var Events_js_2 = require_Events2();
    Object.defineProperty(exports2, "Events", { enumerable: true, get: function() {
      return Events_js_2.Events;
    } });
    var ExchangeRates_js_1 = require_ExchangeRates();
    Object.defineProperty(exports2, "ExchangeRates", { enumerable: true, get: function() {
      return ExchangeRates_js_1.ExchangeRates;
    } });
    var FileLinks_js_1 = require_FileLinks();
    Object.defineProperty(exports2, "FileLinks", { enumerable: true, get: function() {
      return FileLinks_js_1.FileLinks;
    } });
    var Files_js_1 = require_Files();
    Object.defineProperty(exports2, "Files", { enumerable: true, get: function() {
      return Files_js_1.Files;
    } });
    var InvoiceItems_js_1 = require_InvoiceItems();
    Object.defineProperty(exports2, "InvoiceItems", { enumerable: true, get: function() {
      return InvoiceItems_js_1.InvoiceItems;
    } });
    var InvoicePayments_js_1 = require_InvoicePayments();
    Object.defineProperty(exports2, "InvoicePayments", { enumerable: true, get: function() {
      return InvoicePayments_js_1.InvoicePayments;
    } });
    var InvoiceRenderingTemplates_js_1 = require_InvoiceRenderingTemplates();
    Object.defineProperty(exports2, "InvoiceRenderingTemplates", { enumerable: true, get: function() {
      return InvoiceRenderingTemplates_js_1.InvoiceRenderingTemplates;
    } });
    var Invoices_js_1 = require_Invoices();
    Object.defineProperty(exports2, "Invoices", { enumerable: true, get: function() {
      return Invoices_js_1.Invoices;
    } });
    var Mandates_js_1 = require_Mandates();
    Object.defineProperty(exports2, "Mandates", { enumerable: true, get: function() {
      return Mandates_js_1.Mandates;
    } });
    var OAuth_js_1 = require_OAuth();
    Object.defineProperty(exports2, "OAuth", { enumerable: true, get: function() {
      return OAuth_js_1.OAuth;
    } });
    var PaymentIntents_js_1 = require_PaymentIntents();
    Object.defineProperty(exports2, "PaymentIntents", { enumerable: true, get: function() {
      return PaymentIntents_js_1.PaymentIntents;
    } });
    var PaymentLinks_js_1 = require_PaymentLinks();
    Object.defineProperty(exports2, "PaymentLinks", { enumerable: true, get: function() {
      return PaymentLinks_js_1.PaymentLinks;
    } });
    var PaymentMethodConfigurations_js_1 = require_PaymentMethodConfigurations();
    Object.defineProperty(exports2, "PaymentMethodConfigurations", { enumerable: true, get: function() {
      return PaymentMethodConfigurations_js_1.PaymentMethodConfigurations;
    } });
    var PaymentMethodDomains_js_1 = require_PaymentMethodDomains();
    Object.defineProperty(exports2, "PaymentMethodDomains", { enumerable: true, get: function() {
      return PaymentMethodDomains_js_1.PaymentMethodDomains;
    } });
    var PaymentMethods_js_1 = require_PaymentMethods();
    Object.defineProperty(exports2, "PaymentMethods", { enumerable: true, get: function() {
      return PaymentMethods_js_1.PaymentMethods;
    } });
    var Payouts_js_1 = require_Payouts();
    Object.defineProperty(exports2, "Payouts", { enumerable: true, get: function() {
      return Payouts_js_1.Payouts;
    } });
    var Plans_js_1 = require_Plans();
    Object.defineProperty(exports2, "Plans", { enumerable: true, get: function() {
      return Plans_js_1.Plans;
    } });
    var Prices_js_1 = require_Prices();
    Object.defineProperty(exports2, "Prices", { enumerable: true, get: function() {
      return Prices_js_1.Prices;
    } });
    var Products_js_2 = require_Products2();
    Object.defineProperty(exports2, "Products", { enumerable: true, get: function() {
      return Products_js_2.Products;
    } });
    var PromotionCodes_js_1 = require_PromotionCodes();
    Object.defineProperty(exports2, "PromotionCodes", { enumerable: true, get: function() {
      return PromotionCodes_js_1.PromotionCodes;
    } });
    var Quotes_js_1 = require_Quotes();
    Object.defineProperty(exports2, "Quotes", { enumerable: true, get: function() {
      return Quotes_js_1.Quotes;
    } });
    var Refunds_js_2 = require_Refunds2();
    Object.defineProperty(exports2, "Refunds", { enumerable: true, get: function() {
      return Refunds_js_2.Refunds;
    } });
    var Reviews_js_1 = require_Reviews();
    Object.defineProperty(exports2, "Reviews", { enumerable: true, get: function() {
      return Reviews_js_1.Reviews;
    } });
    var SetupAttempts_js_1 = require_SetupAttempts();
    Object.defineProperty(exports2, "SetupAttempts", { enumerable: true, get: function() {
      return SetupAttempts_js_1.SetupAttempts;
    } });
    var SetupIntents_js_1 = require_SetupIntents();
    Object.defineProperty(exports2, "SetupIntents", { enumerable: true, get: function() {
      return SetupIntents_js_1.SetupIntents;
    } });
    var ShippingRates_js_1 = require_ShippingRates();
    Object.defineProperty(exports2, "ShippingRates", { enumerable: true, get: function() {
      return ShippingRates_js_1.ShippingRates;
    } });
    var Sources_js_1 = require_Sources();
    Object.defineProperty(exports2, "Sources", { enumerable: true, get: function() {
      return Sources_js_1.Sources;
    } });
    var SubscriptionItems_js_1 = require_SubscriptionItems();
    Object.defineProperty(exports2, "SubscriptionItems", { enumerable: true, get: function() {
      return SubscriptionItems_js_1.SubscriptionItems;
    } });
    var SubscriptionSchedules_js_1 = require_SubscriptionSchedules();
    Object.defineProperty(exports2, "SubscriptionSchedules", { enumerable: true, get: function() {
      return SubscriptionSchedules_js_1.SubscriptionSchedules;
    } });
    var Subscriptions_js_1 = require_Subscriptions();
    Object.defineProperty(exports2, "Subscriptions", { enumerable: true, get: function() {
      return Subscriptions_js_1.Subscriptions;
    } });
    var TaxCodes_js_1 = require_TaxCodes();
    Object.defineProperty(exports2, "TaxCodes", { enumerable: true, get: function() {
      return TaxCodes_js_1.TaxCodes;
    } });
    var TaxIds_js_1 = require_TaxIds();
    Object.defineProperty(exports2, "TaxIds", { enumerable: true, get: function() {
      return TaxIds_js_1.TaxIds;
    } });
    var TaxRates_js_1 = require_TaxRates();
    Object.defineProperty(exports2, "TaxRates", { enumerable: true, get: function() {
      return TaxRates_js_1.TaxRates;
    } });
    var Tokens_js_2 = require_Tokens2();
    Object.defineProperty(exports2, "Tokens", { enumerable: true, get: function() {
      return Tokens_js_2.Tokens;
    } });
    var Topups_js_1 = require_Topups();
    Object.defineProperty(exports2, "Topups", { enumerable: true, get: function() {
      return Topups_js_1.Topups;
    } });
    var Transfers_js_1 = require_Transfers();
    Object.defineProperty(exports2, "Transfers", { enumerable: true, get: function() {
      return Transfers_js_1.Transfers;
    } });
    var WebhookEndpoints_js_1 = require_WebhookEndpoints();
    Object.defineProperty(exports2, "WebhookEndpoints", { enumerable: true, get: function() {
      return WebhookEndpoints_js_1.WebhookEndpoints;
    } });
    exports2.Apps = (0, ResourceNamespace_js_1.resourceNamespace)("apps", { Secrets: Secrets_js_1.Secrets });
    exports2.Billing = (0, ResourceNamespace_js_1.resourceNamespace)("billing", {
      Alerts: Alerts_js_1.Alerts,
      CreditBalanceSummary: CreditBalanceSummary_js_1.CreditBalanceSummary,
      CreditBalanceTransactions: CreditBalanceTransactions_js_1.CreditBalanceTransactions,
      CreditGrants: CreditGrants_js_1.CreditGrants,
      MeterEventAdjustments: MeterEventAdjustments_js_1.MeterEventAdjustments,
      MeterEvents: MeterEvents_js_1.MeterEvents,
      Meters: Meters_js_1.Meters
    });
    exports2.BillingPortal = (0, ResourceNamespace_js_1.resourceNamespace)("billingPortal", {
      Configurations: Configurations_js_1.Configurations,
      Sessions: Sessions_js_1.Sessions
    });
    exports2.Checkout = (0, ResourceNamespace_js_1.resourceNamespace)("checkout", {
      Sessions: Sessions_js_2.Sessions
    });
    exports2.Climate = (0, ResourceNamespace_js_1.resourceNamespace)("climate", {
      Orders: Orders_js_1.Orders,
      Products: Products_js_1.Products,
      Suppliers: Suppliers_js_1.Suppliers
    });
    exports2.Entitlements = (0, ResourceNamespace_js_1.resourceNamespace)("entitlements", {
      ActiveEntitlements: ActiveEntitlements_js_1.ActiveEntitlements,
      Features: Features_js_1.Features
    });
    exports2.FinancialConnections = (0, ResourceNamespace_js_1.resourceNamespace)("financialConnections", {
      Accounts: Accounts_js_1.Accounts,
      Sessions: Sessions_js_3.Sessions,
      Transactions: Transactions_js_2.Transactions
    });
    exports2.Forwarding = (0, ResourceNamespace_js_1.resourceNamespace)("forwarding", {
      Requests: Requests_js_1.Requests
    });
    exports2.Identity = (0, ResourceNamespace_js_1.resourceNamespace)("identity", {
      VerificationReports: VerificationReports_js_1.VerificationReports,
      VerificationSessions: VerificationSessions_js_1.VerificationSessions
    });
    exports2.Issuing = (0, ResourceNamespace_js_1.resourceNamespace)("issuing", {
      Authorizations: Authorizations_js_2.Authorizations,
      Cardholders: Cardholders_js_1.Cardholders,
      Cards: Cards_js_2.Cards,
      Disputes: Disputes_js_1.Disputes,
      PersonalizationDesigns: PersonalizationDesigns_js_2.PersonalizationDesigns,
      PhysicalBundles: PhysicalBundles_js_1.PhysicalBundles,
      Tokens: Tokens_js_1.Tokens,
      Transactions: Transactions_js_3.Transactions
    });
    exports2.Radar = (0, ResourceNamespace_js_1.resourceNamespace)("radar", {
      EarlyFraudWarnings: EarlyFraudWarnings_js_1.EarlyFraudWarnings,
      ValueListItems: ValueListItems_js_1.ValueListItems,
      ValueLists: ValueLists_js_1.ValueLists
    });
    exports2.Reporting = (0, ResourceNamespace_js_1.resourceNamespace)("reporting", {
      ReportRuns: ReportRuns_js_1.ReportRuns,
      ReportTypes: ReportTypes_js_1.ReportTypes
    });
    exports2.Sigma = (0, ResourceNamespace_js_1.resourceNamespace)("sigma", {
      ScheduledQueryRuns: ScheduledQueryRuns_js_1.ScheduledQueryRuns
    });
    exports2.Tax = (0, ResourceNamespace_js_1.resourceNamespace)("tax", {
      Calculations: Calculations_js_1.Calculations,
      Registrations: Registrations_js_1.Registrations,
      Settings: Settings_js_1.Settings,
      Transactions: Transactions_js_4.Transactions
    });
    exports2.Terminal = (0, ResourceNamespace_js_1.resourceNamespace)("terminal", {
      Configurations: Configurations_js_2.Configurations,
      ConnectionTokens: ConnectionTokens_js_1.ConnectionTokens,
      Locations: Locations_js_1.Locations,
      Readers: Readers_js_2.Readers
    });
    exports2.TestHelpers = (0, ResourceNamespace_js_1.resourceNamespace)("testHelpers", {
      ConfirmationTokens: ConfirmationTokens_js_1.ConfirmationTokens,
      Customers: Customers_js_1.Customers,
      Refunds: Refunds_js_1.Refunds,
      TestClocks: TestClocks_js_1.TestClocks,
      Issuing: (0, ResourceNamespace_js_1.resourceNamespace)("issuing", {
        Authorizations: Authorizations_js_1.Authorizations,
        Cards: Cards_js_1.Cards,
        PersonalizationDesigns: PersonalizationDesigns_js_1.PersonalizationDesigns,
        Transactions: Transactions_js_1.Transactions
      }),
      Terminal: (0, ResourceNamespace_js_1.resourceNamespace)("terminal", {
        Readers: Readers_js_1.Readers
      }),
      Treasury: (0, ResourceNamespace_js_1.resourceNamespace)("treasury", {
        InboundTransfers: InboundTransfers_js_1.InboundTransfers,
        OutboundPayments: OutboundPayments_js_1.OutboundPayments,
        OutboundTransfers: OutboundTransfers_js_1.OutboundTransfers,
        ReceivedCredits: ReceivedCredits_js_1.ReceivedCredits,
        ReceivedDebits: ReceivedDebits_js_1.ReceivedDebits
      })
    });
    exports2.Treasury = (0, ResourceNamespace_js_1.resourceNamespace)("treasury", {
      CreditReversals: CreditReversals_js_1.CreditReversals,
      DebitReversals: DebitReversals_js_1.DebitReversals,
      FinancialAccounts: FinancialAccounts_js_1.FinancialAccounts,
      InboundTransfers: InboundTransfers_js_2.InboundTransfers,
      OutboundPayments: OutboundPayments_js_2.OutboundPayments,
      OutboundTransfers: OutboundTransfers_js_2.OutboundTransfers,
      ReceivedCredits: ReceivedCredits_js_2.ReceivedCredits,
      ReceivedDebits: ReceivedDebits_js_2.ReceivedDebits,
      TransactionEntries: TransactionEntries_js_1.TransactionEntries,
      Transactions: Transactions_js_5.Transactions
    });
    exports2.V2 = (0, ResourceNamespace_js_1.resourceNamespace)("v2", {
      Billing: (0, ResourceNamespace_js_1.resourceNamespace)("billing", {
        MeterEventAdjustments: MeterEventAdjustments_js_2.MeterEventAdjustments,
        MeterEventSession: MeterEventSession_js_1.MeterEventSession,
        MeterEventStream: MeterEventStream_js_1.MeterEventStream,
        MeterEvents: MeterEvents_js_2.MeterEvents
      }),
      Core: (0, ResourceNamespace_js_1.resourceNamespace)("core", {
        EventDestinations: EventDestinations_js_1.EventDestinations,
        Events: Events_js_1.Events
      })
    });
  }
});

// node_modules/stripe/cjs/stripe.core.js
var require_stripe_core = __commonJS({
  "node_modules/stripe/cjs/stripe.core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createStripe = void 0;
    var _Error = require_Error();
    var RequestSender_js_1 = require_RequestSender();
    var StripeResource_js_1 = require_StripeResource();
    var Webhooks_js_1 = require_Webhooks();
    var apiVersion_js_1 = require_apiVersion();
    var CryptoProvider_js_1 = require_CryptoProvider();
    var HttpClient_js_1 = require_HttpClient();
    var resources = require_resources();
    var utils_js_1 = require_utils2();
    var DEFAULT_HOST = "api.stripe.com";
    var DEFAULT_PORT = "443";
    var DEFAULT_BASE_PATH = "/v1/";
    var DEFAULT_API_VERSION = apiVersion_js_1.ApiVersion;
    var DEFAULT_TIMEOUT = 8e4;
    var MAX_NETWORK_RETRY_DELAY_SEC = 5;
    var INITIAL_NETWORK_RETRY_DELAY_SEC = 0.5;
    var APP_INFO_PROPERTIES = ["name", "version", "url", "partner_id"];
    var ALLOWED_CONFIG_PROPERTIES = [
      "authenticator",
      "apiVersion",
      "typescript",
      "maxNetworkRetries",
      "httpAgent",
      "httpClient",
      "timeout",
      "host",
      "port",
      "protocol",
      "telemetry",
      "appInfo",
      "stripeAccount",
      "stripeContext"
    ];
    var defaultRequestSenderFactory = (stripe2) => new RequestSender_js_1.RequestSender(stripe2, StripeResource_js_1.StripeResource.MAX_BUFFERED_REQUEST_METRICS);
    function createStripe(platformFunctions, requestSender = defaultRequestSenderFactory) {
      Stripe2.PACKAGE_VERSION = "18.0.0";
      Stripe2.USER_AGENT = Object.assign({ bindings_version: Stripe2.PACKAGE_VERSION, lang: "node", publisher: "stripe", uname: null, typescript: false }, (0, utils_js_1.determineProcessUserAgentProperties)());
      Stripe2.StripeResource = StripeResource_js_1.StripeResource;
      Stripe2.resources = resources;
      Stripe2.HttpClient = HttpClient_js_1.HttpClient;
      Stripe2.HttpClientResponse = HttpClient_js_1.HttpClientResponse;
      Stripe2.CryptoProvider = CryptoProvider_js_1.CryptoProvider;
      Stripe2.webhooks = (0, Webhooks_js_1.createWebhooks)(platformFunctions);
      function Stripe2(key, config = {}) {
        if (!(this instanceof Stripe2)) {
          return new Stripe2(key, config);
        }
        const props = this._getPropsFromConfig(config);
        this._platformFunctions = platformFunctions;
        Object.defineProperty(this, "_emitter", {
          value: this._platformFunctions.createEmitter(),
          enumerable: false,
          configurable: false,
          writable: false
        });
        this.VERSION = Stripe2.PACKAGE_VERSION;
        this.on = this._emitter.on.bind(this._emitter);
        this.once = this._emitter.once.bind(this._emitter);
        this.off = this._emitter.removeListener.bind(this._emitter);
        const agent = props.httpAgent || null;
        this._api = {
          host: props.host || DEFAULT_HOST,
          port: props.port || DEFAULT_PORT,
          protocol: props.protocol || "https",
          basePath: DEFAULT_BASE_PATH,
          version: props.apiVersion || DEFAULT_API_VERSION,
          timeout: (0, utils_js_1.validateInteger)("timeout", props.timeout, DEFAULT_TIMEOUT),
          maxNetworkRetries: (0, utils_js_1.validateInteger)("maxNetworkRetries", props.maxNetworkRetries, 2),
          agent,
          httpClient: props.httpClient || (agent ? this._platformFunctions.createNodeHttpClient(agent) : this._platformFunctions.createDefaultHttpClient()),
          dev: false,
          stripeAccount: props.stripeAccount || null,
          stripeContext: props.stripeContext || null
        };
        const typescript = props.typescript || false;
        if (typescript !== Stripe2.USER_AGENT.typescript) {
          Stripe2.USER_AGENT.typescript = typescript;
        }
        if (props.appInfo) {
          this._setAppInfo(props.appInfo);
        }
        this._prepResources();
        this._setAuthenticator(key, props.authenticator);
        this.errors = _Error;
        this.webhooks = Stripe2.webhooks;
        this._prevRequestMetrics = [];
        this._enableTelemetry = props.telemetry !== false;
        this._requestSender = requestSender(this);
        this.StripeResource = Stripe2.StripeResource;
      }
      Stripe2.errors = _Error;
      Stripe2.createNodeHttpClient = platformFunctions.createNodeHttpClient;
      Stripe2.createFetchHttpClient = platformFunctions.createFetchHttpClient;
      Stripe2.createNodeCryptoProvider = platformFunctions.createNodeCryptoProvider;
      Stripe2.createSubtleCryptoProvider = platformFunctions.createSubtleCryptoProvider;
      Stripe2.prototype = {
        _appInfo: void 0,
        on: null,
        off: null,
        once: null,
        VERSION: null,
        StripeResource: null,
        webhooks: null,
        errors: null,
        _api: null,
        _prevRequestMetrics: null,
        _emitter: null,
        _enableTelemetry: null,
        _requestSender: null,
        _platformFunctions: null,
        rawRequest(method, path, params, options) {
          return this._requestSender._rawRequest(method, path, params, options);
        },
        _setAuthenticator(key, authenticator) {
          if (key && authenticator) {
            throw new Error("Can't specify both apiKey and authenticator");
          }
          if (!key && !authenticator) {
            throw new Error("Neither apiKey nor config.authenticator provided");
          }
          this._authenticator = key ? (0, utils_js_1.createApiKeyAuthenticator)(key) : authenticator;
        },
        _setAppInfo(info) {
          if (info && typeof info !== "object") {
            throw new Error("AppInfo must be an object.");
          }
          if (info && !info.name) {
            throw new Error("AppInfo.name is required");
          }
          info = info || {};
          this._appInfo = APP_INFO_PROPERTIES.reduce((accum, prop) => {
            if (typeof info[prop] == "string") {
              accum = accum || {};
              accum[prop] = info[prop];
            }
            return accum;
          }, void 0);
        },
        _setApiField(key, value) {
          this._api[key] = value;
        },
        getApiField(key) {
          return this._api[key];
        },
        setClientId(clientId) {
          this._clientId = clientId;
        },
        getClientId() {
          return this._clientId;
        },
        getConstant: (c) => {
          switch (c) {
            case "DEFAULT_HOST":
              return DEFAULT_HOST;
            case "DEFAULT_PORT":
              return DEFAULT_PORT;
            case "DEFAULT_BASE_PATH":
              return DEFAULT_BASE_PATH;
            case "DEFAULT_API_VERSION":
              return DEFAULT_API_VERSION;
            case "DEFAULT_TIMEOUT":
              return DEFAULT_TIMEOUT;
            case "MAX_NETWORK_RETRY_DELAY_SEC":
              return MAX_NETWORK_RETRY_DELAY_SEC;
            case "INITIAL_NETWORK_RETRY_DELAY_SEC":
              return INITIAL_NETWORK_RETRY_DELAY_SEC;
          }
          return Stripe2[c];
        },
        getMaxNetworkRetries() {
          return this.getApiField("maxNetworkRetries");
        },
        _setApiNumberField(prop, n, defaultVal) {
          const val = (0, utils_js_1.validateInteger)(prop, n, defaultVal);
          this._setApiField(prop, val);
        },
        getMaxNetworkRetryDelay() {
          return MAX_NETWORK_RETRY_DELAY_SEC;
        },
        getInitialNetworkRetryDelay() {
          return INITIAL_NETWORK_RETRY_DELAY_SEC;
        },
        getClientUserAgent(cb) {
          return this.getClientUserAgentSeeded(Stripe2.USER_AGENT, cb);
        },
        getClientUserAgentSeeded(seed, cb) {
          this._platformFunctions.getUname().then((uname) => {
            var _a;
            const userAgent = {};
            for (const field in seed) {
              if (!Object.prototype.hasOwnProperty.call(seed, field)) {
                continue;
              }
              userAgent[field] = encodeURIComponent((_a = seed[field]) !== null && _a !== void 0 ? _a : "null");
            }
            userAgent.uname = encodeURIComponent(uname || "UNKNOWN");
            const client = this.getApiField("httpClient");
            if (client) {
              userAgent.httplib = encodeURIComponent(client.getClientName());
            }
            if (this._appInfo) {
              userAgent.application = this._appInfo;
            }
            cb(JSON.stringify(userAgent));
          });
        },
        getAppInfoAsString() {
          if (!this._appInfo) {
            return "";
          }
          let formatted = this._appInfo.name;
          if (this._appInfo.version) {
            formatted += `/${this._appInfo.version}`;
          }
          if (this._appInfo.url) {
            formatted += ` (${this._appInfo.url})`;
          }
          return formatted;
        },
        getTelemetryEnabled() {
          return this._enableTelemetry;
        },
        _prepResources() {
          for (const name in resources) {
            if (!Object.prototype.hasOwnProperty.call(resources, name)) {
              continue;
            }
            this[(0, utils_js_1.pascalToCamelCase)(name)] = new resources[name](this);
          }
        },
        _getPropsFromConfig(config) {
          if (!config) {
            return {};
          }
          const isString = typeof config === "string";
          const isObject = config === Object(config) && !Array.isArray(config);
          if (!isObject && !isString) {
            throw new Error("Config must either be an object or a string");
          }
          if (isString) {
            return {
              apiVersion: config
            };
          }
          const values = Object.keys(config).filter((value) => !ALLOWED_CONFIG_PROPERTIES.includes(value));
          if (values.length > 0) {
            throw new Error(`Config object may only contain the following: ${ALLOWED_CONFIG_PROPERTIES.join(", ")}`);
          }
          return config;
        },
        parseThinEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
          return this.webhooks.constructEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt);
        }
      };
      return Stripe2;
    }
    exports2.createStripe = createStripe;
  }
});

// node_modules/stripe/cjs/stripe.cjs.node.js
var require_stripe_cjs_node = __commonJS({
  "node_modules/stripe/cjs/stripe.cjs.node.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var NodePlatformFunctions_js_1 = require_NodePlatformFunctions();
    var stripe_core_js_1 = require_stripe_core();
    var Stripe2 = (0, stripe_core_js_1.createStripe)(new NodePlatformFunctions_js_1.NodePlatformFunctions());
    module2.exports = Stripe2;
    module2.exports.Stripe = Stripe2;
    module2.exports.default = Stripe2;
  }
});

// node_modules/dotenv/package.json
var require_package = __commonJS({
  "node_modules/dotenv/package.json"(exports2, module2) {
    module2.exports = {
      name: "dotenv",
      version: "16.5.0",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var os = require("os");
    var crypto2 = require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      const vaultPath = _vaultPath(options);
      const result = DotenvModule.configDotenv({ path: vaultPath });
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path.resolve(process.cwd(), ".env.vault");
      }
      if (fs.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = Boolean(options && options.debug);
      if (debug) {
        _debug("Loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path2 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs.readFileSync(path2, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path2} ${e.message}`);
          }
          lastError = e;
        }
      }
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsedAll, options);
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto2.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
        }
      }
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module2.exports.configDotenv = DotenvModule.configDotenv;
    module2.exports._configVault = DotenvModule._configVault;
    module2.exports._parseVault = DotenvModule._parseVault;
    module2.exports.config = DotenvModule.config;
    module2.exports.decrypt = DotenvModule.decrypt;
    module2.exports.parse = DotenvModule.parse;
    module2.exports.populate = DotenvModule.populate;
    module2.exports = DotenvModule;
  }
});

// lib/stripeConfig.server.js
var require_stripeConfig_server = __commonJS({
  "lib/stripeConfig.server.js"(exports2, module2) {
    "use strict";
    require_main().config();
    var stripeMode = process.env.STRIPE_MODE || "test";
    if (stripeMode !== "test" && stripeMode !== "live") {
      console.error(`Invalid STRIPE_MODE: ${stripeMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
    }
    var effectiveMode = stripeMode === "live" ? "live" : "test";
    var stripeConfig2 = {
      publishableKey: effectiveMode === "live" ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY : process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: effectiveMode === "live" ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
      priceId: effectiveMode === "live" ? process.env.STRIPE_LIVE_PRICE_ID || "price_live_..." : process.env.STRIPE_TEST_PRICE_ID || "price_1REyzMPE5x6FmwJPyJVJIEXe",
      mode: effectiveMode
    };
    if (stripeConfig2.publishableKey && !stripeConfig2.publishableKey.startsWith("pk_")) {
      console.error(`CRITICAL ERROR: Publishable key has invalid format. Expected 'pk_*', got: ${stripeConfig2.publishableKey.substring(0, 7)}...`);
      stripeConfig2.publishableKey = null;
    }
    if (stripeConfig2.secretKey && stripeConfig2.publishableKey && stripeConfig2.secretKey === stripeConfig2.publishableKey) {
      console.error(`CRITICAL ERROR: Secret key and publishable key are the same! This indicates a configuration error.`);
      stripeConfig2.secretKey = null;
    }
    console.log(`Stripe Configuration - Mode: ${stripeConfig2.mode}`);
    console.log(`Stripe Secret Key: ${stripeConfig2.secretKey ? stripeConfig2.secretKey.substring(0, 12) + "..." : "NOT SET"}`);
    console.log(`Environment check - STRIPE_MODE: ${process.env.STRIPE_MODE}`);
    console.log(`Environment check - effectiveMode: ${effectiveMode}`);
    if (effectiveMode === "live") {
      console.log(`Live mode - STRIPE_LIVE_SECRET_KEY: ${process.env.STRIPE_LIVE_SECRET_KEY ? process.env.STRIPE_LIVE_SECRET_KEY.substring(0, 12) + "..." : "NOT SET"}`);
      console.log(`Live mode - STRIPE_LIVE_PUBLISHABLE_KEY: ${process.env.STRIPE_LIVE_PUBLISHABLE_KEY ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY.substring(0, 12) + "..." : "NOT SET"}`);
    } else {
      console.log(`Test mode - STRIPE_TEST_SECRET_KEY: ${process.env.STRIPE_TEST_SECRET_KEY ? process.env.STRIPE_TEST_SECRET_KEY.substring(0, 12) + "..." : "NOT SET"}`);
      console.log(`Test mode - STRIPE_SECRET_KEY (fallback): ${process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 12) + "..." : "NOT SET"}`);
      console.log(`Test mode - STRIPE_TEST_PUBLISHABLE_KEY: ${process.env.STRIPE_TEST_PUBLISHABLE_KEY ? process.env.STRIPE_TEST_PUBLISHABLE_KEY.substring(0, 12) + "..." : "NOT SET"}`);
      console.log(`Test mode - STRIPE_PUBLISHABLE_KEY (fallback): ${process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 12) + "..." : "NOT SET"}`);
    }
    if (!stripeConfig2.secretKey) {
      console.warn(`Stripe secret key not set for ${effectiveMode} mode`);
    }
    if (stripeConfig2.secretKey) {
      if (stripeConfig2.secretKey.startsWith("pk_")) {
        console.error(`CRITICAL ERROR: Secret key appears to be a publishable key! This will cause API failures.`);
        console.error(`Secret key value: ${stripeConfig2.secretKey.substring(0, 12)}...`);
      } else if (!stripeConfig2.secretKey.startsWith("sk_")) {
        console.error(`WARNING: Secret key does not start with 'sk_' - format may be incorrect.`);
        console.error(`Secret key value: ${stripeConfig2.secretKey.substring(0, 12)}...`);
      } else {
        console.log(`\u2713 Secret key format validation passed`);
      }
    }
    module2.exports = stripeConfig2;
  }
});

// api/create-checkout-session.js
var Stripe = require_stripe_cjs_node();
var stripeConfig = require_stripeConfig_server();
console.log("Loading create-checkout-session with config:", {
  mode: stripeConfig.mode,
  hasSecretKey: !!stripeConfig.secretKey,
  secretKeyFormat: stripeConfig.secretKey ? stripeConfig.secretKey.startsWith("sk_") ? "valid" : "invalid" : "missing"
});
if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}
if (stripeConfig.secretKey.startsWith("pk_")) {
  throw new Error(`CRITICAL: A publishable key was provided as secret key. This will cause API failures. Please check your environment configuration.`);
}
if (!stripeConfig.secretKey.startsWith("sk_")) {
  throw new Error(`Invalid secret key format. Secret keys should start with 'sk_'. Current key starts with: ${stripeConfig.secretKey.substring(0, 3)}`);
}
var stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: "2022-11-15"
});
module.exports = async (req, res) => {
  console.log("Received request to /api/create-checkout-session:", req.body);
  console.log("Stripe config being used:", {
    mode: stripeConfig.mode,
    hasSecretKey: !!stripeConfig.secretKey,
    secretKeyPrefix: stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 7) : "N/A"
  });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  const { priceId, successUrl, cancelUrl } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    console.log("Missing parameters:", { priceId, successUrl, cancelUrl });
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    console.log("Attempting to create checkout session with Stripe...");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    console.log("Created checkout session:", session.id);
    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error("Error creating checkout session:", err.message);
    console.error("Error type:", err.type);
    console.error("Error code:", err.code);
    console.error("Full error object:", err);
    res.status(500).json({ error: err.message });
  }
};
