(()=>{function e(e){return e&&e.__esModule?e.default:e}var t="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},n={},r={},o=t.parcelRequire8251;null==o&&((o=function(e){if(e in n)return n[e].exports;if(e in r){var t=r[e];delete r[e];var o={id:e,exports:{}};return n[e]=o,t.call(o.exports,o,o.exports),o.exports}var a=new Error("Cannot find module '"+e+"'");throw a.code="MODULE_NOT_FOUND",a}).register=function(e,t){r[e]=t},t.parcelRequire8251=o),o.register("4pmpg",(function(e,t){"use strict";var n=o("gBiMb"),r=o("aHqGi"),a=o("bGXgz"),i=o("eW3qV");function s(e){var t=new a(e),o=r(a.prototype.request,t);return n.extend(o,a.prototype,t),n.extend(o,t),o}var c=s(o("1qNYy"));c.Axios=a,c.create=function(e){return s(i(c.defaults,e))},c.Cancel=o("1N35X"),c.CancelToken=o("cdbqI"),c.isCancel=o("cbWLS"),c.all=function(e){return Promise.all(e)},c.spread=o("i4UJt"),c.isAxiosError=o("9yMNx"),e.exports=c,e.exports.default=c})),o.register("gBiMb",(function(e,t){"use strict";var n=o("aHqGi"),r=Object.prototype.toString;function a(e){return"[object Array]"===r.call(e)}function i(e){return void 0===e}function s(e){return null!==e&&"object"==typeof e}function c(e){if("[object Object]"!==r.call(e))return!1;var t=Object.getPrototypeOf(e);return null===t||t===Object.prototype}function u(e){return"[object Function]"===r.call(e)}function l(e,t){if(null!=e)if("object"!=typeof e&&(e=[e]),a(e))for(var n=0,r=e.length;n<r;n++)t.call(null,e[n],n,e);else for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&t.call(null,e[o],o,e)}e.exports={isArray:a,isArrayBuffer:function(e){return"[object ArrayBuffer]"===r.call(e)},isBuffer:function(e){return null!==e&&!i(e)&&null!==e.constructor&&!i(e.constructor)&&"function"==typeof e.constructor.isBuffer&&e.constructor.isBuffer(e)},isFormData:function(e){return"undefined"!=typeof FormData&&e instanceof FormData},isArrayBufferView:function(e){return"undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&e.buffer instanceof ArrayBuffer},isString:function(e){return"string"==typeof e},isNumber:function(e){return"number"==typeof e},isObject:s,isPlainObject:c,isUndefined:i,isDate:function(e){return"[object Date]"===r.call(e)},isFile:function(e){return"[object File]"===r.call(e)},isBlob:function(e){return"[object Blob]"===r.call(e)},isFunction:u,isStream:function(e){return s(e)&&u(e.pipe)},isURLSearchParams:function(e){return"undefined"!=typeof URLSearchParams&&e instanceof URLSearchParams},isStandardBrowserEnv:function(){return("undefined"==typeof navigator||"ReactNative"!==navigator.product&&"NativeScript"!==navigator.product&&"NS"!==navigator.product)&&("undefined"!=typeof window&&"undefined"!=typeof document)},forEach:l,merge:function e(){var t={};function n(n,r){c(t[r])&&c(n)?t[r]=e(t[r],n):c(n)?t[r]=e({},n):a(n)?t[r]=n.slice():t[r]=n}for(var r=0,o=arguments.length;r<o;r++)l(arguments[r],n);return t},extend:function(e,t,r){return l(t,(function(t,o){e[o]=r&&"function"==typeof t?n(t,r):t})),e},trim:function(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")},stripBOM:function(e){return 65279===e.charCodeAt(0)&&(e=e.slice(1)),e}}})),o.register("aHqGi",(function(e,t){"use strict";e.exports=function(e,t){return function(){for(var n=new Array(arguments.length),r=0;r<n.length;r++)n[r]=arguments[r];return e.apply(t,n)}}})),o.register("bGXgz",(function(e,t){"use strict";var n=o("gBiMb"),r=o("74Y2B"),a=o("4OKYc"),i=o("eXgnr"),s=o("eW3qV"),c=o("8l8wy"),u=c.validators;function l(e){this.defaults=e,this.interceptors={request:new a,response:new a}}l.prototype.request=function(e){"string"==typeof e?(e=arguments[1]||{}).url=arguments[0]:e=e||{},(e=s(this.defaults,e)).method?e.method=e.method.toLowerCase():this.defaults.method?e.method=this.defaults.method.toLowerCase():e.method="get";var t=e.transitional;void 0!==t&&c.assertOptions(t,{silentJSONParsing:u.transitional(u.boolean,"1.0.0"),forcedJSONParsing:u.transitional(u.boolean,"1.0.0"),clarifyTimeoutError:u.transitional(u.boolean,"1.0.0")},!1);var n=[],r=!0;this.interceptors.request.forEach((function(t){"function"==typeof t.runWhen&&!1===t.runWhen(e)||(r=r&&t.synchronous,n.unshift(t.fulfilled,t.rejected))}));var o,a=[];if(this.interceptors.response.forEach((function(e){a.push(e.fulfilled,e.rejected)})),!r){var l=[i,void 0];for(Array.prototype.unshift.apply(l,n),l=l.concat(a),o=Promise.resolve(e);l.length;)o=o.then(l.shift(),l.shift());return o}for(var p=e;n.length;){var f=n.shift(),d=n.shift();try{p=f(p)}catch(e){d(e);break}}try{o=i(p)}catch(e){return Promise.reject(e)}for(;a.length;)o=o.then(a.shift(),a.shift());return o},l.prototype.getUri=function(e){return e=s(this.defaults,e),r(e.url,e.params,e.paramsSerializer).replace(/^\?/,"")},n.forEach(["delete","get","head","options"],(function(e){l.prototype[e]=function(t,n){return this.request(s(n||{},{method:e,url:t,data:(n||{}).data}))}})),n.forEach(["post","put","patch"],(function(e){l.prototype[e]=function(t,n,r){return this.request(s(r||{},{method:e,url:t,data:n}))}})),e.exports=l})),o.register("74Y2B",(function(e,t){"use strict";var n=o("gBiMb");function r(e){return encodeURIComponent(e).replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}e.exports=function(e,t,o){if(!t)return e;var a;if(o)a=o(t);else if(n.isURLSearchParams(t))a=t.toString();else{var i=[];n.forEach(t,(function(e,t){null!=e&&(n.isArray(e)?t+="[]":e=[e],n.forEach(e,(function(e){n.isDate(e)?e=e.toISOString():n.isObject(e)&&(e=JSON.stringify(e)),i.push(r(t)+"="+r(e))})))})),a=i.join("&")}if(a){var s=e.indexOf("#");-1!==s&&(e=e.slice(0,s)),e+=(-1===e.indexOf("?")?"?":"&")+a}return e}})),o.register("4OKYc",(function(e,t){"use strict";var n=o("gBiMb");function r(){this.handlers=[]}r.prototype.use=function(e,t,n){return this.handlers.push({fulfilled:e,rejected:t,synchronous:!!n&&n.synchronous,runWhen:n?n.runWhen:null}),this.handlers.length-1},r.prototype.eject=function(e){this.handlers[e]&&(this.handlers[e]=null)},r.prototype.forEach=function(e){n.forEach(this.handlers,(function(t){null!==t&&e(t)}))},e.exports=r})),o.register("eXgnr",(function(e,t){"use strict";var n=o("gBiMb"),r=o("7vPtK"),a=o("cbWLS"),i=o("1qNYy");function s(e){e.cancelToken&&e.cancelToken.throwIfRequested()}e.exports=function(e){return s(e),e.headers=e.headers||{},e.data=r.call(e,e.data,e.headers,e.transformRequest),e.headers=n.merge(e.headers.common||{},e.headers[e.method]||{},e.headers),n.forEach(["delete","get","head","post","put","patch","common"],(function(t){delete e.headers[t]})),(e.adapter||i.adapter)(e).then((function(t){return s(e),t.data=r.call(e,t.data,t.headers,e.transformResponse),t}),(function(t){return a(t)||(s(e),t&&t.response&&(t.response.data=r.call(e,t.response.data,t.response.headers,e.transformResponse))),Promise.reject(t)}))}})),o.register("7vPtK",(function(e,t){"use strict";var n=o("gBiMb"),r=o("1qNYy");e.exports=function(e,t,o){var a=this||r;return n.forEach(o,(function(n){e=n.call(a,e,t)})),e}})),o.register("1qNYy",(function(e,t){var n=o("ieOnZ"),r=o("gBiMb"),a=o("6FM61"),i=o("jmtzu"),s={"Content-Type":"application/x-www-form-urlencoded"};function c(e,t){!r.isUndefined(e)&&r.isUndefined(e["Content-Type"])&&(e["Content-Type"]=t)}var u,l={transitional:{silentJSONParsing:!0,forcedJSONParsing:!0,clarifyTimeoutError:!1},adapter:(("undefined"!=typeof XMLHttpRequest||void 0!==n&&"[object process]"===Object.prototype.toString.call(n))&&(u=o("eQidV")),u),transformRequest:[function(e,t){return a(t,"Accept"),a(t,"Content-Type"),r.isFormData(e)||r.isArrayBuffer(e)||r.isBuffer(e)||r.isStream(e)||r.isFile(e)||r.isBlob(e)?e:r.isArrayBufferView(e)?e.buffer:r.isURLSearchParams(e)?(c(t,"application/x-www-form-urlencoded;charset=utf-8"),e.toString()):r.isObject(e)||t&&"application/json"===t["Content-Type"]?(c(t,"application/json"),function(e,t,n){if(r.isString(e))try{return(t||JSON.parse)(e),r.trim(e)}catch(e){if("SyntaxError"!==e.name)throw e}return(n||JSON.stringify)(e)}(e)):e}],transformResponse:[function(e){var t=this.transitional,n=t&&t.silentJSONParsing,o=t&&t.forcedJSONParsing,a=!n&&"json"===this.responseType;if(a||o&&r.isString(e)&&e.length)try{return JSON.parse(e)}catch(e){if(a){if("SyntaxError"===e.name)throw i(e,this,"E_JSON_PARSE");throw e}}return e}],timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN",maxContentLength:-1,maxBodyLength:-1,validateStatus:function(e){return e>=200&&e<300}};l.headers={common:{Accept:"application/json, text/plain, */*"}},r.forEach(["delete","get","head"],(function(e){l.headers[e]={}})),r.forEach(["post","put","patch"],(function(e){l.headers[e]=r.merge(s)})),e.exports=l})),o.register("ieOnZ",(function(e,t){var n,r,o=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function i(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(e){n=a}try{r="function"==typeof clearTimeout?clearTimeout:i}catch(e){r=i}}();var c,u=[],l=!1,p=-1;function f(){l&&c&&(l=!1,c.length?u=c.concat(u):p=-1,u.length&&d())}function d(){if(!l){var e=s(f);l=!0;for(var t=u.length;t;){for(c=u,u=[];++p<t;)c&&c[p].run();p=-1,t=u.length}c=null,l=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===i||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function g(e,t){this.fun=e,this.array=t}function h(){}o.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new g(e,t)),1!==u.length||l||s(d)},g.prototype.run=function(){this.fun.apply(null,this.array)},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=h,o.addListener=h,o.once=h,o.off=h,o.removeListener=h,o.removeAllListeners=h,o.emit=h,o.prependListener=h,o.prependOnceListener=h,o.listeners=function(e){return[]},o.binding=function(e){throw new Error("process.binding is not supported")},o.cwd=function(){return"/"},o.chdir=function(e){throw new Error("process.chdir is not supported")},o.umask=function(){return 0}})),o.register("6FM61",(function(e,t){"use strict";var n=o("gBiMb");e.exports=function(e,t){n.forEach(e,(function(n,r){r!==t&&r.toUpperCase()===t.toUpperCase()&&(e[t]=n,delete e[r])}))}})),o.register("jmtzu",(function(e,t){"use strict";e.exports=function(e,t,n,r,o){return e.config=t,n&&(e.code=n),e.request=r,e.response=o,e.isAxiosError=!0,e.toJSON=function(){return{message:this.message,name:this.name,description:this.description,number:this.number,fileName:this.fileName,lineNumber:this.lineNumber,columnNumber:this.columnNumber,stack:this.stack,config:this.config,code:this.code}},e}})),o.register("eQidV",(function(e,t){"use strict";var n=o("gBiMb"),r=o("lBJvL"),a=o("biJ6e"),i=o("74Y2B"),s=o("dSFv7"),c=o("kIv68"),u=o("bS2Id"),l=o("bRI0M");e.exports=function(e){return new Promise((function(t,o){var p=e.data,f=e.headers,d=e.responseType;n.isFormData(p)&&delete f["Content-Type"];var g=new XMLHttpRequest;if(e.auth){var h=e.auth.username||"",m=e.auth.password?unescape(encodeURIComponent(e.auth.password)):"";f.Authorization="Basic "+btoa(h+":"+m)}var y=s(e.baseURL,e.url);function v(){if(g){var n="getAllResponseHeaders"in g?c(g.getAllResponseHeaders()):null,a={data:d&&"text"!==d&&"json"!==d?g.response:g.responseText,status:g.status,statusText:g.statusText,headers:n,config:e,request:g};r(t,o,a),g=null}}if(g.open(e.method.toUpperCase(),i(y,e.params,e.paramsSerializer),!0),g.timeout=e.timeout,"onloadend"in g?g.onloadend=v:g.onreadystatechange=function(){g&&4===g.readyState&&(0!==g.status||g.responseURL&&0===g.responseURL.indexOf("file:"))&&setTimeout(v)},g.onabort=function(){g&&(o(l("Request aborted",e,"ECONNABORTED",g)),g=null)},g.onerror=function(){o(l("Network Error",e,null,g)),g=null},g.ontimeout=function(){var t="timeout of "+e.timeout+"ms exceeded";e.timeoutErrorMessage&&(t=e.timeoutErrorMessage),o(l(t,e,e.transitional&&e.transitional.clarifyTimeoutError?"ETIMEDOUT":"ECONNABORTED",g)),g=null},n.isStandardBrowserEnv()){var b=(e.withCredentials||u(y))&&e.xsrfCookieName?a.read(e.xsrfCookieName):void 0;b&&(f[e.xsrfHeaderName]=b)}"setRequestHeader"in g&&n.forEach(f,(function(e,t){void 0===p&&"content-type"===t.toLowerCase()?delete f[t]:g.setRequestHeader(t,e)})),n.isUndefined(e.withCredentials)||(g.withCredentials=!!e.withCredentials),d&&"json"!==d&&(g.responseType=e.responseType),"function"==typeof e.onDownloadProgress&&g.addEventListener("progress",e.onDownloadProgress),"function"==typeof e.onUploadProgress&&g.upload&&g.upload.addEventListener("progress",e.onUploadProgress),e.cancelToken&&e.cancelToken.promise.then((function(e){g&&(g.abort(),o(e),g=null)})),p||(p=null),g.send(p)}))}})),o.register("lBJvL",(function(e,t){"use strict";var n=o("bRI0M");e.exports=function(e,t,r){var o=r.config.validateStatus;r.status&&o&&!o(r.status)?t(n("Request failed with status code "+r.status,r.config,null,r.request,r)):e(r)}})),o.register("bRI0M",(function(e,t){"use strict";var n=o("jmtzu");e.exports=function(e,t,r,o,a){var i=new Error(e);return n(i,t,r,o,a)}})),o.register("biJ6e",(function(e,t){"use strict";var n=o("gBiMb");e.exports=n.isStandardBrowserEnv()?{write:function(e,t,r,o,a,i){var s=[];s.push(e+"="+encodeURIComponent(t)),n.isNumber(r)&&s.push("expires="+new Date(r).toGMTString()),n.isString(o)&&s.push("path="+o),n.isString(a)&&s.push("domain="+a),!0===i&&s.push("secure"),document.cookie=s.join("; ")},read:function(e){var t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}:{write:function(){},read:function(){return null},remove:function(){}}})),o.register("dSFv7",(function(e,t){"use strict";var n=o("40pC5"),r=o("6GfjI");e.exports=function(e,t){return e&&!n(t)?r(e,t):t}})),o.register("40pC5",(function(e,t){"use strict";e.exports=function(e){return/^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(e)}})),o.register("6GfjI",(function(e,t){"use strict";e.exports=function(e,t){return t?e.replace(/\/+$/,"")+"/"+t.replace(/^\/+/,""):e}})),o.register("kIv68",(function(e,t){"use strict";var n=o("gBiMb"),r=["age","authorization","content-length","content-type","etag","expires","from","host","if-modified-since","if-unmodified-since","last-modified","location","max-forwards","proxy-authorization","referer","retry-after","user-agent"];e.exports=function(e){var t,o,a,i={};return e?(n.forEach(e.split("\n"),(function(e){if(a=e.indexOf(":"),t=n.trim(e.substr(0,a)).toLowerCase(),o=n.trim(e.substr(a+1)),t){if(i[t]&&r.indexOf(t)>=0)return;i[t]="set-cookie"===t?(i[t]?i[t]:[]).concat([o]):i[t]?i[t]+", "+o:o}})),i):i}})),o.register("bS2Id",(function(e,t){"use strict";var n=o("gBiMb");e.exports=n.isStandardBrowserEnv()?function(){var e,t=/(msie|trident)/i.test(navigator.userAgent),r=document.createElement("a");function o(e){var n=e;return t&&(r.setAttribute("href",n),n=r.href),r.setAttribute("href",n),{href:r.href,protocol:r.protocol?r.protocol.replace(/:$/,""):"",host:r.host,search:r.search?r.search.replace(/^\?/,""):"",hash:r.hash?r.hash.replace(/^#/,""):"",hostname:r.hostname,port:r.port,pathname:"/"===r.pathname.charAt(0)?r.pathname:"/"+r.pathname}}return e=o(window.location.href),function(t){var r=n.isString(t)?o(t):t;return r.protocol===e.protocol&&r.host===e.host}}():function(){return!0}})),o.register("cbWLS",(function(e,t){"use strict";e.exports=function(e){return!(!e||!e.__CANCEL__)}})),o.register("eW3qV",(function(e,t){"use strict";var n=o("gBiMb");e.exports=function(e,t){t=t||{};var r={},o=["url","method","data"],a=["headers","auth","proxy","params"],i=["baseURL","transformRequest","transformResponse","paramsSerializer","timeout","timeoutMessage","withCredentials","adapter","responseType","xsrfCookieName","xsrfHeaderName","onUploadProgress","onDownloadProgress","decompress","maxContentLength","maxBodyLength","maxRedirects","transport","httpAgent","httpsAgent","cancelToken","socketPath","responseEncoding"],s=["validateStatus"];function c(e,t){return n.isPlainObject(e)&&n.isPlainObject(t)?n.merge(e,t):n.isPlainObject(t)?n.merge({},t):n.isArray(t)?t.slice():t}function u(o){n.isUndefined(t[o])?n.isUndefined(e[o])||(r[o]=c(void 0,e[o])):r[o]=c(e[o],t[o])}n.forEach(o,(function(e){n.isUndefined(t[e])||(r[e]=c(void 0,t[e]))})),n.forEach(a,u),n.forEach(i,(function(o){n.isUndefined(t[o])?n.isUndefined(e[o])||(r[o]=c(void 0,e[o])):r[o]=c(void 0,t[o])})),n.forEach(s,(function(n){n in t?r[n]=c(e[n],t[n]):n in e&&(r[n]=c(void 0,e[n]))}));var l=o.concat(a).concat(i).concat(s),p=Object.keys(e).concat(Object.keys(t)).filter((function(e){return-1===l.indexOf(e)}));return n.forEach(p,u),r}})),o.register("8l8wy",(function(e,t){"use strict";var n=o("kGKMV"),r={};["object","boolean","number","function","string","symbol"].forEach((function(e,t){r[e]=function(n){return typeof n===e||"a"+(t<1?"n ":" ")+e}}));var a={},i=n.version.split(".");function s(e,t){for(var n=t?t.split("."):i,r=e.split("."),o=0;o<3;o++){if(n[o]>r[o])return!0;if(n[o]<r[o])return!1}return!1}r.transitional=function(e,t,r){var o=t&&s(t);function i(e,t){return"[Axios v"+n.version+"] Transitional option '"+e+"'"+t+(r?". "+r:"")}return function(n,r,s){if(!1===e)throw new Error(i(r," has been removed in "+t));return o&&!a[r]&&(a[r]=!0,console.warn(i(r," has been deprecated since v"+t+" and will be removed in the near future"))),!e||e(n,r,s)}},e.exports={isOlderVersion:s,assertOptions:function(e,t,n){if("object"!=typeof e)throw new TypeError("options must be an object");for(var r=Object.keys(e),o=r.length;o-- >0;){var a=r[o],i=t[a];if(i){var s=e[a],c=void 0===s||i(s,a,e);if(!0!==c)throw new TypeError("option "+a+" must be "+c)}else if(!0!==n)throw Error("Unknown option "+a)}},validators:r}})),o.register("kGKMV",(function(e,t){e.exports=JSON.parse('{"name":"axios","version":"0.21.4","description":"Promise based HTTP client for the browser and node.js","main":"index.js","scripts":{"test":"grunt test","start":"node ./sandbox/server.js","build":"NODE_ENV=production grunt build","preversion":"npm test","version":"npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json","postversion":"git push && git push --tags","examples":"node ./examples/server.js","coveralls":"cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js","fix":"eslint --fix lib/**/*.js"},"repository":{"type":"git","url":"https://github.com/axios/axios.git"},"keywords":["xhr","http","ajax","promise","node"],"author":"Matt Zabriskie","license":"MIT","bugs":{"url":"https://github.com/axios/axios/issues"},"homepage":"https://axios-http.com","devDependencies":{"coveralls":"^3.0.0","es6-promise":"^4.2.4","grunt":"^1.3.0","grunt-banner":"^0.6.0","grunt-cli":"^1.2.0","grunt-contrib-clean":"^1.1.0","grunt-contrib-watch":"^1.0.0","grunt-eslint":"^23.0.0","grunt-karma":"^4.0.0","grunt-mocha-test":"^0.13.3","grunt-ts":"^6.0.0-beta.19","grunt-webpack":"^4.0.2","istanbul-instrumenter-loader":"^1.0.0","jasmine-core":"^2.4.1","karma":"^6.3.2","karma-chrome-launcher":"^3.1.0","karma-firefox-launcher":"^2.1.0","karma-jasmine":"^1.1.1","karma-jasmine-ajax":"^0.1.13","karma-safari-launcher":"^1.0.0","karma-sauce-launcher":"^4.3.6","karma-sinon":"^1.0.5","karma-sourcemap-loader":"^0.3.8","karma-webpack":"^4.0.2","load-grunt-tasks":"^3.5.2","minimist":"^1.2.0","mocha":"^8.2.1","sinon":"^4.5.0","terser-webpack-plugin":"^4.2.3","typescript":"^4.0.5","url-search-params":"^0.10.0","webpack":"^4.44.2","webpack-dev-server":"^3.11.0"},"browser":{"./lib/adapters/http.js":"./lib/adapters/xhr.js"},"jsdelivr":"dist/axios.min.js","unpkg":"dist/axios.min.js","typings":"./index.d.ts","dependencies":{"follow-redirects":"^1.14.0"},"bundlesize":[{"path":"./dist/axios.min.js","threshold":"5kB"}]}')})),o.register("1N35X",(function(e,t){"use strict";function n(e){this.message=e}n.prototype.toString=function(){return"Cancel"+(this.message?": "+this.message:"")},n.prototype.__CANCEL__=!0,e.exports=n})),o.register("cdbqI",(function(e,t){"use strict";var n=o("1N35X");function r(e){if("function"!=typeof e)throw new TypeError("executor must be a function.");var t;this.promise=new Promise((function(e){t=e}));var r=this;e((function(e){r.reason||(r.reason=new n(e),t(r.reason))}))}r.prototype.throwIfRequested=function(){if(this.reason)throw this.reason},r.source=function(){var e;return{token:new r((function(t){e=t})),cancel:e}},e.exports=r})),o.register("i4UJt",(function(e,t){"use strict";e.exports=function(e){return function(t){return e.apply(null,t)}}})),o.register("9yMNx",(function(e,t){"use strict";e.exports=function(e){return"object"==typeof e&&!0===e.isAxiosError}}));var a;a=o("4pmpg");let i;var s;(s=i||(i={})).Instances="instances",s.CurrentInstance="current-instance";const c=async()=>{let t=(await e(a).get("https://api.invidious.io/instances.json")).data;return t=t.filter((e=>!e[0].includes(".onion")&&!e[0].includes(".i2p"))),t=t.filter((e=>e[1].cors)),localStorage.setItem(i.Instances,JSON.stringify(t)),t},u=async()=>{const e=localStorage.getItem(i.Instances);let t=[];t=e?JSON.parse(e):await c();const n=t[Math.floor(Math.random()*t.length)][1].uri;return localStorage.setItem(i.CurrentInstance,n),n},l=async()=>{let e=localStorage.getItem(i.CurrentInstance);return e||(e=await u()),e},p=e=>({name:e.title,apiId:e.videoId,images:e.videoThumbnails,duration:e.lengthSeconds}),f=async t=>{let n=`${await l()}/api/v1/search?q=${t.query}&type=video`,r={resultsPerPage:20,offset:t.pageInfo?.offset||0};if(t.pageInfo?.nextPage){n+=`&page=${t.pageInfo.nextPage}`;const e=parseInt(t.pageInfo.nextPage);r.prevPage=(e-1).toString(),r.nextPage=(e+1).toString()}else if(t.pageInfo?.prevPage){n+=`&page=${t.pageInfo.prevPage}`;const e=parseInt(t.pageInfo.prevPage);r.prevPage=(e-1).toString(),r.nextPage=(e+1).toString()}else r.nextPage="2";return{items:(await e(a).get(n)).data.map(p),pageInfo:r}},d=async t=>{let n=`${await l()}/api/v1/search?q=${t.query}&type=playlist`,r={resultsPerPage:20,offset:t.pageInfo?.offset||0};if(t.pageInfo?.nextPage){n+=`&page=${t.pageInfo.nextPage}`;const e=parseInt(t.pageInfo.nextPage);r.prevPage=(e-1).toString(),r.nextPage=(e+1).toString()}else if(t.pageInfo?.prevPage){n+=`&page=${t.pageInfo.prevPage}`;const e=parseInt(t.pageInfo.prevPage);r.prevPage=(e-1).toString(),r.nextPage=(e+1).toString()}else r.nextPage="2";return{items:(await e(a).get(n)).data.map((e=>({name:e.title,apiId:e.playlistId,images:e.videos.length>0?e.videos[0].videoThumbnails:[]}))),pageInfo:r}},g=async t=>{let n=`${await l()}/api/v1/playlists/${t.apiId}`;const r=(await e(a).get(n)).data;return{playlist:{name:r.title,apiId:r.playlistId,images:r.videos.length>0?r.videos[0].videoThumbnails:[]},items:r.videos.map((e=>({name:e.title,apiId:e.videoId,images:e.videoThumbnails,duration:e.lengthSeconds})))}};async function h(t){const n=`${await l()}/api/v1/videos/${t.apiId}`;return(await e(a).get(n)).data.adaptiveFormats.filter((e=>!!e.audioQuality)).sort(((e,t)=>parseInt(t.bitrate)-parseInt(e.bitrate)))[0].url}var m={};Object.defineProperty(m,"__esModule",{value:!0});var y=["weeks","years","months","days","hours","minutes","seconds"],v=Object.freeze({years:0,months:0,weeks:0,days:0,hours:0,minutes:0,seconds:0}),b=m.pattern=new RegExp("P(?:(\\d+(?:[\\.,]\\d+)?W)|(\\d+(?:[\\.,]\\d+)?Y)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?D)?(?:T(\\d+(?:[\\.,]\\d+)?H)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?S)?)?)"),w=m.parse=function(e){return e.match(b).slice(1).reduce((function(e,t,n){return e[y[n]]=parseFloat(t)||0,e}),{})},x=m.end=function(e,t){e=Object.assign({},v,e);var n=t?t.getTime():Date.now(),r=new Date(n);return r.setFullYear(r.getFullYear()+e.years),r.setMonth(r.getMonth()+e.months),r.setDate(r.getDate()+e.days),r.setHours(r.getHours()+e.hours),r.setMinutes(r.getMinutes()+e.minutes),r.setMilliseconds(r.getMilliseconds()+1e3*e.seconds),r.setDate(r.getDate()+7*e.weeks),r},I=m.toSeconds=function(e,t){e=Object.assign({},v,e);var n=t?t.getTime():Date.now(),r=new Date(n);return(x(e,r).getTime()-r.getTime())/1e3};m.default={end:x,toSeconds:I,pattern:b,parse:w};const S=e(a).create(),P=(e,t)=>{localStorage.setItem("access_token",e),t&&localStorage.setItem("refresh_token",t)};S.interceptors.request.use((e=>{const t=localStorage.getItem("access_token");return t&&(e.headers.Authorization="Bearer "+t),e}),(e=>{Promise.reject(e)})),S.interceptors.response.use((e=>e),(async t=>{const n=t.config;if(401===t.response.status&&!n._retry){n._retry=!0;const t=await(async()=>{const t=localStorage.getItem("refresh_token");if(!t)return;const n=localStorage.getItem("clientId"),r=localStorage.getItem("clientSecret"),o=new URLSearchParams;o.append("refresh_token",t),o.append("grant_type","refresh_token"),n&&r&&(o.append("client_id",n),o.append("client_secret",r));const i=await e(a).post("https://oauth2.googleapis.com/token",o,{headers:{"Content-Type":"application/x-www-form-urlencoded"}});return i.data.access_token?(P(i.data.access_token),i.data.access_token):void 0})();return S.defaults.headers.common.Authorization="Bearer "+t,S(n)}}));const k=()=>localStorage.getItem("apiKey");function T(e){return(e.items||[]).map((e=>({apiId:e.id,name:e.snippet?.title||"",images:[{width:e.snippet?.thumbnails?.default?.width||0,url:e.snippet?.thumbnails?.default?.url||"",height:e.snippet?.thumbnails?.default?.height||0}],isUserPlaylist:!0})))}function j(e){return(e.items||[]).map((e=>({apiId:e.id,duration:(0,m.toSeconds)((0,m.parse)(e.contentDetails?.duration||"0")),images:e.snippet?.thumbnails&&Object.values(e.snippet?.thumbnails).map((e=>({url:e.url||"",height:e.height||0,width:e.width||0}))),name:e.snippet?.title||""})))}async function E(){const t=`https://www.googleapis.com/youtube/v3/videos?key=${k()||"AIzaSyBYUoAxdG5OvUtnxH0HbBioIiF14Ce7RZ0"}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;return{tracks:{items:j((await e(a).get(t)).data)}}}async function O(t){let n=`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&key=${k()}&playlistId=${t.apiId}`;t.isUserPlaylist&&(n+="&mine=true"),t.pageInfo&&(t.pageInfo.nextPage?n+=`&pageToken=${t.pageInfo.nextPage}`:t.pageInfo.prevPage&&(n+=`&pageToken=${t.pageInfo.prevPage}`));const r=t.isUserPlaylist?S:e(a),o=await r.get(n),i=o.data.items?.map((e=>e.contentDetails?.videoId)).join(","),s=`https://www.googleapis.com/youtube/v3/videos?key=${k()}&part=snippet,contentDetails&id=${i}`;return{items:j((await e(a).get(s)).data),pageInfo:{totalResults:o.data.pageInfo?.totalResults||0,resultsPerPage:o.data.pageInfo?.resultsPerPage||0,offset:t.pageInfo?t.pageInfo.offset:0,nextPage:o.data.nextPageToken,prevPage:o.data.prevPageToken}}}async function N(e){const t=`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&key=${k()}`,n=await S.get(t);return{items:T(n.data),pageInfo:{totalResults:n.data.pageInfo?.totalResults||0,resultsPerPage:n.data.pageInfo?.resultsPerPage||0,offset:e.pageInfo?e.pageInfo.offset:0,nextPage:n.data.nextPageToken,prevPage:n.data.prevPageToken}}}const R=e=>{application.postUiMessage(e)};async function B(e){return f(e)}async function C(e){return d(e)}application.onUiMessage=async e=>{switch(e.type){case"check-login":const t=localStorage.getItem("access_token");t&&R({type:"login",accessToken:t}),await(async()=>{const e=document.location.host.split(".");e.shift();const t=e.join("."),n=`${document.location.protocol}//${t}`,r=await application.getPluginId(),o=localStorage.getItem("apiKey")??"",a=localStorage.getItem("clientId")??"",i=localStorage.getItem("clientSecret")??"",s=await l();R({type:"info",origin:n,pluginId:r,apiKey:o,clientId:a,clientSecret:i,instance:s})})();break;case"login":P(e.accessToken,e.refreshToken),application.onGetUserPlaylists=N;break;case"logout":localStorage.removeItem("access_token"),localStorage.removeItem("refresh_token"),application.onGetUserPlaylists=void 0;break;case"set-keys":localStorage.setItem("apiKey",e.apiKey),localStorage.setItem("clientId",e.clientId),localStorage.setItem("clientSecret",e.clientSecret),application.createNotification({message:"Api keys Saved!"});break;case"getinstnace":const n=await u();R({type:"sendinstance",instance:n})}},application.onSearchAll=async function(e){const t=B(e),n=C(e),[r,o]=await Promise.all([t,n]);return{tracks:r,playlists:o}},application.onSearchTracks=B,application.onSearchPlaylists=C,application.onGetTrackUrl=async function(e){return h(e)},application.onGetPlaylistTracks=async function(e){return e.isUserPlaylist?O(e):g(e)},application.onGetTopItems=async function(){return await E()},application.onDeepLinkMessage=async e=>{application.postUiMessage({type:"deeplink",url:e})},window.fetch=function(){return application.networkRequest.apply(this,arguments)};(async()=>{localStorage.getItem("access_token")&&(application.onGetUserPlaylists=N),await c()})()})();