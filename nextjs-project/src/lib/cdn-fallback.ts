/**
 * Инлайн-скрипт фолбэка CDN → origin (вставляется первым в <head>, см. `src/app/layout.tsx`).
 *
 * Если домен CDN у пользователя недоступен (блокировка, DNS, сбой edge):
 * - упавшие <script>/<link>/<img>/<source> с CDN перезапрашиваются с origin (тот же путь без префикса);
 * - сбой подтверждается пробой картинки с CDN, чтобы обычный 404 не выключал CDN;
 * - после подтверждения CDN выключается на OFF_TTL_MS (localStorage): сеттеры src/href/srcset и
 *   setAttribute переписывают CDN-URL на origin, поэтому динамические чанки Turbopack и картинки
 *   React сразу идут на origin, а теги из HTML следующих страниц чинятся MutationObserver'ом.
 *
 * Повторное выполнение чанка безопасно: рантайм Turbopack выходит, если уже инициализирован,
 * а повторный `TURBOPACK.push` не переустанавливает зарегистрированные модули.
 */
const OFF_STORAGE_KEY = 'ih_cdn_off'
const OFF_TTL_MS = 30 * 60 * 1000
const PROBE_PATH = '/favicon-96x96.png'
const PROBE_TIMEOUT_MS = 5000
/** Если за это время после DOMContentLoaded Next не стартовал — проверяем CDN пробой. */
const BOOT_CHECK_MS = 8000

export function buildCdnFallbackScript(cdnUrl: string): string {
  const config = JSON.stringify({
    c: cdnUrl,
    k: OFF_STORAGE_KEY,
    ttl: OFF_TTL_MS,
    probe: PROBE_PATH,
    probeMs: PROBE_TIMEOUT_MS,
    bootMs: BOOT_CHECK_MS,
  }).replace(/</g, '\\u003c')

  return `(function(o){
var C=o.c,P=C+'/',d=document,w=window,off=false,probing=null,sa=Element.prototype.setAttribute;
try{var ts=+localStorage.getItem(o.k);off=ts>0&&Date.now()-ts<o.ttl}catch(e){}
function isCdn(u){return typeof u==='string'&&u.lastIndexOf(P,0)===0}
function fix(u){return isCdn(u)?u.slice(C.length):u}
function fixSet(s){return typeof s==='string'?s.split(P).join('/'):s}
function fixAttr(n,v){n=String(n).toLowerCase();return n==='src'||n==='href'?fix(v):n==='srcset'||n==='imagesrcset'?fixSet(v):v}
function patch(k,p,f){var x=w[k]&&Object.getOwnPropertyDescriptor(w[k].prototype,p);if(x&&x.set)Object.defineProperty(w[k].prototype,p,{configurable:true,enumerable:x.enumerable,get:x.get,set:function(v){x.set.call(this,off?f(v):v)}})}
patch('HTMLScriptElement','src',fix);patch('HTMLLinkElement','href',fix);patch('HTMLImageElement','src',fix);patch('HTMLImageElement','srcset',fixSet);patch('HTMLSourceElement','srcset',fixSet);
Element.prototype.setAttribute=function(n,v){return sa.call(this,n,off&&typeof v==='string'?fixAttr(n,v):v)};
function urlOf(el){return el.tagName==='LINK'?el.getAttribute('href'):el.getAttribute('src')}
function hasCdn(el){var u=urlOf(el),s=el.getAttribute('srcset')||el.getAttribute('imagesrcset');return isCdn(u)||(!!s&&s.indexOf(P)>=0)}
function retry(el){var t=el.tagName;if(!hasCdn(el))return;
if(t==='IMG'||t==='SOURCE'){['srcset','src'].forEach(function(a){var v=el.getAttribute(a);if(v)sa.call(el,a,fixAttr(a,v))});return}
if((t!=='SCRIPT'&&t!=='LINK')||!el.parentNode)return;
var n=d.createElement(t);for(var i=0;i<el.attributes.length;i++){var a=el.attributes[i];sa.call(n,a.name,fixAttr(a.name,a.value))}
el.parentNode.replaceChild(n,el)}
function settled(el){var t=el.tagName;return el.__ihOk||(t==='LINK'&&el.rel==='stylesheet'&&!!el.sheet)||(t==='IMG'&&el.complete&&el.naturalWidth>0)}
function scan(root,force){if(!root.querySelectorAll)return;var q=root.querySelectorAll('script[src],link[href],img,source');for(var i=0;i<q.length;i++){if(force||!settled(q[i]))retry(q[i])}}
function goOff(){if(off)return;off=true;try{localStorage.setItem(o.k,String(Date.now()))}catch(e){}scan(d,false)}
function probe(cb){if(probing){probing.push(cb);return}probing=[cb];var img=new Image(),done=false,
tm=setTimeout(function(){fin(false)},o.probeMs);
function fin(ok){if(done)return;done=true;clearTimeout(tm);var l=probing;probing=null;for(var i=0;i<l.length;i++)l[i](ok)}
img.onload=function(){fin(true)};img.onerror=function(){fin(false)};img.src=C+o.probe+'?cdn-probe='+Date.now()}
function check(){if(!off)probe(function(ok){if(!ok)goOff()})}
w.addEventListener('load',function(e){var el=e.target;if(el&&el.tagName)el.__ihOk=1},true);
w.addEventListener('error',function(e){var el=e.target;if(!el||!el.tagName||!hasCdn(el))return;retry(el);check()},true);
if(off){scan(d,true);var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;for(var j=0;j<a.length;j++){var n=a[j];if(n.nodeType!==1)continue;retry(n);scan(n,true)}}});
mo.observe(d.documentElement,{childList:true,subtree:true});w.addEventListener('load',function(){mo.disconnect()})}
else{d.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(!w.next)check()},o.bootMs)});
w.addEventListener('load',function(){var l=d.querySelectorAll('link[rel=stylesheet]');for(var i=0;i<l.length;i++){if(isCdn(l[i].getAttribute('href'))&&!l[i].sheet){check();return}}if(!w.next)check()})}
})(${config});`
}
