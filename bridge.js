(()=>{
let data=null;
const cards=document.getElementById('lfReceived');
const source=document.getElementById('lfSource');
const result=document.getElementById('lfResult');
const roleIndex={'앞면':0,'뒷면':1,'디테일 1':2,'디테일 2':3,'디테일 3':4,'디테일 4':5,'원단 사진':6};

async function toFile(x){const rid=crypto.randomUUID();const reply=await new Promise((resolve,reject)=>{const finish=()=>{window.removeEventListener('message',on);clearTimeout(timer)};const on=e=>{if(e.source===window&&e.origin===location.origin&&e.data?.type==='LF29_PHOTO_RESULT'&&e.data.rid===rid){finish();resolve(e.data)}};const timer=setTimeout(()=>{finish();reject(Error('이미지 연결 시간 초과'))},22000);window.addEventListener('message',on);window.postMessage({type:'LF29_PHOTO',rid,id:data.id,url:x.url},location.origin)});if(!reply.ok)throw Error(reply.error||'원본 이미지를 불러오지 못했습니다');const blob=await (await fetch(reply.data)).blob();return new File([blob],data.code+'_'+x.key+'.'+(blob.type.split('/')[1]||'jpg'),{type:blob.type})}
async function put(input,file){
  const d=new DataTransfer();
  d.items.add(file);
  input.files=d.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
function setValue(el,value){
  if(!el||!value)return;
  el.value=value;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function groups(){
  const map=new Map();
  for(const item of data.items){
    const color=(item.color||'색상 1').trim()||'색상 1';
    if(!map.has(color))map.set(color,[]);
    map.get(color).push(item);
  }
  return [...map.entries()];
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForOptionCount(count,timeout=3000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    const boxes=[...document.querySelectorAll('fieldset.opt')];
    if(boxes.length>=count)return boxes;
    await wait(50);
  }
  throw new Error(`색상 입력 영역 생성 지연 (${count}개 필요)`);
}
const fileCache=new Map();let applying=false;
async function applyAll(){if(!data||applying)return;applying=true;const btn=document.getElementById('lfLoad');btn.disabled=true;cards.inert=true;result.textContent='선택한 색상별 역할 적용 중…';try{if(!window.LF30ClearPhotoSlots)throw Error('studio-core.js도 함께 교체하세요.');const gs=groups();const add=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ 색상 추가');while(document.querySelectorAll('fieldset.opt').length<gs.length){const n=document.querySelectorAll('fieldset.opt').length;if(!add)throw Error('색상 추가 버튼 없음');add.click();await waitForOptionCount(n+1)}const boxes=[...document.querySelectorAll('fieldset.opt')];const prepared=[];for(const [color,items] of gs){const fixed=new Map(),extras=[];for(const x of items){if(x.role==='제외')continue;if(!fileCache.has(x.url))fileCache.set(x.url,await toFile(x));const f=fileCache.get(x.url),idx=roleIndex[x.role];if(idx===undefined||fixed.has(idx))extras.push(f);else fixed.set(idx,f)}prepared.push({color,code:items[0]?.sourceCode||data.code,fixed,extras})}
let count=0;for(const [i,g] of prepared.entries()){const box=boxes[i],inputs=[...box.querySelectorAll('input[type=file]')];if(inputs.length<8)throw Error('색상 이미지 입력칸을 확인하세요.');window.LF30ClearPhotoSlots(box);setValue(box.querySelector('input[placeholder="예: 블랙"]'),g.color);setValue(box.querySelector('input[placeholder*="색상별"]')||box.querySelectorAll('input[type=text],input:not([type])')[1],g.code);for(const [idx,f] of g.fixed)await put(inputs[idx],f);const dt=new DataTransfer();for(const f of g.extras)dt.items.add(f);if(dt.files.length){inputs[7].files=dt.files;inputs[7].dispatchEvent(new Event('change',{bubbles:true}))}const v=window.LF30PhotoCount(box);if(!v||v.extras!==g.extras.length||[...g.fixed.keys()].some(k=>!v.fixed[k]))throw Error(g.color+' 사진 적용 확인 실패');count+=g.fixed.size+g.extras.length}result.textContent=gs.length+'개 색상 · '+count+'장 적용 완료';}catch(e){result.textContent='이미지 적용 실패: '+e.message}finally{cards.inert=false;btn.disabled=false;applying=false}}
function setupSizeTemplates(){
  const rows=document.getElementById('szRows');if(!rows)return;
  const add=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='사이즈 한 줄 추가');
  const templates={
    '남성 숏패딩':[['95','66.5','45.5','113','62'],['100','68','47.5','118','63'],['105','70','49.5','123','64'],['110','71','51.5','129','65.5'],['115','72','53','134','66.5']],
    '남성 카라 긴팔 티셔츠':[['95','67.5','43.5','102','59'],['100','69','45','106','60.5'],['105','70.5','46.5','110','62'],['110','72','48','114','63.5'],['115','73.5','49.5','118','65'],['120','75','51','122','66.5']],
    '남성 긴팔 니트':[['95','65','42','102','59.5'],['100','67','43.5','106','61'],['105','69','45','110','62.5'],['110','71','46.5','114','64'],['115','72','48','118','65']]
  };
  const table=rows.closest('table')||rows.parentElement,bar=document.createElement('div');bar.style.cssText='margin:10px 0;padding:12px;background:#eef4f0;border-radius:9px';
  bar.innerHTML='<b>상품별 기본 사이즈표</b><div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-top:8px"><select id="lfGender"><option>남성</option><option>여성</option></select><select id="lfSizeKind"><option>숏패딩</option><option>카라 긴팔 티셔츠</option><option>긴팔 니트</option></select></div><button type="button" id="lfFillSize" style="margin-top:8px">선택한 기본표 적용</button><small style="display:block;margin-top:6px">기본값은 수정할 수 있으며 실제 상품 실측표가 있으면 해당 수치를 우선 사용하세요.</small>';
  table.parentElement.insertBefore(bar,table);
  const fill=name=>{const values=templates[name];if(!values)return alert('해당 여성 기본표는 아직 등록되지 않았습니다.');rows.replaceChildren();for(const vals of values){add.click();const ins=rows.lastElementChild.querySelectorAll('input');vals.forEach((v,i)=>{ins[i].value=v;ins[i].dispatchEvent(new Event('input',{bubbles:true}))})}bar.querySelector('b').textContent=name+' 기본 사이즈표'};
  bar.querySelector('#lfFillSize').onclick=()=>fill(bar.querySelector('#lfGender').value+' '+bar.querySelector('#lfSizeKind').value);
  // Only use measurements from the selected item.
}
function setupColorTextRule(){
  const apply=box=>{const name=box.querySelector('input[placeholder="예: 블랙"]')?.value.trim().toLowerCase()||'';if(/블랙|검정|black|그레이|회색|grey|gray|차콜/.test(name)){const colors=box.querySelectorAll('input[type=color]');if(colors[1]){colors[1].value='#ffffff';colors[1].dispatchEvent(new Event('input',{bubbles:true}));colors[1].dispatchEvent(new Event('change',{bubbles:true}))}}};
  document.addEventListener('input',e=>{if(e.target.matches('input[placeholder="예: 블랙"]'))apply(e.target.closest('fieldset.opt'))});
  document.querySelectorAll('fieldset.opt').forEach(apply);
}
function setupCheckPointBuilder(){
  const anchor=document.getElementById('choices');if(!anchor)return;
  anchor.previousElementSibling?.remove();anchor.style.display='none';const oldKnit=document.getElementById('knitPanel');if(oldKnit)oldKnit.style.display='none';const oldFeatures=document.getElementById('features')?.closest('label');if(oldFeatures)oldFeatures.style.display='none';const oldDraft=document.getElementById('draft');if(oldDraft)oldDraft.style.display='none';
  const panel=document.createElement('div');panel.style.cssText='margin:14px 0;padding:14px;background:#f3f6f4;border:1px solid #cfd9d3;border-radius:10px';
  panel.innerHTML=`<b>상세 CHECK POINT 조합</b><div class="lfCpGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:9px;align-items:end"><label>패턴<select data-cp="pattern"><option>해당 없음</option><option>무지</option><option>체크 패턴</option><option>스트라이프 패턴</option><option>전체 퀼팅</option></select></label><label>넥라인<select data-cp="neck"><option>해당 없음</option><option>카라넥</option><option>반하이넥</option><option>라운드넥</option><option>스탠드 카라</option><option>후드넥</option></select></label><label>소재<select data-cp="material"><option>해당 없음</option><option>면</option><option>울</option><option>캐시미어</option><option>면 혼방</option><option>린넨</option><option>구스다운</option><option>덕다운</option></select></label><label>제품 특징<select data-cp="feature"><option>해당 없음</option><option>베이직</option><option>클래식</option><option>심플</option><option>고급스러운</option><option>슬림한 실루엣</option></select></label><label>표현 스타일<select data-cp="style"><option>해당 없음</option><option>데일리</option><option>일상</option><option>데이트</option><option>캐주얼</option><option>비즈니스</option></select></label><label>계절<select data-cp="season"><option>해당 없음</option><option>겨울</option><option>봄</option><option>여름</option><option>가을</option></select></label></div><div style="margin-top:9px"><b>추가 특징</b><div id="lfCpChecks" style="display:flex;gap:7px;flex-wrap:wrap"></div></div><button type="button" id="lfMakeCopy" style="margin-top:10px">선택 내용으로 CHECK POINT 4문장 만들기</button><small style="display:block;margin-top:5px">각 문장은 공백 포함 UTF-8 기준 47~75바이트로 생성됩니다.</small>`;
  panel.querySelectorAll('.lfCpGrid label').forEach(l=>l.style.cssText='display:flex;flex-direction:column;gap:5px;align-self:end');panel.querySelectorAll('.lfCpGrid select').forEach(s=>s.style.cssText='width:100%;height:42px;margin:0');
  const extras=['부드러운 촉감','신축성','가벼운 착용감','통기성','편안한 착용감','탈부착 퍼 후드','허리 드로스트링','집업 여밈','숏 기장','하프 기장','롱 기장','힙을 덮는 기장','방풍성','투습성','발수성','체크 안감','코듀로이 카라'];const checks=panel.querySelector('#lfCpChecks');extras.forEach(v=>checks.insertAdjacentHTML('beforeend',`<label style="background:white;padding:4px 7px;border-radius:6px"><input type="checkbox" value="${v}"> ${v}</label>`));anchor.parentElement.insertBefore(panel,anchor.nextSibling);
  const enc=new TextEncoder(),bytes=s=>enc.encode(s).length,valid=(s,f)=>bytes(s)>=47&&bytes(s)<=75?s:f;
  panel.querySelector('#lfMakeCopy').onclick=()=>{const get=k=>panel.querySelector(`[data-cp="${k}"]`).value,extra=[...checks.querySelectorAll('input:checked')].map(x=>x.value),prod=document.querySelector('input[placeholder="긴팔 카라 니트"]')?.value.trim()||'상품',pattern=get('pattern'),neck=get('neck'),mat=get('material'),feat=get('feature'),sty=get('style'),season=get('season');const feel=extra.find(x=>/촉감|착용감|가벼운/.test(x))||'편안한 착용감',detail=extra.find(x=>/후드|드로스트링|집업|기장|안감|카라/.test(x))||'깔끔한 디테일',func=extra.find(x=>/방풍|투습|발수|통기성|신축성/.test(x))||'안정적인 착용감',shortFeat=feat==='슬림한 실루엣'?'슬림핏':feat,shortDetail=detail==='힙을 덮는 기장'?'힙 커버 기장':detail,p=pattern==='해당 없음'?'깔끔한':pattern,n=neck==='해당 없음'?'단정한':neck,f=shortFeat==='해당 없음'?'베이직':shortFeat,m=mat==='해당 없음'?'편안한':mat,st=sty==='해당 없음'?'데일리':sty,se=season==='해당 없음'?'간절기':season;const s=[valid(`${p} 디자인, ${n} 구성의 ${f} ${prod}입니다.`,`디자인과 실루엣이 조화로운 베이직 상품입니다.`),valid(`${m} 소재감으로 ${feel}을 살린 실용적인 제품입니다.`,`편안한 소재감으로 일상에서 부담 없이 입기 좋습니다.`),valid(`${shortDetail} 적용으로 착용과 스타일 조절이 간편합니다.`,`깔끔한 디테일로 착용과 스타일 조절이 간편합니다.`),valid(`${se} ${st} 코디에 어울리며 ${func}이 돋보입니다.`,`계절 코디에 어울려 활용도가 좋은 제품입니다.`)];const copy=document.getElementById('copy');copy.value=s.join('\n\n');copy.dataset.edited='1';copy.dispatchEvent(new Event('input',{bubbles:true}))};
}
function setupFabricDefaults(){const vals=['보통','보통','보통','없음','없음'];vals.forEach((v,i)=>{const s=document.getElementById('fabricVal'+i);if(s){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}})}
function setupBanners(){
  const dbp=new Promise((ok,no)=>{const r=indexedDB.open('lfStudioBanners',1);r.onupgradeneeded=()=>r.result.createObjectStore('banners');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});async function access(mode,key,blob){const db=await dbp;return new Promise((ok,no)=>{const tx=db.transaction('banners',mode);const s=tx.objectStore('banners'),r=mode==='readonly'?s.get(key):blob?s.put(blob,key):s.delete(key);tx.oncomplete=()=>ok(r.result);tx.onabort=tx.onerror=()=>no(tx.error||Error('배너 저장 실패'))})}
  let tail=Promise.resolve();function queue(fn){tail=tail.then(fn).catch(e=>{alert('배너: '+(e?.name==='QuotaExceededError'?'브라우저 저장 공간이 부족합니다.':e.message))});window.LF30BannerReady=tail;return tail}
  for(const [fid,iid,rid,key] of [['topBannerFile','topBannerPreview','topBannerReset','lfTopBanner'],['endBannerFile','endBannerPreview','endBannerReset','lfEndBanner']]){const inp=document.getElementById(fid),img=document.getElementById(iid),reset=document.getElementById(rid);let prev;const show=async blob=>{const u=URL.createObjectURL(blob),test=new Image();test.src=u;try{await test.decode()}catch{URL.revokeObjectURL(u);throw Error('열 수 없는 이미지입니다. PNG, JPG 또는 WebP를 선택하세요.')}img.src=u;await img.decode();if(prev)URL.revokeObjectURL(prev);prev=u;};queue(async()=>{let b=await access('readonly',key);if(b){await show(b);return}const old=localStorage.getItem(key);if(old?.startsWith('data:image/')){b=await(await fetch(old)).blob();await show(b);await access('readwrite',key,b);localStorage.removeItem(key)}});inp.onchange=()=>{const b=inp.files[0];if(b)queue(async()=>{await show(b);await access('readwrite',key,b);localStorage.removeItem(key)})};reset.onclick=()=>queue(async()=>{await access('readwrite',key,null);localStorage.removeItem(key);img.removeAttribute('src');inp.value='';if(prev)URL.revokeObjectURL(prev);prev=null})}}
document.getElementById('lfLoad').addEventListener('click',applyAll);
setupSizeTemplates();setupColorTextRule();setupCheckPointBuilder();setupBanners();
// Local, deterministic copy helper. No network, AI fees, or changes to the LF source name.
function lfCopyFacts3(d, override={}) {
  const tidy=s=>String(s??'').replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim();
  const uniq=xs=>[...new Set(xs.map(tidy).filter(Boolean))];
  const confirmed=s=>s&&!/미확인|확인\s*필요|상세\s*(페이지|설명)|^색상\s*\d+$/.test(s);
  const source=tidy(d.lfName||d.title);
  // Keep useful bracketed attributes but exclude promotions, prices and stray SKU text from prose.
  const title=tidy(source.replace(/\[[^\]]*(특가|혜택|할인|쿠폰|단독|아울렛|사은|적립|최저가|배송)[^\]]*\]/g,' ').replace(/(?:아울렛특가|단독특가|무료배송|쿠폰할인|최저가|\d+%\s*할인)/g,' ').replace(/[\[\]()]/g,' '));
  const knownBrands=[[/닥스|\bDAKS\b/i,'닥스'],[/헤지스|\bHAZZYS\b/i,'헤지스'],[/질스튜어트|JILL\s*STUART/i,'질스튜어트'],[/마에스트로|MAESTRO/i,'마에스트로'],[/알레그리|ALLEGRI/i,'알레그리'],[/티엔지티|\bTNGT\b/i,'티엔지티'],[/\bATCORNER\b|앳코너/i,'앳코너'],[/던스트|\bDUNST\b/i,'던스트']];
  const brand=tidy(override.brand||d.brand||knownBrands.find(([re])=>re.test(title))?.[1]||'');
  const categories=[[/원피스|드레스(?!셔츠)/,'원피스'],[/다운\s*(?:코트|재킷|자켓|점퍼)|패딩|다운점퍼/,'패딩'],[/가디건|카디건/,'가디건'],[/스웨터/,'스웨터'],[/니트/,'니트'],[/(?:긴팔|긴소매|롱슬리브).{0,18}(?:티셔츠|티\b|티(?=\s|$))|(?:티셔츠).{0,18}(?:긴팔|긴소매)/,'긴팔티셔츠'],[/(?:반팔|반소매).{0,18}(?:티셔츠|티(?=\s|$))|티셔츠.{0,18}(?:반팔|반소매)/,'반팔티'],[/후드\s*티/,'후드티'],[/맨투맨/,'맨투맨'],[/티셔츠|카라티|긴팔티|반팔티/,'티셔츠'],[/블라우스/,'블라우스'],[/셔츠|남방/,'셔츠'],[/재킷|자켓/,'재킷'],[/코트/,'코트'],[/점퍼|잠바/,'점퍼'],[/아우터/,'아우터'],[/베스트|조끼/,'조끼'],[/바지|팬츠|슬랙스|데님진/,'바지'],[/스커트|치마/,'스커트']];
  const cat=tidy(override.category||categories.find(([re])=>re.test(title))?.[1]||'');
  const n=d.notice||{}, mat=confirmed(tidy(n.material))?tidy(n.material):'';
  const shell=mat.split(/안감|배색|충전재|충전물|주머니|심지|부속/)[0];
  const text=tidy(title+' '+(d.description||''));
  const colors=uniq([...(d.colors||[]),...(d.options||[]).map(o=>o.color)]).filter(confirmed);
  const sizes=uniq((d.options||[]).map(o=>o.size)).filter(confirmed);
  const gender=(text.match(/남녀공용|유니섹스|남성|여성|키즈|아동/)||[])[0]||'';
  const cp={}; const pick=(name,list,from=text)=>{for(const [re,v] of list){if(re.test(from)){cp[name]=v;break}}};
  pick('pattern',[[/퀼팅\s*전체|전체\s*퀼팅/,'전체 퀼팅'],[/스트라이프|줄무늬/,'스트라이프 패턴'],[/체크(?:무늬|\s*패턴)|체크(?!\s*안감)/,'체크 패턴'],[/무지|솔리드/,'무지']]);
  pick('neck',[[/스탠드\s*(?:넥|칼라|카라)/,'스탠드 카라'],[/반하이넥|반목/,'반하이넥'],[/라운드\s*넥|크루\s*넥/,'라운드넥'],[/후드\s*넥/,'후드넥'],[/카라\s*넥|칼라\s*넥|카라\s*(?:니트|티셔츠|셔츠|티)(?!\S)/,'카라넥']]);
  pick('material',[[/구스\s*다운|거위\s*(?:솜털|털)/,'구스다운'],[/덕\s*다운|오리\s*(?:솜털|털)/,'덕다운']],title+' '+(mat.match(/(?:충전재|충전물)\s*[:：]?[^;]{0,100}/)||[''])[0]);
  if(!cp.material)pick('material',[[/캐시미어/,'캐시미어'],[/면\s*혼방|코튼\s*(?:블렌드|혼방)/,'면 혼방'],[/린넨|리넨|아마\s*[\d:]/,'린넨'],[/울(?:\s|\d|혼방|니트|소재|$)|모\s*[:：]?\s*\d+(?:\.\d+)?%/,'울'],[/(?:^|[\s,:：])(?:면|코튼)\s*(?:100%|소재|$)/,'면']],title+' '+shell);
  pick('feature',[[/슬림\s*핏|슬림한 실루엣/,'슬림한 실루엣'],[/클래식/,'클래식'],[/베이직|기본형/,'베이직'],[/심플/,'심플'],[/고급스러운/,'고급스러운']]);
  pick('style',[[/비즈니스/,'비즈니스'],[/캐주얼/,'캐주얼'],[/데일리/,'데일리'],[/데이트/,'데이트'],[/일상/,'일상']]);
  pick('season',[[/겨울|동절기/,'겨울'],[/여름|하절기/,'여름'],[/봄(?!버)/,'봄'],[/가을/,'가을']]);
  const extras=[[/부드러운\s*촉감/,'부드러운 촉감'],[/신축성(?!\s*(?:없|낮|미확인))/,'신축성'],[/가벼운\s*착용감/,'가벼운 착용감'],[/통기성(?!\s*(?:없|낮|미확인))/,'통기성'],[/편안한\s*착용감/,'편안한 착용감'],[/탈부착\s*퍼\s*후드/,'탈부착 퍼 후드'],[/허리\s*드로스트링/,'허리 드로스트링'],[/집업|지퍼\s*여밈/,'집업 여밈'],[/숏\s*(?:기장|패딩)/,'숏 기장'],[/하프\s*기장/,'하프 기장'],[/롱\s*(?:기장|패딩)/,'롱 기장'],[/힙을\s*덮는\s*기장/,'힙을 덮는 기장'],[/방풍성(?!\s*(?:없|미확인))/,'방풍성'],[/투습성(?!\s*(?:없|미확인))/,'투습성'],[/발수성(?!\s*(?:없|미확인))/,'발수성'],[/체크\s*안감/,'체크 안감'],[/코듀로이\s*(?:카라|칼라)/,'코듀로이 카라']].filter(([r])=>r.test(text)).map(([,v])=>v);
  const rawFeatures=[['탈부착',/탈부착/],['후드',/후드/],['집업',/집업|지퍼\s*여밈/],['퀼팅',/퀼팅/],['자수',/자수/],['케이블',/케이블/],['플리츠',/플리츠/],['골지',/골지/],['버튼',/버튼|단추/],['포켓',/포켓/],['하프',/하프\s*기장/],['경량',/경량/]].filter(([,r])=>r.test(title)).map(([t])=>t);
  const materialWord=cp.material?.replace(/\s/g,''), patternWord=cp.pattern?.replace(/ 패턴$/,'').replace('전체 퀼팅','퀼팅');
  const tokens=uniq([gender,cp.season,materialWord,patternWord,cp.neck?.replace(/\s/g,''),...rawFeatures,cp.feature?.replace('슬림한 실루엣','슬림핏'),cp.style,colors.length===1&&colors[0],colors.length>1&&colors.length+'컬러',sizes.length>1&&sizes.length+'사이즈',d.code&&/^[A-Z\d_-]{3,24}$/i.test(d.code)?d.code:''].filter(Boolean)).filter(w=>w!==brand&&w!==cat);
  const mid=tokens.slice(0,5); const words=uniq([brand,...mid,cat]);const name=words.join(' ');
  const para=[];const detachable=/(?:탈부착|탈착|분리형)\s*(?:퍼|털)?\s*(?:카라|칼라|후드)/.exec(title)?.[0];const part=detachable?.replace(/^(탈부착|탈착|분리형)\s*/,'').replace(/퍼\s*(카라|칼라)/,'퍼 카라');const length=/미들|미디엄|미디\s*기장/.test(title)?'미들 기장':/롱\s*(?:기장|다운|패딩|코트)/.test(title)?'롱 기장':/숏\s*(?:기장|다운|패딩|점퍼)/.test(title)?'숏 기장':'';const type=/다운\s*점퍼/.test(title)?'다운 점퍼':cat;
  if(part)para.push((length?length+'의 ':'')+(type||'디자인')+'에 탈부착 가능한 '+part+'를 더했습니다. '+(/카라|칼라/.test(part)?'카라를 떼면 목선이 한결 간결해져 두 가지 분위기로 입을 수 있습니다.':'후드를 분리해 원하는 스타일로 입을 수 있습니다.'));
  else {const details=uniq([cp.neck,patternWord,cp.feature,...rawFeatures.filter(v=>!['탈부착','하프'].includes(v))]).slice(0,2);if(details.length)para.push(details.join(' · ')+' 디테일을 살린 '+[length,type].filter(Boolean).join(' ')+'입니다.');else if(length&&type)para.push(length+'으로 디자인한 '+type+'입니다.');else {const clean=title.split(/[,|]/).pop().replace(/[A-Z]{2,}\d[A-Z\d-]+/gi,'').trim();if(clean)para.push(clean.replace(/[.!?]$/,'')+'입니다.')}}
  return {brand,cat,cp,extras,name,desc:para.map(tidy).filter(Boolean).join('\n\n').slice(0,2450),review:!brand||!cat||name.split(/\s+/).length<6||name.split(/\s+/).length>7};
}
function applyWear32(d){const variants=d.variants?.length?d.variants:[d];const keys=['신축성','두께감','촉감','비침','안감'];const issues=[];for(const [i,k] of keys.entries()){const sel=document.getElementById('fabricVal'+i);if(!sel)continue;const values=variants.map(p=>p.wear?.[k]||'');let v=values[0]&&values.every(x=>x===values[0])?values[0]:'';
 if(v==='부분 안감'&&!Array.from(sel.options).some(o=>o.value===v))sel.add(new Option(v,v));if(!Array.from(sel.options).some(o=>o.value===v))v='';sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));if(!v)issues.push(k)}const lab=document.getElementById('fabricVal4');if(lab){let hint=document.getElementById('wear32Hint');if(!hint){hint=document.createElement('p');hint.id='wear32Hint';lab.closest('fieldset')?.append(hint)}hint.textContent=issues.length?'미확인 또는 색상별 값이 다름: '+issues.join(', ')+' (자동 강조 안 함)':'LF몰 착용 정보 5개 항목 반영 완료'}}
function applyCopy3(d){
  applyWear32(d);
  const el=id=>document.getElementById(id);const emit=e=>{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
  const set=(id,v)=>{const e=el(id);if(!e)return;e.value=v||'';emit(e)};
  const initial=lfCopyFacts3(d);if(initial.brand){set('brand',initial.brand);set('sBrand',initial.brand)}set('prod',initial.cat);set('sName',initial.name);
  Object.entries(initial.cp).forEach(([k,v])=>{const e=document.querySelector('.lfCpGrid [data-cp="'+k+'"]');if(e&&[...e.options].some(o=>o.value===v)){e.value=v;emit(e)}});
  document.querySelectorAll('#lfCpChecks input[type=checkbox]').forEach(e=>{e.checked=initial.extras.includes(e.value)});
  const cp=el('copy'),memo=el('sCopy');if(cp){cp.dataset.edited='1';set('copy',initial.desc)}set('sCopy',initial.desc);
  if(cp&&memo&&!cp.dataset.lfCopySync){cp.dataset.lfCopySync='1';cp.addEventListener('input',()=>{memo.value=cp.value});memo.addEventListener('input',()=>{if(cp.value!==memo.value){cp.value=memo.value;cp.dataset.edited='1';cp.dispatchEvent(new Event('input',{bubbles:true}))}})}
  const nm=el('sName');if(nm){let tools=el('lfTitleTools3');if(!tools){tools=document.createElement('div');tools.id='lfTitleTools3';nm.closest('label')?.insertAdjacentElement('afterend',tools)}tools.replaceChildren();tools.style.cssText='font-size:12px;color:#45584d;align-self:end;padding-bottom:8px';const msg=document.createElement('span'),btn=document.createElement('button');btn.type='button';btn.textContent='상품명 다시 제안';btn.onclick=()=>{const f=lfCopyFacts3(d,{brand:el('sBrand')?.value||el('brand')?.value,category:el('prod')?.value});set('sName',f.name);report(f)};const report=f=>{msg.textContent=f.review?'브랜드·상품 종류 또는 확인된 단어가 부족합니다. 제안명을 직접 보완해 주세요. ':'브랜드 첫 단어 · 상품 종류 마지막 단어. 필요하면 직접 수정하세요. '};report(initial);tools.append(msg,btn)}
  return initial;
}

function tidy(){for(const h of document.querySelectorAll('main h1, main h2, main h3')){if(/월\s*1\s*억\s*매출/.test(h.textContent))h.textContent='상품 제작';if(/고정\s*배너와\s*사이즈표/.test(h.textContent))h.textContent='사이즈표'}for(const p of document.querySelectorAll('main p,main small,main .hint'))if(!p.children.length&&p.textContent.includes('정품 안내')&&p.textContent.includes('구매 전 유의사항'))p.hidden=true}
tidy();document.getElementById('lfLoad').textContent='변경한 사진 역할 적용';
window.LF29Mount=async d=>{data={...d,items:d.items.map(x=>({...x}))};const roleKey='lf30:roles:'+d.id;const photoKey=x=>JSON.stringify([x.sourceCode||'',x.color,x.url]);try{const saved=JSON.parse(localStorage.getItem(roleKey)||'{}');for(const x of data.items){const r=saved[photoKey(x)];if(Object.hasOwn(roleIndex,r)||['추가 디테일','제외'].includes(r))x.role=r}}catch{}fileCache.clear();cards.replaceChildren();source.textContent=d.colors.join(' / ')+' · '+d.items.length+'장. 역할을 바꾼 후 적용하세요.';const labels=[...Object.keys(roleIndex),'추가 디테일','제외'];const bindings=[];for(const x of data.items){const el=document.createElement('div');el.className='lfInCard';const im=document.createElement('img');im.src=x.url;im.alt=x.color+' '+x.role;const sel=document.createElement('select');sel.ariaLabel=x.color+' '+x.key+' 사진 역할';for(const role of labels)sel.add(new Option(role,role));sel.value=x.role;bindings.push([x,sel]);sel.onchange=()=>{const old=x.role,role=sel.value;if(roleIndex[role]!==undefined){const other=bindings.find(([y])=>y!==x&&y.color===x.color&&y.role===role);if(other){other[0].role=old;other[1].value=old}}x.role=role;try{localStorage.setItem(roleKey,JSON.stringify(Object.fromEntries(data.items.map(i=>[photoKey(i),i.role]))))}catch{}result.textContent='역할이 변경되었습니다. 변경한 사진 역할 적용을 눌러주세요.'};el.append(im,document.createTextNode(x.color+' · '+x.key),sel);cards.append(el)}applyCopy3(d);await applyAll()};
})();