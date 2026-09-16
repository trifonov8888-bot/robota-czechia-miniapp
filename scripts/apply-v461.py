from pathlib import Path

def patch(path, old, new, label):
    p=Path(path); s=p.read_text()
    if old in s:
        p.write_text(s.replace(old,new,1)); print('patched',label); return
    if new in s:
        print('already',label); return
    raise SystemExit('missing source block: '+label)

patch('index.html', """function localCrossResults_(filters){
  var mode=currentSearchMode,q=filters.query||filters.profession||'',jobs=(mode==='vacancies'||mode==='brigadeRequests'),primaryTarget=jobs?(mode==='vacancies'?'vacancies':'brigadeRequests'):(mode==='candidates'?'candidates':'brigades'),secondaryTarget=jobs?(mode==='vacancies'?'brigadeRequests':'vacancies'):(mode==='candidates'?'brigades':'candidates');
  var pf=Object.assign({},filters,{query:q});
  var primary=localSearchFilter_(searchIndexArray_(searchPrefetchMode_(),primaryTarget),primaryTarget,pf),secondary=localSearchFilter_(searchIndexArray_(searchPrefetchMode_(),secondaryTarget),secondaryTarget,pf);
  return {primary:primary,secondary:secondary,secondaryType:secondaryTarget};
}
""", """function clientCrossTaxonomyScore_(x,target,q){
  q=String(q||'').trim();if(!q)return 0;var n=normalizeProfessionTaxonomyText_(q),fields=String(localSearchText_(x,target)||'').split(' | ').map(normalizeProfessionTaxonomyText_).filter(Boolean),best=0;
  if(fields.some(function(f){return f===n;}))best=1000;
  try{Object.keys(CLIENT_CROSS_SPECIALIZATION_PROFESSIONS_).forEach(function(spec){var sn=normalizeProfessionTaxonomyText_(spec),arr=CLIENT_CROSS_SPECIALIZATION_PROFESSIONS_[spec]||[];if(arr.indexOf(n)>=0&&fields.some(function(f){return f===sn||f.indexOf(sn)>=0;}))best=Math.max(best,700);});}catch(e){}
  try{var aliases=professionAliases||{};Object.keys(aliases).forEach(function(k){var kn=normalizeProfessionTaxonomyText_(k),arr=aliases[k]||[];if(kn===n&&arr.some(function(v){var vn=normalizeProfessionTaxonomyText_(v);return fields.some(function(f){return f===vn;});}))best=Math.max(best,950);});}catch(e2){}
  if(!best)best=localSearchScore_(x,target,q);return best;
}
function localCrossSearchFilter_(a,target,filters){
  filters=filters||{};var q=filters.query||filters.profession||'';
  return (a||[]).map(function(x,i){if(filters.category&&String(x.category||'').toLowerCase()!==String(filters.category).toLowerCase())return null;if(filters.city&&!cityMatchClient_(x,filters.city))return null;var score=clientCrossTaxonomyScore_(x,target,q);if(q&&!score)return null;return{x:x,score:score,idx:i};}).filter(Boolean).sort(function(a,b){return b.score-a.score||a.idx-b.idx;}).slice(0,100).map(function(z){return z.x;});
}
function localCrossResults_(filters){
  var mode=currentSearchMode,q=filters.query||filters.profession||'',jobs=(mode==='vacancies'||mode==='brigadeRequests'),primaryTarget=jobs?(mode==='vacancies'?'vacancies':'brigadeRequests'):(mode==='candidates'?'candidates':'brigades'),secondaryTarget=jobs?(mode==='vacancies'?'brigadeRequests':'vacancies'):(mode==='candidates'?'brigades':'candidates');
  var pf=Object.assign({},filters,{query:q});var primary=localCrossSearchFilter_(searchIndexArray_(searchPrefetchMode_(),primaryTarget),primaryTarget,pf),secondary=localCrossSearchFilter_(searchIndexArray_(searchPrefetchMode_(),secondaryTarget),secondaryTarget,pf);
  return {primary:primary,secondary:secondary,secondaryType:secondaryTarget};
}
""", 'client cross ranking')
patch('index.html', """async function openDetail(type,id,preloaded){
  if(!window.lastDetailContext)window.lastDetailContext=(document.getElementById('searchPanel').classList.contains('hidden')?'profile':'search');
""", """async function openDetail(type,id,preloaded){
  if(!window.lastDetailContext||window.lastDetailContext==='profile')window.lastDetailContext=(document.getElementById('searchPanel').classList.contains('hidden')?'profile':'search');window.detailReturnNav_=window.lastDetailContext;
""", 'detail return context')
patch('index.html', "async function openSavedItem(type,id){enterDetailView_();", "async function openSavedItem(type,id){window.lastDetailContext='profile';window.detailReturnNav_='profile';enterDetailView_();", 'saved item return context')
patch('index.html', "function favoritesLocalKey_(){return 'robota_czechia_favorites_'+String(clientUser().id||'');}", "function favoritesLocalKey_(){return 'robota_czechia_favorites_v46_1_'+String(clientUser().id||'');}", 'favorite local cache key')
patch('index.html', "function favoritesPendingKey_(){return 'robota_czechia_favorites_pending_'+String(clientUser().id||'');}", "function favoritesPendingKey_(){return 'robota_czechia_favorites_pending_v46_1_'+String(clientUser().id||'');}", 'favorite pending cache key')
old="""document.getElementById('backBtn').onclick=()=>{
  if(window.lastDetailContext==='similarSearch'){
    restoreSimilarSearchView_();
    window.scrollTo({top:0,behavior:'smooth'});
  }else if(window.lastDetailContext==='search'){
    document.getElementById('detailPanel').classList.add('hidden');
    document.getElementById('searchPanel').classList.remove('hidden');
    normaliseSearchPanelLayout_();
    document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='jobs'&&(currentSearchMode==='vacancies'||currentSearchMode==='brigadeRequests')||b.dataset.nav==='workers'&&(currentSearchMode==='candidates'||currentSearchMode==='brigades')));
  }else if(window.lastDetailContext==='employer'&&window.currentEmployerProfileId){
    openMyEntity('employer',encodeURIComponent(window.currentEmployerProfileId));
  }else{goBackToProfile();}
};"""
new="""document.getElementById('backBtn').onclick=()=>{
  var ctx=window.detailReturnNav_||window.lastDetailContext||'search';if(ctx==='similarSearch'){restoreSimilarSearchView_();window.scrollTo({top:0,behavior:'smooth'});return;}if(ctx==='search'){setAppChrome_(true);['publishPanel','profilePanel','editPanel','detailPanel'].forEach(function(id){document.getElementById(id)?.classList.add('hidden');});document.getElementById('searchPanel').classList.remove('hidden');normaliseSearchPanelLayout_();document.querySelectorAll('[data-nav]').forEach(function(b){b.classList.toggle('active',b.dataset.nav==='jobs'&&(currentSearchMode==='vacancies'||currentSearchMode==='brigadeRequests')||b.dataset.nav==='workers'&&(currentSearchMode==='candidates'||currentSearchMode==='brigades'));});return;}if(ctx==='employer'&&window.currentEmployerProfileId){setAppChrome_(true);openMyEntity('employer',encodeURIComponent(window.currentEmployerProfileId));return;}goBackToProfile();
};"""
patch('index.html', old, new, 'back navigation')
patch('index.html', "const SEARCH_PREFETCH_TTL_MS_=10*60*1000;", "const SEARCH_PREFETCH_TTL_MS_=30*1000;", 'prefetch freshness')
patch('apps-script/Files.js', "function brigadeForPremium_(brigadeId){var bid=String(brigadeId||'');if(!bid)return null;try{var pc=getPublicEntityPersistent_('brigade',bid);if(pc){var raw=pc.raw||pc;return raw;}}catch(e){}var o=getById('Бригады',bid,'brigade_id');if(o){try{cachePublicEntityPersistent_('brigade',bid,publicBrigade_(o));}catch(e2){}return o;}return null;}", "function brigadeForPremium_(brigadeId){var bid=String(brigadeId||'');if(!bid)return null;var ck='PREMIUM_RAW_BRIGADE_'+bid;try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}var o=getById('Бригады',bid,'brigade_id');if(o){try{CacheService.getScriptCache().put(ck,JSON.stringify(o),600);}catch(e2){}return o;}return null;}", 'brigade premium raw contacts')
patch('apps-script/Files.js', "function favoriteCacheKey_(uid){return 'FAVORITES_V2_'+String(uid||'');}", "function favoriteCacheKey_(uid){return 'FAVORITES_V46_1_'+String(uid||'');}", 'favorite server cache key')
old="""function toggleFavorite(d){
  var uid=String(d.userId||d.user_id||'').trim(),type=String(d.entityType||d.type||'').trim(),id=String(d.entityId||d.id||'').trim(),on=d.enabled!==false;
"""
new="""function toggleFavorite(d){
  var uid=String(d.userId||d.user_id||'').trim(),type=String(d.entityType||d.type||'').trim(),id=String(d.entityId||d.id||'').trim(),on=d.enabled!==false;var lock=LockService.getScriptLock();try{lock.waitLock(4000);}catch(e){return{ok:false,error:'Синхронизация избранного занята, повторите ещё раз'};}try{
"""
patch('apps-script/Files.js', old, new, 'favorite mutation lock')
patch('apps-script/Files.js', "return{ok:true,favorite_id:idFav,enabled:true,type:type,entityId:id,data:preview};\n}", "return{ok:true,favorite_id:idFav,enabled:true,type:type,entityId:id,data:preview};\n}finally{try{lock.releaseLock();}catch(e){}}\n}", 'favorite lock release')
patch('apps-script/Kod.js', "function crossEntityScoreV2_(fields,rel,kind){var vals=taxonomySplit_(fields),best=0;for(var i=0;i<vals.length;i++){var v=vals[i];if(crossTokenMatches_(v,rel.aliases))best=Math.max(best,95);if(kind==='candidate'){if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,100);}else{if(crossTokenMatches_(v,rel.specializations))best=Math.max(best,100);if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,90);}}return best;}", "function crossEntityScoreV2_(fields,rel,kind){var vals=taxonomySplit_(fields),best=0;for(var i=0;i<vals.length;i++){var v=vals[i];if(kind==='candidate'){if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,1000);}else{if(crossTokenMatches_(v,rel.specializations))best=Math.max(best,1000);if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,900);}if(crossTokenMatches_(v,rel.aliases))best=Math.max(best,950);}if(best===0&&kind==='candidate'&&rel.profession&&rel.profession.name){var rr=CROSS_PROFESSION_RELATIONS_V2[rel.profession.name]||[];for(var j=0;j<rr.length;j++)if(vals.some(function(v){return taxonomyNormalize_(v)===taxonomyNormalize_(rr[j]);})){best=700;break;}}return best;}", 'server cross ranking')
patch('apps-script/Kod.js', "var key='CROSS_V45_'+", "var key='CROSS_V46_1_'+", 'cross cache key')
