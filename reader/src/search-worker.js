let indexPromise;
self.onmessage=async({data:{query,version,url}})=>{
  try{
    if(!indexPromise)indexPromise=fetch(url).then(r=>{if(!r.ok)throw new Error('Search download failed. Try again.');return r.json()}).catch(e=>{indexPromise=null;throw e});
    const index=await indexPromise, words=query.trim().toLowerCase().split(/\s+/);
    const ids=index.filter(record=>words.every(word=>record.text.includes(word))).map(record=>record.id);
    self.postMessage({version,ids});
  }catch(e){self.postMessage({version,error:e.message})}
};
