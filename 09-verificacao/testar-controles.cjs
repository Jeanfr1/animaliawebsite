const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
async function test(reduce=false,fail=false){
 const nodes={};const get=k=>nodes[k]||(nodes[k]={classes:new Set(),handlers:{},attrs:{},hidden:true,disabled:false,offsetWidth:1000,textContent:'',classList:{add(...ss){ss.forEach(s=>nodes[k].classes.add(s))},remove(...ss){ss.forEach(s=>nodes[k].classes.delete(s))},contains(s){return nodes[k].classes.has(s)},toggle(s){const ss=nodes[k].classes;ss.has(s)?ss.delete(s):ss.add(s);return ss.has(s)}},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}});
 const images=[{decode:()=>fail?Promise.reject(Error('fail')):Promise.resolve()},{decode:()=>Promise.resolve()},{decode:()=>Promise.resolve()}];
 const mq={matches:reduce,addEventListener(k,f){this.onChange=f}};
 const doc={querySelector:get,getElementById:get,querySelectorAll:s=>s==='.hero-motion img'?images:s==='.site-nav a'?[get('navlink')]:[],body:get('body'),handlers:{},addEventListener(k,f){this.handlers[k]=f}};
 function FakeImage(){this.decode=()=>Promise.resolve()}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../08-estudo/animalia.js'),'utf8'),{document:doc,window:{matchMedia:()=>mq},Image:FakeImage,Promise,console});
 await new Promise(r=>setImmediate(r));const h=get('.hero'),ctl=get('.motion-controls'),pause=get('pause');
 if(fail){assert(!h.classes.has('motion-ready'));assert(ctl.hidden);return;}
 assert.equal(h.classes.has('motion-ready'),!reduce);assert.equal(ctl.hidden,reduce);assert.equal(h.classes.has('is-running'),!reduce);
 pause.handlers.click();assert.equal(h.classes.has('is-paused'),!reduce);
 get('replay').handlers.click();assert(!h.classes.has('is-paused'));assert.equal(pause.attrs['aria-pressed'],'false');
 h.handlers.animationend({animationName:'snackArc'});assert(pause.disabled);get('replay').handlers.click();assert(!pause.disabled);
 get('.menu-toggle').handlers.click();assert(get('.site-header').classes.has('menu-open'));assert.equal(get('.menu-toggle').attrs['aria-expanded'],'true');doc.handlers.keydown({key:'Escape'});assert(!get('.site-header').classes.has('menu-open'));assert(get('.menu-toggle').focused);
 get('.menu-toggle').handlers.click();get('navlink').handlers.click();assert(!get('.site-header').classes.has('menu-open'));
 mq.matches=true;mq.onChange();assert(!h.classes.has('motion-ready'));assert(ctl.hidden);
}
(async()=>{await test();await test(true);await test(false,true);console.log('PASS: play/pause/replay/end, reduced motion, failed layer fallback, mobile menu and Escape. DOM contracts only.');})().catch(e=>{console.error(e);process.exit(1)});
