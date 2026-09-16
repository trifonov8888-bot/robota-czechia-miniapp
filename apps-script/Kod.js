// PROFILE_FIXES_V4_BACKEND: candidate profile/announcement separation + profile normalization
// ============================================================
// ROBOTA CZECHIA — ОСНОВНОЙ BACKEND
// Архитектура: пользователи / работодатели / соискатели / бригады / вакансии
// ============================================================
const ADMIN_ID = '7993777623';
const SPREADSHEET_ID = '161JpI4285RErWhPLIHKaBTrzx3smGp4NWcZv8PduqV8';
const CHANNEL_USERNAME = '@rabota_czechia_24';
const JOB_SEEKERS_CHANNEL_USERNAME = '@rabota_czechia_jobs';
const BRIGADES_CHANNEL_USERNAME = '@RobotaCzechiaBrigady';
const BRIGADE_REQUESTS_CHANNEL_USERNAME = '@RobotaCzechiaBrigadySearch';
const MINIAPP_URL = 'https://trifonov8888-bot.github.io/robota-czechia-miniapp/';
const APP_VERSION = 'V44_UNIFIED_SEARCH_FAVORITES_SPEED_2026-09-16';
var DB_SPREADSHEET = null;

const CANDIDATE_ANNOUNCEMENT_HEADERS = ['announcement_id','profile_id','user_id','Дата создания','Дата обновления','Статус','Тип объявления','Имя','Желаемая должность','Профессия','Категория','Город','Вся Чехия','Желаемая зарплата от','Желаемая зарплата до','Единица оплаты','Тип работы','Тип занятости','График','Жильё','Языки','Уровень языка','Документы','Опыт','Водительские права','Категории прав','Автомобиль','Квалификация','Навыки','Дата готовности к работе','О себе','Контакт','Telegram','Telegram Message ID','Moderation Message ID','Сгенерированная картинка'];

const DB_HEADERS = {
  'Пользователи': ['user_id','Дата создания','Дата обновления','Telegram','Имя','Фамилия','Username','Роли','Статус'],
  'Работодатели': ['employer_id','user_id','Дата создания','Дата обновления','Компания','Контактное лицо','Телефон','Telegram','Email','Город','Описание','Сайт','Логотип','Статус'],
  'Соискатели': ['profile_id','user_id','Дата создания','Дата обновления','Статус','Имя','Образование','Профессии и навыки','Языки','Уровень языка','Документы','Водительские права','Категории прав','Автомобиль','Контакт','Telegram','Файл резюме','Фото','Дата обновления профиля','Контакты опубликованы','Согласие на публикацию контактов','Дата согласия','Доступ к контактам','Статус оплаты','Стоимость контакта','Telegram Message ID','Telegram ID','Moderation Message ID','Сгенерированная картинка'],
  'Бригады': ['brigade_id','user_id','Дата создания','Дата обновления','Статус','Название бригады','Категория','Специализация','Виды работ','Количество человек','Профессии','Город','Вся Чехия','Мобильность','Формат сотрудничества','Свой инструмент / техника','Языки','Уровень языка','Документы','Опыт','Транспорт','Навыки','Квалификация','Жильё','Дата готовности к работе','Описание','Контакт','Telegram','Фото','Файлы','Telegram Message ID','Moderation Message ID','Сгенерированная картинка'],
  'Ищу бригаду': ['brigade_request_id','employer_id','user_id','Дата создания','Дата обновления','Статус','Категория','Специализация','Виды работ','Профессия','Город','Вся Чехия','Количество человек','Зарплата от','Зарплата до','Единица оплаты','Тип работы','Занятость','График','Жильё','Языки','Уровень языка','Документы','Опыт','Требования','Квалификация','Навыки','Дата начала','Описание','Контакт','Telegram','Файлы','Telegram Message ID','Moderation Message ID','Сгенерированная картинка'],
  'Доступы': ['access_id','buyer_user_id','employer_id','announcement_id','profile_id','brigade_id','Дата','Стоимость','Валюта','Статус оплаты','Доступ','Тип доступа','payment_id','package_id','Дата открытия','PDF URL','Последнее открытие'],
  'Платежи': ['payment_id','user_id','employer_id','Тип покупки','Количество контактов','Осталось контактов','Сумма','Валюта','Статус','Дата','ID транзакции','package_id'],
  'Избранное': ['favorite_id','user_id','employer_id','profile_id','announcement_id','vacancy_id','brigade_id','brigade_request_id','Дата','Статус'],
  'Справочники': ['Тип','Значение','Группа']
};

function doGet(e) {
  try {
    return jsonResponse({ok:true,service:'ROBOTA CZECHIA',version:APP_VERSION,message:'API работает'});
  } catch (err) {
    return jsonResponse({ok:false,error:String(err && err.message ? err.message : err)});
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return jsonResponse({ok:false,error:'Нет данных'});
    var data = JSON.parse(e.postData.contents);
    if (data.action) return jsonResponse(handleApiAction(data));
    if (data.callback_query) {
      handleTelegramCallback(data.callback_query);
      // Telegram webhook delivery must receive a non-redirect response.
      // ContentService can produce a 302 through script.googleusercontent.com;
      // use HtmlService for Telegram callbacks only. Mini App API responses
      // continue to use JSON/ContentService below.
      return telegramWebhookResponse_('OK');
    }

    var item = normalizeSubmission(data);
    item = taxonomyNormalizeEntity_(item);
    validateSubmission(item);

    if(item.submissionId){
      var dup=PropertiesService.getScriptProperties().getProperty('SUBMISSION_'+item.submissionId);
      if(dup)return jsonResponse(JSON.parse(dup));
    }

    // Быстрый путь: сначала сразу сохраняем объявление и профиль в Sheets,
    // затем сразу отправляем модерацию. Time-based очередь больше НЕ участвует
    // в обычной отправке из Mini App: она давала задержку до следующего запуска
    // минутного триггера. Файлы кандидата/бригады загружаются уже после ответа.
    getOrCreateUser(item);
    if(item.type==='Предлагаю работу' || item.type==='Ищу бригаду'){
      item.employerId=item.employerId||getOrCreateEmployer(item).employer_id;
    }

    if(!item.id){
      if(item.type==='Ищу работу') item.id=generateUniqueEntityId('CAND','Объявления соискателей');
      else if(item.type==='Бригада ищет работу') item.id=generateUniqueEntityId('BRG','Бригады');
      else if(item.type==='Ищу бригаду') item.id=generateUniqueEntityId('BRQ','Ищу бригаду');
      else item.id=generateUniqueEntityId('VAC','Вакансии');
    }

    if(item.type==='Ищу работу'){
      // ID объявления и стабильный ID профиля — разные сущности.
      item.profileId=item.profileId||findExistingCandidateId(item.userId)||generateUniqueEntityId('CAND','Соискатели');
    }
    if(item.type==='Бригада ищет работу') item.brigadeId=item.brigadeId||item.id;
    if(item.type==='Ищу бригаду') item.brigadeRequestId=item.brigadeRequestId||item.id;

    saveSubmissionRecord(item,'На модерации');
    rememberUserEntityIndex_(item);

    var response={
      ok:true,
      message:'Объявление принято и отправлено на модерацию',
      id:item.id,
      profileId:item.profileId||'',
      type:item.type
    };
    var submissionProps={};
    if(item.submissionId)submissionProps['SUBMISSION_'+item.submissionId]=JSON.stringify(response);
    submissionProps['SUBMISSION_ENTITY_'+String(item.submissionId||item.id)]=JSON.stringify({
      id:item.type==='Ищу работу'?item.profileId:item.id,
      announcementId:item.id,
      profileId:item.profileId||'',
      userId:item.userId,
      type:item.type
    });
    PropertiesService.getScriptProperties().setProperties(submissionProps);

    // Не перечитываем всю таблицу после сохранения: item уже содержит все данные
    // для модерации. Это убирает ещё один тяжёлый проход по Sheets.
    var markup={inline_keyboard:[[{text:'✅ Опубликовать',callback_data:'approve:'+item.id},{text:'❌ Отклонить',callback_data:'reject:'+item.id}]]};
    var mr=sendTelegramMessage(ADMIN_ID,buildModerationText(item),markup);
    var mid=String(mr.result&&mr.result.message_id||'');
    if(!mid)throw new Error('Telegram не вернул message_id');
    // Не делаем дополнительный проход по Sheets ради Moderation Message ID: callback Telegram содержит исходное сообщение.

    return jsonResponse(response);
  } catch (err) {
    console.error(err);
    return jsonResponse({ok:false,error:String(err && err.message ? err.message : err)});
  }
}
function normalizeSubmission(data) {
  data=data||{};
  var u=data.telegramUser||data.user||{};
  var type=clean(data.announcementType||data.announcement_type||'Предлагаю работу');
  return {
    id: clean(data.id), type:type, announcementType:type,
    userId: clean(data.userId||data.user_id||data.telegramId||data.telegram_id||u.id),
    telegramId: clean(data.telegramId||data.telegram_id||u.id),
    telegramUsername: clean(data.telegramUsername||data.telegram_username||u.username),
    telegramFirstName: clean(data.telegramFirstName||data.telegram_first_name||u.first_name),
    telegramLastName: clean(data.telegramLastName||data.telegram_last_name||u.last_name),
    submissionId: clean(data.submissionId||data.submission_id),
    candidateName: clean(data.candidateName||data.name), employerId:clean(data.employerId||data.employer_id), profileId:clean(data.profileId||data.profile_id), brigadeId:clean(data.brigadeId||data.brigade_id), brigadeRequestId:clean(data.brigadeRequestId||data.brigade_request_id),
    title:clean(data.title), profession:clean(data.profession), category:clean(data.category), city:clean(data.city), otherCities:clean(data.otherCities||data.other_cities), allCzechia:bool(data.allCzechia||data.all_czechia||data.city==='Вся Чехия'),
    salaryFrom:clean(data.salaryFrom||data.salary_from), salaryTo:clean(data.salaryTo||data.salary_to), salaryUnit:clean(data.salaryUnit||data.salary_unit), salary:clean(data.salary),
    workType:clean(data.workType||data.work_type), employmentType:clean(data.employmentType||data.employment_type), schedule:clean(data.schedule), housing:clean(data.housing),
    languages:arr(data.languages), languageLevel:clean(data.languageLevel||data.language_level), documents:arr(data.documents),
    experience:clean(data.experience||data.experienceYears||data.experienceRequired||data.experience_required), experienceRequired:clean(data.experienceRequired||data.experience_required),
    drivingLicenses:clean(data.drivingLicenses||data.driverLicense||data.driver_license), licenseCategories:arr(data.licenseCategories||data.license_categories||data.drivingLicenseCategories), automobile:clean(data.automobile||data.carRequired||data.car_required),
    qualification:clean(data.qualification), skills:clean(data.skills), age18:bool(data.age18||data.age_18), readyDate:clean(data.readyDate||data.ready_date), description:clean(data.description), contact:clean(data.contact),
    brigadeSize:clean(data.brigadeSize||data.brigade_size||data.headcount||data.numberOfPeople), specialization:clean(data.specialization), professions:clean(data.professions), mobility:clean(data.mobility), transport:clean(data.transport),
    requirements:clean(data.requirements), candidatePhoto:data.candidatePhoto||data.photo||'', candidateResume:data.candidateResume||data.resume||'', generatedImage:data.generatedImage||data.generated_image||'', generatedImageUrl:clean(data.generatedImageUrl||data.generated_image_url), files:arr(data.files), photo:clean(data.photoUrl), resume:clean(data.resumeUrl),
    // Дата создания нового объявления определяется сервером, а не клиентом.
    createdAt:new Date(), source:clean(data.source)||'Mini App'
  };
}

function validateSubmission(x) {
  var common=['Предлагаю работу','Ищу работу','Бригада ищет работу','Ищу бригаду'];
  if(common.indexOf(x.type)<0) throw new Error('Неизвестный тип объявления');
  if(!x.userId) throw new Error('Не удалось определить Telegram ID пользователя');
  if(!x.category) throw new Error('Выберите категорию');
  if(!x.city) throw new Error('Выберите город');
  if(x.type==='Предлагаю работу') {
    if(!x.title) throw new Error('Введите название вакансии');
    if(!x.profession) throw new Error('Выберите профессию');
    if(!x.salaryUnit) throw new Error('Выберите единицу оплаты или «По договорённости»');
    if(!x.workType) throw new Error('Выберите формат сотрудничества');
    if(!hasSalary(x)) throw new Error('Укажите зарплату');
    if(!x.schedule) throw new Error('Выберите график');
    if(!x.description) throw new Error('Заполните описание вакансии');
    if(!x.contact) throw new Error('Укажите контакт');
  }
  if(x.type==='Ищу работу') {
    if(!x.title) throw new Error('Укажите желаемую должность');
    if(!x.profession) x.profession=x.title;
    if(!x.salaryUnit) throw new Error('Выберите единицу желаемой зарплаты или «По договорённости»');
    if(!x.workType) throw new Error('Выберите формат сотрудничества');
    if(!hasSalary(x)) throw new Error('Укажите желаемую зарплату');
    if(!x.schedule) throw new Error('Выберите график');
    if(!x.description) throw new Error('Расскажите о себе');
    if(!x.contact) throw new Error('Укажите контакт');
  }
  if(x.type==='Бригада ищет работу') {
    if(!x.workType) throw new Error('Выберите формат сотрудничества');
    if(!x.brigadeSize) throw new Error('Укажите количество человек в бригаде');
    if(!x.specialization && !x.professions) throw new Error('Укажите виды работ / специализацию');
    if(!x.description) throw new Error('Расскажите о бригаде');
    if(!x.contact) throw new Error('Укажите контакт');
  }
  if(x.type==='Ищу бригаду') {
    if(!x.workType) throw new Error('Выберите формат сотрудничества');
    if(!x.profession && !x.title) throw new Error('Укажите, какая работа нужна');
    if(!x.brigadeSize) throw new Error('Укажите количество человек');
    if(!x.description) throw new Error('Опишите работу / объект');
    if(!x.contact) throw new Error('Укажите контакт');
  }
}
function hasSalary(x){ return !!(x.salaryFrom||x.salaryTo||x.salaryUnit==='По договорённости'); }
function clean(v){return v===null||v===undefined?'':String(v).trim();}
function arr(v){if(!v)return[];if(Array.isArray(v))return v.map(clean).filter(Boolean);return String(v).split(',').map(clean).filter(Boolean);}
function uniqueArr_(v){var out=[],seen={};arr(v).forEach(function(x){var k=String(x||'').trim();var key=k.toLowerCase();if(k&&!seen[key]){seen[key]=1;out.push(k);}});return out;}
function normalizeProfileLanguages_(v){return uniqueArr_(v).map(function(x){var s=String(x||'').trim();var m=s.match(/^(.+?)\s*[—-]\s*(A1|A2|B1|B2|C1|C2|Родной)$/i);if(!m)return s;return String(m[1]).trim()+' — '+String(m[2]).toUpperCase();});}
function bool(v){return v===true||v===1||v==='1'||String(v).toLowerCase()==='true'||String(v).toLowerCase()==='да';}

function findExistingCandidateId(uid){
  uid=String(uid||'');if(!uid)return '';
  var cache=CacheService.getScriptCache(),ck='CANDIDATE_ID_BY_USER_'+uid;
  try{var hit=cache.get(ck);if(hit!==null)return String(hit||'');}catch(e){}
  var s=getSheet('Соискатели');if(!s||s.getLastRow()<2){try{cache.put(ck,'',21600);}catch(e){}return '';}
  var h=getHeaders(s),uc=h.indexOf('user_id'),pc=h.indexOf('profile_id');if(uc<0||pc<0)return '';
  var cell=s.getRange(2,uc+1,s.getLastRow()-1,1).createTextFinder(uid).matchEntireCell(true).findNext();
  var id=cell?String(s.getRange(cell.getRow(),pc+1).getValue()||''):'';
  try{cache.put(ck,id,21600);}catch(e){}
  return id;
}
function queueStringChunks_(key, raw){
  var p=PropertiesService.getScriptProperties();
  var chunkSize=3500;
  var chunks=[];
  for(var i=0;i<raw.length;i+=chunkSize)chunks.push(raw.slice(i,i+chunkSize));
  if(chunks.length>40)throw new Error('Заявка слишком большая для очереди. Уменьшите описание.');
  for(var j=0;j<chunks.length;j++)p.setProperty(key+'_DATA_'+j,chunks[j]);
  return chunks.length;
}
function readQueuedSubmission_(key,count){
  var p=PropertiesService.getScriptProperties(),raw='';
  for(var i=0;i<count;i++){
    var part=p.getProperty(key+'_DATA_'+i);
    if(part===null)throw new Error('Не хватает данных очереди для '+key);
    raw+=part;
  }
  return JSON.parse(raw);
}
function deleteQueuedSubmission_(key,count){
  var p=PropertiesService.getScriptProperties();
  p.deleteProperty(key);
  for(var i=0;i<count;i++)p.deleteProperty(key+'_DATA_'+i);
}
function enqueueSubmissionForModeration(x){
  var id=String(x&&x.id||'');
  if(!id)return false;
  var submissionKey=String(x.submissionId||id);
  var p=PropertiesService.getScriptProperties();
  // Файлы никогда не кладём в Script Properties: они идут отдельными uploadFile-запросами.
  var payload=JSON.parse(JSON.stringify(x||{}));
  delete payload.candidatePhoto; delete payload.candidateResume;
  delete payload.photo; delete payload.resume; delete payload.generatedImage;
  var raw=JSON.stringify(payload);
  var count=queueStringChunks_('MOD_QUEUE_'+submissionKey,raw);
  // Manifest пишем последним, чтобы worker не увидел неполную заявку.
  p.setProperty('MOD_QUEUE_'+submissionKey,JSON.stringify({id:id,submissionId:submissionKey,type:String(x.type||x.announcementType||''),chunks:count,queuedAt:new Date().toISOString()}));
  return true;
}

function saveModerationMessageId(sheetName,id,idHeader,messageId){
  var s=getSheet(sheetName),h=getHeaders(s);
  var c=h.indexOf(idHeader),m=h.indexOf('Moderation Message ID');
  if(c<0||m<0)return false;
  var row=findRowByIdFast(s,id,idHeader);
  if(!row)return false;
  s.getRange(row,m+1).setValue(String(messageId||''));
  return true;
}

function setupSubmissionQueueTrigger(){
  var triggers=ScriptApp.getProjectTriggers(),exists=false;
  triggers.forEach(function(t){
    if(t.getHandlerFunction()==='processSubmissionQueue')exists=true;
  });
  if(!exists){
    ScriptApp.newTrigger('processSubmissionQueue').timeBased().everyMinutes(1).create();
  }
  return {
    ok:true,
    created:!exists,
    message:exists?'Триггер очереди уже существует':'Триггер очереди создан'
  };
}

function processSubmissionQueue(){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))return {ok:false,error:'Очередь уже обрабатывается'};
  try{
    var p=PropertiesService.getScriptProperties(),all=p.getProperties();
    var keys=Object.keys(all).filter(function(k){return k.indexOf('MOD_QUEUE_')===0 && k.indexOf('_DATA_')<0;});
    keys.sort();
    var processed=0,failed=0;
    for(var i=0;i<Math.min(keys.length,6);i++){
      var key=keys[i],job;
      try{job=JSON.parse(all[key]||'{}');}catch(e){p.deleteProperty(key);failed++;continue;}
      var submissionKey=key.slice('MOD_QUEUE_'.length), id=String(job.id||'');
      try{
        var x=taxonomyNormalizeEntity_(readQueuedSubmission_(key,Number(job.chunks||0)));
        if(!id)id=String(x.id||'');
        if(!id)throw new Error('В очереди нет ID');

        // Пользователь/работодатель создаются только worker'ом, а не в HTTP-запросе.
        getOrCreateUser(x);
        if(x.type==='Предлагаю работу' || x.type==='Ищу бригаду'){
          x.employerId=x.employerId||getOrCreateEmployer(x).employer_id;
        }

        // Для кандидата profile_id стабилен и принадлежит профилю человека,
        // а каждое новое объявление получает собственный announcement_id (= x.id).
        if(x.type==='Ищу работу'){
          var existingCandidate=findExistingCandidateId(x.userId);
          x.profileId=existingCandidate||generateUniqueEntityId('CAND','Соискатели');
          x.id=id;
        }else if(x.type==='Бригада ищет работу'){
          x.id=id;x.brigadeId=id;
        }else if(x.type==='Ищу бригаду'){
          x.id=id;x.brigadeRequestId=id;
        }else x.id=id;

        saveSubmissionRecord(x,'На модерации');invalidateSearchCaches_();
        p.setProperty('SUBMISSION_ENTITY_'+submissionKey,JSON.stringify({id:x.type==='Ищу работу'?x.profileId:x.id,announcementId:x.id,profileId:x.profileId||'',userId:x.userId,type:x.type}));

        var stored=findSubmissionById(x.id);
        if(!stored)throw new Error('Сохранённое объявление не найдено: '+x.id);
        var existingMid=String(stored.moderationMessageId||'').trim();
        if(!existingMid){
          var markup={inline_keyboard:[[{text:'✅ Опубликовать',callback_data:'approve:'+x.id},{text:'❌ Отклонить',callback_data:'reject:'+x.id}]]};
          var r=sendTelegramMessage(ADMIN_ID,buildModerationText(stored),markup);
          var mid=String(r.result&&r.result.message_id||'');
          if(!mid)throw new Error('Telegram не вернул message_id');
          if(!saveModerationMessageId(stored._sheet,x.id,stored._idHeader,mid))throw new Error('Не удалось сохранить Moderation Message ID');
        }

        deleteQueuedSubmission_(key,Number(job.chunks||0));
        processed++;
      }catch(e){
        failed++;
        console.error('MOD_QUEUE '+submissionKey+': '+(e&&e.message?e.message:e));
        // Manifest остаётся для следующего запуска. DATA тоже остаются.
      }
    }
    var left=Object.keys(p.getProperties()).filter(function(k){return k.indexOf('MOD_QUEUE_')===0 && k.indexOf('_DATA_')<0;}).length;
    return {ok:true,processed:processed,failed:failed,left:left};
  }finally{lock.releaseLock();}
}
function handleApiAction(d){
  var a=String(d.action||'');
  if(a==='getProfessionTaxonomy') return getProfessionTaxonomy_();
  if(a==='getUniversalTaxonomy') return getUniversalTaxonomy_();
  if(a==='setupDatabase'){setupDatabase();setupSubmissionQueueTrigger();return{ok:true,message:'Структура базы готова'};}
  if(a==='setupSubmissionQueueTrigger') return setupSubmissionQueueTrigger();
  if(a==='searchCandidates') return {ok:true,results:searchCandidates(d.filters||{})};
  if(a==='searchVacancies'||a==='getVacancies') return {ok:true,results:searchVacancies(d.filters||{})};
  if(a==='searchBrigades') return {ok:true,results:searchBrigades(d.filters||{})};
  if(a==='searchBrigadeRequests') return {ok:true,results:searchBrigadeRequests(d.filters||{})};
  if(a==='searchCrossMatches') return {ok:true,results:searchCrossMatches(d.filters||{})};
  if(a==='getCandidateProfile') return getCandidateProfile(d.profileId||d.profile_id);
  if(a==='getMyCandidateProfile') return getMyCandidateProfile(d);
  if(a==='getCandidateAnnouncement') return getCandidateAnnouncement(d.announcementId||d.announcement_id,d.userId||d.user_id);
  if(a==='getCandidatePremiumAnnouncement') return getCandidatePremiumAnnouncement(d);
  if(a==='getCandidatePremiumPreview') return getCandidatePremiumPreview(d);
  if(a==='getCandidatePremiumPdf') return getCandidatePremiumPdf(d);
  if(a==='getPublicCandidateAnnouncement'){var pc=getPublicCandidateAnnouncement(d);if(pc&&pc.data)return{ok:true,cached:pc.cached,announcement:pc.data.announcement,profile:pc.data.profile};return pc;}
  if(a==='getPublicCandidateProfile') return getPublicCandidateProfile_(d);
  if(a==='grantCandidateAnnouncementAccess') return grantCandidateAnnouncementAccess(d);
  if(a==='registerPremiumPackage') return registerPremiumPackage(d);
  if(a==='getMyPremiumCandidates') return getMyPremiumCandidates(d);
  if(a==='toggleFavoriteCandidateAnnouncement') return toggleFavoriteCandidateAnnouncement(d);
  if(a==='getMyFavorites') return getMyFavorites(d);
  if(a==='toggleFavorite') return toggleFavorite(d);
  if(a==='deleteEntity') return deleteEntity(d);
  if(a==='getVacancy') return getVacancy(d.vacancyId||d.vacancy_id);
  if(a==='getPublicVacancyAnnouncement') return getPublicVacancyAnnouncement(d);
  if(a==='getPublicFavoriteEntity') return getPublicFavoriteEntity(d);
  if(a==='getVacancyPremiumPreview') return getVacancyPremiumPreview(d);
  if(a==='getBrigadePremium') return getBrigadePremium(d);
  if(a==='getBrigade') return getBrigade(d.brigadeId||d.brigade_id);
  if(a==='getBrigadeRequest') return getBrigadeRequest(d.brigadeRequestId||d.brigade_request_id);
  if(a==='getMyProfiles') return getMyProfiles(clean(d.userId||d.user_id));
  if(a==='getCandidatePrefill') return getCandidatePrefill(clean(d.userId||d.user_id),d.firstName,d.lastName,d.telegramUsername);
  if(a==='getMyEmployer') return getMyEmployer(d);
  if(a==='updateEmployer') return updateEmployer(d);
  if(a==='updateCandidateProfile') return updateCandidateProfile(d);
  if(a==='removeCandidateProfileFile') return removeCandidateProfileFile(d);
  if(a==='updateEntity') return updateEntity(d);
  if(a==='updateCandidateAnnouncement') return updateCandidateAnnouncement(d);
  if(a==='cloneAnnouncement') return cloneAnnouncement(d);
  if(a==='submitDraft') return submitDraft(d);
  if(a==='submitCandidateDraft') return submitCandidateDraft(d);
  if(a==='uploadFile') return uploadFileForEntity(d);
  if(a==='getSubmissionStatus') return getSubmissionStatus(d);
  return {ok:false,error:'Неизвестное действие'};
}


function getProfessionTaxonomy_(){
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID),s=ss.getSheetByName('Справочник_профессий');
  if(!s||s.getLastRow()<2)return{ok:true,professions:[],count:0};
  var v=s.getDataRange().getValues(),h=v.shift(),idx={};h.forEach(function(x,i){idx[String(x)]=i;});
  var rows=v.map(function(r){return{category_id:r[idx.category_id],category:r[idx.category],profession_id:r[idx.profession_id],canonical_profession:r[idx.canonical_profession],aliases_for_search:r[idx.aliases_for_search],priority:r[idx.priority],image_filename:r[idx.image_filename]};}).filter(function(x){return x.category&&x.canonical_profession;});
  return{ok:true,professions:rows,count:rows.length};
}
function setupDatabase(){
  Object.keys(DB_HEADERS).forEach(function(n){ensureHeaders(getSheet(n),DB_HEADERS[n]);});
  ensureHeaders(getSheet('Объявления соискателей'),CANDIDATE_ANNOUNCEMENT_HEADERS);
  var v=getSheet('Вакансии'); ensureHeaders(v,['ID','Дата создания','Дата публикации','Статус','Тип объявления','Название вакансии','Категория','Профессия','Город','Вся Чехия','Зарплата от','Зарплата до','Единица оплаты','Жильё','Тип работы','Занятость','График','Языки','Требования к языку','Документы','Опыт','Водительские права','Категории прав','Автомобиль','Квалификация','18+','Навыки','Дата начала','Описание','Контакт','Telegram','Telegram ID','Telegram Message ID','Файлы','Moderation Message ID','employer_id','profile_id','user_id']);
  return true;
}
function getSpreadsheet(){if(!DB_SPREADSHEET)DB_SPREADSHEET=SpreadsheetApp.openById(SPREADSHEET_ID);return DB_SPREADSHEET;}
function getSheet(n){var ss=getSpreadsheet(),s=ss.getSheetByName(n);return s||ss.insertSheet(n);}
function getHeaders(s){return s.getLastColumn()?s.getRange(1,1,1,s.getLastColumn()).getValues()[0]:[];}
function ensureHeaders(s,hs){if(!s.getLastColumn()){s.getRange(1,1,1,hs.length).setValues([hs]);return;}var cur=getHeaders(s);hs.forEach(function(h){if(cur.indexOf(h)<0)s.getRange(1,s.getLastColumn()+1).setValue(h);});}
function rowObject(h,r){var o={};h.forEach(function(k,i){if(k)o[k]=r[i];});return o;}
function generateEntityId(prefix,sheetName){
  var lock=LockService.getScriptLock();
  if(lock.tryLock(1200)){
    try{
      var s=getSheet(sheetName), h=getHeaders(s);
      var idHeader=sheetName==='Вакансии'?'ID':
        sheetName==='Соискатели'?'profile_id':
        sheetName==='Работодатели'?'employer_id':
        sheetName==='Бригады'?'brigade_id':
        sheetName==='Ищу бригаду'?'brigade_request_id':sheetName==='Объявления соискателей'?'announcement_id':h[0];
      var c=h.indexOf(idHeader), m=0;
      if(c<0)c=0;
      if(s.getLastRow()>1){
        s.getRange(2,c+1,s.getLastRow()-1,1).getValues().forEach(function(r){
          var z=String(r[0]||'').match(new RegExp('^'+prefix+'-(\\\\d+)$'));
          if(z)m=Math.max(m,Number(z[1]));
        });
      }
      return prefix+'-'+String(m+1).padStart(6,'0');
    }finally{
      try{lock.releaseLock();}catch(e){}
    }
  }
  return generateUniqueEntityId(prefix,sheetName);
}

function generateUniqueEntityId(prefix,sheetName){
  // Fallback без ожидания общего ScriptLock.
  // Вероятность совпадения префикса+timestamp+случайного суффикса пренебрежимо мала.
  return prefix+'-'+String(Date.now()).slice(-10)+String(Math.floor(Math.random()*900)+100);
}

function userName(x){return [x.telegramFirstName,x.telegramLastName].filter(Boolean).join(' ').trim();}
function getOrCreateUser(x){
  var uid=String(x.userId||x.telegramId||'');if(!uid)return null;
  var cache=CacheService.getScriptCache(),ck='USER_RECORD_'+uid;
  try{var hit=cache.get(ck);if(hit)return JSON.parse(hit);}catch(e){}
  var s=getSheet('Пользователи');ensureHeaders(s,DB_HEADERS['Пользователи']);var h=getHeaders(s),row=findRowByIdFast(s,uid,'user_id');
  if(row){var o=rowObject(h,s.getRange(row,1,1,h.length).getValues()[0]);try{cache.put(ck,JSON.stringify(o),21600);}catch(e){}return o;}
  var o2={'user_id':uid,'Дата создания':new Date(),'Дата обновления':new Date(),'Telegram':x.telegramUsername,'Имя':x.telegramFirstName,'Фамилия':x.telegramLastName,'Username':x.telegramUsername,'Роли':'','Статус':'Активен'};
  var newRow=s.getLastRow()+1;s.getRange(newRow,1,1,h.length).setValues([h.map(function(k){return o2[k]!==undefined?o2[k]:'';})]);try{cache.put(ck,JSON.stringify(o2),21600);}catch(e){}return o2;
}
function getOrCreateEmployer(x){
  var uid=String(x.userId||x.telegramId||'');
  var cache=CacheService.getScriptCache(),ck='EMPLOYER_BY_USER_'+uid;
  try{var hit=cache.get(ck);if(hit)return JSON.parse(hit);}catch(e){}
  var s=getSheet('Работодатели');ensureHeaders(s,DB_HEADERS['Работодатели']);var h=getHeaders(s),row=findRowByIdFast(s,uid,'user_id');
  if(row){var existing=rowObject(h,s.getRange(row,1,1,h.length).getValues()[0]);try{cache.put(ck,JSON.stringify(existing),21600);}catch(e){}return existing;}
  var id=generateUniqueEntityId('EMP','Работодатели'),o={'employer_id':id,'user_id':uid,'Дата создания':new Date(),'Дата обновления':new Date(),'Компания':'','Контактное лицо':userName(x),'Телефон':'','Telegram':x.telegramUsername,'Email':'','Город':x.city,'Описание':'','Сайт':'','Логотип':'','Статус':'Активен'};
  var newRow=s.getLastRow()+1;s.getRange(newRow,1,1,h.length).setValues([h.map(function(k){return o[k]!==undefined?o[k]:'';})]);try{cache.put(ck,JSON.stringify(o),21600);}catch(e){}invalidateMyProfilesCache(uid);return o;
}

function textFieldValue(v){
  if(v===null||v===undefined)return '';
  if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())){
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Europe/Prague', 'dd.MM.yyyy');
  }
  return String(v);
}
function setTextColumns(s,h,rowNumber,names){
  names.forEach(function(name){
    var c=h.indexOf(name);
    if(c>=0)s.getRange(rowNumber,c+1).setNumberFormat('@');
  });
}
function persistGeneratedImage_(x,label){
  if(!x)return '';
  if(x.generatedImageUrl){x.generatedImage='';return String(x.generatedImageUrl);}
  var raw=String(x.generatedImage||'').trim();
  if(!raw)return '';
  var url=saveUploadedFile(raw,label||'Сгенерированная карточка');
  x.generatedImage='';
  x.generatedImageUrl=url;
  return url;
}

function saveVacancyRecord(x,status){
  var s=getSheet('Вакансии');
  ensureHeaders(s,['ID','Дата создания','Дата публикации','Статус','Тип объявления','Название вакансии','Категория','Профессия','Город','Вся Чехия','Зарплата от','Зарплата до','Единица оплаты','Жильё','Тип работы','Занятость','График','Языки','Требования к языку','Документы','Опыт','Водительские права','Категории прав','Автомобиль','Квалификация','18+','Навыки','Дата начала','Описание','Контакт','Telegram','Telegram ID','Telegram Message ID','Файлы','Moderation Message ID','employer_id','profile_id','user_id','Сгенерированная картинка']);
  var h=getHeaders(s),map={
    'ID':x.id,'Дата создания':x.createdAt,'Дата публикации':status==='Опубликована'?new Date():'','Статус':status,
    'Тип объявления':x.type,'Название вакансии':x.title,'Категория':x.category,'Профессия':x.profession,'Город':x.city,
    'Вся Чехия':x.allCzechia?'Да':'','Зарплата от':x.salaryFrom,'Зарплата до':x.salaryTo,'Единица оплаты':x.salaryUnit,
    'Жильё':x.housing,'Тип работы':x.workType,'Занятость':x.employmentType,'График':textFieldValue(x.schedule),
    'Языки':x.languages.join(', '),'Требования к языку':x.languageLevel,'Документы':x.documents.join(', '),
    'Опыт':x.type==='Предлагаю работу'?x.experienceRequired:x.experience,'Водительские права':x.drivingLicenses,
    'Категории прав':x.licenseCategories.join(', '),'Автомобиль':x.automobile,'Квалификация':x.qualification,
    '18+':x.age18?'Да':'','Навыки':x.skills,'Дата начала':textFieldValue(x.readyDate),'Описание':x.description,
    'Контакт':"'"+x.contact,'Telegram':x.telegramUsername,'Telegram ID':x.telegramId,'Telegram Message ID':x.telegramMessageId||'',
    'Файлы':x.files.join(', '),'Moderation Message ID':x.moderationMessageId||'','employer_id':x.employerId||'',
    'profile_id':x.profileId||'','user_id':x.userId,'Сгенерированная картинка':x.generatedImageUrl||''
  };
  // Новый ID уже гарантированно уникален на уровне doPost. Не перечитываем весь лист ради проверки ID.
  var row=h.map(function(k){return map[k]!==undefined?map[k]:'';});
  s.appendRow(row);
  setTextColumns(s,h,s.getLastRow(),['График','Дата начала']);
}

function candidateAnnouncementMap_(x,status){
  return {'announcement_id':x.id,'profile_id':x.profileId,'user_id':x.userId,'Дата создания':x.createdAt||new Date(),'Дата обновления':new Date(),'Статус':status,'Тип объявления':'Ищу работу','Имя':x.candidateName||userName(x),'Желаемая должность':x.title||x.profession,'Профессия':x.profession||x.title,'Категория':x.category,'Город':x.city,'Вся Чехия':x.allCzechia?'Да':'','Желаемая зарплата от':x.salaryFrom,'Желаемая зарплата до':x.salaryTo,'Единица оплаты':x.salaryUnit,'Тип работы':x.workType,'Тип занятости':x.employmentType,'График':textFieldValue(x.schedule),'Жильё':x.housing,'Языки':x.languages.join(', '),'Уровень языка':x.languageLevel,'Документы':x.documents.join(', '),'Опыт':x.experience,'Водительские права':x.drivingLicenses,'Категории прав':x.licenseCategories.join(', '),'Автомобиль':x.automobile,'Квалификация':x.qualification,'Навыки':x.skills,'Дата готовности к работе':textFieldValue(x.readyDate),'О себе':x.description,'Контакт':"'"+x.contact,'Telegram':x.telegramUsername,'Telegram Message ID':x.telegramMessageId||'','Moderation Message ID':x.moderationMessageId||'','Сгенерированная картинка':x.generatedImageUrl||''};
}
function saveCandidate(x,status){
  var s=getSheet('Соискатели');ensureHeaders(s,DB_HEADERS['Соискатели']);
  var h=getHeaders(s),uid=String(x.userId||''),existingRow=findRowByIdFast(s,uid,'user_id'),existingObj=null,profileId=x.profileId||'';
  if(existingRow){existingObj=rowObject(h,s.getRange(existingRow,1,1,h.length).getValues()[0]);profileId=String(existingObj.profile_id||profileId);}
  if(!profileId)profileId=generateUniqueEntityId('CAND','Соискатели');
  var photo=x.candidatePhoto?saveUploadedFile(x.candidatePhoto,'Фото соискателя'):'';
  var resume=x.candidateResume?saveUploadedFile(x.candidateResume,'Резюме'):'';
  var now=new Date();
  // Профиль соискателя — постоянная сущность. Никакие поля конкретного объявления
  // (профессия, город, зарплата, график и т.п.) здесь больше не перезаписываются.
  // Первый опубликованный черновик также является удобным источником первичного
  // заполнения постоянного профиля. Но после того, как пользователь сохранил профиль,
  // данные профиля никогда не перезаписываются данными следующего объявления.
  var firstAnnouncementSource = !existingRow;
  var profileLanguages = existingObj && String(existingObj['Языки']||'').trim() ? String(existingObj['Языки']||'') : uniqueArr_(x.languages).join(', ');
  var profileDocs = existingObj && String(existingObj['Документы']||'').trim() ? String(existingObj['Документы']||'') : uniqueArr_(x.documents).join(', ');
  var profileLicenses = existingObj && String(existingObj['Категории прав']||'').trim() ? String(existingObj['Категории прав']||'') : uniqueArr_(x.licenseCategories).join(', ');
  var profileContact = existingObj && String(existingObj['Контакт']||'').trim() ? existingObj['Контакт'] : "'"+x.contact;
  var map={
    'profile_id':profileId,'user_id':x.userId,
    'Дата создания':existingRow?existingObj['Дата создания']:now,'Дата обновления':now,
    'Статус':existingRow?(existingObj['Статус']||'Активен'):'Активен',
    'Имя':existingObj&&existingObj['Имя']?existingObj['Имя']:(x.candidateName||userName(x)),
    'Образование':existingObj&&String(existingObj['Образование']||'').trim()?existingObj['Образование']:'',
    'Профессии и навыки':existingObj&&String(existingObj['Профессии и навыки']||'').trim()?existingObj['Профессии и навыки']:uniqueArr_(String(x.profession||x.title||'').split(',')).join(', '),
    'Языки':profileLanguages,
    'Уровень языка':existingObj&&String(existingObj['Уровень языка']||'').trim()?existingObj['Уровень языка']:x.languageLevel,
    'Документы':profileDocs,
    'Водительские права':existingObj&&String(existingObj['Водительские права']||'').trim()?existingObj['Водительские права']:x.drivingLicenses,
    'Категории прав':profileLicenses,
    'Автомобиль':existingObj&&String(existingObj['Автомобиль']||'').trim()?existingObj['Автомобиль']:x.automobile,
    'Контакт':profileContact,
    'Telegram':existingObj&&String(existingObj['Telegram']||'').trim()?existingObj['Telegram']:x.telegramUsername,'Telegram ID':existingObj&&String(existingObj['Telegram ID']||'').trim()?existingObj['Telegram ID']:x.telegramId,
    'Файл резюме':resume||(existingObj?existingObj['Файл резюме']:''),
    'Фото':photo||(existingObj?existingObj['Фото']:''),
    'Дата обновления профиля':existingObj&&existingObj['Дата обновления профиля']?existingObj['Дата обновления профиля']:now,
    'Контакты опубликованы':'Нет','Согласие на публикацию контактов':'Да','Дата согласия':existingObj?existingObj['Дата согласия']:now,
    'Доступ к контактам':existingObj?existingObj['Доступ к контактам']:'Открыт',
    'Статус оплаты':existingObj?existingObj['Статус оплаты']:'','Стоимость контакта':existingObj?existingObj['Стоимость контакта']:'',
    'Сгенерированная картинка':existingObj?existingObj['Сгенерированная картинка']||'':''
  };
  var row=h.map(function(k){return map[k]!==undefined?map[k]:(existingObj&&existingObj[k]!==undefined?existingObj[k]:'');});
  var rowNum=existingRow||s.getLastRow()+1;
  s.getRange(rowNum,1,1,row.length).setValues([row]);
  x.profileId=profileId;
  try{CacheService.getScriptCache().put('CANDIDATE_ID_BY_USER_'+String(x.userId||''),String(profileId),21600);}catch(e){}

  var as=getSheet('Объявления соискателей');ensureHeaders(as,CANDIDATE_ANNOUNCEMENT_HEADERS);
  var ah=getHeaders(as),arow=findRowByIdFast(as,x.id,'announcement_id'),aold=arow?rowObject(ah,as.getRange(arow,1,1,ah.length).getValues()[0]):null;
  var amap=candidateAnnouncementMap_(x,status);
  var arowData=ah.map(function(k){return amap[k]!==undefined?amap[k]:(aold&&aold[k]!==undefined?aold[k]:'');});
  var arowNum=arow||as.getLastRow()+1;
  setTextColumns(as,ah,arowNum,['График','Дата готовности к работе']);as.getRange(arowNum,1,1,arowData.length).setValues([arowData]);
  invalidatePublicCandidateProfile(profileId);
  try{var warmedCandidate=publicCandidate(rowObject(h,s.getRange(rowNum,1,1,h.length).getValues()[0]),true);cachePublicCandidateProfile(profileId,warmedCandidate);cachePublicCandidateProfilePersistent_(profileId,warmedCandidate);cacheCandidatePrefillPersistent_(x.userId,warmedCandidate);}catch(e){}
  invalidateMyProfilesCache(x.userId);
  return profileId;
}
function saveBrigade(x,status){
  x=taxonomyNormalizeEntity_(x);
  var s=getSheet('Бригады');ensureHeaders(s,DB_HEADERS['Бригады']);var h=getHeaders(s),photo=x.candidatePhoto?saveUploadedFile(x.candidatePhoto,'Фото бригады'):'';
  var map={'brigade_id':x.brigadeId||x.id,'user_id':x.userId,'Дата создания':new Date(),'Дата обновления':new Date(),'Статус':status,
    'Название бригады':x.title||('Бригада '+x.brigadeSize+' человек'),'Категория':x.category,'Специализация':x.specialization,'Виды работ':x.workTypes||x.professions||x.profession,
    'Количество человек':x.brigadeSize,'Профессии':x.professions||x.profession,'Город':x.city,'Вся Чехия':x.allCzechia?'Да':'',
    'Мобильность':x.mobility,'Формат сотрудничества':x.workType,'Свой инструмент / техника':x.ownEquipment,'Языки':x.languages.join(', '),'Уровень языка':x.languageLevel,'Документы':x.documents.join(', '),'Опыт':x.experience,'Транспорт':x.transport,
    'Навыки':x.skills,'Квалификация':x.qualification,'Жильё':x.housing,'Дата готовности к работе':textFieldValue(x.readyDate),
    'Описание':x.description,'Контакт':"'"+x.contact,'Telegram':x.telegramUsername,'Фото':photo||x.photo,'Файлы':x.files.join(', '),'Telegram Message ID':x.telegramMessageId||'','Сгенерированная картинка':x.generatedImageUrl||''};
  var row=h.map(function(k){return map[k]!==undefined?map[k]:'';});
  var newRow=s.getLastRow()+1;setTextColumns(s,h,newRow,['Дата готовности к работе']);s.getRange(newRow,1,1,row.length).setValues([row]);
  return x.brigadeId||x.id;
}
function saveBrigadeRequest(x,status){
  x=taxonomyNormalizeEntity_(x);
  var s=getSheet('Ищу бригаду');ensureHeaders(s,DB_HEADERS['Ищу бригаду']);var h=getHeaders(s),map={'brigade_request_id':x.brigadeRequestId||x.id,'employer_id':x.employerId,
    'user_id':x.userId,'Дата создания':new Date(),'Дата обновления':new Date(),'Статус':status,'Категория':x.category,'Специализация':x.specialization,'Виды работ':x.workTypes||x.professions||x.profession,
    'Профессия':x.profession||x.title,'Город':x.city,'Вся Чехия':x.allCzechia?'Да':'','Количество человек':x.brigadeSize,
    'Зарплата от':x.salaryFrom,'Зарплата до':x.salaryTo,'Единица оплаты':x.salaryUnit,'Тип работы':x.workType,'Занятость':x.employmentType,
    'График':textFieldValue(x.schedule),'Жильё':x.housing,'Языки':x.languages.join(', '),'Уровень языка':x.languageLevel,'Документы':x.documents.join(', '),
    'Опыт':x.experienceRequired||x.experience,'Требования':x.requirements,'Квалификация':x.qualification,'Навыки':x.skills,
    'Дата начала':textFieldValue(x.readyDate),'Описание':x.description,'Контакт':"'"+x.contact,'Telegram':x.telegramUsername,'Файлы':x.files.join(', '),'Telegram Message ID':x.telegramMessageId||'','Сгенерированная картинка':x.generatedImageUrl||''};
  var row=h.map(function(k){return map[k]!==undefined?map[k]:'';});
  var newRow=s.getLastRow()+1;setTextColumns(s,h,newRow,['График','Дата начала']);s.getRange(newRow,1,1,row.length).setValues([row]);
  return x.brigadeRequestId||x.id;
}

function updateStatus(sheetName,id,idHeader,status){var s=getSheet(sheetName),h=getHeaders(s),v=s.getDataRange().getValues(),c=h.indexOf(idHeader),st=h.indexOf('Статус');for(var i=1;i<v.length;i++)if(String(v[i][c])===String(id)){s.getRange(i+1,st+1).setValue(status);if(h.indexOf('Дата обновления')>=0)s.getRange(i+1,h.indexOf('Дата обновления')+1).setValue(new Date());return true;}return false;}
function updateStatusFast_(sheetName,id,idHeader,status){var s=getSheet(sheetName),h=getHeaders(s),row=findRowByIdFast(s,id,idHeader),st=h.indexOf('Статус');if(!row||st<0)return false;s.getRange(row,st+1).setValue(status);var upd=h.indexOf('Дата обновления');if(upd>=0)s.getRange(row,upd+1).setValue(new Date());return true;}
function looksLikeSchedule(v){var a=['Пн–Пт','Пн-Пт','Пн–Сб','Пн-Сб','2/2','3/3','4/4','Дневные смены','Ночные смены','Гибкий график'];return a.indexOf(String(v||''))>=0;}
function looksLikeLanguages(v){var s=String(v||'').toLowerCase();if(!s)return false;var a=['чешский','русский','украинский','английский','немецкий','итальянский','испанский','польский','словацкий','французский'];return a.filter(function(x){return s.indexOf(x)>=0;}).length>=1;}
function looksLikeLanguageLevel(v){return /^(A1|A2|B1|B2|C1|C2|Родной)$/i.test(String(v||'').trim());}
function normalizeLegacyVacancyObject(o){if(!o||!looksLikeSchedule(o['Языки'])||!looksLikeLanguages(o['Требования к языку'])||!looksLikeLanguageLevel(o['Документы']))return o;var x=Object.assign({},o);x['Языки']=o['Языки'];x['Требования к языку']=o['Документы'];x['Документы']=o['Опыт'];x['Опыт']=o['Водительские права'];x['Водительские права']=o['Категории прав'];x['Категории прав']=o['Автомобиль'];x['Автомобиль']=o['Квалификация'];x['Квалификация']=o['18+'];x['18+']=o['Навыки'];x['Навыки']=o['Дата начала'];x['Дата начала']=o['Описание'];x['Описание']=o['Контакт'];x['Контакт']=o['Telegram'];x['Telegram']=o['Telegram ID'];x['Telegram ID']=o['Telegram Message ID'];x['Telegram Message ID']=o['Файлы'];x['Файлы']=o['Moderation Message ID'];x.__legacyShifted=true;return x;}
function findRowByIdFast(s,id,idHeader){
  if(!s||s.getLastRow()<2)return 0;
  var h=getHeaders(s),c=h.indexOf(idHeader);if(c<0)return 0;
  var cell=s.getRange(2,c+1,Math.max(1,s.getLastRow()-1),1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell?cell.getRow():0;
}
function repairLegacyVacancyById(id){
  var s=getSheet('Вакансии');if(s.getLastRow()<2)return null;
  var h=getHeaders(s),rowNum=findRowByIdFast(s,id,'ID');if(!rowNum)return null;
  var raw=rowObject(h,s.getRange(rowNum,1,1,h.length).getValues()[0]),fixed=normalizeLegacyVacancyObject(raw);
  if(fixed.__legacyShifted){
    var row=h.map(function(k){return fixed[k]!==undefined?fixed[k]:raw[k];});
    s.getRange(rowNum,1,1,row.length).setValues([row]);
    return fixed;
  }
  return raw;
}
function getById(sheetName,id,idHeader){
  var s=getSheet(sheetName);if(!s||s.getLastRow()<2)return null;
  var h=getHeaders(s),rowNum=findRowByIdFast(s,id,idHeader);if(!rowNum)return null;
  var o=rowObject(h,s.getRange(rowNum,1,1,h.length).getValues()[0]);
  if(sheetName==='Вакансии'){
    var fixed=normalizeLegacyVacancyObject(o);
    if(fixed.__legacyShifted){
      var row=h.map(function(k){return fixed[k]!==undefined?fixed[k]:o[k];});
      s.getRange(rowNum,1,1,row.length).setValues([row]);
      return fixed;
    }
  }
  return o;
}
function driveImageUrl(v){var s=String(v||'');if(!s)return '';var m=s.match(/[?&]id=([^&]+)/);if(m)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(m[1])+'&sz=w1200';m=s.match(/\/d\/([a-zA-Z0-9_-]+)/);if(m)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(m[1])+'&sz=w1200';return s;}
function publicCandidate(o,full){return {profile_id:o.profile_id,user_id:o.user_id,name:o['Имя'],education:o['Образование'],professionalSkills:o['Профессии и навыки'],languages:o['Языки'],languageLevel:o['Уровень языка'],documents:o['Документы'],drivingLicenses:o['Водительские права'],licenseCategories:o['Категории прав'],automobile:o['Автомобиль'],photo:driveImageUrl(o['Фото']),resume:o['Файл резюме'],contact:full?o['Контакт']:'',telegram:full?o['Telegram']:'',contactAvailable:true};}
function publicCandidateAnnouncement_(o,profile,full){profile=profile||{};return {announcement_id:o.announcement_id,profile_id:o.profile_id,user_id:o.user_id,name:o['Имя']||profile['Имя'],title:o['Желаемая должность']||o['Профессия'],profession:o['Профессия'],category:o['Категория'],city:o['Город'],allCzechia:o['Вся Чехия']==='Да',salaryFrom:o['Желаемая зарплата от'],salaryTo:o['Желаемая зарплата до'],salaryUnit:o['Единица оплаты'],workType:o['Тип работы'],employmentType:o['Тип занятости'],schedule:o['График'],housing:o['Жильё'],languages:o['Языки'],languageLevel:o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],drivingLicenses:o['Водительские права'],licenseCategories:o['Категории прав'],automobile:o['Автомобиль'],qualification:o['Квалификация'],skills:o['Навыки'],readyDate:o['Дата готовности к работе'],about:o['О себе'],photo:driveImageUrl(profile['Фото']||''),resume:profile['Файл резюме']||'',contact:full?profile['Контакт']||o['Контакт']:'',telegram:full?profile['Telegram']||o['Telegram']:'',contactAvailable:true};}
function publicCandidateCacheKey_(id){return 'PUBLIC_PROFILE_'+String(id||'');}
function cachePublicCandidateProfile(id,profile){if(!id||!profile)return;try{CacheService.getScriptCache().put(publicCandidateCacheKey_(id),JSON.stringify(profile),21600);}catch(e){console.warn('Не удалось положить профиль в cache:',e);}}
function getCachedPublicCandidateProfile(id){if(!id)return null;try{var raw=CacheService.getScriptCache().get(publicCandidateCacheKey_(id));if(raw)return JSON.parse(raw);}catch(e){console.warn('Не удалось прочитать профиль из cache:',e);}return null;}
function invalidatePublicCandidateProfile(id){if(!id)return;try{CacheService.getScriptCache().remove(publicCandidateCacheKey_(id));}catch(e){}}
function normalizeSearchText(v){return String(v||'').toLowerCase().replace(/ё/g,'е').replace(/і/g,'i').replace(/ї/g,'i').replace(/є/g,'e').replace(/ґ/g,'g').replace(/[áä]/g,'a').replace(/č/g,'c').replace(/ď/g,'d').replace(/[éě]/g,'e').replace(/í/g,'i').replace(/ň/g,'n').replace(/[óö]/g,'o').replace(/ř/g,'r').replace(/š/g,'s').replace(/ť/g,'t').replace(/[úůü]/g,'u').replace(/ý/g,'y').replace(/ž/g,'z').replace(/[^a-zа-я0-9+]+/g,' ').trim();}
var SMART_PROFESSION_ALIASES={
  'бетон':['бетонщик','монолитчик','бетонные работы','бетонирование','монолит','фундамент','заливка'],
  'монолит':['монолитчик','бетонщик','арматурщик','опалубщик','бетон'],
  'арматура':['арматурщик','монолитчик','бетонщик'],
  'опалубка':['опалубщик','монолитчик','бетонщик'],
  'камень':['каменщик','кладчик','облицовщик','кладка'],
  'кирпич':['каменщик','кладчик','кладка'],
  'фасад':['фасадчик','утеплитель фасадов','штукатур','маляр'],
  'отделка':['штукатур','маляр','плиточник','гипсокартонщик','отделочник'],
  'водитель':['водитель b','водитель c','водитель c+e','водитель ce','водитель d','водитель автобуса','дальнобойщик','курьер'],
  'фура':['водитель c+e','водитель ce','водитель фуры','дальнобойщик'],
  'дальнобой':['водитель c+e','водитель ce','дальнобойщик'],
  'ce':['водитель c+e','водитель ce','дальнобойщик'],
  'c+e':['водитель c+e','водитель ce','дальнобойщик'],
  'склад':['кладовщик','работник склада','комплектовщик','пикер','упаковщик','приемщик товара'],
  'сварка':['сварщик','сварщик mig/mag','сварщик tig','аргонщик','газорезчик'],
  'электрик':['электрик','электромонтажник','слаботочник','электроинженер'],
  'повар':['повар','помощник повара','су-шеф','шеф-повар','пиццайоло'],
  'уборка':['уборщик','уборщица','клинер','горничная'],
  'сантехник':['сантехник','водопроводчик','монтажник сантехники','монтажник санитарно-технических систем'],
  'водопроводчик':['сантехник','водопроводчик','монтажник сантехники'],
  'плотник':['плотник','столяр','строительный плотник'],
  'водитель c':['водитель c','водитель категории c','водитель грузовика','водитель грузового автомобиля'],
  'категория c':['водитель c','водитель категории c','водитель грузовика'],
  'авто':['автомеханик','автослесарь','автоэлектрик','диагност','автомаляр'],
  'программист':['программист','frontend-разработчик','backend-разработчик','full-stack разработчик','web-разработчик'],
  'бухгалтер':['бухгалтер','главный бухгалтер','финансовый менеджер'],
  'няня':['няня','воспитатель','помощник воспитателя'],
  'ridic':['водитель b','водитель c','водитель c+e','водитель d','дальнобойщик'],
  'kamion':['водитель c+e','водитель ce','дальнобойщик'],
  'sklad':['кладовщик','работник склада','комплектовщик','пикер'],
  'zednik':['каменщик','кладчик','каменщик'],
  'beton':['бетонщик','монолитчик','бетонные работы'],
  'svarc':['сварщик','сварщик mig/mag','аргонщик'],
  'elektrikar':['электрик','электромонтажник','слаботочник'],
  'kuchar':['повар','помощник повара','су-шеф'],
  'uklid':['уборщик','клинер','горничная'],
  'tesar':['плотник','столяр','строительный плотник'],
  'truhlar':['столяр','мебельщик'],
  'malir':['маляр','штукатур','отделочник'],
  'fasadnik':['фасадчик','утеплитель фасадов']
};
function smartQueryVariants_(q){var s=normalizeSearchText(q),out=[s];Object.keys(SMART_PROFESSION_ALIASES).forEach(function(k){if(s.indexOf(k)>=0||k.indexOf(s)>=0){SMART_PROFESSION_ALIASES[k].forEach(function(v){var n=normalizeSearchText(v);if(n&&out.indexOf(n)<0)out.push(n);});}});return out;}
function professionVariants(q){
  var s=normalizeSearchText(q),out=smartQueryVariants_(s),add=function(v){v=normalizeSearchText(v);if(v&&out.indexOf(v)<0)out.push(v);};
  if(s.indexOf('водитель c+e')>=0||s==='водитель ce'||s==='ce'||s.indexOf('водитель c')>=0){add('водитель c');add('водитель c+e');add('водитель ce');add('c');add('c+e');add('ce');}
  if(s.indexOf('водитель d')>=0||s==='d'){add('водитель d');add('водитель автобуса');add('автобус');add('d');}
  if(s.indexOf('автобус')>=0){add('водитель d');add('водитель автобуса');add('автобус');add('d');}
  if(s.indexOf('погрузчик')>=0||s.indexOf('vzv')>=0){add('водитель погрузчика');add('водитель погрузчика vzv');add('погрузчик');add('vzv');}
  if(s.indexOf('c e')>=0){add('водитель c+e');add('водитель ce');add('водитель c');}
  return out;
}

function professionEditDistance_(a,b){a=String(a||'');b=String(b||'');if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;var prev=[],cur=[],i,j;for(j=0;j<=b.length;j++)prev[j]=j;for(i=1;i<=a.length;i++){cur[0]=i;for(j=1;j<=b.length;j++){var cost=a.charAt(i-1)===b.charAt(j-1)?0:1;cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);}var t=prev;prev=cur;cur=t;}return prev[b.length];}
function professionScore(value,query){
  if(!query)return 1;
  var v=normalizeSearchText(value).replace(/c\s*\+\s*e/g,'ce').trim();
  var q=normalizeSearchText(query).replace(/c\s*\+\s*e/g,'ce').trim();
  if(!v||!q)return 0;
  var variants=professionVariants(q).map(function(x){return normalizeSearchText(x).replace(/c\s*\+\s*e/g,'ce').trim();}).filter(Boolean);
  var best=0;
  variants.forEach(function(x,idx){
    if(!x)return;
    var score=0;
    // Exact profession/title match is strongest.
    if(v===x) score=1400-idx;
    else {
      var vwords=v.split(/\s+/).filter(Boolean), xwords=x.split(/\s+/).filter(Boolean);
      // A phrase may match at a word boundary, e.g. "плотник" -> "плотник столяр".
      if(xwords.length===1){
        if(vwords.indexOf(xwords[0])>=0) score=1100-idx;
        else if(vwords.some(function(w){return w.indexOf(xwords[0])===0;})) score=1000-idx;
      }else{
        var phrase=' '+v+' ', needle=' '+x+' ';
        if(phrase.indexOf(needle)>=0) score=1150-idx;
        else if(xwords.every(function(w){return vwords.indexOf(w)>=0;})) score=1080-idx;
      }
    }
    best=Math.max(best,score);
  });
  return best;
}
function searchSheet(sheetName,status,idHeader,filters,mapper){
  var s=getSheet(sheetName);if(s.getLastRow()<2)return[];var h=getHeaders(s),v=s.getDataRange().getValues(),out=[];filters=filters||{};
  v.slice(1).forEach(function(r){var o=rowObject(h,r);if(status&&String(o['Статус']||'')!==status)return;if(filters.category&&!eq(o['Категория'],filters.category))return;if(filters.city&&!cityMatch(o,filters.city))return;
    var queryValue=filters.query||filters.profession;
    var queryValues=Array.isArray(filters.crossQueryTerms)&&filters.crossQueryTerms.length?filters.crossQueryTerms:[queryValue];
    // Similar-search deep links are strict: when the user selected a concrete
    // profession such as "Фасадчик", do not pull related aliases such as
    // "Маляр" just because fuzzy search considers them close.
    if(filters.strictProfession&&filters.profession){
      var strictTarget=normalizeSearchText(filters.profession);
      var strictFields=[o['Профессия'],o['Название вакансии'],o['Название бригады'],o['Специализация'],o['Профессии']].filter(Boolean);
      if(!strictFields.some(function(vv){return normalizeSearchText(vv)===strictTarget;}))return;
      out.push({score:1500,ts:new Date(o['Дата обновления']||o['Дата создания']||0).getTime()||0,item:mapper(o)});
      return;
    }
    // Search ONLY in the actual profession/title fields. Do not use description,
    // requirements or category: that produced nonsense matches such as "Плотник"
    // -> "Разнорабочий на стройке" and "Сантехник" -> "Монтажник окон".
    var professionValue=[o['Профессия'],o['Название вакансии'],o['Название бригады'],o['Специализация'],o['Профессии']].filter(Boolean).join(' | ');
    var ps=0;queryValues.forEach(function(qv){if(!qv)return;var ts=filters.crossQueryTerms?crossTaxonomyScore_(professionValue,qv):taxonomyScore_(professionValue,qv);var sc=ts?ts*15:professionScore(professionValue,qv);ps=Math.max(ps,sc);});if(queryValue&&!ps)return;
    out.push({score:ps||1,ts:new Date(o['Дата обновления']||o['Дата создания']||0).getTime()||0,item:mapper(o)});
  });
  out.sort(function(a,b){return b.score-a.score||b.ts-a.ts;});return out.slice(0,100).map(function(x){return x.item;});
}
function contains(v,f){return String(v||'').toLowerCase().indexOf(String(f||'').toLowerCase())>=0;}function eq(v,f){return String(v||'').toLowerCase()===String(f||'').toLowerCase();}function cityMatch(o,c){return eq(o['Город'],c)||String(o['Вся Чехия']||'')==='Да'||String(o['Готов по всей Чехии']||'')==='Да';}
function invalidateSearchCaches_(){try{var p=PropertiesService.getScriptProperties(),v=Number(p.getProperty('SEARCH_CACHE_VERSION')||'1')+1;p.setProperty('SEARCH_CACHE_VERSION',String(v));}catch(e){console.warn('Не удалось обновить версию кэша поиска:',e);}}
function searchCandidates(f){
  f=f||{};
  var sv='V'+String(PropertiesService.getScriptProperties().getProperty('SEARCH_CACHE_VERSION')||'1');
  var cacheKey='SEARCH_CANDIDATES_V2_'+sv+'_'+Utilities.base64EncodeWebSafe(JSON.stringify(f));
  try{var hit=CacheService.getScriptCache().get(cacheKey);if(hit)return JSON.parse(hit);}catch(e){}
  try{
    var s=getSheet('Объявления соискателей'),rows=[];
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
    }catch(profileErr){console.warn('Candidate profile index skipped:',profileErr);}
    var best={};
    rows.forEach(function(o){
      if(String(o['Статус']||'')!=='Опубликован')return;
      if(f.category&&!eq(o['Категория'],f.category))return;
      if(f.city&&!cityMatch(o,f.city))return;
      var cq=f.query||f.profession;
      if(f.strictProfession&&f.profession){
        var strictTarget=normalizeSearchText(f.profession);
        var strictFields=[o['Профессия'],o['Желаемая должность']].filter(Boolean);
        if(!strictFields.some(function(vv){return normalizeSearchText(vv)===strictTarget;}))return;
      }else if(cq){
        var candidateFields=[o['Профессия'],o['Желаемая должность']].filter(Boolean).join(' | '),directScore=0;var cqTerms=Array.isArray(f.crossQueryTerms)&&f.crossQueryTerms.length?f.crossQueryTerms:[cq];
        cqTerms.forEach(function(qv){var ts=Array.isArray(f.crossQueryTerms)?crossTaxonomyScore_(candidateFields,qv):taxonomyScore_(candidateFields,qv);var sc=ts*15||professionScore(candidateFields,qv);directScore=Math.max(directScore,sc);});
        if(!directScore){
          var variants=professionVariants(cq),hay=normalizeSearchText([o['Профессия'],o['Желаемая должность']].filter(Boolean).join(' | '));
          var related=variants.some(function(vv){var n=normalizeSearchText(vv);return n&&hay.indexOf(n)>=0;});
          if(!related)return;
        }
      }
      var aid=String(o.announcement_id||''),ts=new Date(o['Дата обновления']||o['Дата создания']||0).getTime()||0;
      var item=publicCandidateAnnouncement_(o,profiles[String(o.profile_id||'')]||{},false);
      if(aid&&(!best[aid]||ts>best[aid].ts))best[aid]={ts:ts,item:item};
    });
    var out=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.ts-a.ts;}).map(function(x){return x.item;}).slice(0,100);
    try{CacheService.getScriptCache().put(cacheKey,JSON.stringify(out),300);}catch(e){}
    return out;
  }catch(primaryErr){
    console.warn('searchCandidates primary path failed, using fallback:',primaryErr);
    // Safe fallback: search only the announcement sheet and do not depend on
    // the candidate profile sheet or profile cache. This keeps Similar Workers
    // usable even if a profile row/header is malformed.
    try{
      var fs=getSheet('Объявления соискателей');
      if(!fs||fs.getLastRow()<2)return[];
      var fh=getHeaders(fs),fv=fs.getDataRange().getValues(),fallback=[];
      for(var k=1;k<fv.length;k++){
        var o=rowObject(fh,fv[k]);
        if(String(o['Статус']||'')!=='Опубликован')continue;
        if(f.category&&!eq(o['Категория'],f.category))continue;
        if(f.city&&!cityMatch(o,f.city))continue;
        var q=f.query||f.profession;
        if(f.strictProfession&&f.profession){
          var strictTarget2=normalizeSearchText(f.profession);
          var strictFields2=[o['Профессия'],o['Желаемая должность']].filter(Boolean);
          if(!strictFields2.some(function(vv){return normalizeSearchText(vv)===strictTarget2;}))continue;
        }else if(q){var fallbackFields=[o['Профессия'],o['Желаемая должность']].filter(Boolean).join(' | '),fqTerms=Array.isArray(f.crossQueryTerms)&&f.crossQueryTerms.length?f.crossQueryTerms:[q],fqScore=0;fqTerms.forEach(function(qv){var ts=Array.isArray(f.crossQueryTerms)?crossTaxonomyScore_(fallbackFields,qv):taxonomyScore_(fallbackFields,qv);fqScore=Math.max(fqScore,ts*15||professionScore(fallbackFields,qv));});if(!fqScore)continue;}
        fallback.push({
          announcement_id:o.announcement_id,
          profile_id:o.profile_id,
          name:o['Имя']||'',
          title:o['Желаемая должность']||o['Профессия'],
          profession:o['Профессия'],
          category:o['Категория'],
          city:o['Город'],
          allCzechia:o['Вся Чехия']==='Да',
          salaryFrom:o['Желаемая зарплата от'],
          salaryTo:o['Желаемая зарплата до'],
          salaryUnit:o['Единица оплаты'],
          workType:o['Тип работы'],
          employmentType:o['Тип занятости'],
          schedule:o['График'],
          housing:o['Жильё'],
          languages:o['Языки'],
          languageLevel:o['Уровень языка'],
          documents:o['Документы'],
          experience:o['Опыт'],
          drivingLicenses:o['Водительские права'],
          licenseCategories:o['Категории прав'],
          automobile:o['Автомобиль'],
          qualification:o['Квалификация'],
          skills:o['Навыки'],
          readyDate:o['Дата готовности к работе'],
          about:o['О себе'],
          contact:'',
          telegram:'',
          contactAvailable:true,
          _ts:new Date(o['Дата обновления']||o['Дата создания']||0).getTime()||0
        });
      }
      fallback.sort(function(a,b){return b._ts-a._ts;});
      fallback=fallback.slice(0,100).map(function(x){delete x._ts;return x;});
      try{CacheService.getScriptCache().put(cacheKey,JSON.stringify(fallback),120);}catch(e){}
      return fallback;
    }catch(fallbackErr){
      console.error('searchCandidates fallback failed:',fallbackErr);
      throw primaryErr;
    }
  }
}
function searchVacancies(f){
  f=f||{};var sv='V'+String(PropertiesService.getScriptProperties().getProperty('SEARCH_CACHE_VERSION')||'1');var cacheKey='SEARCH_VACANCIES_V2_'+sv+'_'+Utilities.base64EncodeWebSafe(JSON.stringify(f));
  try{var hit=CacheService.getScriptCache().get(cacheKey);if(hit)return JSON.parse(hit);}catch(e){}
  var out=searchSheet('Вакансии','Опубликована','ID',f,function(o){return {id:o.ID,title:o['Название вакансии'],profession:o['Профессия'],category:o['Категория'],city:o['Город'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты'],housing:o['Жильё'],workType:o['Тип работы'],employmentType:o['Занятость'],schedule:o['График'],languages:o['Языки'],languageLevel:o['Требования к языку']||o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],drivingLicenses:o['Водительские права'],licenseCategories:o['Категории прав'],automobile:o['Автомобиль'],qualification:o['Квалификация'],age18:o['18+'],skills:o['Навыки'],readyDate:o['Дата начала'],description:o['Описание'],contact:o['Контакт'],telegram:o['Telegram']};});
  try{CacheService.getScriptCache().put(cacheKey,JSON.stringify(out),300);}catch(e){}return out;
}
function searchBrigades(f){f=f||{};var ck='SEARCH_BRIGADES_V2_'+Utilities.base64EncodeWebSafe(JSON.stringify(f));try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}var out=searchSheet('Бригады','Опубликован','brigade_id',f,function(o){return {brigade_id:o.brigade_id,name:o['Название бригады'],category:o['Категория'],specialization:o['Специализация'],workTypes:o['Виды работ']||o['Профессии'],brigadeSize:o['Количество человек'],professions:o['Профессии'],city:o['Город'],mobility:o['Мобильность'],workType:o['Формат сотрудничества']||o['Тип работы'],languages:o['Языки'],languageLevel:o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],transport:o['Транспорт'],skills:o['Навыки'],qualification:o['Квалификация'],housing:o['Жильё'],description:o['Описание'],photo:o['Фото']};});try{CacheService.getScriptCache().put(ck,JSON.stringify(out),300);}catch(e){}return out;}
function searchBrigadeRequests(f){f=f||{};var ck='SEARCH_BRIGADE_REQUESTS_V2_'+Utilities.base64EncodeWebSafe(JSON.stringify(f));try{var hit=CacheService.getScriptCache().get(ck);if(hit)return JSON.parse(hit);}catch(e){}var out=searchSheet('Ищу бригаду','Опубликована','brigade_request_id',f,function(o){return {brigade_request_id:o.brigade_request_id,profession:o['Профессия'],category:o['Категория'],specialization:o['Специализация'],workTypes:o['Виды работ']||o['Профессия'],city:o['Город'],brigadeSize:o['Количество человек'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты'],schedule:o['График'],housing:o['Жильё'],description:o['Описание']};});try{CacheService.getScriptCache().put(ck,JSON.stringify(out),300);}catch(e){}return out;}
function splitTaxValues_(v){return taxonomySplit_(v).map(function(x){return taxonomyNormalize_(x);}).filter(Boolean);}
function taxExactOrRelated_(haystack,target){return crossTaxonomyScore_(haystack,target);}

// V43: explicit cross-search graph. A query is never expanded into a broad OR
// of all related/adjacent words. Only declared profession relations and declared
// brigade specializations are allowed to produce secondary matches.
var CROSS_SPECIALIZATION_PROFESSIONS_V2={'Монолит':['Бетонщик','Арматурщик','Опалубщик'],'Бетонные работы':['Бетонщик'],'Арматурные работы':['Арматурщик'],'Опалубка':['Опалубщик'],'Фундаменты':['Бетонщик'],'Кладка':['Каменщик'],'Кладка кирпича':['Каменщик'],'Кладка блоков':['Каменщик'],'Газобетон':['Каменщик'],'Фасадные работы':['Фасадчик'],'Утепление фасадов':['Фасадчик'],'Штукатурные работы':['Штукатур'],'Малярные работы':['Маляр'],'Шпаклёвка':['Маляр'],'Гипсокартон':['Гипсокартонщик'],'Плиточные работы':['Плиточник'],'Кровельные работы':['Кровельщик'],'Плотницкие работы':['Плотник'],'Столярные работы':['Столяр'],'Демонтаж':['Демонтажник'],'Земляные работы':['Землекоп','Экскаваторщик'],'Дорожные работы':['Дорожный рабочий'],'Благоустройство':['Рабочий по благоустройству','Садовник'],'Сантехника':['Сантехник'],'Отопление':['Монтажник отопления'],'Вентиляция':['Монтажник вентиляции'],'Электромонтаж':['Электромонтажник','Электрик'],'Слаботочные системы':['Слаботочник'],'Сварка':['Сварщик'],'Металлоконструкции':['Монтажник металлоконструкций']};
var CROSS_PROFESSION_RELATIONS_V2={'Каменщик':[],'Бетонщик':['Арматурщик','Опалубщик'],'Арматурщик':['Бетонщик','Опалубщик'],'Монтажник':[],'Монтажник окон':[],'Плиточник':[],'Штукатур':['Маляр','Фасадчик','Гипсокартонщик'],'Маляр':['Штукатур','Гипсокартонщик'],'Фасадчик':['Штукатур'],'Кровельщик':['Плотник'],'Сантехник':[],'Столяр':['Плотник'],'Плотник':['Кровельщик','Столяр','Опалубщик'],'Гипсокартонщик':['Штукатур','Маляр'],'Прораб':[],'Инженер-строитель':[],'Экскаваторщик':['Оператор спецтехники'],'Оператор спецтехники':['Экскаваторщик'],'Разнорабочий на стройке':[],'Монтажник металлоконструкций':['Сварщик'],'Изолировщик':[],'Мастер по ремонту':[],'Электромонтажник':[],'Другой специалист':[]};
function crossRelationProfile_(query){var q=String(query||'').trim(),p=null,sp=null;try{sp=taxonomyFindBrigade_(q);p=taxonomyFind_(q);}catch(e){}var canonical=taxonomyNormalize_((p&&p.name)||(sp&&sp.name)||q),prof={},spec={},alias={};function add(o,v){var n=taxonomyNormalize_(v);if(n)o[n]=String(v);}if(p){add(prof,p.name);(p.searchVariants||[]).concat(p.trueSynonyms||[],p.colloquial||[],p.czech||[]).forEach(function(v){add(alias,v);});(CROSS_PROFESSION_RELATIONS_V2[p.name]||[]).forEach(function(v){add(prof,v);});}if(sp){add(spec,sp.name);(sp.searchVariants||[]).concat(sp.trueSynonyms||[],sp.colloquial||[],sp.czech||[]).forEach(function(v){add(alias,v);});(CROSS_SPECIALIZATION_PROFESSIONS_V2[sp.name]||[]).forEach(function(pp){add(prof,pp);});}add(alias,q);if(!p&&!sp)add(prof,q);return{canonical:canonical,professionNames:prof,specializations:spec,aliases:alias,profession:p,brigadeSpecialization:sp};}
function crossTokenMatches_(token,dict){var n=taxonomyNormalize_(token);if(!n)return false;if(dict[n])return true;var p=taxonomyFind_(n);return !!(p&&dict[taxonomyNormalize_(p.name)]);}
function crossEntityScoreV2_(fields,rel,kind){var vals=taxonomySplit_(fields),best=0;for(var i=0;i<vals.length;i++){var v=vals[i];if(crossTokenMatches_(v,rel.aliases))best=Math.max(best,95);if(kind==='candidate'){if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,100);}else{if(crossTokenMatches_(v,rel.specializations))best=Math.max(best,100);if(crossTokenMatches_(v,rel.professionNames))best=Math.max(best,90);}}return best;}
function crossQueryTerms_(q){q=String(q||'').trim();return q?[q]:[];}
function crossTaxonomyScore_(candidate,query){return crossEntityScoreV2_(candidate,crossRelationProfile_(query),'candidate');}
function crossScoreFields_(fields,terms){var best=0;(terms||[]).forEach(function(q){best=Math.max(best,crossTaxonomyScore_(fields,q)*15);});return best;}
function crossSearchSheetV2_(sheetName,status,idHeader,query,filters,mapper,kind){filters=filters||{};query=String(query||'').trim();if(!query)return[];var rel=crossRelationProfile_(query),s=getSheet(sheetName);if(!s||s.getLastRow()<2)return[];var h=getHeaders(s),v=s.getDataRange().getValues(),out=[];v.slice(1).forEach(function(r){var o=rowObject(h,r);if(status&&String(o['Статус']||'')!==status)return;if(filters.category&&!eq(o['Категория'],filters.category))return;if(filters.city&&!cityMatch(o,filters.city))return;var fields=kind==='candidate'?[o['Профессия'],o['Желаемая должность']].filter(Boolean).join(' | '):kind==='brigade'?[o['Название бригады'],o['Специализация'],o['Виды работ'],o['Профессии']].filter(Boolean).join(' | '):[o['Профессия'],o['Специализация'],o['Виды работ']].filter(Boolean).join(' | ');var score=crossEntityScoreV2_(fields,rel,kind);if(!score)return;out.push({score:score,ts:new Date(o['Дата обновления']||o['Дата создания']||0).getTime()||0,item:mapper(o)});});out.sort(function(a,b){return b.score-a.score||b.ts-a.ts;});return out.slice(0,100).map(function(x){return x.item;});}
function crossSearchCandidatesV2_(q,f){
  return crossSearchSheetV2_('Объявления соискателей','Опубликован','announcement_id',q,f,function(o){
    return publicCandidateAnnouncement_(o,{},false);
  },'candidate');
}
function crossSearchBrigadesV2_(q,f){return crossSearchSheetV2_('Бригады','Опубликован','brigade_id',q,f,function(o){return {brigade_id:o.brigade_id,name:o['Название бригады'],category:o['Категория'],specialization:o['Специализация'],workTypes:o['Виды работ']||o['Профессии'],brigadeSize:o['Количество человек'],professions:o['Профессии'],city:o['Город'],mobility:o['Мобильность'],workType:o['Формат сотрудничества']||o['Тип работы'],languages:o['Языки'],languageLevel:o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],transport:o['Транспорт'],skills:o['Навыки'],qualification:o['Квалификация'],housing:o['Жильё'],description:o['Описание'],photo:o['Фото']};},'brigade');}
function crossSearchVacanciesV2_(q,f){return crossSearchSheetV2_('Вакансии','Опубликована','ID',q,f,function(o){return {id:o.ID,title:o['Название вакансии'],profession:o['Профессия'],category:o['Категория'],city:o['Город'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты'],housing:o['Жильё'],workType:o['Тип работы'],employmentType:o['Занятость'],schedule:o['График'],languages:o['Языки'],languageLevel:o['Требования к языку']||o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],drivingLicenses:o['Водительские права'],licenseCategories:o['Категории прав'],automobile:o['Автомобиль'],qualification:o['Квалификация'],age18:o['18+'],skills:o['Навыки'],readyDate:o['Дата начала'],description:o['Описание'],contact:o['Контакт'],telegram:o['Telegram']};},'vacancy');}
function crossSearchRequestsV2_(q,f){return crossSearchSheetV2_('Ищу бригаду','Опубликована','brigade_request_id',q,f,function(o){return {brigade_request_id:o.brigade_request_id,profession:o['Профессия'],category:o['Категория'],specialization:o['Специализация'],workTypes:o['Виды работ']||o['Профессия'],city:o['Город'],brigadeSize:o['Количество человек'],salaryFrom:o['Зарплата от'],salaryTo:o['Зарплата до'],salaryUnit:o['Единица оплаты'],schedule:o['График'],housing:o['Жильё'],description:o['Описание']};},'request');}
function searchCrossMatches(f){
  f=f||{};var q=String(f.query||f.profession||'').trim();if(!q)return{primary:[],secondary:[],secondaryType:''};
  var mode=String(f.mode||'candidates'),key='CROSS_V45_'+Utilities.base64EncodeWebSafe(JSON.stringify({q:q,mode:mode,category:f.category||'',city:f.city||''}));
  try{var hit=CacheService.getScriptCache().get(key);if(hit)return JSON.parse(hit);}catch(e){}
  var primary=[],secondary=[],secondaryType='',pf=Object.assign({},f,{query:q});
  if(mode==='candidates'){primary=crossSearchCandidatesV2_(q,pf);secondary=crossSearchBrigadesV2_(q,pf);secondaryType='brigades';}
  else if(mode==='brigades'){primary=crossSearchBrigadesV2_(q,pf);secondary=crossSearchCandidatesV2_(q,pf);secondaryType='candidates';}
  else if(mode==='vacancies'){primary=crossSearchVacanciesV2_(q,pf);secondary=crossSearchRequestsV2_(q,pf);secondaryType='brigadeRequests';}
  else{primary=crossSearchRequestsV2_(q,pf);secondary=crossSearchVacanciesV2_(q,pf);secondaryType='vacancies';}
  var out={primary:primary,secondary:secondary,secondaryType:secondaryType};try{CacheService.getScriptCache().put(key,JSON.stringify(out),120);}catch(e2){}return out;
}

function publicCandidateCachePropertyKey_(id){return 'PUBLIC_PROFILE_DATA_'+String(id||'');}
function cachePublicCandidateProfilePersistent_(id,profile){
  if(!id||!profile)return;
  try{PropertiesService.getScriptProperties().setProperty(publicCandidateCachePropertyKey_(id),JSON.stringify(profile));}catch(e){console.warn('Не удалось сохранить профиль в persistent cache:',e);}
}
function getPersistentPublicCandidateProfile_(id){
  if(!id)return null;
  try{var raw=PropertiesService.getScriptProperties().getProperty(publicCandidateCachePropertyKey_(id));if(raw)return JSON.parse(raw);}catch(e){console.warn('Не удалось прочитать persistent cache профиля:',e);}
  return null;
}
function candidatePrefillPropertyKey_(uid){return 'CANDIDATE_PREFILL_'+String(uid||'');}
function candidatePrefillCacheKey_(uid){return 'CANDIDATE_PREFILL_CACHE_'+String(uid||'');}
function cacheCandidatePrefillPersistent_(uid,profile){
  if(!uid||!profile)return;
  var raw=JSON.stringify(profile);
  try{CacheService.getScriptCache().put(candidatePrefillCacheKey_(uid),raw,21600);}catch(e){}
  try{PropertiesService.getScriptProperties().setProperty(candidatePrefillPropertyKey_(uid),raw);}catch(e){}
}
function getCandidatePrefill(uid,firstName,lastName,telegramUsername){
  uid=String(uid||'').trim();
  if(!uid)return{ok:false,error:'Не указан пользователь'};
  try{
    var fast=CacheService.getScriptCache().get(candidatePrefillCacheKey_(uid));
    if(fast){var fp=JSON.parse(fast);if(fp)return{ok:true,profile:fp,cached:true,source:'cache'};}
  }catch(e){}
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(candidatePrefillPropertyKey_(uid));
    if(raw){
      var cached=JSON.parse(raw);
      if(cached){
        try{CacheService.getScriptCache().put(candidatePrefillCacheKey_(uid),raw,21600);}catch(e){}
        return{ok:true,profile:cached,cached:true,source:'persistent'};
      }
    }
  }catch(e){}
  var rows=rowsByColumnValueFast_('Соискатели','user_id',uid);
  if(!rows.length){
    var cs=getSheet('Соискатели');ensureHeaders(cs,DB_HEADERS['Соискатели']);
    var ch=getHeaders(cs),pid=generateUniqueEntityId('CAND','Соискатели'),now=new Date();
    var nm=[String(firstName||''),String(lastName||'')].filter(Boolean).join(' ').trim();
    var cm={'profile_id':pid,'user_id':uid,'Дата создания':now,'Дата обновления':now,'Дата обновления профиля':now,'Статус':'Активен','Имя':nm,'Образование':'','Профессии и навыки':'','Языки':'','Уровень языка':'','Документы':'','Водительские права':'','Категории прав':'','Автомобиль':'','Контакт':'','Telegram':String(telegramUsername||'').replace(/^@/,''),'Telegram ID':uid,'Файл резюме':'','Фото':'','Контакты опубликованы':'Нет','Согласие на публикацию контактов':'Да','Дата согласия':now,'Доступ к контактам':'Открыт','Статус оплаты':'','Стоимость контакта':'','Сгенерированная картинка':''};
    cs.getRange(cs.getLastRow()+1,1,1,ch.length).setValues([ch.map(function(k){return cm[k]!==undefined?cm[k]:'';})]);
    rows=[cm];cacheCandidatePrefillPersistent_(uid,publicCandidate(cm,true));invalidateMyProfilesCache(uid);
  }
  rows.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
  var profile=publicCandidate(rows[0],true);
  cacheCandidatePrefillPersistent_(uid,profile);
  return{ok:true,profile:profile,cached:false,source:'sheet'};
}
function getCandidateProfile(id){
  id=String(id||'').trim();
  if(!id)return{ok:false,error:'Профиль не найден'};
  var persistent=getPersistentPublicCandidateProfile_(id);
  if(persistent)return{ok:true,profile:persistent,cached:true,source:'persistent'};
  var cached=getCachedPublicCandidateProfile(id);
  if(cached){cachePublicCandidateProfilePersistent_(id,cached);return{ok:true,profile:cached,cached:true,source:'cache'};}
  var o=getById('Соискатели',id,'profile_id');
  if(!o)return{ok:false,error:'Профиль не найден'};
  var profile=publicCandidate(o,true);
  try{cacheCandidatePrefillPersistent_(profile.user_id,profile);}catch(e){}
  cachePublicCandidateProfile(id,profile);
  cachePublicCandidateProfilePersistent_(id,profile);
  return{ok:true,profile:profile,cached:false};
}
function getPublicCandidateProfile_(d){
  var id=String(d.profileId||d.profile_id||'').trim();if(!id)return{ok:false,error:'Профиль не найден'};
  var r=cachedEntityResponse_('PUBLIC_CANDIDATE_PROFILE_'+id,function(){var o=getById('Соискатели',id,'profile_id');if(!o||String(o['Статус']||'')==='Удалён')return null;return publicCandidate(o,false);},'data','Профиль не найден');
  if(r&&r.data)return{ok:true,cached:r.cached,profile:r.data};return r;
}

function getCandidatePremiumPreview(d){
  var uid=String(d.userId||d.user_id||''),aid=String(d.announcementId||d.announcement_id||'');
  if(uid!==String(ADMIN_ID))return{ok:false,error:'Premium-доступ ещё не открыт'};
  var pack=candidateAnnouncementForPremium_(aid);if(!pack)return{ok:false,error:'Объявление не найдено'};
  var key='PREMIUM_PREVIEW_PDF_'+aid,pdf='';
  try{pdf=String(CacheService.getScriptCache().get(key)||'');}catch(e){}
  return{ok:true,test:true,announcement:pack.announcement,profile:publicCandidate(pack.profile,true),pdfUrl:pdf};
}

function getPublicFavoriteEntity(d){
  var type=String(d.type||d.entityType||'').trim(),id=String(d.id||d.entityId||'').trim();
  try{id=decodeURIComponent(id);}catch(e){}
  if(!type||!id)return{ok:false,error:'Не указан тип или ID'};
  if(type==='candidate'){var c=getPublicCandidateAnnouncement({announcementId:id});if(c&&c.ok)return c;return c||{ok:false,error:'Объявление не найдено'};}
  if(type==='vacancy'){var v=getPublicVacancyAnnouncement({vacancyId:id});if(v&&v.ok)return v;return v||{ok:false,error:'Вакансия не найдена'};}
  if(type==='brigade'){var b=getBrigade(id);if(b&&b.ok)return b;return b||{ok:false,error:'Бригада не найдена'};}
  if(type==='request'){var r=getBrigadeRequest(id);if(r&&r.ok)return r;return r||{ok:false,error:'Запрос не найден'};}
  return{ok:false,error:'Неизвестный тип сохранения'};
}

function getPublicVacancyAnnouncement(d){
  var id=String(d.vacancyId||d.announcementId||d.announcement_id||'').trim();if(!id)return{ok:false,error:'Вакансия не найдена'};
  var persisted=getPublicEntityPersistent_('vacancy',id);if(persisted)return{ok:true,cached:true,vacancy:persisted};
  var r=cachedEntityResponse_('VACANCY_PUBLIC_'+id,function(){var a=getById('Вакансии',id,'ID');if(!a||String(a['Статус']||'')!=='Опубликована')return null;cachePublicEntityPersistent_('vacancy',id,a);return a;},'data','Вакансия не найдена');
  if(r&&r.data)return{ok:true,cached:r.cached,vacancy:r.data};return r;
}
function getVacancyPremiumPreview(d){
  var uid=String(d.userId||d.user_id||''),id=String(d.vacancyId||d.announcementId||d.announcement_id||'');
  if(uid!==String(ADMIN_ID))return{ok:false,error:'Premium-доступ ещё не открыт'};
  var a=getById('Вакансии',id,'ID');if(!a)return{ok:false,error:'Вакансия не найдена'};
  return{ok:true,test:true,vacancy:a};
}

function getPublicCandidateAnnouncement(d){
  var id=canonicalCandidateAnnouncementId_(d.announcementId||d.announcement_id);if(!id)return{ok:false,error:'Объявление не найдено'};
  var persisted=getPublicEntityPersistent_('candidateAnnouncement',id);if(persisted)return{ok:true,cached:true,announcement:persisted.announcement,profile:persisted.profile};
  var r=cachedEntityResponse_('CAND_ANN_PUBLIC_'+id,function(){var a=getById('Объявления соискателей',id,'announcement_id');if(!a||String(a['Статус']||'')!=='Опубликован')return null;var p=getById('Соискатели',String(a.profile_id||''),'profile_id')||{};var pack={announcement:a,profile:publicCandidateAnnouncement_(a,p,false)};cachePublicEntityPersistent_('candidateAnnouncement',id,pack);return pack;},'data','Объявление не найдено');
  if(r&&r.data)return{ok:true,cached:r.cached,announcement:r.data.announcement,profile:r.data.profile};return r;
}

function getCandidateAnnouncement(id,uid){
  id=String(id||'').trim();uid=String(uid||'').trim();
  if(!id)return{ok:false,error:'Объявление не найдено'};
  var o=getById('Объявления соискателей',id,'announcement_id');
  if(!o||String(o.user_id||'')!==uid)return{ok:false,error:'Объявление не найдено'};
  var p=getById('Соискатели',String(o.profile_id||''),'profile_id')||{};
  return{ok:true,announcement:o,profile:publicCandidate(p,true)};
}
function candidateAnnouncementRowsForProfile_(profileId,uid){
  var out=[],s=getSheet('Объявления соискателей');
  if(s.getLastRow()>1){
    var h=getHeaders(s),v=s.getDataRange().getValues();
    for(var i=1;i<v.length;i++){var o=rowObject(h,v[i]);if(String(o.profile_id||'')===String(profileId||'')&&(!uid||String(o.user_id||'')===String(uid)))out.push(o);}
  }
  return out;
}
function ensureCandidateLegacyAnnouncement_(profileRow){
  if(!profileRow||!profileRow.profile_id)return;
  var status=String(profileRow['Статус']||'');
  if(['На модерации','Публикуется','Опубликован','Отклонена','Отклонён'].indexOf(status)<0 && !profileRow['Telegram Message ID'] && !profileRow['Moderation Message ID'])return;
  var id=String(profileRow.profile_id);
  if(getById('Объявления соискателей',id,'announcement_id'))return;
  var s=getSheet('Объявления соискателей');ensureHeaders(s,CANDIDATE_ANNOUNCEMENT_HEADERS);
  var h=getHeaders(s),map={'announcement_id':id,'profile_id':profileRow.profile_id,'user_id':profileRow.user_id,'Дата создания':profileRow['Дата создания']||new Date(),'Дата обновления':profileRow['Дата обновления']||new Date(),'Статус':status||'Опубликован','Тип объявления':'Ищу работу','Имя':profileRow['Имя'],'Желаемая должность':profileRow['Желаемая должность'],'Профессия':profileRow['Профессия'],'Категория':profileRow['Категория'],'Город':profileRow['Город'],'Вся Чехия':profileRow['Готов по всей Чехии'],'Желаемая зарплата от':profileRow['Желаемая зарплата от'],'Желаемая зарплата до':profileRow['Желаемая зарплата до'],'Единица оплаты':profileRow['Единица оплаты'],'Тип работы':profileRow['Тип работы'],'Тип занятости':profileRow['Тип занятости'],'График':profileRow['График'],'Жильё':profileRow['Жильё'],'Языки':profileRow['Языки'],'Уровень языка':profileRow['Уровень языка'],'Документы':profileRow['Документы'],'Опыт':profileRow['Опыт'],'Водительские права':profileRow['Водительские права'],'Категории прав':profileRow['Категории прав'],'Автомобиль':profileRow['Автомобиль'],'Квалификация':profileRow['Квалификация'],'Навыки':profileRow['Навыки'],'Дата готовности к работе':profileRow['Дата готовности к работе'],'О себе':profileRow['О себе'],'Контакт':profileRow['Контакт'],'Telegram':profileRow['Telegram'],'Telegram Message ID':profileRow['Telegram Message ID'],'Moderation Message ID':profileRow['Moderation Message ID']};
  s.appendRow(h.map(function(k){return map[k]!==undefined?map[k]:'';}));
}
function rowsByColumnValueFast_(sheetName,columnName,value){
  var s=getSheet(sheetName);if(!s||s.getLastRow()<2)return[];
  var h=getHeaders(s),c=h.indexOf(columnName);if(c<0)return[];
  var finder=s.getRange(2,c+1,s.getLastRow()-1,1).createTextFinder(String(value||'')).matchEntireCell(true),out=[],cell;
  while((cell=finder.findNext())){
    var row=cell.getRow();out.push(rowObject(h,s.getRange(row,1,1,h.length).getValues()[0]));
  }
  return out;
}
function rowsByAnyColumnValueFast_(sheetName,tests){
  var out=[],seen={};
  (tests||[]).forEach(function(t){rowsByColumnValueFast_(sheetName,t.column,t.value).forEach(function(o){var key=String(o[t.idHeader||'ID']||o.profile_id||o.brigade_id||o.brigade_request_id||o.employer_id||o.announcement_id||Math.random());if(!seen[key]){seen[key]=1;out.push(o);}});});
  return out;
}
function getMyCandidateProfile(d){
  var uid=String(d.userId||d.user_id||'');
  if(!uid)return{ok:false,error:'Не удалось определить пользователя'};
  var profiles=rowsByColumnValueFast_('Соискатели','user_id',uid);
  if(!profiles.length)return{ok:true,profile:null,announcements:[]};
  profiles.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
  var profile=profiles[0];
  try{cacheCandidatePrefillPersistent_(uid,publicCandidate(profile,true));}catch(e){}
  var anns=rowsByColumnValueFast_('Объявления соискателей','profile_id',profile.profile_id).filter(function(o){return String(o.user_id||'')===uid;});
  anns.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
  return{ok:true,profile:publicCandidate(profile,true),rawProfile:profile,announcements:anns};
}
function rememberUserEntityIndex_(x){try{var uid=String(x&&x.userId||'');if(!uid)return;var key='USER_ENTITY_INDEX_'+uid,raw=CacheService.getScriptCache().get(key),a=raw?JSON.parse(raw):[];var t=String(x.type||'');if(t==='Ищу работу'&&a.indexOf('candidate')<0)a.push('candidate');if((t==='Предлагаю работу'||t==='Ищу бригаду')&&a.indexOf('employer')<0)a.push('employer');if(t==='Предлагаю работу'&&a.indexOf('vacancy')<0)a.push('vacancy');if(t==='Бригада ищет работу'&&a.indexOf('brigade')<0)a.push('brigade');if(t==='Ищу бригаду'&&a.indexOf('request')<0)a.push('request');CacheService.getScriptCache().put(key,JSON.stringify(a),21600);}catch(e){}}
function getUserEntityIndex_(uid){try{var raw=CacheService.getScriptCache().get('USER_ENTITY_INDEX_'+String(uid||''));return raw?JSON.parse(raw):null;}catch(e){return null;}}
function getMyProfiles(uid){
  uid=String(uid||'');
  var result={ok:true,user_id:uid,candidates:[],employers:[],brigades:[],brigadeRequests:[],vacancies:[]};
  if(!uid)return result;
  var cache=CacheService.getScriptCache(),ck='MYPROFILES_V4_'+uid;
  try{var hit=cache.get(ck);if(hit)return JSON.parse(hit);}catch(e){}
  // Не полагаемся только на USER_ENTITY_INDEX_: он может устареть и из-за этого
  // ранее созданный профиль работодателя пропадал из «Моего профиля».
  var candidateRows=rowsByColumnValueFast_('Соискатели','user_id',uid);
  if(candidateRows.length){
    candidateRows.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
    var canonical=candidateRows[0],anns=rowsByColumnValueFast_('Объявления соискателей','profile_id',canonical.profile_id).filter(function(a){return String(a.user_id||'')===uid && ['Удалено'].indexOf(String(a['Статус']||''))<0;});
    anns.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
    var c=publicCandidate(canonical,true);c.announcements=anns;result.candidates=[c];try{cacheCandidatePrefillPersistent_(uid,c);}catch(e){}
  }
  var vacancyRows=rowsByColumnValueFast_('Вакансии','user_id',uid);
  vacancyRows.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});
  vacancyRows=vacancyRows.filter(function(v){return ['Удалена'].indexOf(String(v['Статус']||''))<0;});
  result.vacancies=vacancyRows.map(function(v){var fixed=normalizeLegacyVacancyObject(v);return fixed.__legacyShifted?fixed:v;});
  var employerRows=rowsByColumnValueFast_('Работодатели','user_id',uid);
  result.employers=employerRows.map(function(e){
    var id=String(e.employer_id||'');
    e.announcements=vacancyRows.filter(function(v){return String(v.employer_id||'')===id||(!v.employer_id&&String(e.user_id||'')===uid);});
    return e;
  });
  if(result.employers.length===1&&result.employers[0].announcements.length===0&&vacancyRows.length)result.employers[0].announcements=vacancyRows.slice();
  result.brigades=rowsByColumnValueFast_('Бригады','user_id',uid).map(function(b){b.announcements=[b];return b;});
  result.brigadeRequests=rowsByColumnValueFast_('Ищу бригаду','user_id',uid);
  // Premium и Избранное НЕ загружаем здесь: это тяжёлые независимые разделы.
  // Профиль должен вернуться сразу, а эти данные клиент подгружает отдельно.
  result.premiumCandidates=[];
  result.favorites=[];
  try{
    cache.put(ck,JSON.stringify(result),900);
    cache.put('USER_ENTITY_INDEX_'+uid,JSON.stringify([result.candidates.length?'candidate':'',result.employers.length?'employer':'',result.vacancies.length?'vacancy':'',result.brigades.length?'brigade':'',result.brigadeRequests.length?'request':''].filter(Boolean)),21600);
  }catch(e){}
  return result;
}


function canonicalCandidateAnnouncementId_(id){var raw=String(id||'').trim();if(!raw)return '';try{raw=decodeURIComponent(raw);}catch(e){}var direct=getById('Объявления соискателей',raw,'announcement_id');if(direct)return raw;var alt=raw.replace(/^_+/,'');if(alt&&alt!==raw){var a2=getById('Объявления соискателей',alt,'announcement_id');if(a2)return alt;}var prof=getById('Соискатели',raw,'profile_id');if(prof){var rows=rowsByColumnValueFast_('Объявления соискателей','profile_id',raw).filter(function(a){return ['Опубликован','Опубликована'].indexOf(String(a['Статус']||''))>=0;});rows.sort(function(a,b){return new Date(b['Дата обновления']||b['Дата создания']||0)-new Date(a['Дата обновления']||a['Дата создания']||0);});if(rows.length&&rows[0].announcement_id)return String(rows[0].announcement_id);}return raw;}

function deleteEntity(d){
  var uid=String(d.userId||d.user_id||'').trim(),type=String(d.entityType||d.type||'').trim(),id=String(d.entityId||d.id||'').trim();if(!uid||!type||!id)return{ok:false,error:'Не указан пользователь, тип или ID'};
  var spec={candidateAnnouncement:['Объявления соискателей','announcement_id'],vacancy:['Вакансии','ID'],brigade:['Бригады','brigade_id'],request:['Ищу бригаду','brigade_request_id']}[type];if(!spec)return{ok:false,error:'Этот тип нельзя удалить'};
  var o=rowOwnedByUser(spec[0],id,spec[1],uid);if(!o)return{ok:false,error:'Нет доступа к объявлению'};
  var deleted=type==='candidateAnnouncement'?'Удалено':type==='vacancy'?'Удалена':type==='brigade'?'Удалена':'Удалён';
  var updated=setRowFields(spec[0],id,spec[1],{'Статус':deleted});
  var msgId=String(o['Telegram Message ID']||'').trim(),channel=type==='candidateAnnouncement'?JOB_SEEKERS_CHANNEL_USERNAME:type==='brigade'?BRIGADES_CHANNEL_USERNAME:type==='request'?BRIGADE_REQUESTS_CHANNEL_USERNAME:CHANNEL_USERNAME;
  // База — источник истины: сначала деактивируем запись, затем best-effort удаляем пост.
  if(msgId){try{telegramRequest('deleteMessage',{chat_id:channel,message_id:msgId});}catch(e){console.warn('Не удалось удалить Telegram-пост:',e);}}
  invalidateMyProfilesCache(uid);
  try{CacheService.getScriptCache().remove('MYFAVORITES_V2_'+uid);}catch(e){}if(type==='candidateAnnouncement')invalidatePublicCandidateProfile(String(o.profile_id||''));else if(type==='vacancy'){try{CacheService.getScriptCache().remove('VACANCY_PUBLIC_'+id);CacheService.getScriptCache().remove('VACANCY_'+id);}catch(e){}}else if(type==='brigade'){try{CacheService.getScriptCache().remove('BRIGADE_'+id);}catch(e){}clearPublicEntityPersistent_('brigade',id);}else if(type==='request'){try{CacheService.getScriptCache().remove('BRIGADE_REQUEST_'+id);}catch(e){}clearPublicEntityPersistent_('request',id);}
  return{ok:true,id:id,type:type,status:deleted};
}

function getSubmissionStatus(d){
  var sid=clean(d.submissionId||d.submission_id);
  if(!sid)return{ok:false,error:'Не указан submissionId'};
  var raw=PropertiesService.getScriptProperties().getProperty('SUBMISSION_ENTITY_'+sid);
  if(!raw)return{ok:true,ready:false};
  var o;try{o=JSON.parse(raw);}catch(e){return{ok:true,ready:false};}
  if(d.userId && String(o.userId||'')!==String(d.userId||''))return{ok:false,error:'Нет доступа'};
  return{ok:true,ready:true,id:String(o.id||''),type:String(o.type||'')};
}

function uploadFileForEntity(d){
  var uid=clean(d.userId||d.user_id);
  var entityId=clean(d.entityId||d.profileId||d.brigadeId);
  var kind=clean(d.fileKind);
  var dataUrl=d.dataUrl||'';
  if(!uid)throw new Error('Не удалось определить пользователя');
  if(!entityId)throw new Error('Не указан ID профиля');
  if(!dataUrl)throw new Error('Файл не передан');
  var sheetName='',idHeader='',columnName='',label='';
  if(kind==='candidatePhoto'){sheetName='Соискатели';idHeader='profile_id';columnName='Фото';label='Фото соискателя';}
  else if(kind==='candidateResume'){sheetName='Соискатели';idHeader='profile_id';columnName='Файл резюме';label='Резюме';}
  else if(kind==='brigadePhoto'){sheetName='Бригады';idHeader='brigade_id';columnName='Фото';label='Фото бригады';}
  else if(kind==='brigadeFile'){sheetName='Бригады';idHeader='brigade_id';columnName='Файлы';label='Файл бригады';}
  else if(kind==='generatedCard'){
    var et=clean(d.entityType||'');
    if(et==='Ищу работу'||et==='candidate'){sheetName='Соискатели';idHeader='profile_id';}
    else if(et==='Бригада ищет работу'||et==='brigade'){sheetName='Бригады';idHeader='brigade_id';}
    else if(et==='Ищу бригаду'||et==='request'){sheetName='Ищу бригаду';idHeader='brigade_request_id';}
    else {sheetName='Вакансии';idHeader='ID';}
    columnName='Сгенерированная картинка';label='Сгенерированная карточка';
  }
  else throw new Error('Неизвестный тип файла');
  var o=getById(sheetName,entityId,idHeader);
  if(!o)throw new Error('Профиль не найден');
  if(String(o.user_id||'')!==String(uid))throw new Error('Нет доступа к этому профилю');
  var url=saveUploadedFile(dataUrl,label);
  var s=getSheet(sheetName),h=getHeaders(s),row=findRowByIdFast(s,entityId,idHeader),c=h.indexOf(columnName);
  if(!row||c<0)throw new Error('Не удалось сохранить файл');
  s.getRange(row,c+1).setValue(url);
  var upd=h.indexOf('Дата обновления');
  if(upd>=0)s.getRange(row,upd+1).setValue(new Date());
  if(kind==='generatedCard'&&sheetName==='Соискатели'&&d.announcementId){
    var as=getSheet('Объявления соискателей'),ah=getHeaders(as),ar=findRowByIdFast(as,String(d.announcementId),'announcement_id'),ac=ah.indexOf('Сгенерированная картинка');
    if(ar&&ac>=0){as.getRange(ar,ac+1).setValue(url);var au=ah.indexOf('Дата обновления');if(au>=0)as.getRange(ar,au+1).setValue(new Date());}
  }
  if(sheetName==='Соискатели'){
    invalidateMyProfilesCache(uid);
    var fresh=getById('Соискатели',entityId,'profile_id');
    if(fresh){var cp=publicCandidate(fresh,true);cachePublicCandidateProfile(entityId,cp);cachePublicCandidateProfilePersistent_(entityId,cp);}
  }
  if(kind==='generatedCard'){
    try{CacheService.getScriptCache().remove(sheetName==='Вакансии'?'VACANCY_'+entityId:sheetName==='Бригады'?'BRIGADE_'+entityId:sheetName==='Ищу бригаду'?'BRIGADE_REQUEST_'+entityId:'MYPROFILES_V3_'+uid);}catch(e){}
    try{invalidateMyProfilesCache(uid);}catch(e){}
  }
  return {ok:true,url:url,entityId:entityId,fileKind:kind};
}

function saveUploadedFile(dataUrl,label){
  if(!dataUrl)return '';
  var m=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if(!m)throw new Error(label+': неверный файл');
  var mime=String(m[1]).toLowerCase();
  var bytes=Utilities.base64Decode(m[2]);
  var maxBytes=12*1024*1024;
  if(bytes.length>maxBytes)throw new Error(label+': файл больше 12 МБ');
  var isImage=mime==='image/jpeg'||mime==='image/jpg'||mime==='image/png'||mime==='image/webp';
  var isResume=mime==='application/pdf'||mime==='application/msword'||mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if(!isImage&&!isResume)throw new Error(label+': поддерживаются JPG, PNG, WEBP, PDF, DOC и DOCX');
  var folderName='Robota Czechia Uploads';
  var it=DriveApp.getFoldersByName(folderName),folder=it.hasNext()?it.next():DriveApp.createFolder(folderName);
  var ext=mime==='application/pdf'?'.pdf':mime==='application/msword'?'.doc':mime.indexOf('wordprocessingml.document')>=0?'.docx':'.'+mime.split('/')[1].replace('jpeg','jpg');
  var file=folder.createFile(Utilities.newBlob(bytes,mime,label+' '+new Date().getTime()+ext));
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){console.warn('Не удалось открыть файл по ссылке:',e);}
  var url=file.getUrl();
   if(isImage)return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(file.getId())+'&sz=w1200';
   return url;
}


function cachedEntityResponse_(key,loader,field,errorText){var cache=CacheService.getScriptCache();try{var hit=cache.get(key);if(hit)return{ok:true,cached:true,[field]:JSON.parse(hit)};}catch(e){}var o=loader();if(!o)return{ok:false,error:errorText};try{cache.put(key,JSON.stringify(o),300);}catch(e){}var out={ok:true};out[field]=o;return out;}
function publicEntityPersistentKey_(type,id){return 'PUBLIC_ENTITY_V41_'+String(type||'')+'_'+String(id||'');}
function cachePublicEntityPersistent_(type,id,data){if(!type||!id||!data)return;try{PropertiesService.getScriptProperties().setProperty(publicEntityPersistentKey_(type,id),JSON.stringify(data));}catch(e){console.warn('Persistent public cache failed:',e);}}
function getPublicEntityPersistent_(type,id){if(!type||!id)return null;try{var raw=PropertiesService.getScriptProperties().getProperty(publicEntityPersistentKey_(type,id));return raw?JSON.parse(raw):null;}catch(e){return null;}}
function clearPublicEntityPersistent_(type,id){try{PropertiesService.getScriptProperties().deleteProperty(publicEntityPersistentKey_(type,id));}catch(e){}}
function publicBrigade_(o){o=o||{};return {brigade_id:o.brigade_id,name:o['Название бригады'],category:o['Категория'],specialization:o['Специализация'],workTypes:o['Виды работ']||o['Профессии'],brigadeSize:o['Количество человек'],professions:o['Профессии'],city:o['Город'],allCzechia:o['Вся Чехия']==='Да',mobility:o['Мобильность'],workType:o['Формат сотрудничества']||o['Тип работы'],languages:o['Языки'],languageLevel:o['Уровень языка'],documents:o['Документы'],experience:o['Опыт'],transport:o['Транспорт'],skills:o['Навыки'],qualification:o['Квалификация'],housing:o['Жильё'],readyDate:o['Дата готовности к работе'],description:o['Описание'],photo:driveImageUrl(o['Фото']),contactAvailable:true};}
function getVacancy(id){id=String(id||'');var pc=getPublicEntityPersistent_('vacancy',id);if(pc)return{ok:true,cached:true,vacancy:pc};var r=cachedEntityResponse_('VACANCY_'+id,function(){var o=getById('Вакансии',id,'ID');if(o)cachePublicEntityPersistent_('vacancy',id,o);return o;},'vacancy','Вакансия не найдена');return r;}
function getBrigade(id){id=String(id||'');var pc=getPublicEntityPersistent_('brigade',id);if(pc)return{ok:true,cached:true,brigade:pc};var r=cachedEntityResponse_('BRIGADE_PUBLIC_'+id,function(){var o=getById('Бригады',id,'brigade_id');if(o){var pub=publicBrigade_(o);cachePublicEntityPersistent_('brigade',id,pub);return pub;}return null;},'brigade','Бригада не найдена');return r;}
function getBrigadeRequest(id){id=String(id||'');var pc=getPublicEntityPersistent_('request',id);if(pc)return{ok:true,cached:true,request:pc};return cachedEntityResponse_('BRIGADE_REQUEST_'+id,function(){var o=getById('Ищу бригаду',id,'brigade_request_id');if(o)cachePublicEntityPersistent_('request',id,o);return o;},'request','Запрос не найден');}
function getMyEmployer(d){var uid=String(d.userId||d.user_id||''),id=String(d.employerId||d.employer_id||''),ck='MYEMPLOYER_'+id;var cache=CacheService.getScriptCache();try{var hit=cache.get(ck);if(hit){var cached=JSON.parse(hit);if(String(cached.profile&&cached.profile.user_id||'')===uid)return cached;}}catch(e){}var o=getById('Работодатели',id,'employer_id');if(!o||String(o.user_id)!==uid)return{ok:false,error:'Профиль работодателя не найден'};var anns=rowsByColumnValueFast_('Вакансии','employer_id',id);if(!anns.length)anns=rowsByColumnValueFast_('Вакансии','user_id',uid).filter(function(v){return !v.employer_id;});anns=anns.map(function(x){var fixed=normalizeLegacyVacancyObject(x);return fixed.__legacyShifted?fixed:x;});var out={ok:true,profile:o,announcements:anns};try{cache.put(ck,JSON.stringify(out),300);}catch(e){}return out;}
function rowOwnedByUser(sheetName,id,idHeader,uid){var o=getById(sheetName,id,idHeader);if(!o)return null;if(String(o.user_id||'')!==String(uid||''))return null;return o;}
function setRowFields(sheetName,id,idHeader,fields){
  var s=getSheet(sheetName),h=getHeaders(s),rowNum=findRowByIdFast(s,id,idHeader);
  if(!rowNum)return null;
  var row=s.getRange(rowNum,1,1,h.length).getValues()[0];
  Object.keys(fields).forEach(function(k){var idx=h.indexOf(k);if(idx>=0)row[idx]=fields[k];});
  var upd=h.indexOf('Дата обновления');if(upd>=0)row[upd]=new Date();
  var textCols=['График','Дата начала','Дата готовности к работе'];
  textCols.forEach(function(name){if(h.indexOf(name)>=0)s.getRange(rowNum,h.indexOf(name)+1).setNumberFormat('@');});
  s.getRange(rowNum,1,1,row.length).setValues([row]);
  return rowObject(h,row);
}
function updateEmployer(d){var uid=String(d.userId||'');var id=String(d.employerId||'');var o=rowOwnedByUser('Работодатели',id,'employer_id',uid);if(!o)return{ok:false,error:'Нет доступа к профилю работодателя'};var updated=setRowFields('Работодатели',id,'employer_id',{'Компания':clean(d.company),'Контактное лицо':clean(d.contactPerson),'Телефон':clean(d.phone),'Telegram':clean(d.telegram),'Email':clean(d.email),'Город':clean(d.city),'Описание':clean(d.description),'Сайт':clean(d.site)});invalidateMyProfilesCache(uid);return{ok:true,profile:updated};}
function invalidateMyProfilesCache(uid){try{if(uid){var u=String(uid);CacheService.getScriptCache().remove('MYPROFILES_V4_'+u);CacheService.getScriptCache().remove('MYPROFILES_V3_'+u);CacheService.getScriptCache().remove('CANDIDATE_PREFILL_CACHE_'+u);}}catch(e){}}
function updateCandidateProfile(d){
  var uid=String(d.userId||d.user_id||''),id=String(d.profileId||d.profile_id||'');
  if(!uid||!id)return{ok:false,error:'Не указан пользователь или ID профиля'};
  var o=rowOwnedByUser('Соискатели',id,'profile_id',uid);if(!o)return{ok:false,error:'Профиль соискателя не найден'};
  var fields={'Имя':clean(d.candidateName||d.name),'Образование':clean(d.education),'Профессии и навыки':clean(d.professionalSkills),'Языки':normalizeProfileLanguages_(d.languages).join(', '),'Уровень языка':clean(d.languageLevel),'Документы':uniqueArr_(d.documents).join(', '),'Водительские права':clean(d.drivingLicenses),'Категории прав':uniqueArr_(d.licenseCategories).join(', '),'Автомобиль':clean(d.automobile),'Контакт':"'"+clean(d.contact),'Telegram':clean(d.telegram)};
  var updated=setRowFields('Соискатели',id,'profile_id',fields);if(!updated)return{ok:false,error:'Не удалось сохранить профиль'};
  if(d.education!==undefined||d.professionalSkills!==undefined){}
  invalidatePublicCandidateProfile(id);try{var cp=publicCandidate(updated,true);cachePublicCandidateProfile(id,cp);cachePublicCandidateProfilePersistent_(id,cp);cacheCandidatePrefillPersistent_(uid,cp);}catch(e){}invalidateMyProfilesCache(uid);
  return{ok:true,profile:cp};
}
function removeCandidateProfileFile(d){
  var uid=String(d.userId||d.user_id||''),id=String(d.profileId||d.profile_id||''),kind=String(d.fileKind||'');
  if(!uid||!id)return{ok:false,error:'Не указан пользователь или профиль'};
  if(kind!=='candidateResume'&&kind!=='candidatePhoto')return{ok:false,error:'Неизвестный тип файла'};
  var o=rowOwnedByUser('Соискатели',id,'profile_id',uid);if(!o)return{ok:false,error:'Профиль соискателя не найден'};
  var field=kind==='candidateResume'?'Файл резюме':'Фото';var updated=setRowFields('Соискатели',id,'profile_id',{});
  if(!updated)return{ok:false,error:'Не удалось обновить профиль'};
  var s=getSheet('Соискатели'),h=getHeaders(s),row=findRowByIdFast(s,id,'profile_id');if(row&&h.indexOf(field)>=0)s.getRange(row,h.indexOf(field)+1).setValue('');
  invalidatePublicCandidateProfile(id);var latest=getById('Соискатели',id,'profile_id');try{cacheCandidatePrefillPersistent_(uid,publicCandidate(latest,true));}catch(e){}invalidateMyProfilesCache(uid);return{ok:true,profile:latest};
}
function updateCandidateAnnouncement(d){
  var uid=String(d.userId||d.user_id||''),id=String(d.announcementId||d.announcement_id||'');
  if(!uid||!id)return{ok:false,error:'Не указан пользователь или ID объявления'};
  var o=rowOwnedByUser('Объявления соискателей',id,'announcement_id',uid);
  if(!o)return{ok:false,error:'Объявление не найдено'};
  var generatedImageUrl=d.generatedImage?saveUploadedFile(d.generatedImage,'Сгенерированная карточка соискателя'):'';
  var fields={'Желаемая должность':clean(d.title),'Профессия':clean(d.profession),'Категория':clean(d.category),'Город':clean(d.city),'Вся Чехия':d.city==='Вся Чехия'?'Да':'','Желаемая зарплата от':clean(d.salaryFrom),'Желаемая зарплата до':clean(d.salaryTo),'Единица оплаты':clean(d.salaryUnit),'Тип работы':clean(d.workType),'Тип занятости':clean(d.employmentType),'График':clean(d.schedule),'Жильё':clean(d.housing),'Языки':arr(d.languages).join(', '),'Уровень языка':clean(d.languageLevel),'Документы':arr(d.documents).join(', '),'Опыт':clean(d.experience),'Водительские права':clean(d.drivingLicenses),'Категории прав':arr(d.licenseCategories).join(', '),'Автомобиль':clean(d.automobile),'Квалификация':clean(d.qualification),'Навыки':clean(d.skills),'Дата готовности к работе':clean(d.readyDate),'О себе':clean(d.description),'Контакт':"'"+clean(d.contact),'Сгенерированная картинка':generatedImageUrl||String(o['Сгенерированная картинка']||'')};
  var updated=setRowFields('Объявления соискателей',id,'announcement_id',fields);
  if(!updated)return{ok:false,error:'Не удалось сохранить объявление'};
  invalidateMyProfilesCache(uid);
  invalidateSearchCaches_();
  clearPublicEntityPersistent_('candidateAnnouncement',id);
  var profileId=String(updated.profile_id||'');
  if(String(updated['Статус']||'')==='Опубликован'){
    try{var x=hydrateStoredSubmission(updated);x._sheet='Объявления соискателей';x._idHeader='announcement_id';x.id=id;x.type='Ищу работу';x.announcementType='Ищу работу';x.profileId=profileId;x.telegramUsername=updated['Telegram']||'';x.telegramId=updated['user_id']||'';updatePublishedTelegramPost(x,updated);try{var cp2=getById('Соискатели',profileId,'profile_id');cachePublicEntityPersistent_('candidateAnnouncement',id,{announcement:updated,profile:publicCandidateAnnouncement_(updated,cp2||{},false)});}catch(warmE){}}catch(e){console.error('Не удалось обновить объявление соискателя в Telegram:',e);return{ok:false,error:'Изменения сохранены, но Telegram-пост не обновился: '+e.message,entity:updated};}
  }
  return{ok:true,entity:updated};
}
function updateEntity(d){var uid=String(d.userId||'');var type=String(d.entityType||'');var id=String(d.entityId||'');var sheet='',header='';if(type==='candidate'){sheet='Соискатели';header='profile_id';}else if(type==='vacancy'){sheet='Вакансии';header='ID';}else if(type==='brigade'){sheet='Бригады';header='brigade_id';}else if(type==='request'){sheet='Ищу бригаду';header='brigade_request_id';}else return{ok:false,error:'Неизвестный тип профиля'};if(type==='vacancy')repairLegacyVacancyById(id);var o=rowOwnedByUser(sheet,id,header,uid);if(!o)return{ok:false,error:'Нет доступа к этому объявлению'};var generatedImageUrl=d.generatedImage?saveUploadedFile(d.generatedImage,'Сгенерированная карточка'):'';var fields={};if(type==='candidate'){fields={'Имя':clean(d.candidateName),'Желаемая должность':clean(d.title),'Профессия':clean(d.profession),'Категория':clean(d.category),'Город':clean(d.city),'Желаемая зарплата от':clean(d.salaryFrom),'Желаемая зарплата до':clean(d.salaryTo),'Единица оплаты':clean(d.salaryUnit),'Тип работы':clean(d.workType),'Тип занятости':clean(d.employmentType),'График':clean(d.schedule),'Жильё':clean(d.housing),'Языки':arr(d.languages).join(', '),'Уровень языка':clean(d.languageLevel),'Документы':arr(d.documents).join(', '),'Опыт':clean(d.experience),'Водительские права':clean(d.drivingLicenses),'Категории прав':arr(d.licenseCategories).join(', '),'Автомобиль':clean(d.automobile),'Квалификация':clean(d.qualification),'Навыки':clean(d.skills),'Дата готовности к работе':clean(d.readyDate),'О себе':clean(d.description),'Контакт':"'"+clean(d.contact),'Сгенерированная картинка':generatedImageUrl||String(o['Сгенерированная картинка']||'')};}else if(type==='vacancy'){fields={'Название вакансии':clean(d.title),'Категория':clean(d.category),'Профессия':clean(d.profession),'Город':clean(d.city),'Вся Чехия':d.city==='Вся Чехия'?'Да':'','Зарплата от':clean(d.salaryFrom),'Зарплата до':clean(d.salaryTo),'Единица оплаты':clean(d.salaryUnit),'Жильё':clean(d.housing),'Тип работы':clean(d.workType),'Занятость':clean(d.employmentType),'График':clean(d.schedule),'Языки':arr(d.languages).join(', '),'Требования к языку':clean(d.languageLevel),'Документы':arr(d.documents).join(', '),'Опыт':clean(d.experienceRequired),'Водительские права':clean(d.drivingLicenses),'Категории прав':arr(d.licenseCategories).join(', '),'Автомобиль':clean(d.automobile),'Квалификация':clean(d.qualification),'18+':d.age18?'Да':'','Навыки':clean(d.skills),'Дата начала':clean(d.readyDate),'Описание':clean(d.description),'Контакт':"'"+clean(d.contact),'Сгенерированная картинка':generatedImageUrl||String(o['Сгенерированная картинка']||'')};}else if(type==='brigade'){fields={'Название бригады':clean(d.title),'Категория':clean(d.category),'Специализация':clean(d.specialization),'Количество человек':clean(d.brigadeSize),'Профессии':clean(d.professions)||clean(d.profession),'Город':clean(d.city),'Вся Чехия':d.city==='Вся Чехия'?'Да':'','Мобильность':clean(d.mobility),'Формат сотрудничества':clean(d.workType),'Свой инструмент / техника':clean(d.ownEquipment),'Языки':arr(d.languages).join(', '),'Уровень языка':clean(d.languageLevel),'Документы':arr(d.documents).join(', '),'Опыт':clean(d.experience),'Транспорт':clean(d.transport),'Навыки':clean(d.skills),'Квалификация':clean(d.qualification),'Жильё':clean(d.housing),'Дата готовности к работе':clean(d.readyDate),'Описание':clean(d.description),'Контакт':"'"+clean(d.contact),'Сгенерированная картинка':generatedImageUrl||String(o['Сгенерированная картинка']||'')};}else{fields={'Категория':clean(d.category),'Профессия':clean(d.profession)||clean(d.title),'Город':clean(d.city),'Вся Чехия':d.city==='Вся Чехия'?'Да':'','Количество человек':clean(d.brigadeSize),'Зарплата от':clean(d.salaryFrom),'Зарплата до':clean(d.salaryTo),'Единица оплаты':clean(d.salaryUnit),'Тип работы':clean(d.workType),'Занятость':clean(d.employmentType),'График':clean(d.schedule),'Жильё':clean(d.housing),'Языки':arr(d.languages).join(', '),'Уровень языка':clean(d.languageLevel),'Документы':arr(d.documents).join(', '),'Опыт':clean(d.experienceRequired),'Требования':clean(d.requirements),'Квалификация':clean(d.qualification),'Навыки':clean(d.skills),'Дата начала':clean(d.readyDate),'Описание':clean(d.description),'Контакт':"'"+clean(d.contact),'Сгенерированная картинка':generatedImageUrl||String(o['Сгенерированная картинка']||'')};}var updated=setRowFields(sheet,id,header,fields);if(!updated)return{ok:false,error:'Не удалось сохранить изменения'};invalidateMyProfilesCache(uid);invalidateSearchCaches_();if(type==='candidate'){invalidatePublicCandidateProfile(id);try{var cp=publicCandidate(updated,true);cachePublicCandidateProfile(id,cp);cachePublicCandidateProfilePersistent_(id,cp);}catch(e){}}else if(type==='vacancy'){try{CacheService.getScriptCache().remove('VACANCY_PUBLIC_'+id);CacheService.getScriptCache().remove('VACANCY_'+id);}catch(e){}}else if(type==='brigade'){try{CacheService.getScriptCache().remove('BRIGADE_'+id);}catch(e){}clearPublicEntityPersistent_('brigade',id);}else if(type==='request'){try{CacheService.getScriptCache().remove('BRIGADE_REQUEST_'+id);}catch(e){}clearPublicEntityPersistent_('request',id);}if(type==='vacancy' || type==='candidate' || type==='brigade' || type==='request'){try{var x=hydrateStoredSubmission(updated);x.id=id;x.profileId=type==='candidate'?id:'';x.type=type==='candidate'?'Ищу работу':type==='vacancy'?'Предлагаю работу':type==='brigade'?'Бригада ищет работу':'Ищу бригаду';x.announcementType=x.type;x.telegramUsername=updated['Telegram']||'';x.telegramId=updated['Telegram ID']||updated.user_id||'';if(type==='vacancy'||type==='request')x.employerId=updated.employer_id||'';if(type==='brigade')x.brigadeId=id;if(type==='request')x.brigadeRequestId=id;if(updated['Статус']==='Опубликована'||updated['Статус']==='Опубликован'){try{updatePublishedTelegramPost(x,updated);}catch(e){console.error('Не удалось обновить опубликованный пост:',e);return{ok:false,error:'Изменения сохранены в базе, но Telegram-пост не обновился: '+e.message,entity:updated};}}}catch(e){console.error('Не удалось подготовить обновление Telegram:',e);}}return{ok:true,entity:updated};}
function savePublishedMessageId(sheetName,id,idHeader,messageId){var s=getSheet(sheetName),h=getHeaders(s),c=h.indexOf(idHeader),m=h.indexOf('Telegram Message ID');if(c<0||m<0)return false;var row=findRowByIdFast(s,id,idHeader);if(!row)return false;s.getRange(row,m+1).setValue(String(messageId||''));return true;}
function updatePublishedTelegramPost(x,row){
  var msgId=String(row['Telegram Message ID']||'').trim();
  if(!msgId)throw new Error('У объявления не сохранён Telegram Message ID');
  var type=x.type||x.announcementType;
  var channel=type==='Ищу работу'?JOB_SEEKERS_CHANNEL_USERNAME:type==='Бригада ищет работу'?BRIGADES_CHANNEL_USERNAME:type==='Ищу бригаду'?BRIGADE_REQUESTS_CHANNEL_USERNAME:CHANNEL_USERNAME;
  return telegramRequest('editMessageText',{chat_id:channel,message_id:msgId,rich_message:{blocks:richChannelBlocks(x)}});
}
function cloneAnnouncement(d){
  var uid=String(d.userId||''),type=String(d.entityType||''),id=String(d.entityId||'');
  if(type==='candidateAnnouncement'||type==='candidate'){
    var src=rowOwnedByUser('Объявления соискателей',id,'announcement_id',uid);
    if(!src)return{ok:false,error:'Нет доступа к объявлению соискателя'};
    var newId=generateUniqueEntityId('CAND','Объявления соискателей');
    var s=getSheet('Объявления соискателей'),h=getHeaders(s),map={};h.forEach(function(k){map[k]=src[k]!==undefined?src[k]:'';});
    map['announcement_id']=newId;map['Дата создания']=new Date();map['Дата обновления']=new Date();map['Статус']='Черновик';map['Telegram Message ID']='';map['Moderation Message ID']='';map['Сгенерированная картинка']='';
    s.appendRow(h.map(function(k){return map[k]!==undefined?map[k]:'';}));invalidateMyProfilesCache(uid);return{ok:true,id:newId,type:'candidateAnnouncement'};
  }
  if(type!=='vacancy')return{ok:false,error:'Неизвестный тип объявления для повтора'};
  var srcV=rowOwnedByUser('Вакансии',id,'ID',uid);if(!srcV)return{ok:false,error:'Нет доступа к вакансии'};
  var newIdV=generateUniqueEntityId('VAC','Вакансии'),sv=getSheet('Вакансии'),hv=getHeaders(sv),mv={};hv.forEach(function(k){mv[k]=srcV[k]!==undefined?srcV[k]:'';});
  mv['ID']=newIdV;mv['Дата создания']=new Date();mv['Дата публикации']='';mv['Статус']='Черновик';mv['Telegram Message ID']='';mv['Moderation Message ID']='';sv.appendRow(hv.map(function(k){return mv[k]!==undefined?mv[k]:'';}));invalidateMyProfilesCache(uid);return{ok:true,id:newIdV,type:'vacancy'};
}
function submitCandidateDraft(d){
  var uid=String(d.userId||''),id=String(d.announcementId||d.entityId||'');
  var o=rowOwnedByUser('Объявления соискателей',id,'announcement_id',uid);
  if(!o)return{ok:false,error:'Черновик объявления соискателя не найден'};
  if(String(o['Статус']||'')!=='Черновик')return{ok:false,error:'Это объявление уже отправлено или опубликовано'};
  var x=hydrateStoredSubmission(o);
  x.id=id;x.type='Ищу работу';x.announcementType='Ищу работу';
  x.userId=uid;x.profileId=o.profile_id||'';
  x.telegramId=o['Telegram ID']||uid;x.telegramUsername=o['Telegram']||'';
  validateSubmission(x);
  setRowFields('Объявления соискателей',id,'announcement_id',{'Статус':'На модерации'});
  enqueueSubmissionForModeration(x);
  return{ok:true,queued:true,message:'Объявление принято и поставлено в очередь модерации',id:id};
}

function submitDraft(d){
  var uid=String(d.userId||'');var id=String(d.entityId||'');var o=rowOwnedByUser('Вакансии',id,'ID',uid);if(!o)return{ok:false,error:'Черновик не найден'};
  if(String(o['Статус']||'')!=='Черновик')return{ok:false,error:'Это объявление уже отправлено или опубликовано'};
  var x=hydrateStoredSubmission(o);x.id=id;x.type='Предлагаю работу';x.announcementType='Предлагаю работу';x.userId=uid;x.telegramId=o['Telegram ID']||uid;x.telegramUsername=o['Telegram']||'';x.employerId=o.employer_id||'';
  validateSubmission(x);
  setRowFields('Вакансии',id,'ID',{'Статус':'На модерации'});
  enqueueSubmissionForModeration(x);
  return{ok:true,queued:true,message:'Вакансия принята и поставлена в очередь модерации',id:id};
}

function jsonResponse(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function telegramWebhookResponse_(text){return HtmlService.createHtmlOutput(String(text||'OK'));}
