import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './reader.css';

const base = import.meta.env.BASE_URL;
const storage = {get(k) {try {return localStorage.getItem(k)} catch {return null}}, set(k,v) {try {localStorage.setItem(k,v)} catch {}}};
function readProgress() {try {const p=JSON.parse(storage.get('course-v3-progress')||'{}'); return {read:Array.isArray(p.read)?p.read:[],bookmarks:Array.isArray(p.bookmarks)?p.bookmarks:[],last:p.last||null}} catch {return {read:[],bookmarks:[],last:null}}}
function href(id, anchor='') {return `${base}?lesson=${encodeURIComponent(id)}${anchor?'#'+encodeURIComponent(anchor):''}`}
function route() {return new URLSearchParams(location.search).get('lesson')||''}
let mathPromise, anchorsPromise;
function loadAnchors(){if(!anchorsPromise)anchorsPromise=fetch(base+'anchors.json').then(r=>{if(!r.ok)throw new Error('Could not load lesson links.');return r.json()}).catch(e=>{anchorsPromise=null;throw e});return anchorsPromise}
function loadMath() {
  if (!mathPromise) mathPromise = new Promise((resolve,reject)=>{
    const css=document.createElement('link'); css.rel='stylesheet'; css.href=base+'assets/math.css'; document.head.append(css);
    const script=document.createElement('script'); script.src=base+'assets/math.js'; script.onload=()=>resolve(window.katex); script.onerror=()=>{script.remove(); mathPromise=null; reject(new Error('Could not load formulas. Check your connection and retry.'))}; document.head.append(script);
  });
  return mathPromise;
}
function Lesson({page, manifest, progress, toggle, navigate}) {
  const [content,setContent]=useState(''), [anchors,setAnchors]=useState({}), [error,setError]=useState(''), [retry,setRetry]=useState(0), [mathReady,setMathReady]=useState(false), [printing,setPrinting]=useState(false);
  const root=useRef(null), renderAll=useRef(async()=>{});
  useEffect(()=>{
    const controller=new AbortController(); setContent(''); setError(''); setMathReady(false);
    Promise.all([fetch(base+`content/${page.id}.html`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Could not load this lesson.');return r.text()}),loadAnchors()]).then(([html,map])=>{if(!controller.signal.aborted){setAnchors(map);setContent(html)}}).catch(e=>{if(e.name!=='AbortError'&&!controller.signal.aborted)setError(e.message)});
    return ()=>controller.abort();
  },[page.id,retry]);
  useEffect(()=>{
    if(!content||!root.current)return;
    const node=root.current; let cancelled=false, observer, timer; const queue=[], scheduled=new Set();
    node.querySelectorAll('a[href^="#"]').forEach(a=>{let id;try{id=decodeURIComponent(a.getAttribute('href').slice(1))}catch{return}const owner=anchors[id];if(owner)a.href=href(owner,id);else a.href='../#'+encodeURIComponent(id)});
    node.querySelectorAll('img').forEach(img=>{img.loading='lazy';img.decoding='async'});
    node.querySelectorAll('.v3-complete').forEach(button=>{button.onclick=()=>toggle('read',button.dataset.lesson)});
    const resume=node.querySelector('#v3-resume-main');if(resume)resume.onclick=()=>navigate(progress.last||manifest.order[0]);
    node.querySelectorAll('pre code').forEach((code,i)=>{
      const tools=document.createElement('div');tools.className='code-tools';
      const copy=document.createElement('button');copy.textContent='Copy code';copy.onclick=async()=>{try{await navigator.clipboard.writeText(code.textContent);copy.textContent='Copied'}catch{copy.textContent='Select code to copy';const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}};
      const download=document.createElement('button');download.textContent='Download';download.onclick=()=>{const url=URL.createObjectURL(new Blob([code.textContent],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=code.dataset.filename||`${page.id}-${i+1}.${code.classList.contains('language-python')?'py':'txt'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
      tools.append(copy,download);code.parentElement.before(tools);
    });
    function scrollAnchor(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}const target=id&&document.getElementById(id);if(target&&node.contains(target)){let p=target.parentElement;while(p&&p!==node){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}target.scrollIntoView({block:'start'})}}
    scrollAnchor();
    const formulas=[...node.querySelectorAll('.math')];
    if(!formulas.length){setMathReady(true);return ()=>{cancelled=true}};
    loadMath().then(katex=>{
      if(cancelled)return;
      function render(el){if(el.dataset.rendered)return;const tex=el.textContent;try{katex.render(tex,el,{displayMode:el.classList.contains('block'),throwOnError:false,strict:'ignore'});el.dataset.rendered='true';el.classList.remove('pending')}catch{el.textContent=tex;el.title='Formula could not be rendered'}}
      function pump(){if(cancelled)return;const start=performance.now();while(queue.length&&performance.now()-start<6)render(queue.shift());if(queue.length)timer=setTimeout(pump,0)}
      function enqueue(el){if(scheduled.has(el))return;scheduled.add(el);queue.push(el);if(queue.length===1)timer=setTimeout(pump,0)}
      renderAll.current=()=>new Promise(resolve=>{formulas.forEach(enqueue);function check(){if(cancelled)return resolve();if(queue.length)timer=setTimeout(check,25);else resolve()}check()});
      if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){enqueue(entry.target);observer.unobserve(entry.target)}})},{rootMargin:'400px'});formulas.forEach(el=>observer.observe(el))}else formulas.forEach(enqueue);
      setMathReady(true);
    }).catch(e=>{if(!cancelled)setError(e.message)});
    const onHash=()=>scrollAnchor();addEventListener('hashchange',onHash);
    return ()=>{cancelled=true;observer?.disconnect();clearTimeout(timer);removeEventListener('hashchange',onHash);renderAll.current=async()=>{}};
  },[content,manifest,page.id,anchors]);
  useEffect(()=>{root.current?.querySelectorAll('.v3-complete').forEach(b=>{const read=progress.read.includes(b.dataset.lesson);b.textContent=read?'Marked read ✓':'Mark read';b.setAttribute('aria-pressed',String(read))})},[progress,content]);
  async function print(){setPrinting(true);const disclosures=[...root.current.querySelectorAll('details')].map(d=>[d,d.open]);disclosures.forEach(([d])=>d.open=true);await renderAll.current();window.print();disclosures.forEach(([d,open])=>d.open=open);setPrinting(false)}
  const index=manifest.order.indexOf(page.id), previous=manifest.order[index-1], next=manifest.order[index+1];
  return <>
    <div className="lesson-meta"><span>{page.group}</span><span>About {Math.max(1,Math.ceil(page.words/220))} min reading</span></div>
    <div className="lesson-tools">
      <button onClick={()=>toggle('bookmarks',page.id)} aria-pressed={progress.bookmarks.includes(page.id)}>{progress.bookmarks.includes(page.id)?'Bookmarked ✓':'Bookmark'}</button>
      {page.core&&<button onClick={()=>toggle('read',page.id)} aria-pressed={progress.read.includes(page.id)}>{progress.read.includes(page.id)?'Read ✓':'Mark read'}</button>}
      <button disabled={!content||!mathReady||printing} onClick={print}>{printing?'Preparing…':'Print lesson'}</button>
    </div>
    {error&&<div role="alert" className="notice">{error} <button onClick={()=>setRetry(retry+1)}>Retry</button></div>}
    {!content&&!error&&<p role="status">Loading lesson…</p>}
    <article id="doc" ref={root} onClick={e=>{const a=e.target.closest('a');if(!a)return;const url=new URL(a.href,location.href);const target=url.searchParams.get('lesson');if(url.origin===location.origin&&url.pathname===base&&target)navigate(target,e,decodeURIComponent(url.hash.slice(1)))}} dangerouslySetInnerHTML={{__html:content}} />
    <nav className="lesson-pagination" aria-label="Lesson navigation">{previous?<a href={href(previous)} onClick={e=>navigate(previous,e)}>← Previous lesson</a>:<span/>}{next&&<a href={href(next)} onClick={e=>navigate(next,e)}>Next lesson →</a>}</nav>
  </>
}

function App(){
  const [manifest,setManifest]=useState(null),[error,setError]=useState(''),[id,setId]=useState(route),[progress,setProgress]=useState(readProgress),[query,setQuery]=useState(''),[results,setResults]=useState(null),[searchStatus,setSearchStatus]=useState(''),[menu,setMenu]=useState(false),[onlyBookmarks,setOnlyBookmarks]=useState(false),[theme,setTheme]=useState(()=>storage.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  const searchWorker=useRef(null), searchVersion=useRef(0), main=useRef(null);
  const [narrow,setNarrow]=useState(()=>matchMedia('(max-width:900px)').matches);
  const [sidebarHidden,setSidebarHidden]=useState(()=>storage.get('reader-sidebar-hidden')==='true');
  const sidebarOpen=narrow?menu:!sidebarHidden;
  useEffect(()=>{const media=matchMedia('(max-width:900px)');const change=()=>{setNarrow(media.matches);setMenu(false)};media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)},[]);
  useEffect(()=>{storage.set('reader-sidebar-hidden',String(sidebarHidden))},[sidebarHidden]);
  function closeSidebar(){setMenu(false);if(!narrow)setSidebarHidden(true);document.querySelector('.contents-button')?.focus()}
  useEffect(()=>{fetch(base+'manifest.json').then(r=>{if(!r.ok)throw new Error('Could not load the course contents.');return r.json()}).then(setManifest).catch(e=>setError(e.message));const pop=()=>{setId(route());setMenu(false)};addEventListener('popstate',pop);return ()=>{removeEventListener('popstate',pop);searchWorker.current?.terminate()}},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;storage.set('theme',theme)},[theme]);
  useEffect(()=>{storage.set('course-v3-progress',JSON.stringify(progress))},[progress]);
  const resolvedId=manifest?.redirects?.[id]||id;
  const page=manifest?.pages.find(p=>p.id===resolvedId);
  useEffect(()=>{if(manifest?.redirects?.[id]){history.replaceState(null,'',href(resolvedId));setId(resolvedId)}},[manifest,id,resolvedId]);
  useEffect(()=>{if(page){document.title=page.title+' — Agentic';if(page.core)setProgress(p=>({...p,last:page.id}))}else document.title='Agentic — Course reader'},[page?.id]);
  function navigate(target,event,anchor=''){if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0))return;event?.preventDefault();if(manifest?.redirects?.[target]){target=manifest.redirects[target];anchor=''}history.pushState(null,'',target?href(target,anchor):base);setId(target);setMenu(false);if(target===id&&anchor)dispatchEvent(new HashChangeEvent('hashchange'));else window.scrollTo(0,0);main.current?.focus({preventScroll:true})}
  useEffect(()=>{const escape=e=>{if(e.key==='Escape'&&sidebarOpen)closeSidebar()};addEventListener('keydown',escape);if(menu&&narrow)document.getElementById('search')?.focus();return ()=>removeEventListener('keydown',escape)},[menu,narrow,sidebarOpen]);
  function toggle(field,target){setProgress(p=>({...p,[field]:p[field].includes(target)?p[field].filter(x=>x!==target):[...p[field],target]}))}
  useEffect(()=>{
    const version=++searchVersion.current;
    if(!query.trim()){setResults(null);setSearchStatus('');return}
    const timeout=setTimeout(()=>{
      setSearchStatus('Searching course…');
      if(!searchWorker.current){searchWorker.current=new Worker(new URL('./search-worker.js',import.meta.url),{type:'module'});searchWorker.current.onmessage=({data})=>{if(data.version!==searchVersion.current)return;if(data.error){setSearchStatus(data.error);setResults(null)}else{setResults(data.ids);setSearchStatus(`${data.ids.length} matching sections`)}}}
      searchWorker.current.postMessage({query,version,url:base+'search.json'});
    },250);return ()=>clearTimeout(timeout);
  },[query]);
  if(error)return <main><h1>Course reader</h1><p role="alert">{error}</p><button onClick={()=>location.reload()}>Retry</button><p><a href="../">Open original course</a></p></main>;
  if(!manifest)return <main><p role="status">Opening course contents…</p></main>;
  const filtered=manifest.pages.filter(p=>!p.redirect&&(!onlyBookmarks||progress.bookmarks.includes(p.id))&&(results?results.includes(p.id):!query.trim()||p.title.toLowerCase().includes(query.toLowerCase())));
  const groups=[...new Set(filtered.map(p=>p.group))];
  const coreRead=manifest.order.filter(x=>progress.read.includes(x)).length;
  return <>
    <a className="skip" href="#reader-main">Skip to reading</a>
    <header className="reader-header"><a className="brand" href={base} onClick={e=>navigate('',e)}>AGENTIC<span>Course reader</span></a><div><button className="contents-button" aria-expanded={sidebarOpen} aria-controls="contents" onClick={()=>narrow?setMenu(!menu):setSidebarHidden(!sidebarHidden)}>{sidebarOpen?'Hide contents':'Show contents'}</button><button onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'}>{theme==='dark'?'Light':'Dark'}</button><a className="original" href="../">Original course ↗</a></div></header>
    <div className={`reader-layout${!sidebarOpen?' sidebar-hidden':''}`}>
      <aside id="contents" hidden={!sidebarOpen} className={sidebarOpen?'open':''} aria-label="Course contents"><div className="sidebar-top"><h2>Contents</h2><button className="mobile-close" aria-label="Close sidebar" onClick={closeSidebar}>Close</button></div><label htmlFor="search">Search lessons, text & formulas</label><input id="search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try attention or quantization"/><p className="search-status" role="status">{searchStatus||`${coreRead} / ${manifest.order.length} lessons read`}</p><button className="bookmark-filter" aria-pressed={onlyBookmarks} onClick={()=>setOnlyBookmarks(!onlyBookmarks)}>{onlyBookmarks?'Show all sections':'Show bookmarks'}</button>
      {!filtered.length&&<p>No matching sections.</p>}{groups.map(group=><details key={group} open={!!query||onlyBookmarks||!id||page?.group===group}><summary>{group}</summary><nav>{filtered.filter(p=>p.group===group).map(p=><a key={p.id} aria-current={p.id===id?'page':undefined} href={href(p.id)} onClick={e=>navigate(p.id,e)}><span>{p.title}</span>{progress.read.includes(p.id)&&<small aria-label="Read">✓</small>}</a>)}</nav></details>)}</aside>
      <main id="reader-main" tabIndex="-1" ref={main}>{id&&!page?<><h1>Section not found</h1><p>The link doesn’t match a course section.</p><a href={base} onClick={e=>navigate('',e)}>Return to contents</a></>:page?<Lesson key={page.id} page={page} manifest={manifest} progress={progress} toggle={toggle} navigate={navigate}/>:<>
        <div className="eyebrow">FROM FIRST PRINCIPLES TO DEEPSEEK-R1</div><h1 className="hero-title">A whole course.<br/>One lesson at a time.</h1><p className="hero-description">Explore the mathematics, mechanisms and methods behind modern language models. Pick up where you left off, or start with the foundations.</p><div className="hero-actions"><a className="primary" href={href(manifest.order[0])} onClick={e=>navigate(manifest.order[0],e)}>Start learning →</a>{manifest.order.includes(progress.last)&&<a href={href(progress.last)} onClick={e=>navigate(progress.last,e)}>Resume reading →</a>}</div><p className="home-note">{manifest.order.length} lessons · Worked examples · Source references</p>
        <section className="home-sections"><h2>Your learning path</h2>{[...new Set(manifest.pages.filter(p=>p.core).map(p=>p.group))].map((group,i)=>{const lessons=manifest.pages.filter(p=>p.core&&p.group===group);return <a className="course-card" key={group} href={href(lessons[0].id)} onClick={e=>navigate(lessons[0].id,e)}><span className="card-number">{String(i+1).padStart(2,'0')}</span><div><h3>{group}</h3><p>{lessons.length} lessons · {lessons.filter(p=>progress.read.includes(p.id)).length} read</p></div><span>→</span></a>})}</section><section className="home-sections"><h2>Explore the full collection</h2><p>The contents also include appendices, source ledgers, verification reports and executable companions. All original course sections are available.</p><a href={href('audit-continuation')} onClick={e=>navigate('audit-continuation',e)}>Open mechanisms & verification →</a></section>
      </>}<footer>Agentic · Progress and bookmarks are saved in this browser.</footer></main>
    </div>
  </>
}
createRoot(document.getElementById('root')).render(<App/>);
