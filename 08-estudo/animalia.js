(() => {
 const hero=document.querySelector('.hero'),controls=document.querySelector('.motion-controls');
 const replay=document.getElementById('replay'),pause=document.getElementById('pause');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let loaded=false;
 const reset=()=>{hero.classList.remove('is-paused');pause.disabled=false;pause.textContent='Pausar animación';pause.setAttribute('aria-pressed','false');};
 const play=()=>{reset();hero.classList.remove('is-running');void hero.offsetWidth;if(loaded&&!reduced.matches)hero.classList.add('is-running');};
 replay.addEventListener('click',play);
 pause.addEventListener('click',()=>{if(reduced.matches||pause.disabled)return;const p=hero.classList.toggle('is-paused');pause.textContent=p?'Continuar animación':'Pausar animación';pause.setAttribute('aria-pressed',String(p));});
 const finish=e=>{if(e.animationName==='snackArc'){pause.disabled=true;pause.textContent='Animación finalizada';}};hero.addEventListener('animationend',finish);
 const layers=[...document.querySelectorAll('.hero-motion img')];
 const bg=new Image();bg.src='../03-hero/cenario.webp';
 const imageReady=img=>img.decode?img.decode():new Promise((ok,no)=>{if(img.complete){img.naturalWidth?ok():no();}else{img.addEventListener('load',ok,{once:true});img.addEventListener('error',no,{once:true});}});
 Promise.all([...layers,bg].map(imageReady)).then(()=>{loaded=true;if(!reduced.matches){hero.classList.add('motion-ready');controls.hidden=false;play();}}).catch(()=>{controls.hidden=true;hero.classList.remove('motion-ready');});
 const change=()=>{hero.classList.remove('is-running','motion-ready');reset();controls.hidden=reduced.matches||!loaded;if(loaded&&!reduced.matches){hero.classList.add('motion-ready');play();}};
 if(reduced.addEventListener)reduced.addEventListener('change',change);
 const header=document.querySelector('.site-header'),menu=document.querySelector('.menu-toggle');
 const close=()=>{header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');};
 menu.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));});
 document.querySelectorAll('.site-nav a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('menu-open')){close();menu.focus();}});
 if('IntersectionObserver' in window&&!reduced.matches){document.body.classList.add('js-reveals');const ob=new IntersectionObserver(items=>items.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('waiting');ob.unobserve(e.target);}}),{threshold:.1});document.querySelectorAll('.reveal').forEach(n=>{n.classList.add('waiting');ob.observe(n);});}
})();