// PROFILE_FIXES_V4: Premium/file layer kept compatible; exact candidate announcement access preserved
// ============================================================
// ROBOTA CZECHIA — ФАЙЛЫ / PREMIUM ACCESS / PDF
// ============================================================

function premiumAccessSheet_(){
  var s=getSheet('Доступы');
  ensureHeaders(s,DB_HEADERS['Доступы']);
  return s;
}

function premiumPaymentSheet_(){
  var s=getSheet('Платежи');
  ensureHeaders(s,DB_HEADERS['Платежи']);
  return s;
}

function findCandidateAccess_(buyerUserId,announcementId){
  var uid=String(buyerUserId||''),aid=String(announcementId||'');
  if(!uid||!aid)return null;
  var ck='PREMIUM_ACCESS_'+uid+'_'+aid;
  try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}
  var rows=rowsByColumnValueFast_('Доступы','buyer_user_id',uid);
  for(var i=0;i<rows.length;i++){
    if(String(rows[i].announcement_id||'')===aid && String(rows[i]['Статус оплаты']||'')==='Оплачен' && String(rows[i]['Доступ']||'')==='Открыт'){try{CacheService.getScriptCache().put(ck,JSON.stringify(rows[i]),300);}catch(e2){}return rows[i];}
  }
  return null;
}

function candidateAnnouncementForPremium_(announcementId){var aid=canonicalCandidateAnnouncementId_(announcementId);if(!aid)return null;var ck='PREMIUM_RAW_CANDIDATE_'+aid;try{var rawHit=CacheService.getScriptCache().get(ck);if(rawHit)return JSON.parse(rawHit);}catch(e){}var pck='PREMIUM_PACK_'+aid;try{var hit=CacheService.getScriptCache().get(pck);if(hit)return JSON.parse(hit);}catch(e1){}var pub=getPublicEntityPersistent_('candidateAnnouncement',aid);if(pub&&pub.announcement){var prof=getById('Соискатели',String(pub.announcement.profile_id||''),'profile_id');if(prof){var out0={announcement:pub.announcement,profile:prof};try{CacheService.getScriptCache().put(pck,JSON.stringify(out0),300);CacheService.getScriptCache().put(ck,JSON.stringify(out0),600);}catch(e0){}return out0;}}var a=getById('Объявления соискателей',aid,'announcement_id');if(!a)return null;var profile=getById('Соискатели',String(a.profile_id||''),'profile_id');var out={announcement:a,profile:profile};try{CacheService.getScriptCache().put(pck,JSON.stringify(out),300);CacheService.getScriptCache().put(ck,JSON.stringify(out),600);}catch(e2){}try{cachePublicEntityPersistent_('candidateAnnouncement',aid,{announcement:a,profile:publicCandidateAnnouncement_(a,profile||{},false)});}catch(e3){}return out;}

function sendPremiumPdfToTelegram_(buyerUserId,pdfUrl,announcement){
  var uid=String(buyerUserId||'').trim(),url=String(pdfUrl||'').trim(),aid=String(announcement&&announcement.announcement_id||'').trim();
  if(!uid||!url||!aid)return false;
  var key='PREMIUM_PDF_SENT_'+uid+'_'+aid;
  try{if(PropertiesService.getScriptProperties().getProperty(key)==='1')return true;}catch(e){}
  try{
    var title=String((announcement&&announcement['Желаемая должность'])||(announcement&&announcement['Профессия'])||'Профиль кандидата');
    var r=telegramRequest('sendDocument',{chat_id:uid,document:directDriveDownloadUrl_(url),caption:'📄 Premium-профиль кандидата\n'+title+'\nID: '+aid});
    if(r&&r.ok){try{PropertiesService.getScriptProperties().setProperty(key,'1');}catch(e){}return true;}
  }catch(e){console.warn('Не удалось отправить Premium PDF в Telegram:',e);}
  return false;
}

function findBrigadeAccess_(buyerUserId,brigadeId){
  var uid=String(buyerUserId||''),bid=String(brigadeId||'');if(!uid||!bid)return null;
  var ck='PREMIUM_BRIGADE_ACCESS_'+uid+'_'+bid;
  try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}
  var rows=rowsByColumnValueFast_('Доступы','buyer_user_id',uid);
  for(var i=0;i<rows.length;i++){
    if(String(rows[i].brigade_id||'')===bid && String(rows[i]['Статус оплаты']||'')==='Оплачен' && String(rows[i]['Доступ']||'')==='Открыт' && String(rows[i]['Тип доступа']||'')==='brigade_announcement'){
      try{CacheService.getScriptCache().put(ck,JSON.stringify(rows[i]),300);}catch(e2){}return rows[i];
    }
  }
  return null;
}
function brigadeForPremium_(brigadeId){var bid=String(brigadeId||'');if(!bid)return null;try{var pc=getPublicEntityPersistent_('brigade',bid);if(pc){var raw=pc.raw||pc;return raw;}}catch(e){}var o=getById('Бригады',bid,'brigade_id');if(o){try{cachePublicEntityPersistent_('brigade',bid,publicBrigade_(o));}catch(e2){}return o;}return null;}
function getBrigadePremium(d){
  var uid=String(d.userId||d.user_id||''),bid=String(d.brigadeId||d.brigade_id||'');
  try{var bh=CacheService.getScriptCache().get('PREMIUM_BRIGADE_VIEW_'+uid+'_'+bid);if(bh){var bo=JSON.parse(bh);if(bo&&bo.ok)return bo;}}catch(e0){}
  if(!uid||!bid)return{ok:false,error:'Не указан пользователь или ID бригады'};
  var brigade=brigadeForPremium_(bid);if(!brigade)return{ok:false,error:'Бригада не найдена'};
  if(uid===String(ADMIN_ID))return{ok:true,test:true,brigade:brigade};
  var access=findBrigadeAccess_(uid,bid);
  if(!access){var pkg=consumePremiumPackage_(uid);if(pkg){var grant=grantBrigadeAccess({userId:ADMIN_ID,buyerUserId:uid,brigadeId:bid,paymentId:pkg.payment_id,packageId:pkg.package_id,cost:pkg.cost,currency:pkg.currency});if(grant&&grant.ok)access=findBrigadeAccess_(uid,bid);}}
  if(!access)return{ok:false,requiresPayment:true,brigade_id:bid,error:'Доступ к контактам этой бригады ещё не открыт'};
  var out={ok:true,access:access,brigade:brigade};try{CacheService.getScriptCache().put('PREMIUM_BRIGADE_VIEW_'+uid+'_'+bid,JSON.stringify(out),120);}catch(e4){}return out;
}
function grantBrigadeAccess(d){
  var caller=String(d.userId||d.user_id||''),token=String(d.token||''),configured=String(PropertiesService.getScriptProperties().getProperty('PREMIUM_ACCESS_TOKEN')||'');
  if(caller!==String(ADMIN_ID)&&(!configured||token!==configured))return{ok:false,error:'Нет прав на выдачу Premium-доступа'};
  var buyer=String(d.buyerUserId||d.buyer_user_id||''),bid=String(d.brigadeId||d.brigade_id||'');if(!buyer||!bid)return{ok:false,error:'Не указан покупатель или бригада'};
  var brigade=brigadeForPremium_(bid);if(!brigade)return{ok:false,error:'Бригада не найдена'};
  var existing=findBrigadeAccess_(buyer,bid);
  if(existing){updateAccessRow_(existing.access_id,{'Статус оплаты':'Оплачен','Доступ':'Открыт','Последнее открытие':new Date()});return{ok:true,already:true,access_id:existing.access_id};}
  var employerRows=rowsByColumnValueFast_('Работодатели','user_id',buyer),employer=employerRows.length?employerRows[0]:null;
  var accessId=generateUniqueEntityId('ACC','Доступы'),now=new Date();
  var access={access_id:accessId,buyer_user_id:buyer,employer_id:employer?employer.employer_id:(d.employerId||''),announcement_id:'',profile_id:'',brigade_id:bid,Дата:now,Стоимость:d.cost||d.amount||'','Валюта':d.currency||'CZK','Статус оплаты':'Оплачен','Доступ':'Открыт','Тип доступа':'brigade_announcement',payment_id:d.paymentId||d.payment_id||'',package_id:d.packageId||d.package_id||'','Дата открытия':now,'PDF URL':'','Последнее открытие':now};
  var s=premiumAccessSheet_(),h=getHeaders(s);s.appendRow(h.map(function(k){return access[k]!==undefined?access[k]:'';}));
  try{CacheService.getScriptCache().put('PREMIUM_BRIGADE_ACCESS_'+buyer+'_'+bid,JSON.stringify(access),300);}catch(e3){}
  return{ok:true,access_id:accessId,brigade_id:bid};
}

function getCandidatePremiumAnnouncement(d){
  var uid=String(d.userId||d.user_id||''),aid=String(d.announcementId||d.announcement_id||'');
  try{var ph=CacheService.getScriptCache().get('PREMIUM_VIEW_'+uid+'_'+aid);if(ph){var po=JSON.parse(ph);if(po&&po.ok)return po;}}catch(e0){}
  if(!uid||!aid)return{ok:false,error:'Не указан пользователь или ID объявления'};
  var pack=candidateAnnouncementForPremium_(aid);
  if(!pack)return{ok:false,error:'Объявление не найдено'};
  if(uid===String(ADMIN_ID))return{ok:true,test:true,announcement:pack.announcement,profile:publicCandidate(pack.profile,true),pdfUrl:''};
  var access=findCandidateAccess_(uid,aid);
  if(!access){var pkg=consumePremiumPackage_(uid);if(pkg){var grant=grantCandidateAnnouncementAccess({userId:ADMIN_ID,buyerUserId:uid,announcementId:aid,paymentId:pkg.payment_id,packageId:pkg.package_id,cost:pkg.cost,currency:pkg.currency});if(grant&&grant.ok)access=findCandidateAccess_(uid,aid);}}
  if(!access)return{ok:false,requiresPayment:true,announcement_id:aid,error:'Доступ к этому объявлению ещё не открыт'};
  var pdf=String(access['PDF URL']||''),premiumOut={ok:true,access:access,announcement:pack.announcement,profile:publicCandidate(pack.profile,true),pdfUrl:pdf,pdfSent:false};
  try{CacheService.getScriptCache().put('PREMIUM_VIEW_'+uid+'_'+aid,JSON.stringify(premiumOut),120);}catch(e4){}
  return premiumOut;
}

function getCandidatePremiumPdf(d){
  var uid=String(d.userId||d.user_id||''),aid=String(d.announcementId||d.announcement_id||'');
  if(!uid||!aid)return{ok:false,error:'Не указан пользователь или ID объявления'};
  var pack=candidateAnnouncementForPremium_(aid);if(!pack)return{ok:false,error:'Объявление не найдено'};
  if(uid===String(ADMIN_ID)){
    var key='PREMIUM_PREVIEW_PDF_'+aid,pdf='';
    try{pdf=String(CacheService.getScriptCache().get(key)||'');}catch(e){}
    if(!pdf){pdf=generateCandidateProfilePdf_(pack.announcement,pack.profile,{access_id:'preview-'+aid});try{CacheService.getScriptCache().put(key,pdf,21600);}catch(e){}}
    return{ok:true,pdfUrl:pdf};
  }
  var access=findCandidateAccess_(uid,aid);if(!access)return{ok:false,error:'Доступ к этому объявлению ещё не открыт'};
  var pdf=String(access['PDF URL']||'');
  if(!pdf){pdf=generateCandidateProfilePdf_(pack.announcement,pack.profile,access);var updatedAccess=updateAccessRow_(access.access_id,{'PDF URL':pdf,'Последнее открытие':new Date()});if(updatedAccess)access=updatedAccess;try{CacheService.getScriptCache().put('PREMIUM_ACCESS_'+uid+'_'+aid,JSON.stringify(access),300);}catch(e2){}}
  return{ok:true,pdfUrl:pdf};
}

function grantCandidateAnnouncementAccess(d){
  var caller=String(d.userId||d.user_id||'');
  var token=String(d.token||'');
  var configured=String(PropertiesService.getScriptProperties().getProperty('PREMIUM_ACCESS_TOKEN')||'');
  if(caller!==String(ADMIN_ID) && (!configured||token!==configured))return{ok:false,error:'Нет прав на выдачу Premium-доступа'};
  var buyer=String(d.buyerUserId||d.buyer_user_id||'');
  var aid=String(d.announcementId||d.announcement_id||'');
  if(!buyer||!aid)return{ok:false,error:'Не указан покупатель или объявление'};
  var pack=candidateAnnouncementForPremium_(aid);if(!pack)return{ok:false,error:'Объявление не найдено'};
  var existing=findCandidateAccess_(buyer,aid);
  if(existing){
    var pdf=String(existing['PDF URL']||'');
    updateAccessRow_(existing.access_id,{'Статус оплаты':'Оплачен','Доступ':'Открыт','Последнее открытие':new Date()});
    try{CacheService.getScriptCache().put('PREMIUM_ACCESS_'+buyer+'_'+aid,JSON.stringify(existing),300);}catch(e2){}
    return{ok:true,already:true,access_id:existing.access_id,pdfUrl:pdf};
  }
  var employerRows=rowsByColumnValueFast_('Работодатели','user_id',buyer),employer=employerRows.length?employerRows[0]:null;
  var accessId=generateUniqueEntityId('ACC','Доступы'),now=new Date();
  var access={access_id:accessId,buyer_user_id:buyer,employer_id:employer?employer.employer_id:(d.employerId||''),announcement_id:aid,profile_id:pack.announcement.profile_id||'',brigade_id:'',Дата:now,Стоимость:d.cost||d.amount||'','Валюта':d.currency||'CZK','Статус оплаты':'Оплачен','Доступ':'Открыт','Тип доступа':'candidate_announcement',payment_id:d.paymentId||d.payment_id||'',package_id:d.packageId||d.package_id||'','Дата открытия':now,'PDF URL':'','Последнее открытие':now};
  var s=premiumAccessSheet_(),h=getHeaders(s);s.appendRow(h.map(function(k){return access[k]!==undefined?access[k]:'';}));
  // PDF is deliberately NOT generated here. It is generated only when the user
  // presses "Открыть PDF с контактами". This removes the main first-open delay.
  try{CacheService.getScriptCache().put('PREMIUM_ACCESS_'+buyer+'_'+aid,JSON.stringify(access),300);}catch(e3){}
  return{ok:true,access_id:accessId,pdfUrl:'',announcement_id:aid};
}

function registerPremiumPackage(d){
  var caller=String(d.userId||d.user_id||''),token=String(d.token||''),configured=String(PropertiesService.getScriptProperties().getProperty('PREMIUM_ACCESS_TOKEN')||'');
  if(caller!==String(ADMIN_ID)&&(!configured||token!==configured))return{ok:false,error:'Нет прав на регистрацию Premium-пакета'};
  var buyer=String(d.buyerUserId||d.buyer_user_id||''),count=Math.max(1,parseInt(d.count||d.quantity||d.contacts||1,10)||1);
  if(!buyer)return{ok:false,error:'Не указан покупатель'};
  var s=premiumPaymentSheet_(),h=getHeaders(s),pid=String(d.paymentId||d.payment_id||generateUniqueEntityId('PAY','Платежи')),packageId=String(d.packageId||d.package_id||('PKG-'+pid));
  var map={payment_id:pid,user_id:buyer,employer_id:d.employerId||'','Тип покупки':'Premium кандидаты','Количество контактов':count,'Осталось контактов':count,'Сумма':d.amount||d.cost||'','Валюта':d.currency||'CZK','Статус':'Оплачен','Дата':new Date(),'ID транзакции':d.transactionId||d.transaction_id||'',package_id:packageId};
  s.appendRow(h.map(function(k){return map[k]!==undefined?map[k]:'';}));return{ok:true,payment_id:pid,package_id:packageId,remaining:count};
}
function consumePremiumPackage_(buyerUserId){
  var uid=String(buyerUserId||'');if(!uid)return null;var lock=LockService.getScriptLock();try{lock.waitLock(5000);var rows=rowsByColumnValueFast_('Платежи','user_id',uid);rows.sort(function(a,b){return new Date(a['Дата']||0)-new Date(b['Дата']||0);});for(var i=0;i<rows.length;i++){var r=rows[i],left=parseInt(r['Осталось контактов']||0,10)||0;if(String(r['Статус']||'')==='Оплачен'&&left>0){var left2=left-1;setPaymentRemaining_(r.payment_id,left2);return {payment_id:r.payment_id,package_id:r.package_id||'',cost:r['Сумма'],currency:r['Валюта']||'CZK'};}}return null;}catch(e){return null;}finally{try{lock.releaseLock();}catch(e){}}
}
function setPaymentRemaining_(paymentId,left){var s=getSheet('Платежи'),h=getHeaders(s),row=findRowByIdFast(s,paymentId,'payment_id');if(row&&h.indexOf('Осталось контактов')>=0)s.getRange(row,h.indexOf('Осталось контактов')+1).setValue(Math.max(0,left));}
function updateAccessRow_(accessId,fields){
  return setRowFields('Доступы',accessId,'access_id',fields);
}

function getMyPremiumCandidates(d){
  var uid=String(d.userId||d.user_id||'');
  if(!uid)return{ok:false,error:'Не указан пользователь'};
  var rows=rowsByColumnValueFast_('Доступы','buyer_user_id',uid).filter(function(x){return String(x['Статус оплаты']||'')==='Оплачен'&&String(x['Доступ']||'')==='Открыт'&&String(x['Тип доступа']||'')==='candidate_announcement';});
  rows.sort(function(a,b){return new Date(b['Последнее открытие']||b['Дата открытия']||b['Дата']||0)-new Date(a['Последнее открытие']||a['Дата открытия']||a['Дата']||0);});
  return{ok:true,items:rows.map(function(x){var pack=candidateAnnouncementForPremium_(x.announcement_id);return {access_id:x.access_id,announcement_id:x.announcement_id,profile_id:x.profile_id,openedAt:x['Дата открытия'],lastOpened:x['Последнее открытие'],pdfUrl:x['PDF URL']||'',announcement:pack?pack.announcement:null,profile:pack&&pack.profile?publicCandidate(pack.profile,true):null};})};
}

function favoriteEntitySpec_(type){
  type=String(type||'');
  if(type==='candidate')return{sheet:'Объявления соискателей',idHeader:'announcement_id',field:'announcement_id'};
  if(type==='vacancy')return{sheet:'Вакансии',idHeader:'ID',field:'vacancy_id'};
  if(type==='brigade')return{sheet:'Бригады',idHeader:'brigade_id',field:'brigade_id'};
  if(type==='request')return{sheet:'Ищу бригаду',idHeader:'brigade_request_id',field:'brigade_request_id'};
  return null;
}
function getFavoriteItemData_(type,id){
  var spec=favoriteEntitySpec_(type);if(!spec)return null;
  var raw=getById(spec.sheet,String(id||''),spec.idHeader);if(!raw)return null;
  if(type==='candidate'){
    var p=getById('Соискатели',String(raw.profile_id||''),'profile_id')||{};
    return publicCandidateAnnouncement_(raw,p,false);
  }
  if(type==='vacancy')return normalizeDetailForFavorite_(raw,'vacancy');
  if(type==='brigade')return normalizeDetailForFavorite_(raw,'brigade');
  return normalizeDetailForFavorite_(raw,'request');
}
function normalizeDetailForFavorite_(o,type){
  o=o||{};
  if(type==='vacancy')return{id:o.ID,title:o['Название вакансии']||o['Профессия'],profession:o['Профессия'],category:o['Категория'],city:o['Город'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты'],contact:o['Контакт'],telegram:o['Telegram']};
  if(type==='brigade')return{brigade_id:o.brigade_id,name:o['Название бригады'],category:o['Категория'],specialization:o['Специализация'],professions:o['Профессии'],city:o['Город'],brigadeSize:o['Количество человек']};
  return{brigade_request_id:o.brigade_request_id,profession:o['Профессия'],category:o['Категория'],city:o['Город'],brigadeSize:o['Количество человек'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты']};
}
function favoriteCacheKey_(uid){return 'FAVORITES_V2_'+String(uid||'');}
function clearFavoriteCache_(uid){try{CacheService.getScriptCache().remove(favoriteCacheKey_(uid));}catch(e){}}
function getMyFavorites(d){
  var uid=String(d.userId||d.user_id||'').trim();if(!uid)return{ok:false,error:'Не указан пользователь'};
  try{var hit=CacheService.getScriptCache().get(favoriteCacheKey_(uid));if(hit)return JSON.parse(hit);}catch(e){}
  var s=getSheet('Избранное');ensureHeaders(s,DB_HEADERS['Избранное']);
  var rows=rowsByColumnValueFast_('Избранное','user_id',uid).filter(function(x){return String(x['Статус']||'')==='Активно';});
  rows.sort(function(a,b){return new Date(b['Дата']||0)-new Date(a['Дата']||0);});
  var needed={candidate:{},vacancy:{},brigade:{},request:{}},seen={};
  rows.forEach(function(x){
    var type=x.announcement_id?'candidate':x.vacancy_id?'vacancy':x.brigade_id?'brigade':x.brigade_request_id?'request':'';
    var id=x.announcement_id||x.vacancy_id||x.brigade_id||x.brigade_request_id;if(!type||!id)return;
    var key=type+':'+String(id);if(seen[key])return;seen[key]=1;needed[type][String(id)]=true;
  });
  // Read each source sheet at most once. The previous implementation performed
  // one full Sheets lookup per saved item, which became very slow with many saves.
  var sourceMaps={candidate:{},vacancy:{},brigade:{},request:{}};
  var sourceSpecs={candidate:['Объявления соискателей','announcement_id'],vacancy:['Вакансии','ID'],brigade:['Бригады','brigade_id'],request:['Ищу бригаду','brigade_request_id']};
  Object.keys(sourceSpecs).forEach(function(type){
    var ids=Object.keys(needed[type]);if(!ids.length)return;
    var ss=getSheet(sourceSpecs[type][0]);if(!ss||ss.getLastRow()<2)return;
    var hh=getHeaders(ss),vv=ss.getDataRange().getValues(),col=sourceSpecs[type][1];
    for(var i=1;i<vv.length;i++){
      var o=rowObject(hh,vv[i]),id=String(o[col]||'');if(id&&needed[type][id])sourceMaps[type][id]=o;
    }
  });
  var items=[];
  rows.forEach(function(x){
    var type=x.announcement_id?'candidate':x.vacancy_id?'vacancy':x.brigade_id?'brigade':x.brigade_request_id?'request':'';
    var id=String(x.announcement_id||x.vacancy_id||x.brigade_id||x.brigade_request_id||'');if(!type||!id)return;
    var source=sourceMaps[type][id];if(!source)return;
    items.push({type:type,favorite_id:x.favorite_id,announcement_id:x.announcement_id||'',vacancy_id:x.vacancy_id||'',brigade_id:x.brigade_id||'',brigade_request_id:x.brigade_request_id||'',savedAt:x['Дата']||'',data:favoritePreviewData_(type,source,id)});
  });
  var out={ok:true,items:items};try{CacheService.getScriptCache().put(favoriteCacheKey_(uid),JSON.stringify(out),60);}catch(e2){}
  return out;
}
function favoritePreviewData_(type,raw,id){
  raw=raw||{};id=String(id||'');
  if(type==='candidate'){
    var p=getById('Соискатели',String(raw.profile_id||''),'profile_id')||{};
    return publicCandidateAnnouncement_(raw,p,false);
  }
  if(type==='vacancy')return {id:id,title:raw['Название вакансии']||raw['Профессия'],profession:raw['Профессия'],category:raw['Категория'],city:raw['Город'],salaryFrom:raw['Зарплата от'],salaryTo:raw['Зарплата до'],salaryUnit:raw['Единица оплаты'],housing:raw['Жильё'],workType:raw['Тип работы'],employmentType:raw['Занятость'],schedule:raw['График'],languages:raw['Языки'],languageLevel:raw['Требования к языку']||raw['Уровень языка'],documents:raw['Документы'],experience:raw['Опыт'],drivingLicenses:raw['Водительские права'],licenseCategories:raw['Категории прав'],automobile:raw['Автомобиль'],qualification:raw['Квалификация'],skills:raw['Навыки'],readyDate:raw['Дата начала'],description:raw['Описание'],contactAvailable:true};
  if(type==='brigade')return publicBrigade_(raw);
  return {brigade_request_id:id,profession:raw['Профессия'],category:raw['Категория'],specialization:raw['Специализация'],workTypes:raw['Виды работ'],city:raw['Город'],brigadeSize:raw['Количество человек'],salaryFrom:raw['Зарплата от'],salaryTo:raw['Зарплата до'],salaryUnit:raw['Единица оплаты'],workType:raw['Тип работы'],employmentType:raw['Занятость'],schedule:raw['График'],housing:raw['Жильё'],languages:raw['Языки'],languageLevel:raw['Уровень языка'],documents:raw['Документы'],experience:raw['Опыт'],requirements:raw['Требования'],qualification:raw['Квалификация'],skills:raw['Навыки'],readyDate:raw['Дата начала'],description:raw['Описание'],contactAvailable:true};
}

function toggleFavorite(d){
  var uid=String(d.userId||d.user_id||'').trim(),type=String(d.entityType||d.type||'').trim(),id=String(d.entityId||d.id||'').trim(),on=d.enabled!==false;
  if(!uid||!type||!id)return{ok:false,error:'Не указан пользователь, тип или ID'};
  var spec=favoriteEntitySpec_(type);if(!spec)return{ok:false,error:'Неизвестный тип сохранения'};
  var s=getSheet('Избранное');ensureHeaders(s,DB_HEADERS['Избранное']);
  var rows=rowsByColumnValueFast_('Избранное','user_id',uid),matches=[];
  for(var i=0;i<rows.length;i++){if(String(rows[i][spec.field]||'')===id)matches.push(rows[i]);}
  // Deleting is an optimistic UI action. Do not make it wait for a lookup in the
  // source announcement sheet; the favorite row itself is enough to remove it.
  if(!on){
    if(matches.length){matches.forEach(function(row){setRowFields('Избранное',row.favorite_id,'favorite_id',{'Статус':'Удалено','Дата':new Date()});});clearFavoriteCache_(uid);}
    return{ok:true,favorite_id:matches.length?matches[0].favorite_id:'',enabled:false,type:type,entityId:id};
  }
  var source=getById(spec.sheet,id,spec.idHeader);if(!source)return{ok:false,error:'Объект не найден'};
  var preview=favoritePreviewData_(type,source,id);
  if(matches.length){matches.forEach(function(row){setRowFields('Избранное',row.favorite_id,'favorite_id',{'Статус':'Активно','Дата':new Date()});});clearFavoriteCache_(uid);return{ok:true,favorite_id:matches[0].favorite_id,enabled:true,type:type,entityId:id,data:preview};}
  var idFav=generateUniqueEntityId('FAV','Избранное'),h=getHeaders(s),map={favorite_id:idFav,user_id:uid,employer_id:'',profile_id:'',announcement_id:'',vacancy_id:'',brigade_id:'',brigade_request_id:'','Дата':new Date(),'Статус':'Активно'};
  map[spec.field]=id;s.appendRow(h.map(function(k){return map[k]!==undefined?map[k]:'';}));clearFavoriteCache_(uid);return{ok:true,favorite_id:idFav,enabled:true,type:type,entityId:id,data:preview};
}

function toggleFavoriteCandidateAnnouncement(d){
  var uid=String(d.userId||d.user_id||''),aid=String(d.announcementId||d.announcement_id||''),on=bool(d.enabled!==false);
  if(!uid||!aid)return{ok:false,error:'Не указан пользователь или объявление'};
  var s=getSheet('Избранное');ensureHeaders(s,DB_HEADERS['Избранное']);
  var rows=rowsByColumnValueFast_('Избранное','user_id',uid),found=null;
  for(var i=0;i<rows.length;i++)if(String(rows[i].announcement_id||'')===aid){found=rows[i];break;}
  if(found){setRowFields('Избранное',found.favorite_id,'favorite_id',{'Статус':on?'Активно':'Удалено'});clearFavoriteCache_(uid);return{ok:true,favorite_id:found.favorite_id,enabled:on};}
  if(!on)return{ok:true,enabled:false};
  var id=generateUniqueEntityId('FAV','Избранное'),er=rowsByColumnValueFast_('Работодатели','user_id',uid),e=er.length?er[0]:null,h=getHeaders(s),map={favorite_id:id,user_id:uid,employer_id:e?e.employer_id:'',profile_id:'',announcement_id:aid,vacancy_id:'',brigade_id:'',brigade_request_id:'','Дата':new Date(),'Статус':'Активно'};
  s.appendRow(h.map(function(k){return map[k]!==undefined?map[k]:'';}));clearFavoriteCache_(uid);return{ok:true,favorite_id:id,enabled:true};
}

function driveFileIdFromUrl_(url){
  var s=String(url||'');var m=s.match(/[?&]id=([A-Za-z0-9_-]+)/);if(m)return m[1];m=s.match(/\/d\/([A-Za-z0-9_-]+)/);return m?m[1]:'';
}
function directDriveDownloadUrl_(url){var id=driveFileIdFromUrl_(url);return id?'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id):String(url||'');}
function inlineImageData_(url){
  try{var u=String(url||'');if(!u)return '';var r=UrlFetchApp.fetch(u,{muteHttpExceptions:true,followRedirects:true});if(r.getResponseCode()<200||r.getResponseCode()>=300)return '';var b=r.getBlob();var type=b.getContentType()||'image/jpeg';return 'data:'+type+';base64,'+Utilities.base64Encode(b.getBytes());}catch(e){return '';}
}
function pdfEscape_(s){return String(s===null||s===undefined?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pdfLine_(label,value){if(value===undefined||value===null||String(value).trim()==='')return '';return '<div class="row"><div class="label">'+pdfEscape_(label)+'</div><div class="value">'+pdfEscape_(value)+'</div></div>';}
function generateCandidateProfilePdf_(announcement,profile,access){
  announcement=announcement||{};profile=profile||{};
  var photo=driveImageUrl(profile['Фото']||'');var photoData=inlineImageData_(photo);var resume=String(profile['Файл резюме']||'');var resumeUrl=directDriveDownloadUrl_(resume);
  var title=announcement['Желаемая должность']||announcement['Профессия']||'Соискатель';
  var salary='';if(announcement['Желаемая зарплата от']&&announcement['Желаемая зарплата до'])salary='от '+announcement['Желаемая зарплата от']+' до '+announcement['Желаемая зарплата до'];else if(announcement['Желаемая зарплата от'])salary='от '+announcement['Желаемая зарплата от'];else if(announcement['Желаемая зарплата до'])salary='до '+announcement['Желаемая зарплата до'];if(salary&&announcement['Единица оплаты'])salary+=' '+announcement['Единица оплаты'];
  var html='<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1f2937;margin:34px;font-size:11px} .top{display:flex;align-items:center;border-bottom:3px solid #1f2937;padding-bottom:18px;margin-bottom:18px}.photo{width:112px;height:112px;object-fit:cover;border-radius:12px;margin-right:20px}.name{font-size:24px;font-weight:700}.title{font-size:16px;margin-top:6px;color:#4b5563}.badge{display:inline-block;margin-top:9px;padding:5px 9px;border-radius:8px;background:#eef2f7}.section{font-size:14px;font-weight:700;margin:18px 0 8px;border-bottom:1px solid #d1d5db;padding-bottom:5px}.row{display:flex;padding:4px 0;break-inside:avoid}.label{width:170px;font-weight:700;color:#4b5563}.value{flex:1;white-space:pre-wrap;word-break:break-word}.about{white-space:pre-wrap;line-height:1.5}.resume{margin-top:16px;padding:11px;border:1px solid #d1d5db;border-radius:9px}.resume a{font-weight:700;text-decoration:none}.footer{margin-top:25px;padding-top:10px;border-top:1px solid #d1d5db;color:#6b7280;font-size:9px}</style></head><body>';
  html+='<div class="top">'+(photoData?'<img class="photo" src="'+photoData+'">':'')+'<div><div class="name">'+pdfEscape_(profile['Имя']||'Кандидат')+'</div><div class="title">'+pdfEscape_(title)+'</div><div class="badge">'+pdfEscape_(announcement['Категория']||'Ищу работу')+' · '+pdfEscape_(announcement['Город']||'')+'</div></div></div>';
  html+='<div class="section">📢 Конкретное объявление</div>'+pdfLine_('Профессия',announcement['Профессия'])+pdfLine_('Желаемая должность',announcement['Желаемая должность'])+pdfLine_('Город',announcement['Город'])+pdfLine_('Зарплата',salary)+pdfLine_('Формат',announcement['Тип работы']+(announcement['Тип занятости']?' · '+announcement['Тип занятости']:''))+pdfLine_('График',announcement['График'])+pdfLine_('Жильё',announcement['Жильё'])+pdfLine_('Опыт',announcement['Опыт'])+pdfLine_('Готовность',textFieldValue(announcement['Дата готовности к работе']))+pdfLine_('Квалификация',announcement['Квалификация'])+pdfLine_('Навыки',announcement['Навыки']);
  html+='<div class="section">👤 Постоянный профиль</div>'+pdfLine_('Имя',profile['Имя'])+pdfLine_('Образование',profile['Образование'])+pdfLine_('Профессии и навыки',profile['Профессии и навыки'])+pdfLine_('Языки',profile['Языки'])+pdfLine_('Документы',profile['Документы'])+pdfLine_('Водительские права',profile['Водительские права'])+pdfLine_('Категории прав',profile['Категории прав'])+pdfLine_('Автомобиль',profile['Автомобиль']);
  if(announcement['О себе'])html+='<div class="section">📝 О себе</div><div class="about">'+pdfEscape_(announcement['О себе'])+'</div>';
  if(resumeUrl)html+='<div class="resume">📄 <a href="'+pdfEscape_(resumeUrl)+'">Открыть прикреплённое резюме</a><br><span>Ссылка ведёт на оригинальный файл резюме кандидата.</span></div>';
  html+='<div class="section">📞 Контакты</div>'+pdfLine_('Телефон / контакт',profile['Контакт'])+pdfLine_('Telegram',profile['Telegram']);
  html+='<div class="footer">ROBOTA CZECHIA · Premium candidate profile · ID объявления: '+pdfEscape_(announcement.announcement_id||'')+'</div></body></html>';
  var blob=HtmlService.createHtmlOutput(html).getBlob().getAs(MimeType.PDF).setName('Robota_Czechia_'+String(title).replace(/[^A-Za-zА-Яа-я0-9_-]+/g,'_')+'_'+String(announcement.announcement_id||'candidate')+'.pdf');
  var folderName='Robota Czechia Premium PDFs',it=DriveApp.getFoldersByName(folderName),folder=it.hasNext()?it.next():DriveApp.createFolder(folderName),file=folder.createFile(blob);try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}return file.getUrl();
}


/* V46_1_BRIGADE_PREMIUM_RAW_OVERRIDE */
function brigadeForPremium_(brigadeId){var bid=String(brigadeId||'');if(!bid)return null;var ck='PREMIUM_RAW_BRIGADE_'+bid;try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}var o=getById('Бригады',bid,'brigade_id');if(o){try{CacheService.getScriptCache().put(ck,JSON.stringify(o),600);}catch(e2){}return o;}return null;}
function favoriteCacheKey_(uid){return 'FAVORITES_V46_1_'+String(uid||'');}



/* V46_1_FAVORITE_LOCK_OVERRIDE */
var __V46_1_originalToggleFavorite=toggleFavorite;
function toggleFavorite(d){var lock=LockService.getScriptLock();try{lock.waitLock(4000);}catch(e){return{ok:false,error:'Синхронизация избранного занята, повторите ещё раз'};}try{return __V46_1_originalToggleFavorite(d);}finally{try{lock.releaseLock();}catch(e){}}}

