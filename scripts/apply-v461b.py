from pathlib import Path

def append_once(path, marker, block):
    p=Path(path); s=p.read_text()
    if marker in s:
        print('already', marker); return
    p.write_text(s+'\n\n'+block+'\n')
    print('added', marker)

append_once('index.html','V46_1_CLIENT_CROSS_OVERRIDE',r'''/* V46_1_CLIENT_CROSS_OVERRIDE */
function clientCrossTaxonomyScore_(x,target,q){
  q=String(q||'').trim();if(!q)return 0;var n=normalizeProfessionTaxonomyText_(q),fields=String(localSearchText_(x,target)||'').split(' | ').map(normalizeProfessionTaxonomyText_).filter(Boolean),best=0;
  if(fields.some(function(f){return f===n;}))best=1000;
  try{Object.keys(CLIENT_CROSS_SPECIALIZATION_PROFESSIONS_).forEach(function(spec){var sn=normalizeProfessionTaxonomyText_(spec),arr=CLIENT_CROSS_SPECIALIZATION_PROFESSIONS_[spec]||[];if(arr.indexOf(n)>=0&&fields.some(function(f){return f===sn||f.indexOf(sn)>=0;}))best=Math.max(best,700);});}catch(e){}
  try{var aliases=professionAliases||{};Object.keys(aliases).forEach(function(k){var kn=normalizeProfessionTaxonomyText_(k),arr=aliases[k]||[];if(kn===n&&arr.some(function(v){var vn=normalizeProfessionTaxonomyText_(v);return fields.some(function(f){return f===vn;});}))best=Math.max(best,950);});}catch(e2){}
  if(!best)best=localSearchScore_(x,target,q);return best;
}
function localCrossSearchFilter_(a,target,filters){filters=filters||{};var q=filters.query||filters.profession||'';return(a||[]).map(function(x,i){if(filters.category&&String(x.category||'').toLowerCase()!==String(filters.category).toLowerCase())return null;if(filters.city&&!cityMatchClient_(x,filters.city))return null;var score=clientCrossTaxonomyScore_(x,target,q);if(q&&!score)return null;return{x:x,score:score,idx:i};}).filter(Boolean).sort(function(a,b){return b.score-a.score||a.idx-b.idx;}).slice(0,100).map(function(z){return z.x;});}
function localCrossResults_(filters){var mode=currentSearchMode,q=filters.query||filters.profession||'',jobs=(mode==='vacancies'||mode==='brigadeRequests'),primaryTarget=jobs?(mode==='vacancies'?'vacancies':'brigadeRequests'):(mode==='candidates'?'candidates':'brigades'),secondaryTarget=jobs?(mode==='vacancies'?'brigadeRequests':'vacancies'):(mode==='candidates'?'brigades':'candidates');var pf=Object.assign({},filters,{query:q});return{primary:localCrossSearchFilter_(searchIndexArray_(searchPrefetchMode_(),primaryTarget),primaryTarget,pf),secondary:localCrossSearchFilter_(searchIndexArray_(searchPrefetchMode_(),secondaryTarget),secondaryTarget,pf),secondaryType:secondaryTarget};}
''')

append_once('index.html','V46_1_BACK_OVERRIDE',r'''/* V46_1_BACK_OVERRIDE */
document.getElementById('backBtn').onclick=function(){var ctx=window.detailReturnNav_||window.lastDetailContext||'search';if(ctx==='similarSearch'){restoreSimilarSearchView_();window.scrollTo({top:0,behavior:'smooth'});return;}if(ctx==='search'){setAppChrome_(true);['publishPanel','profilePanel','editPanel','detailPanel'].forEach(function(id){document.getElementById(id)?.classList.add('hidden');});document.getElementById('searchPanel').classList.remove('hidden');normaliseSearchPanelLayout_();return;}if(ctx==='employer'&&window.currentEmployerProfileId){setAppChrome_(true);openMyEntity('employer',encodeURIComponent(window.currentEmployerProfileId));return;}goBackToProfile();};
''')

append_once('index.html','V46_1_FAVORITE_KEYS_OVERRIDE',r'''/* V46_1_FAVORITE_KEYS_OVERRIDE */
function favoritesLocalKey_(){return 'robota_czechia_favorites_v46_1_'+String(clientUser().id||'');}
function favoritesPendingKey_(){return 'robota_czechia_favorites_pending_v46_1_'+String(clientUser().id||'');}
''')

append_once('apps-script/Files.js','V46_1_BRIGADE_PREMIUM_RAW_OVERRIDE',r'''/* V46_1_BRIGADE_PREMIUM_RAW_OVERRIDE */
function brigadeForPremium_(brigadeId){var bid=String(brigadeId||'');if(!bid)return null;var ck='PREMIUM_RAW_BRIGADE_'+bid;try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}var o=getById('Бригады',bid,'brigade_id');if(o){try{CacheService.getScriptCache().put(ck,JSON.stringify(o),600);}catch(e2){}return o;}return null;}
function favoriteCacheKey_(uid){return 'FAVORITES_V46_1_'+String(uid||'');}
''')

append_once('apps-script/Files.js','V46_1_FAVORITE_LOCK_OVERRIDE',r'''/* V46_1_FAVORITE_LOCK_OVERRIDE */
var __V46_1_originalToggleFavorite=toggleFavorite;
function toggleFavorite(d){var lock=LockService.getScriptLock();try{lock.waitLock(4000);}catch(e){return{ok:false,error:'Синхронизация избранного занята, повторите ещё раз'};}try{return __V46_1_originalToggleFavorite(d);}finally{try{lock.releaseLock();}catch(e){}}}
''')

append_once('apps-script/Kod.js','V46_1_CROSS_SCORE_OVERRIDE',r'''/* V46_1_CROSS_SCORE_OVERRIDE */
function crossEntityScoreV2_(fields,rel,kind){var vals=taxonomySplit_(fields),best=0;for(var i=0;i<vals.length;i++){var v=vals[i];if(kind==='candidate'){if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,1000);}else{if(crossTokenMatches_(v,rel.specializations))best=Math.max(best,1000);if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,900);}if(crossTokenMatches_(v,rel.aliases))best=Math.max(best,950);}if(best===0&&kind==='candidate'&&rel.profession&&rel.profession.name){var rr=CROSS_PROFESSION_RELATIONS_V2[rel.profession.name]||[];for(var j=0;j<rr.length;j++)if(vals.some(function(v){return taxonomyNormalize_(v)===taxonomyNormalize_(rr[j]);})){best=700;break;}}return best;}
''')

# Bump the cross cache key without depending on exact source formatting.
p=Path('apps-script/Kod.js');s=p.read_text();s2=s.replace("key='CROSS_V45_'+","key='CROSS_V46_1_'+")
if s2!=s:p.write_text(s2);print('bumped cross cache key')
