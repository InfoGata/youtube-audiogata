(()=>{class t extends Error{response;request;options;constructor(t,e,s){const n=`${t.status||0===t.status?t.status:""} ${t.statusText||""}`.trim();super(`Request failed with ${n?`status code ${n}`:"an unknown error"}: ${e.method} ${e.url}`),this.name="HTTPError",this.response=t,this.request=e,this.options=s}}class e extends Error{request;constructor(t){super(`Request timed out: ${t.method} ${t.url}`),this.name="TimeoutError",this.request=t}}const s=t=>null!==t&&"object"==typeof t,n=(...t)=>{for(const e of t)if((!s(e)||Array.isArray(e))&&void 0!==e)throw new TypeError("The `options` argument must be an object");return i({},...t)},o=(t={},e={})=>{const s=new globalThis.Headers(t),n=e instanceof globalThis.Headers,o=new globalThis.Headers(e);for(const[t,e]of o.entries())n&&"undefined"===e||void 0===e?s.delete(t):s.set(t,e);return s};function a(t,e,s){return Object.hasOwn(e,s)&&void 0===e[s]?[]:i(t[s]??[],e[s]??[])}const r=(t={},e={})=>({beforeRequest:a(t,e,"beforeRequest"),beforeRetry:a(t,e,"beforeRetry"),afterResponse:a(t,e,"afterResponse"),beforeError:a(t,e,"beforeError")}),i=(...t)=>{let e={},n={},a={};for(const c of t)if(Array.isArray(c))Array.isArray(e)||(e=[]),e=[...e,...c];else if(s(c)){for(let[t,n]of Object.entries(c))s(n)&&t in e&&(n=i(e[t],n)),e={...e,[t]:n};s(c.hooks)&&(a=r(a,c.hooks),e.hooks=a),s(c.headers)&&(n=o(n,c.headers),e.headers=n)}return e},c=(()=>{let t=!1,e=!1;const s="function"==typeof globalThis.ReadableStream,n="function"==typeof globalThis.Request;if(s&&n)try{e=new globalThis.Request("https://empty.invalid",{body:new globalThis.ReadableStream,method:"POST",get duplex(){return t=!0,"half"}}).headers.has("Content-Type")}catch(t){if(t instanceof Error&&"unsupported BodyInit type"===t.message)return!1;throw t}return t&&!e})(),l="function"==typeof globalThis.AbortController,u="function"==typeof globalThis.ReadableStream,p="function"==typeof globalThis.FormData,h=["get","post","put","patch","head","delete"],d={json:"application/json",text:"text/*",formData:"multipart/form-data",arrayBuffer:"*/*",blob:"*/*"},f=2147483647,y=Symbol("stop"),g={json:!0,parseJson:!0,stringifyJson:!0,searchParams:!0,prefixUrl:!0,retry:!0,timeout:!0,hooks:!0,throwHttpErrors:!0,onDownloadProgress:!0,fetch:!0},m={method:!0,headers:!0,body:!0,mode:!0,credentials:!0,cache:!0,redirect:!0,referrer:!0,referrerPolicy:!0,integrity:!0,keepalive:!0,signal:!0,window:!0,dispatcher:!0,duplex:!0,priority:!0},w=t=>h.includes(t)?t.toUpperCase():t,b={limit:2,methods:["get","put","head","delete","options","trace"],statusCodes:[408,413,429,500,502,503,504],afterStatusCodes:[413,429,503],maxRetryAfter:Number.POSITIVE_INFINITY,backoffLimit:Number.POSITIVE_INFINITY,delay:t=>.3*2**(t-1)*1e3},I=(t={})=>{if("number"==typeof t)return{...b,limit:t};if(t.methods&&!Array.isArray(t.methods))throw new Error("retry.methods must be an array");if(t.statusCodes&&!Array.isArray(t.statusCodes))throw new Error("retry.statusCodes must be an array");return{...b,...t}};async function _(t,s,n,o){return new Promise(((a,r)=>{const i=setTimeout((()=>{n&&n.abort(),r(new e(t))}),o.timeout);o.fetch(t,s).then(a).catch(r).then((()=>{clearTimeout(i)}))}))}async function P(t,{signal:e}){return new Promise(((s,n)=>{function o(){clearTimeout(a),n(e.reason)}e&&(e.throwIfAborted(),e.addEventListener("abort",o,{once:!0}));const a=setTimeout((()=>{e?.removeEventListener("abort",o),s()}),t)}))}const k=(t,e)=>{const s={};for(const n in e)n in m||n in g||n in t||(s[n]=e[n]);return s};class T{static create(e,s){const n=new T(e,s),o=async()=>{if("number"==typeof n._options.timeout&&n._options.timeout>f)throw new RangeError("The `timeout` option cannot be greater than 2147483647");await Promise.resolve();let e=await n._fetch();for(const t of n._options.hooks.afterResponse){const s=await t(n.request,n._options,n._decorateResponse(e.clone()));s instanceof globalThis.Response&&(e=s)}if(n._decorateResponse(e),!e.ok&&n._options.throwHttpErrors){let s=new t(e,n.request,n._options);for(const t of n._options.hooks.beforeError)s=await t(s);throw s}if(n._options.onDownloadProgress){if("function"!=typeof n._options.onDownloadProgress)throw new TypeError("The `onDownloadProgress` option must be a function");if(!u)throw new Error("Streams are not supported in your environment. `ReadableStream` is missing.");return n._stream(e.clone(),n._options.onDownloadProgress)}return e},a=n._options.retry.methods.includes(n.request.method.toLowerCase())?n._retry(o):o();for(const[t,e]of Object.entries(d))a[t]=async()=>{n.request.headers.set("accept",n.request.headers.get("accept")||e);const o=await a;if("json"===t){if(204===o.status)return"";if(0===(await o.clone().arrayBuffer()).byteLength)return"";if(s.parseJson)return s.parseJson(await o.text())}return o[t]()};return a}request;abortController;_retryCount=0;_input;_options;constructor(t,e={}){if(this._input=t,this._options={...e,headers:o(this._input.headers,e.headers),hooks:r({beforeRequest:[],beforeRetry:[],beforeError:[],afterResponse:[]},e.hooks),method:w(e.method??this._input.method??"GET"),prefixUrl:String(e.prefixUrl||""),retry:I(e.retry),throwHttpErrors:!1!==e.throwHttpErrors,timeout:e.timeout??1e4,fetch:e.fetch??globalThis.fetch.bind(globalThis)},"string"!=typeof this._input&&!(this._input instanceof URL||this._input instanceof globalThis.Request))throw new TypeError("`input` must be a string, URL, or Request");if(this._options.prefixUrl&&"string"==typeof this._input){if(this._input.startsWith("/"))throw new Error("`input` must not begin with a slash when using `prefixUrl`");this._options.prefixUrl.endsWith("/")||(this._options.prefixUrl+="/"),this._input=this._options.prefixUrl+this._input}if(l){this.abortController=new globalThis.AbortController;const t=this._options.signal??this._input.signal;t?.aborted&&this.abortController.abort(t?.reason),t?.addEventListener("abort",(()=>{this.abortController.abort(t.reason)})),this._options.signal=this.abortController.signal}if(c&&(this._options.duplex="half"),void 0!==this._options.json&&(this._options.body=this._options.stringifyJson?.(this._options.json)??JSON.stringify(this._options.json),this._options.headers.set("content-type",this._options.headers.get("content-type")??"application/json")),this.request=new globalThis.Request(this._input,this._options),this._options.searchParams){const t="?"+("string"==typeof this._options.searchParams?this._options.searchParams.replace(/^\?/,""):new URLSearchParams(this._options.searchParams).toString()),e=this.request.url.replace(/(?:\?.*?)?(?=#|$)/,t);!(p&&this._options.body instanceof globalThis.FormData||this._options.body instanceof URLSearchParams)||this._options.headers&&this._options.headers["content-type"]||this.request.headers.delete("content-type"),this.request=new globalThis.Request(new globalThis.Request(e,{...this.request}),this._options)}}_calculateRetryDelay(s){if(this._retryCount++,this._retryCount>this._options.retry.limit||s instanceof e)throw s;if(s instanceof t){if(!this._options.retry.statusCodes.includes(s.response.status))throw s;const t=s.response.headers.get("Retry-After")??s.response.headers.get("RateLimit-Reset")??s.response.headers.get("X-RateLimit-Reset")??s.response.headers.get("X-Rate-Limit-Reset");if(t&&this._options.retry.afterStatusCodes.includes(s.response.status)){let e=1e3*Number(t);Number.isNaN(e)?e=Date.parse(t)-Date.now():e>=Date.parse("2024-01-01")&&(e-=Date.now());const s=this._options.retry.maxRetryAfter??e;return e<s?e:s}if(413===s.response.status)throw s}const n=this._options.retry.delay(this._retryCount);return Math.min(this._options.retry.backoffLimit,n)}_decorateResponse(t){return this._options.parseJson&&(t.json=async()=>this._options.parseJson(await t.text())),t}async _retry(t){try{return await t()}catch(e){const s=Math.min(this._calculateRetryDelay(e),f);if(this._retryCount<1)throw e;await P(s,{signal:this._options.signal});for(const t of this._options.hooks.beforeRetry){if(await t({request:this.request,options:this._options,error:e,retryCount:this._retryCount})===y)return}return this._retry(t)}}async _fetch(){for(const t of this._options.hooks.beforeRequest){const e=await t(this.request,this._options);if(e instanceof Request){this.request=e;break}if(e instanceof Response)return e}const t=k(this.request,this._options),e=this.request;return this.request=e.clone(),!1===this._options.timeout?this._options.fetch(e,t):_(e,t,this.abortController,this._options)}_stream(t,e){const s=Number(t.headers.get("content-length"))||0;let n=0;return 204===t.status?(e&&e({percent:1,totalBytes:s,transferredBytes:n},new Uint8Array),new globalThis.Response(null,{status:t.status,statusText:t.statusText,headers:t.headers})):new globalThis.Response(new globalThis.ReadableStream({async start(o){const a=t.body.getReader();e&&e({percent:0,transferredBytes:0,totalBytes:s},new Uint8Array),await async function t(){const{done:r,value:i}=await a.read();if(r)o.close();else{if(e){n+=i.byteLength;e({percent:0===s?0:n/s,transferredBytes:n,totalBytes:s},i)}o.enqueue(i),await t()}}()}}),{status:t.status,statusText:t.statusText,headers:t.headers})}}const v=t=>{const e=(e,s)=>T.create(e,n(t,s));for(const s of h)e[s]=(e,o)=>T.create(e,n(t,o,{method:s}));return e.create=t=>v(n(t)),e.extend=e=>("function"==typeof e&&(e=e(t??{})),v(n(t,e))),e.stop=y,e};var R=v();const S={get length(){try{return localStorage.length}catch{return 0}},clear:function(){try{localStorage.clear()}catch{}},getItem:function(t){try{return localStorage.getItem(t)}catch{return null}},removeItem:function(t){try{localStorage.removeItem(t)}catch{}},setItem:function(t,e){try{localStorage.setItem(t,e)}catch{}},key:function(t){try{return localStorage.key(t)}catch{return null}}};let q;var x;(x=q||(q={})).PipedInstances="piped-instances",x.PipedCurrentInstance="piped-current-instance",x.InvidiousInstances="invidious-instances",x.InvidiousCurrentInstance="invidious-current-instance";const $=t=>`https://www.youtube.com/watch?v=${t}`,U=t=>({name:t.title,apiId:t.url.split("=").slice(-1)[0],images:[{url:t.thumbnail}],duration:t.duration}),C=async()=>{const t=await R.get("https://piped-instances.kavin.rocks/").json();return S.setItem(q.PipedInstances,JSON.stringify(t)),t},j=async()=>{const t=S.getItem(q.PipedInstances);let e=[];e=t?JSON.parse(t):await C();const s=e[0].api_url;return S.setItem(q.PipedCurrentInstance,s),s},D=async()=>{const t=S.getItem(q.PipedInstances);return t?JSON.parse(t):await C()},E=async()=>{let t=S.getItem(q.PipedCurrentInstance);return t||(t=await j()),t};async function A(t,e=0){const s=await D();let n=await E();e>0&&e<s.length&&(n=s[e].api_url);try{const e=`${n}/streams/${t.apiId}`,s=1e4,o=new Promise(((t,e)=>{setTimeout((()=>e()),s)})),a=R.get(e).json();await Promise.race([a,o]);const r=(await a).audioStreams.sort(((t,e)=>e.bitrate-t.bitrate));return r[0].url}catch(s){if(e<(await D()).length)return A(t,e+1);throw s}}const L=async t=>{const e=`${await E()}/search?q=${t.query}&filter=videos`,s=await R.get(e).json();return{items:s.items.filter((t=>"stream"===t.type)).map((t=>({name:t.title,apiId:t.url.split("=").slice(-1)[0],images:[{url:t.thumbnail}],duration:t.duration}))),pageInfo:{resultsPerPage:0,offset:0,nextPage:s.nextpage}}},N=async t=>{const e=`${await E()}/search?q=${t.query}&filter=playlists`,s=await R.get(e).json();return{items:s.items.filter((t=>"playlist"===t.type)).map((t=>({name:t.name,apiId:t.url.split("=").slice(-1)[0],images:[{url:t.thumbnail}],tracks:[]}))),pageInfo:{resultsPerPage:0,offset:0,nextPage:s.nextpage}}},O=async t=>{const e=`${await E()}/playlists/${t.apiId}`,s=await R.get(e).json();return{items:s.relatedStreams.map(U),pageInfo:{resultsPerPage:0,offset:0,nextPage:s.nextpage}}},M=async t=>{const e=`${await E()}/opensearch/suggestions?query=${t.query}`;return(await R.get(e).json())[1]};var B={};Object.defineProperty(B,"__esModule",{value:!0});var H=["weeks","years","months","days","hours","minutes","seconds"],J=Object.freeze({years:0,months:0,weeks:0,days:0,hours:0,minutes:0,seconds:0}),G=B.pattern=new RegExp("P(?:(\\d+(?:[\\.,]\\d+)?W)|(\\d+(?:[\\.,]\\d+)?Y)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?D)?(?:T(\\d+(?:[\\.,]\\d+)?H)?(\\d+(?:[\\.,]\\d+)?M)?(\\d+(?:[\\.,]\\d+)?S)?)?)"),F=B.parse=function(t){return t.match(G).slice(1).reduce((function(t,e,s){return t[H[s]]=parseFloat(e)||0,t}),{})},z=B.end=function(t,e){t=Object.assign({},J,t);var s=e?e.getTime():Date.now(),n=new Date(s);return n.setFullYear(n.getFullYear()+t.years),n.setMonth(n.getMonth()+t.months),n.setDate(n.getDate()+t.days),n.setHours(n.getHours()+t.hours),n.setMinutes(n.getMinutes()+t.minutes),n.setMilliseconds(n.getMilliseconds()+1e3*t.seconds),n.setDate(n.getDate()+7*t.weeks),n},K=B.toSeconds=function(t,e){t=Object.assign({},J,t);var s=e?e.getTime():Date.now(),n=new Date(s);return(z(t,n).getTime()-n.getTime())/1e3};B.default={end:z,toSeconds:K,pattern:G,parse:F};const Y="AIzaSyBYUoAxdG5OvUtnxH0HbBioIiF14Ce7RZ0",W=(t,e)=>{S.setItem("access_token",t),e&&S.setItem("refresh_token",e)},Z=R.create({hooks:{beforeRequest:[t=>{const e=S.getItem("access_token");e&&t.headers.set("Authorization",`Bearer ${e}`)}],afterResponse:[async(t,e,s)=>{if(401===s.status){const s=await V();return t.headers.set("Authorization",`Bearer ${s}`),Z(t,e)}}]}}),V=async()=>{const t=S.getItem("refresh_token");if(!t)return;const e=S.getItem("clientId"),s=S.getItem("clientSecret"),n=new URLSearchParams;n.append("refresh_token",t),n.append("grant_type","refresh_token"),e&&s&&(n.append("client_id",e),n.append("client_secret",s));const o=await R.post("https://oauth2.googleapis.com/token",{headers:{"Content-Type":"application/x-www-form-urlencoded"},body:n}).json();return o.access_token?(W(o.access_token),o.access_token):void 0},X=()=>S.getItem("apiKey");function Q(t){return(t.items||[]).map((t=>({apiId:t.id,name:t.snippet?.title||"",images:[{width:t.snippet?.thumbnails?.default?.width||0,url:t.snippet?.thumbnails?.default?.url||"",height:t.snippet?.thumbnails?.default?.height||0}],isUserPlaylist:!0})))}function tt(t){return(t.items||[]).map((t=>({apiId:t.id,duration:(0,B.toSeconds)((0,B.parse)(t.contentDetails?.duration||"0")),images:t.snippet?.thumbnails&&Object.values(t.snippet?.thumbnails).map((t=>({url:t.url||"",height:t.height||0,width:t.width||0}))),name:t.snippet?.title||"",originalUrl:`https://www.youtube.com/watch?v=${t.id}`})))}async function et(){const t=`https://www.googleapis.com/youtube/v3/videos?key=${X()||Y}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;return{tracks:{items:tt(await R.get(t).json())}}}async function st(t){const e=t.join(","),s=`https://www.googleapis.com/youtube/v3/videos?key=${X()||Y}&part=snippet,contentDetails&id=${e}`;return tt(await R.get(s).json())}async function nt(t){let e=`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&key=${X()}&playlistId=${t.apiId}`;t.isUserPlaylist&&(e+="&mine=true"),t.pageInfo&&(t.pageInfo.nextPage?e+=`&pageToken=${t.pageInfo.nextPage}`:t.pageInfo.prevPage&&(e+=`&pageToken=${t.pageInfo.prevPage}`));const s=t.isUserPlaylist?Z:R,n=await s.get(e).json(),o=n.items?.map((t=>t.contentDetails?.videoId)).filter((t=>!!t))||[];return{items:await st(o),pageInfo:{totalResults:n.pageInfo?.totalResults||0,resultsPerPage:n.pageInfo?.resultsPerPage||0,offset:t.pageInfo?t.pageInfo.offset:0,nextPage:n.nextPageToken,prevPage:n.prevPageToken}}}async function ot(t){const e=`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&key=${X()}`,s=await Z.get(e).json();return{items:Q(s),pageInfo:{totalResults:s.pageInfo?.totalResults||0,resultsPerPage:s.pageInfo?.resultsPerPage||0,offset:t.pageInfo?t.pageInfo.offset:0,nextPage:s.nextPageToken,prevPage:s.prevPageToken}}}const at=async()=>{const t=S.getItem(q.InvidiousInstances);let e=[];e=t?JSON.parse(t):await(async()=>{let t=await R.get("https://api.invidious.io/instances.json").json();return t=t.filter((t=>!t[0].includes(".onion")&&!t[0].includes(".i2p"))),t=t.filter((t=>t[1].cors)),S.setItem(q.InvidiousInstances,JSON.stringify(t)),t})();const s=e[Math.floor(Math.random()*e.length)][1].uri;return S.setItem(q.InvidiousCurrentInstance,s),s},rt=async t=>{let e=await(async()=>{let t=S.getItem(q.InvidiousCurrentInstance);return t||(t=await at()),t})();try{const s=`${e}${t}`;return await R.get(s).json()}catch{e=await at();const s=`${e}${t}`;return await R.get(s).json()}};async function it(t){const e=`/api/v1/videos/${t}`,s=await rt(e);return{name:s.title,apiId:t,duration:s.lengthSeconds,images:s.videoThumbnails,originalUrl:$(t)}}const ct=t=>{application.postUiMessage(t)},lt=async t=>{const e=[];t.forEach((t=>{try{const s=/^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)(?:\S+)?$/,n=t.match(s);n&&e.push(n[1])}catch{}}));const s=e.length;let n=0,o=50;const a=[];for(;n<s;){const t=e.slice(n,o),s=await st(t);a.push(...s),n+=50,o+=50}return a};async function ut(t){return L(t)}async function pt(t){return N(t)}async function ht(t){return t.isUserPlaylist?nt(t):O(t)}application.onUiMessage=async t=>{switch(t.type){case"check-login":const e=S.getItem("access_token");e&&ct({type:"login",accessToken:e}),await(async()=>{const t=document.location.host.split(".");t.shift();const e=t.join("."),s=`${document.location.protocol}//${e}`,n=await application.getPluginId(),o=await application.getLocale(),a=await application.getPlaylistsInfo(),r=S.getItem("apiKey")??"",i=S.getItem("clientId")??"",c=S.getItem("clientSecret")??"",l=await E();ct({type:"info",origin:s,pluginId:n,apiKey:r,clientId:i,clientSecret:c,instance:l,locale:o,playlists:a})})();break;case"login":W(t.accessToken,t.refreshToken),application.onGetUserPlaylists=ot;break;case"logout":S.removeItem("access_token"),S.removeItem("refresh_token"),application.onGetUserPlaylists=void 0;break;case"set-keys":S.setItem("apiKey",t.apiKey),S.setItem("clientId",t.clientId),S.setItem("clientSecret",t.clientSecret),application.createNotification({message:"Api Keys saved!"});break;case"getinstnace":const s=await j();ct({type:"sendinstance",instance:s});break;case"resolve-urls":const n=await lt(t.trackUrls.split("\n"));await application.addTracksToPlaylist(t.playlistId,n),application.createNotification({message:"Success!"});break;default:}},application.onSearchAll=async function(t){const e=ut(t),s=pt(t),[n,o]=await Promise.all([e,s]);return{tracks:n,playlists:o}},application.onSearchTracks=ut,application.onSearchPlaylists=pt,application.onGetTrackUrl=async function(t){return await A(t)},application.onGetPlaylistTracks=ht,application.onGetTopItems=async function(){return await et()},application.onGetTrack=async function(t){return it(t.apiId)},application.onLookupPlaylistUrl=async t=>{const e=new URL(t).searchParams.get("list");if(e){const t=await ht({apiId:e,isUserPlaylist:!1});return{...t.playlist,tracks:t.items}}throw new Error("Couldn't retreive playlist")},application.onLookupTrackUrls=lt,application.onCanParseUrl=async function(t,e){if(!/^.*(youtu.be\/|list=)([^#\&\?]*).*/.test(t)&&!/^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)(?:\S+)?$/.test(t))return!1;switch(e){case"playlist":return new URL(t).searchParams.has("list");case"track":return!0;default:return!1}},application.onGetSearchSuggestions=async function(t){return M(t)},application.onLookupTrack=async t=>(await ut({query:`${t.artistName} - ${t.trackName}`})).items[0],application.onDeepLinkMessage=async t=>{application.postUiMessage({type:"deeplink",url:t})};const dt=t=>{localStorage.setItem("kb-color-mode",t)};application.onChangeTheme=async t=>{dt(t)};(async()=>{const t=await application.getTheme();dt(t);S.getItem("access_token")&&(application.onGetUserPlaylists=ot),await C()})()})();