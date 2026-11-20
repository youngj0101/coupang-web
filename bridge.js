(()=>{
let data=null;
const cards=document.getElementById('lfReceived');
const source=document.getElementById('lfSource');
const result=document.getElementById('lfResult');
const roleIndex={'앞면':0,'뒷면':1,'디테일 1':2,'디테일 2':3,'디테일 3':4,'디테일 4':5,'원단 사진':6};

async function toFile(x){
  const r=await fetch(x.url);
  if(!r.ok) throw new Error(`이미지 다운로드 실패 (${r.status})`);
  const b=await r.blob();
  return new File([b],`${data.code}_${x.color}_${x.key}.jpg`,{type:b.type||'image/jpeg'});
}
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
async function applyAll(){
  if(!data)return alert('LF몰에서 받은 이미지가 없습니다.');
  result.textContent='색상별 이미지를 적용하고 있습니다...';
  try{
    const colorGroups=groups();
    const addButton=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ 색상 추가');
    while(document.querySelectorAll('fieldset.opt').length<colorGroups.length){
      if(!addButton)throw new Error('색상 추가 버튼을 찾지 못했습니다.');
      addButton.click();
    }
    const optionBoxes=[...document.querySelectorAll('fieldset.opt')];
    for(let gi=0;gi<colorGroups.length;gi++){
      const [color,items]=colorGroups[gi];
      const box=optionBoxes[gi];
      setValue(box.querySelector('input[placeholder="예: 블랙"]'),color);
      const inputs=[...box.querySelectorAll('input[type=file]')];
      for(const x of items){
        if(roleIndex[x.role]!==undefined&&inputs[roleIndex[x.role]]){
          await put(inputs[roleIndex[x.role]],await toFile(x));
        }
      }
      const extras=items.filter(x=>x.role==='추가 디테일');
      if(extras.length&&inputs[7]){
        const d=new DataTransfer();
        for(const x of extras)d.items.add(await toFile(x));
        inputs[7].files=d.files;
        inputs[7].dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    const title=data.title||'';
    const brand=title.match(/닥스|헤지스|질스튜어트|마에스트로|알레그리/i)?.[0]||'';
    setValue(document.querySelector('input[placeholder="닥스"]'),brand);
    setValue(document.querySelector('input[placeholder="DMSW6D301BK"]'),data.code);
    result.textContent=`적용 완료: ${colorGroups.length}개 색상, ${data.items.length}장`;
  }catch(e){
    console.error(e);
    result.textContent='적용 실패: '+e.message;
  }
}

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
  if(![...rows.querySelectorAll('input')].some(x=>x.value.trim()))fill('남성 숏패딩');
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
function setupBanners(){const bind=(fileId,imgId,resetId,key)=>{const input=document.getElementById(fileId),img=document.getElementById(imgId),reset=document.getElementById(resetId),saved=localStorage.getItem(key);if(saved)img.src=saved;input?.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{img.src=r.result;try{localStorage.setItem(key,r.result)}catch{alert('배너 파일이 너무 큽니다. JPG로 줄여서 다시 선택하세요.')}};r.readAsDataURL(file)});reset?.addEventListener('click',()=>{localStorage.removeItem(key);img.removeAttribute('src');input.value=''})};bind('topBannerFile','topBannerPreview','topBannerReset','lfTopBanner');bind('endBannerFile','endBannerPreview','endBannerReset','lfEndBanner')}
document.getElementById('lfLoad').addEventListener('click',applyAll);
setupSizeTemplates();setupColorTextRule();setupCheckPointBuilder();setupFabricDefaults();setupBanners();
chrome.storage.local.get('lfMakerData',o=>{
  data=o.lfMakerData;
  if(!data){source.textContent='받은 이미지가 없습니다. LF몰 상품 페이지에서 다시 보내주세요.';return;}
  const colorCount=new Set(data.items.map(x=>x.color||'색상 1')).size;
  source.textContent=`${data.code} · ${colorCount}개 색상 · ${data.items.length}장`;
  cards.innerHTML=data.items.map(x=>`<div class="lfInCard"><img src="${x.url}"><div><b>${x.color||'색상 1'} · ${x.role}</b><br><small>${x.key}</small></div></div>`).join('');
  setTimeout(applyAll,100);
});
})();