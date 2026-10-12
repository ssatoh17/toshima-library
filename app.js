const SYS='Tokyo_Toshima', $=id=>document.getElementById(id), TTL=10*60*1000;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function cache(k,v){if(v===undefined){try{const o=JSON.parse(localStorage.getItem(k));return o&&Date.now()-o.t<TTL?o.v:null}catch(e){return null}}try{localStorage.setItem(k,JSON.stringify({t:Date.now(),v}))}catch(e){}}
let busy=false;
function isbn13(s){s=s.replace(/[^0-9X]/gi,'');if(s.length===13)return s;if(s.length!==10)return null;let b='978'+s.slice(0,9),sum=0;for(let i=0;i<12;i++)sum+=+b[i]*(i%2?3:1);return b+((10-sum%10)%10)}
async function ndl(q){const key='ndl:'+q,c=cache(key);if(c)return c;
 const raw=q.replace(/[-\s]/g,''),isI=/^(97[89])?\d{9}[\dX]$/i.test(raw);
 const u='https://ndlsearch.ndl.go.jp/api/opensearch?mediatype=books&cnt=30&'+(isI?'isbn='+raw:'any='+encodeURIComponent(q));
 const x=new DOMParser().parseFromString(await (await fetch(u)).text(),'text/xml'),seen={},items=[];
 for(const it of x.querySelectorAll('item')){const id=[...it.getElementsByTagName('dc:identifier')].find(e=>/ISBN/.test(e.getAttribute('xsi:type')));if(!id)continue;
  const i13=isbn13(id.textContent);if(!i13||seen[i13])continue;seen[i13]=1;
  const g=t=>it.getElementsByTagName(t)[0]?.textContent||'';
  items.push({isbn:i13,title:g('title'),author:g('author')||g('dc:creator'),pub:g('dc:publisher'),year:g('dcterms:issued')});}
 if(isI&&!items.length&&isbn13(raw))items.push({isbn:isbn13(raw),title:'ISBN '+raw,author:'',pub:'',year:''});
 cache(key,items);return items}
function jsonp(u){return new Promise((ok,ng)=>{const cb='cb'+Math.random().toString(36).slice(2),s=document.createElement('script');
 window[cb]=d=>{delete window[cb];s.remove();ok(d)};s.onerror=()=>{delete window[cb];s.remove();ng(new Error('calil'))};s.src=u+'&callback='+cb;document.body.appendChild(s)})}
async function calil(isbns,onUpd){let d=await jsonp(`https://api.calil.jp/check?systemid=${SYS}&format=json&isbn=${isbns.join(',')}`);onUpd(d.books);
 for(let n=0;d.continue===1&&n<15;n++){await new Promise(r=>setTimeout(r,2000));d=await jsonp(`https://api.calil.jp/check?session=${d.session}&format=json`);onUpd(d.books)}}
function render(items,books){$('out').innerHTML=items.map(b=>{const r=books?.[b.isbn]?.[SYS];let h;
 if(!r||r.status==='Running')h='<span class=m>所蔵確認中…</span>';else if(r.status!=='OK'&&r.status!=='Cache')h='<span class=m>確認できませんでした</span>';
 else{const L=Object.entries(r.libkey||{});h=L.length?'<div class=lib>'+L.map(([k,v])=>`<span class="${v==='貸出可'?'ok':'ng'}">${esc(k)}: ${esc(v)}</span>`).join('')+'</div>'+(r.reserveurl?`<a class=r target=_blank rel=noopener href="${esc(r.reserveurl)}">公式サイトで予約する</a>`:''):'<span class=m>豊島区立図書館に所蔵なし</span>'}
 return `<div class=b><div class=t>${esc(b.title)}</div><div class=m>${esc(b.author)} ${esc(b.pub)} ${esc(b.year)} ISBN ${b.isbn}</div>${h}</div>`}).join('')}
$('f').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const q=$('q').value.trim();$('s').textContent='検索中…';$('out').innerHTML='';
 try{const items=await ndl(q);{const n=x=>(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,''),w=n(q).length?q.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean):[],sc=b=>{const t=n(b.title);return t.includes(n(q))?2:w.some(k=>t.includes(k))?1:0};items.forEach((b,i)=>b._i=i);items.sort((a,b)=>sc(b)-sc(a)||a._i-b._i)}$('s').textContent=items.length?`${items.length}件（ISBNのある図書のみ）`:'該当なし';if(!items.length)return;
  const ck='calil:'+items.map(i=>i.isbn).join(','),c=cache(ck);if(c){render(items,c);return}
  let books={};render(items,books);await calil(items.map(i=>i.isbn),b=>{Object.assign(books,b);render(items,books)});cache(ck,books);
 }catch(err){$('s').textContent='エラー: '+err.message}finally{busy=false}};
const p=new URLSearchParams(location.search).get('q');if(p){$('q').value=p;$('f').requestSubmit()}
