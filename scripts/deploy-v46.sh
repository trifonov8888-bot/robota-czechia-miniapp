#!/usr/bin/env bash
set -euo pipefail

git checkout bfd83d6580e978b95eb5ccbf82d748e405294b69 -- apps-script/Kod.js index.html

python3 - <<'PY'
from pathlib import Path
import re
p=Path('apps-script/Kod.js'); s=p.read_text(encoding='utf-8')
s=s.replace("const APP_VERSION = 'V44_UNIFIED_SEARCH_FAVORITES_SPEED_2026-09-16';","const APP_VERSION = 'V46_PERFORMANCE_ARCHITECTURE_2026-09-16';",1)
s=s.replace("""function searchSheet(sheetName,status,idHeader,filters,mapper){
  var s=getSheet(sheetName);if(s.getLastRow()<2)return[];var h=getHeaders(s),v=s.getDataRange().getValues(),out=[];filters=filters||{};
  v.slice(1).forEach(function(r){var o=rowObject(h,r);""","""function searchSheet(sheetName,status,idHeader,filters,mapper){
  var rows=perfReadRows_(sheetName);if(!rows.length)return[];var out=[];filters=filters||{};
  rows.forEach(function(o){""",1)
s=s.replace("""    var s=getSheet('Объявления соискателей'),rows=[];
              if(!s||s.getLastRow()<2)return[];
              var h=getHeaders(s),v=s.getDataRange().getValues();
              for(var i=1;i<v.length;i++)rows.push(rowObject(h,v[i]));
              var ps=getSheet('Соискатели'),profiles={};
              try{
                if(ps&&ps.getLastRow()>1){
                  var ph=getHeaders(ps),pv=ps.getDataRange().getValues();
                  for(var j=1;j<pv.length;j++){
                    var pr=rowObject(ph,pv[j]);
                    if(pr.profile_id)profiles[String(pr.profile_id)]=pr;
                  }
                }
              }catch(profileErr){console.warn('Candidate profile index skipped:',profileErr);}""","""    var perf=perfReadRowsBatch_(['Объявления соискателей','Соискатели']);
              var rows=perf['Объявления соискателей']||[],profiles={};
              try{(perf['Соискатели']||[]).forEach(function(pr){if(pr.profile_id)profiles[String(pr.profile_id)]=pr;});}catch(profileErr){console.warn('Candidate profile index skipped:',profileErr);}""",1)
s=s.replace("""      var fs=getSheet('Объявления соискателей');
                if(!fs||fs.getLastRow()<2)return[];
                var fh=getHeaders(fs),fv=fs.getDataRange().getValues(),fallback=[];
                for(var k=1;k<fv.length;k++){
                  var o=rowObject(fh,fv[k]);""","""      var fallbackRows=perfReadRows_('Объявления соискателей'),fallback=[];
                if(!fallbackRows.length)return[];
                for(var k=0;k<fallbackRows.length;k++){
                  var o=fallbackRows[k];""",1)
s=s.replace("""function crossSearchSheetV2_(sheetName,status,idHeader,query,filters,mapper,kind){filters=filters||{};query=String(query||'').trim();if(!query)return[];var rel=crossRelationProfile_(query),s=getSheet(sheetName);if(!s||s.getLastRow()<2)return[];var h=getHeaders(s),v=s.getDataRange().getValues(),out=[];v.slice(1).forEach(function(r){var o=rowObject(h,r);""","""function crossSearchSheetV2_(sheetName,status,idHeader,query,filters,mapper,kind){filters=filters||{};query=String(query||'').trim();if(!query)return[];var rel=crossRelationProfile_(query),rows=perfReadRows_(sheetName);if(!rows.length)return[];var out=[];rows.forEach(function(o){""",1)
s=s.replace("key='CROSS_V45_'+","key='CROSS_V46_'+",1)
s=re.sub(r"var primary=\[\],secondary=\[\],secondaryType='',pf=Object\.assign\(\{\},f,\{query:q\}\);.*?else\{primary=crossSearchRequestsV2_\(q,pf\);secondary=crossSearchVacanciesV2_\(q,pf\);secondaryType='vacancies';\}","""var primary=[],secondary=[],secondaryType='',pf=Object.assign({},f,{query:q});
  if(mode==='candidates'){perfReadRowsBatch_(['Объявления соискателей','Бригады']);primary=crossSearchCandidatesV2_(q,pf);secondary=crossSearchBrigadesV2_(q,pf);secondaryType='brigades';}
  else if(mode==='brigades'){perfReadRowsBatch_(['Бригады','Объявления соискателей']);primary=crossSearchBrigadesV2_(q,pf);secondary=crossSearchCandidatesV2_(q,pf);secondaryType='candidates';}
  else if(mode==='vacancies'){perfReadRowsBatch_(['Вакансии','Ищу бригаду']);primary=crossSearchVacanciesV2_(q,pf);secondary=crossSearchRequestsV2_(q,pf);secondaryType='brigadeRequests';}
  else{perfReadRowsBatch_(['Ищу бригаду','Вакансии']);primary=crossSearchRequestsV2_(q,pf);secondary=crossSearchVacanciesV2_(q,pf);secondaryType='vacancies';}""",s,count=1,flags=re.S)
perf=r'''// V46 PERFORMANCE ARCHITECTURE
var PERF_ROWS_CACHE_PREFIX_='PERF_ROWS_V1_';
var PERF_ROWS_CACHE_TTL_=240;
var PERF_ROWS_CHUNK_SIZE_=70000;
var PERF_DATE_HEADERS_={'Дата создания':1,'Дата обновления':1,'Дата публикации':1,'Дата готовности к работе':1,'Дата начала':1,'Дата обновления профиля':1,'Дата согласия':1,'Дата':1,'Дата открытия':1,'Последнее открытие':1};
function perfSearchVersion_(){try{return String(PropertiesService.getScriptProperties().getProperty('SEARCH_CACHE_VERSION')||'1');}catch(e){return '1';}}
function perfRowsCacheBase_(sheetName){return PERF_ROWS_CACHE_PREFIX_+perfSearchVersion_()+'_'+Utilities.base64EncodeWebSafe(String(sheetName||''));}
function perfRowsChunkKey_(base,i){return base+'_'+String(i);}
function perfDateValue_(v){if(v===null||v===undefined||v==='')return v;if(Object.prototype.toString.call(v)==='[object Date]')return v;if(typeof v==='number'&&isFinite(v)&&v>20000&&v<100000)return new Date(Math.round((v-25569)*86400000));return v;}
function perfRowsFromValues_(values){values=Array.isArray(values)?values:[];if(!values.length)return[];var h=(values[0]||[]).map(function(x){return String(x||'');}),out=[];for(var i=1;i<values.length;i++){var row=values[i]||[],o={};h.forEach(function(k,j){if(!k)return;var v=row[j];if(PERF_DATE_HEADERS_[k])v=perfDateValue_(v);o[k]=v===undefined?'':v;});out.push(o);}return out;}
function perfReadCachedRows_(sheetName){var base=perfRowsCacheBase_(sheetName),cache=CacheService.getScriptCache();try{var meta=cache.get(base+'_meta');if(!meta)return null;var m=JSON.parse(meta),keys=[];for(var i=0;i<Number(m.chunks||0);i++)keys.push(perfRowsChunkKey_(base,i));if(!keys.length)return[];var parts=cache.getAll(keys),raw='';for(var j=0;j<keys.length;j++){if(parts[keys[j]]===undefined)return null;raw+=parts[keys[j]];}var parsed=JSON.parse(raw);return Array.isArray(parsed)?parsed:null;}catch(e){return null;}}
function perfWriteCachedRows_(sheetName,rows){var base=perfRowsCacheBase_(sheetName),raw=JSON.stringify(rows||[]),cache=CacheService.getScriptCache();try{var oldMeta=cache.get(base+'_meta'),oldChunks=0;try{oldChunks=Number(JSON.parse(oldMeta||'{}').chunks||0);}catch(e){}var values={},chunks=0;for(var i=0;i<raw.length;i+=PERF_ROWS_CHUNK_SIZE_){values[perfRowsChunkKey_(base,chunks)]=raw.slice(i,i+PERF_ROWS_CHUNK_SIZE_);chunks++;}if(!chunks){values[perfRowsChunkKey_(base,0)]='[]';chunks=1;}values[base+'_meta']=JSON.stringify({chunks:chunks,updatedAt:Date.now()});cache.putAll(values,PERF_ROWS_CACHE_TTL_);if(oldChunks>chunks){var remove=[];for(var j=chunks;j<oldChunks;j++)remove.push(perfRowsChunkKey_(base,j));if(remove.length)cache.removeAll(remove);}}catch(e){try{cache.put(base+'_meta',JSON.stringify({chunks:0}),30);}catch(ignore){}}}
function perfReadRowsFallback_(sheetName){var sh=getSheet(sheetName);if(!sh||sh.getLastRow()<2)return[];var h=getHeaders(sh),v=sh.getDataRange().getValues(),out=[];for(var i=1;i<v.length;i++)out.push(rowObject(h,v[i]));return out;}
function perfReadRowsBatch_(sheetNames){var names=[];(sheetNames||[]).forEach(function(n){n=String(n||'').trim();if(n&&names.indexOf(n)<0)names.push(n);});if(!names.length)return{};var out={},missing=[];names.forEach(function(name){var hit=perfReadCachedRows_(name);if(hit!==null)out[name]=hit;else missing.push(name);});if(!missing.length)return out;try{if(typeof Sheets==='undefined'||!Sheets.Spreadsheets||!Sheets.Spreadsheets.Values)throw new Error('Sheets Advanced Service unavailable');var ranges=missing.map(function(name){return "'"+String(name).replace(/'/g,"''")+"'!A:ZZ";});var resp=Sheets.Spreadsheets.Values.batchGet(SPREADSHEET_ID,{ranges:ranges,majorDimension:'ROWS',valueRenderOption:'UNFORMATTED_VALUE'}),vr=resp&&resp.valueRanges||[];missing.forEach(function(name,idx){var rows=perfRowsFromValues_(vr[idx]&&vr[idx].values||[]);out[name]=rows;perfWriteCachedRows_(name,rows);});return out;}catch(apiErr){console.warn('V46 Sheets API batchGet fallback:',apiErr&&apiErr.message?apiErr.message:apiErr);missing.forEach(function(name){var rows=perfReadRowsFallback_(name);out[name]=rows;perfWriteCachedRows_(name,rows);});return out;}}
function perfReadRows_(sheetName){return perfReadRowsBatch_([sheetName])[String(sheetName||'')]||[];}
'''
s += '\n'+perf
p.write_text(s,encoding='utf-8')

ip=Path('index.html'); h=ip.read_text(encoding='utf-8')
h=h.replace("async function runSearch(timeoutMs=12000){","var searchPrefetchTimer_=null,searchPrefetchSeq_=0;\nfunction scheduleSearchPrefetch_(){if(window.similarSearchMode)return;var input=document.getElementById('smartSearchInput'),q=String(input?.value||'').trim();if(q.length<2)return;clearTimeout(searchPrefetchTimer_);var seq=++searchPrefetchSeq_;searchPrefetchTimer_=setTimeout(function(){if(seq!==searchPrefetchSeq_||window.similarSearchMode)return;var filters=searchFilters(),cacheKey='robota_czechia_search_'+currentSearchMode+'_'+JSON.stringify(filters);try{var raw=localStorage.getItem(cacheKey);if(raw){var old=JSON.parse(raw);if(old&&old.cross&&Date.now()-Number(old.ts||0)<900000)return;}}catch(e){}apiPost({action:'searchCrossMatches',filters:Object.assign({},filters,{mode:currentSearchMode})},15000,'background').then(function(r){if(!r||!r.ok||seq!==searchPrefetchSeq_)return;try{localStorage.setItem(cacheKey,JSON.stringify({cross:r.results||{primary:[],secondary:[],secondaryType:''},ts:Date.now()}));}catch(e){}}).catch(function(){});},420);}\nasync function runSearch(timeoutMs=12000){",1)
h=h.replace("__bootBind_('sfCategory','onchange',e=>{populateSearchProfessions(e.target.value,document.getElementById('smartSearchInput')?.value||'');});","__bootBind_('sfCategory','onchange',e=>{populateSearchProfessions(e.target.value,document.getElementById('smartSearchInput')?.value||'');scheduleSearchPrefetch_();});",1)
h=h.replace("ssi.oninput=()=>{renderSmartSuggestions('smartSearchInput','smartSearchSuggestions',document.getElementById('sfCategory')?.value||'',v=>{populateSearchProfessions(document.getElementById('sfCategory')?.value||'',v);document.getElementById('sfProfession').value=v;});};","ssi.oninput=()=>{renderSmartSuggestions('smartSearchInput','smartSearchSuggestions',document.getElementById('sfCategory')?.value||'',v=>{populateSearchProfessions(document.getElementById('sfCategory')?.value||'',v);document.getElementById('sfProfession').value=v;scheduleSearchPrefetch_();});scheduleSearchPrefetch_();};",1)
ip.write_text(h,encoding='utf-8')
PY
node --check apps-script/Kod.js
node --check apps-script/Performance.js
python3 - <<'PY'
from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
Path('/tmp/index-script.js').write_text('\n'.join(re.findall(r'<script>(.*?)</script>',s,re.S)))
PY
node --check /tmp/index-script.js

git config user.name 'trifonov8888-bot'
git config user.email 'trifonov88.88@gmail.com'
git add apps-script/Kod.js apps-script/Performance.js index.html
git commit -m 'feat: V46 performance architecture'
git push origin HEAD:main

npm install --global @google/clasp@3.4.1
printf '%s' "$CLASPRC_JSON" > "$HOME/.clasprc.json"
printf '{"scriptId":"%s"}\n' "$APPS_SCRIPT_ID" > apps-script/.clasp.json
cd apps-script
clasp push --force
clasp list-versions
clasp update-deployment "$APPS_SCRIPT_DEPLOYMENT_ID" --description "V46 Performance Architecture ${GITHUB_SHA::7}"
echo V46_DEPLOY_SUCCESS
