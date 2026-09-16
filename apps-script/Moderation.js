// PROFILE_FIXES_V4: moderation layer kept compatible; no Rich Message architecture changes
// ============================================================
// ROBOTA CZECHIA — МОДЕРАЦИЯ И ПУБЛИКАЦИЯ
// ============================================================
function normalizeForModeration(x){
  x=taxonomyNormalizeEntity_(x||{});
  x.languages=arr(x.languages);x.documents=arr(x.documents);x.licenseCategories=arr(x.licenseCategories);x.files=arr(x.files);
  var validSchedules=['Пн–Пт','Пн-Пт','Пн–Сб','Пн-Сб','2/2','3/3','4/4','Дневные смены','Ночные смены','Гибкий график'];
  var sc=String(x.schedule||'').trim();
  // Защита от случайной передачи Date.toString() вместо значения select.
  // Неверный график не должен попадать в Telegram как "Tue Mar ...".
  if(sc && validSchedules.indexOf(sc)<0)x.schedule='';
  return x;
}
function htmlEscape(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function addLine(lines,icon,label,value){if(value!==undefined&&value!==null&&String(value).trim())lines.push(icon+' <b>'+htmlEscape(label)+':</b> '+htmlEscape(value));}
function formatAmount_(v){var s=String(v||'').trim();if(!s)return '';var n=Number(String(s).replace(/\s/g,'').replace(',','.'));if(isFinite(n))return n.toLocaleString('ru-RU');return s;}
function salaryText(x){var from=formatAmount_(x.salaryFrom),to=formatAmount_(x.salaryTo),unit=String(x.salaryUnit||'').trim();var t='';if(from&&to)t='от '+from+' до '+to;else if(from)t='от '+from;else if(to)t='до '+to;if(!t&&unit==='По договорённости')return 'По договорённости';if(unit==='По договорённости')return t+' Kč · По договорённости';return t+(t&&unit?' '+unit:'');}
function typeLabel(t){return {'Предлагаю работу':'📢 Предлагаю работу','Ищу работу':'🔎 Ищу работу','Бригада ищет работу':'👷 Бригада ищет работу','Ищу бригаду':'🤝 Ищу бригаду'}[t]||t;}
function buildModerationText(x){x=normalizeForModeration(x);var lines=['🆕 <b>Новое объявление</b>','',typeLabel(x.type),''];if(x.type==='Ищу работу'){lines.push('🔴 <b>'+htmlEscape(x.title||x.profession||'Соискатель')+'</b>');addLine(lines,'👤','Имя',x.candidateName||userName(x));addLine(lines,'🎯','Желаемая должность',x.title);addLine(lines,'👷','Профессия',x.profession);}else if(x.type==='Бригада ищет работу'){lines.push('🔴 <b>'+htmlEscape(x.title||('Бригада '+x.brigadeSize+' человек'))+'</b>');addLine(lines,'👥','Количество человек',x.brigadeSize);addLine(lines,'🏗','Специализация',x.specialization);addLine(lines,'🛠','Виды работ',x.workTypes||x.professions||x.profession);}else if(x.type==='Ищу бригаду'){lines.push('🔴 <b>'+htmlEscape(x.title||x.profession||'Ищу бригаду')+'</b>');addLine(lines,'🏗','Профессия',x.profession);addLine(lines,'👥','Количество человек',x.brigadeSize);}else lines.push('🔴 <b>'+htmlEscape(x.title||x.profession||'Вакансия')+'</b>');addLine(lines,'📂','Категория',x.category);addLine(lines,'📍','Город',x.city+(x.allCzechia?' / Вся Чехия':''));if(salaryText(x))addLine(lines,'💰','Зарплата',salaryText(x));addLine(lines,'🤝','Формат сотрудничества',x.workType);addLine(lines,'🕐','График',x.schedule);addLine(lines,'🏠','Жильё',x.housing);addLine(lines,'🗣','Языки',x.languages.join(', '));addLine(lines,'📊','Уровень языка',x.languageLevel);addLine(lines,'📄','Документы',x.documents.join(', '));addLine(lines,'📚','Опыт',x.type==='Предлагаю работу'?x.experienceRequired:x.experience);addLine(lines,'🚗','Водительские права',x.drivingLicenses);addLine(lines,'🔢','Категории прав',x.licenseCategories.join(', '));addLine(lines,'🚙','Автомобиль',x.automobile);addLine(lines,'🎓','Квалификация',x.qualification);addLine(lines,'🛠','Навыки',x.skills);if(x.type==='Предлагаю работу'&&x.age18)addLine(lines,'🔞','Возраст','18+');addLine(lines,'📅','Дата начала / готовности',x.readyDate);addLine(lines,'👥','Мобильность',x.mobility);addLine(lines,'🚚','Транспорт',x.transport);addLine(lines,'🧰','Свой инструмент / техника',x.ownEquipment);addLine(lines,'📋','Требования',x.requirements);if(x.description)lines.push('','📝 <b>Описание:</b>\n'+htmlEscape(x.description));if(x.contact)addLine(lines,'📞','Контакт',x.contact);if(x.telegramUsername)addLine(lines,'📱','Telegram','@'+x.telegramUsername.replace(/^@/,''));addLine(lines,'🆔','ID',x.id);return lines.join('\n');}
function buildChannelText(x){x=normalizeForModeration(x);var lines=[];if(x.type==='Предлагаю работу'){lines.push('🔴 <b>'+htmlEscape(x.title||x.profession||'Вакансия')+'</b>');addLine(lines,'📂','Категория',x.category);addLine(lines,'👷','Профессия',x.profession);addLine(lines,'📍','Город',x.city+(x.allCzechia?' / Вся Чехия':''));addLine(lines,'💰','Зарплата',salaryText(x));addLine(lines,'🤝','Формат сотрудничества',x.workType);addLine(lines,'🕐','График',x.schedule);addLine(lines,'🏠','Жильё',x.housing);addLine(lines,'🗣','Языки',x.languages.join(', '));addLine(lines,'📊','Уровень языка',x.languageLevel);addLine(lines,'📄','Документы',x.documents.join(', '));addLine(lines,'📚','Опыт',x.experienceRequired);addLine(lines,'🚗','Водительские права',x.drivingLicenses);addLine(lines,'🚙','Автомобиль',x.automobile);addLine(lines,'🎓','Квалификация',x.qualification);addLine(lines,'🛠','Навыки',x.skills);if(x.age18)addLine(lines,'🔞','Возраст','18+');addLine(lines,'📅','Дата начала',x.readyDate);if(x.description)lines.push('','📝 <b>Описание:</b>\n'+htmlEscape(x.description));if(x.contact)lines.push('','📞 <b>Контакт:</b> '+formatContact(x.contact));if(x.telegramUsername)lines.push('📱 <b>Telegram:</b> '+formatTelegramUsername(x.telegramUsername));lines.push('','🇨🇿 <i>Работа в Чехии | Вакансии</i>');return lines.join('\n');}}
function buildCandidateChannelText(x){x=normalizeForModeration(x);var title=x.title||x.profession||'Соискатель';var lines=['🔴 <b>'+htmlEscape(title)+'</b>'];addLine(lines,'👤','Имя',x.candidateName||userName(x));addLine(lines,'🎯','Желаемая должность',x.title);addLine(lines,'📂','Категория',x.category);addLine(lines,'👷','Профессия',x.profession);addLine(lines,'📍','Город',x.city+(x.allCzechia?' / Вся Чехия':''));addLine(lines,'💰','Желаемая зарплата',salaryText(x));addLine(lines,'🤝','Формат сотрудничества',x.workType);addLine(lines,'🕐','График',x.schedule);addLine(lines,'🏠','Жильё',x.housing);addLine(lines,'🗣','Языки',x.languages.join(', '));addLine(lines,'📊','Уровень языка',x.languageLevel);addLine(lines,'📄','Документы',x.documents.join(', '));addLine(lines,'📚','Опыт',x.experience);addLine(lines,'🚗','Водительские права',x.drivingLicenses);addLine(lines,'🔢','Категории прав',x.licenseCategories.join(', '));addLine(lines,'🚙','Автомобиль',x.automobile);addLine(lines,'🎓','Квалификация',x.qualification);addLine(lines,'🛠','Навыки',x.skills);addLine(lines,'📅','Готов к работе',x.readyDate);if(x.description)lines.push('','📝 <b>О себе:</b>\n'+htmlEscape(x.description));lines.push('','📌 <i>Контакт доступен через профиль</i>','','🇨🇿 <i>Работа в Чехии | Ищу работу</i>');return lines.join('\n');}
function buildBrigadeChannelText(x){x=normalizeForModeration(x);var lines=['🔴 <b>'+htmlEscape(x.title||('Бригада '+x.brigadeSize+' человек'))+'</b>'];addLine(lines,'👥','Количество человек',x.brigadeSize);addLine(lines,'📂','Категория',x.category);addLine(lines,'🏗','Специализация',x.specialization);addLine(lines,'🛠','Виды работ',x.workTypes||x.professions||x.profession);addLine(lines,'📍','Город',x.city+(x.allCzechia?' / Вся Чехия':''));addLine(lines,'🤝','Формат сотрудничества',x.workType);addLine(lines,'🚗','Транспорт',x.transport);addLine(lines,'🧰','Свой инструмент / техника',x.ownEquipment);addLine(lines,'🗺','Мобильность',x.mobility);addLine(lines,'🗣','Языки',x.languages.join(', '));addLine(lines,'📊','Уровень языка',x.languageLevel);addLine(lines,'📄','Документы',x.documents.join(', '));addLine(lines,'📚','Опыт',x.experience);addLine(lines,'🎓','Квалификация',x.qualification);addLine(lines,'🛠','Навыки',x.skills);addLine(lines,'🏠','Жильё',x.housing);addLine(lines,'📅','Готовы к работе',x.readyDate);if(x.description)lines.push('','📝 <b>О бригаде:</b>\n'+htmlEscape(x.description));lines.push('','🔒 <i>Контакт доступен через Premium</i>');lines.push('','🇨🇿 <i>Работа в Чехии | Бригады</i>');return lines.join('\n');}
function buildBrigadeRequestText(x){x=normalizeForModeration(x);var lines=['🔴 <b>'+htmlEscape(x.title||x.profession||'Ищу бригаду')+'</b>'];addLine(lines,'📂','Категория',x.category);addLine(lines,'🏗','Специализация',x.specialization);addLine(lines,'🛠','Виды работ',x.workTypes||x.professions||x.profession);addLine(lines,'🏗','Работа',x.profession||x.title);addLine(lines,'📍','Город',x.city+(x.allCzechia?' / Вся Чехия':''));addLine(lines,'👥','Количество человек',x.brigadeSize);addLine(lines,'💰','Оплата',salaryText(x));addLine(lines,'🤝','Формат сотрудничества',x.workType);addLine(lines,'🕐','График',x.schedule);addLine(lines,'🏠','Жильё',x.housing);addLine(lines,'🗣','Языки',x.languages.join(', '));addLine(lines,'📊','Уровень языка',x.languageLevel);addLine(lines,'📄','Документы',x.documents.join(', '));addLine(lines,'📚','Опыт',x.experienceRequired);addLine(lines,'📋','Требования',x.requirements);addLine(lines,'🎓','Квалификация',x.qualification);addLine(lines,'🛠','Навыки',x.skills);addLine(lines,'📅','Дата начала',x.readyDate);if(x.description)lines.push('','📝 <b>Описание:</b>\n'+htmlEscape(x.description));if(x.contact)lines.push('','📞 <b>Контакт:</b> '+formatContact(x.contact));lines.push('','🇨🇿 <i>Работа в Чехии | Ищу бригаду</i>');return lines.join('\n');}
function formatTelegramUsername(u){u=String(u||'').replace(/^@/,'');return u?'@'+htmlEscape(u):'';}
function formatContact(c){c=String(c||'').trim();if(/^@[\w\d_]+$/i.test(c))return '<a href="https://t.me/'+encodeURIComponent(c.slice(1))+'">'+htmlEscape(c)+'</a>';var p=c.replace(/[^\d+]/g,'');if(p.length>=8)return '<a href="tel:'+htmlEscape(p)+'">'+htmlEscape(c)+'</a>';return htmlEscape(c);}
function telegramRequest(method,payload){var token=PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');if(!token)throw new Error('BOT_TOKEN не найден в Script Properties');var r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'post',contentType:'application/json; charset=utf-8',payload:Utilities.newBlob(JSON.stringify(payload),'application/json').getBytes(),muteHttpExceptions:true});var t=r.getContentText(),o;try{o=JSON.parse(t);}catch(e){throw new Error(t);}if(!o.ok)throw new Error(t);return o;}
// V40 diagnostics: these functions are safe to run manually from Apps Script.
function testTelegramConnection(){var r=telegramRequest('getMe',{});Logger.log(JSON.stringify({ok:!!r.ok,bot:r.result&&r.result.username,version:(typeof APP_VERSION!=='undefined'?APP_VERSION:'unknown')}));return r;}
function testTelegramWebhook(){var r=telegramRequest('getWebhookInfo',{});Logger.log(JSON.stringify(r));return r;}
function setupTelegramWebhook(){var url='https://script.google.com/macros/s/AKfycbwGiif2P_hjtiv5jY-CrBn__6LcFw7544x6p4-ioP0LCXlPsE0KBY5cvMICmSGA9nzl/exec';var r=telegramRequest('setWebhook',{url:url,allowed_updates:['callback_query','message'],drop_pending_updates:true,max_connections:1});Logger.log(JSON.stringify({url:url,result:r}));return r;}
function safeSplit_(value,separator){return String(value==null?'':value).split(separator);}

function richPlain_(s){
  return String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function richLineTextParts_(line){
  if(line===undefined||line===null||String(line)==='')return [];
  var m=String(line).match(/^([\s\S]*?)<b>([\s\S]*?)<\/b>([\s\S]*)$/);
  if(m){
    var prefix=richPlain_(m[1]);
    var label=richPlain_(m[2]);
    var tail=richPlain_(m[3]);
    return [prefix,{type:'bold',text:label},tail];
  }
  return [richPlain_(line)];
}
function richLineBlock_(line){
  var parts=richLineTextParts_(line);
  return parts.length?{type:'paragraph',text:parts}:null;
}
function richCompactDetailsBlock_(parts){
  if(!Array.isArray(parts))return null;
  var text=[];
  parts.forEach(function(line){
    var p=richLineTextParts_(line);
    if(!p.length)return;
    if(text.length)text.push('\n');
    Array.prototype.push.apply(text,p);
  });
  return text.length?{type:'paragraph',text:text}:null;
}
function spacesForRichIndent_(s){
  // Приближённый визуальный отступ под начало значения после emoji и подписи.
  // Telegram Rich Text не имеет hanging-indent, поэтому используем обычные пробелы.
  var n=Math.min(24,Math.max(3,String(s||'').length+1));
  return new Array(n+1).join(' ');
}
function richProfessionImageCode_(profession,category){
  var p=String(profession||'').trim().toLowerCase();
  var c=String(category||'').trim().toLowerCase();
  if(c!=='строительство и ремонт'&&c!=='строительство')return '';
  var map={
    'каменщик':'01_001_kamenshchik',
    'бетонщик':'01_002_betonshchik',
    'арматурщик':'01_003_armaturshchik',
    'монтажник':'01_004_montazhnik',
    'монтажник окон':'01_005_montazhnik_okon',
    'плиточник':'01_006_plitochnik',
    'штукатур':'01_007_shtukatur',
    'маляр':'01_008_malyar',
    'фасадчик':'01_009_fasadchik',
    'кровельщик':'01_010_krovelshchik',
    'сантехник':'01_011_santekhnik',
    'столяр':'01_012_stolyar',
    'плотник':'01_013_plotnik',
    'гипсокартонщик':'01_014_gipsokartonshchik',
    'прораб':'01_015_prorab',
    'инженер-строитель':'01_016_inzhener_stroitel',
    'экскаваторщик':'01_017_ekskavatorshchik',
    'оператор спецтехники':'01_018_operator_spetstekhniki',
    'разнорабочий на стройке':'01_019_raznorabochiy_na_stroyke',
    'монтажник металлоконструкций':'01_020_montazhnik_metallokonstruktsiy',
    'изолировщик':'01_021_izolirovshchik',
    'мастер по ремонту':'01_022_master_po_remontu',
    'электромонтажник':'01_023_elektromontazhnik',
    'другой специалист':'01_024_drugoy_spetsialist',
    'стекольщик':'01_025_stekolshchik'
  };
  return map[p]||'';
}

function richProfessionImageUrl_(profession,category,type){
  var code=richProfessionImageCode_(profession,category);
  if(!code)return '';
  var base='https://raw.githubusercontent.com/trifonov8888-bot/robota-czechia-miniapp/main/assets/category-images/construction/';
  if(type==='Ищу работу')return base+'ishchu-rabotu/'+code+'_ishchu_rabotu.jpg';
  return base+code+'.jpg';
}

function richProfessionImageFileId_(profession,category,type){
  var code=richProfessionImageCode_(profession,category);
  if(!code)return '';
  var props=PropertiesService.getScriptProperties();
  var key=(type==='Ищу работу'?'RICH_PROFESSION_FILE_ID_V14_ISHCHU_RABOTU_':'RICH_PROFESSION_FILE_ID_V14_')+code.toUpperCase();
  var cached=String(props.getProperty(key)||'').trim();
  if(cached)return cached;

  var url=richProfessionImageUrl_(profession,category,type);
  if(!url)return '';
  var token=props.getProperty('BOT_TOKEN');
  if(!token)throw new Error('BOT_TOKEN не найден в Script Properties');

  var imageResp=UrlFetchApp.fetch(url,{method:'get',followRedirects:true,muteHttpExceptions:true});
  var codeHttp=imageResp.getResponseCode();
  if(codeHttp<200||codeHttp>=300)throw new Error('Не удалось скачать изображение профессии: HTTP '+codeHttp+' '+url);
  var blob=imageResp.getBlob().setName(type==='Ищу работу'?code+'_ishchu_rabotu.jpg':code+'.jpg');

  var upload=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/sendPhoto',{
    method:'post',
    payload:{chat_id:String(ADMIN_ID),photo:blob},
    muteHttpExceptions:true
  });
  var uploadText=upload.getContentText();
  var uploadJson;
  try{uploadJson=JSON.parse(uploadText);}catch(e){throw new Error('Telegram upload вернул не-JSON: '+uploadText);}
  if(!uploadJson.ok)throw new Error('Telegram upload photo: '+uploadText);
  var photos=uploadJson.result&&uploadJson.result.photo||[];
  if(!photos.length)throw new Error('Telegram upload photo: Telegram не вернул photo/file_id');
  var fileId=String(photos[photos.length-1].file_id||'').trim();
  if(!fileId)throw new Error('Telegram upload photo: file_id пустой');
  var tempMessageId=uploadJson.result.message_id;
  try{
    telegramRequest('deleteMessage',{chat_id:String(ADMIN_ID),message_id:tempMessageId});
  }catch(delErr){console.warn('Временное фото загружено, но удалить его не удалось:',delErr);}
  props.setProperty(key,fileId);
  return fileId;
}

function richPhotoBlock_(x){
  var profession=x&&x.profession||'';
  var category=x&&x.category||'';
  var mappedCode=richProfessionImageCode_(profession,category);
  if(!mappedCode)return null;
  var type=x&&x.type||x&&x.announcementType||'';
  var fileId=richProfessionImageFileId_(profession,category,type);
  if(!fileId)throw new Error('Не найден баннер профессии: '+profession);
  return {type:'photo',photo:{type:'photo',media:fileId}};
}
function richCandidateMedia_(x){
  var profession=x&&x.profession||'';
  var category=x&&x.category||'';
  var mappedCode=richProfessionImageCode_(profession,category);
  if(!mappedCode)return null;
  var type=x&&x.type||x&&x.announcementType||'';
  var fileId=richProfessionImageFileId_(profession,category,type);
  if(!fileId)throw new Error('Не найден баннер профессии: '+profession);
  return {id:'profession_photo',media:{type:'photo',media:fileId}};
}
function richCandidateBlocks_(x,detailsOpen){
  x=normalizeForModeration(x);
  var text=buildCandidateChannelText(x);
  var parts=safeSplit_(text,'\n');
  parts.shift();
  var city=richPlain_(x.city+(x.allCzechia?' / Вся Чехия':''));
  var sal=salaryText(x);
  var blocks=[];
  var photo=richPhotoBlock_(x);
  if(photo)blocks.push(photo);
  // Keep city and salary as two compact rows. Do not put a literal escaped newline
  // into one rich paragraph: some Telegram clients can render that awkwardly.
  if(city)blocks.push({type:'paragraph',text:[{type:'bold',text:'📍 '+city}]});
  if(sal)blocks.push({type:'paragraph',text:[{type:'bold',text:'💰 '+richPlain_(sal)}]});
  var detailBlock=richCompactDetailsBlock_(parts);
  if(detailBlock)blocks.push({type:'details',summary:'Подробнее без контактов',is_open:false,blocks:[detailBlock]});
  return blocks;
}
function richFilterToken_(value){
  try{return Utilities.base64EncodeWebSafe(Utilities.newBlob(String(value||'')).getBytes()).replace(/=+$/,'');}catch(e){return '';}
}
function cacheCandidateForRich_(x){
  try{
    var id=String(x&&x.profileId||'').trim();
    if(id)CacheService.getScriptCache().put('RICH_CANDIDATE_'+id,JSON.stringify(x),21600);
  }catch(e){console.warn('Не удалось сохранить соискателя в cache:',e);}
}
function getCachedCandidateForRich_(id){
  try{
    var raw=CacheService.getScriptCache().get('RICH_CANDIDATE_'+String(id||'').trim());
    if(raw)return JSON.parse(raw);
  }catch(e){console.warn('Не удалось прочитать соискателя из cache:',e);}
  return null;
}
function richCandidateMarkup_(x,detailsOpen){
  var profileId=String(x&&x.profileId||'');
  if(!profileId)return {inline_keyboard:[]};

  // Контакты открываются через уже проверенный URL-переход в профиль.
  // Это обычная inline-кнопка под Rich Message — без callback и без ожидания webhook.
  return {inline_keyboard:[[
    {
      text:'💎 Premium с контактами',
      url:'https://t.me/RobotaCzechiaBot?startapp='+(String(x.type||x.announcementType||'')==='Предлагаю работу'?'premium_vacancy_':'premium_candidate_')+encodeURIComponent(String(x.announcementId||x.id||'')),
      style:'success'
    }
  ]]};
}
function richChannelBlocks(x,detailsOpen){
  x=normalizeForModeration(x);
  detailsOpen=detailsOpen===true;
  var type=x.type||x.announcementType||'';
  var text=type==='Ищу работу'?buildCandidateChannelText(x):type==='Бригада ищет работу'?buildBrigadeChannelText(x):type==='Ищу бригаду'?buildBrigadeRequestText(x):buildChannelText(x);
  var parts=safeSplit_(text,'\n');
  var first=richPlain_(parts.shift()||'').replace(/^🔴\s*/,'').trim();
  var city=richPlain_(x.city+(x.allCzechia?' / Вся Чехия':''));
  var sal=salaryText(x);
  var blocks=[];
  var photo=richPhotoBlock_(x);
  if(photo)blocks.push(photo);
  var compactVacancy=!!photo&&(type==='Предлагаю работу'||type==='Ищу работу');
  if(!compactVacancy){
    var typeNames={'Предлагаю работу':'ВАКАНСИЯ','Ищу работу':'ИЩУ РАБОТУ','Бригада ищет работу':'БРИГАДА ИЩЕТ РАБОТУ','Ищу бригаду':'ИЩУ БРИГАДУ'};
    blocks.push({type:'paragraph',text:[{type:'bold',text:typeNames[type]||'РАБОТА В ЧЕХИИ'}]});
    blocks.push({type:'heading',size:2,text:[{type:'bold',text:first}]});
  }
  if(city)blocks.push({type:'paragraph',text:[{type:'bold',text:'📍 '+city}]});
  if((type==='Бригада ищет работу'||type==='Ищу бригаду')&&x.brigadeSize)blocks.push({type:'paragraph',text:[{type:'bold',text:'👥 '+richPlain_(x.brigadeSize)+' чел.'}]});
  else if(sal)blocks.push({type:'paragraph',text:[{type:'bold',text:'💰 '+richPlain_(sal)}]});
  if(!compactVacancy)blocks.push({type:'divider'});
  var detailBlock=richCompactDetailsBlock_(parts);
  if(detailBlock)blocks.push({type:'details',summary:'Подробнее',is_open:false,blocks:[detailBlock]});
  return blocks;
}


function channelCandidateReplyMarkup_(x){
  var id=String(x&&x.announcementId||x&&x.id||'').trim();
  if(!id)return undefined;
  var base='https://t.me/RobotaCzechiaBot?startapp=';
  var token=richFilterToken_(x.profession||'');
  var rows=[[
    {text:'💎 Контакт VIP',url:base+'premium_candidate_'+encodeURIComponent(id),style:'success'},
    {text:'❤️',url:base+'save_candidate_'+encodeURIComponent(id),style:'danger'}
  ]];
  if(token)rows.push([{text:'🔎 Найти работников и бригады',url:base+'cross_hiring_b64_'+token,style:'primary'}]);
  return {inline_keyboard:rows};
}

function channelActionMarkup_(x){
  var type=x.type||x.announcementType||'',id=String(x.announcementId||x.id||'');
  var base='https://t.me/RobotaCzechiaBot?startapp=';
  var rows=[];
  if(type==='Предлагаю работу'&&id){
    rows.push([{text:'❤️',url:base+'save_vacancy_'+encodeURIComponent(id),style:'danger'}]);
    if(x.profession){var vt=richFilterToken_(x.profession);if(vt)rows[0].push({text:'🔎 Найти работников и бригады',url:base+'cross_hiring_b64_'+vt,style:'primary'});}
  }else if(type==='Бригада ищет работу'&&id){
    rows.push([{text:'💎 Контакт VIP',url:base+'premium_brigade_'+encodeURIComponent(id),style:'success'},{text:'❤️',url:base+'save_brigade_'+encodeURIComponent(id),style:'danger'}]);
    var bt=richFilterToken_(x.specialization||x.profession||x.title||'');if(bt)rows.push([{text:'🔎 Найти работников и бригады',url:base+'cross_hiring_b64_'+bt,style:'primary'}]);
  }else if(type==='Ищу бригаду'&&id){
    rows.push([{text:'❤️',url:base+'save_request_'+encodeURIComponent(id),style:'danger'}]);
    var rt=richFilterToken_(x.specialization||x.profession||x.title||'');if(rt)rows.push([{text:'🔎 Найти бригады и работников',url:base+'cross_brigade_b64_'+rt,style:'primary'}]);
  }
  return rows.length?{inline_keyboard:rows}:undefined;
}
function richBlockHasContent_(b){
  if(!b||typeof b!=='object'||!b.type)return false;
  if(b.type==='divider')return true;
  if(b.type==='photo')return !!(b.photo&&b.photo.media);
  if(b.type==='details')return !!String(b.summary||'').trim() && Array.isArray(b.blocks) && b.blocks.some(richBlockHasContent_);
  if(b.type==='paragraph'||b.type==='heading'||b.type==='footer'||b.type==='pre'||b.type==='pullquote')return !!richTextHasContent_(b.text);
  return true;
}
function richTextHasContent_(t){
  if(t===undefined||t===null)return false;
  if(typeof t==='string')return !!t.trim();
  if(Array.isArray(t))return t.some(richTextHasContent_);
  if(typeof t==='object'){
    if(t.type==='bold'||t.type==='italic'||t.type==='underline'||t.type==='strikethrough'||t.type==='spoiler'||t.type==='code'||t.type==='marked')return richTextHasContent_(t.text);
    return true;
  }
  return false;
}
function sanitizeRichBlocks_(blocks){
  if(!Array.isArray(blocks))return [];
  return blocks.map(function(b){
    if(!b||typeof b!=='object')return null;
    if(b.type==='details'&&Array.isArray(b.blocks)){
      b.blocks=b.blocks.filter(richBlockHasContent_);
      if(!b.blocks.length)return null;
    }
    return richBlockHasContent_(b)?b:null;
  }).filter(function(b){return !!b;});
}
function sendRichChannelMessage(chat,blocks,markup,x){
  x=x||{};
  if((x.type||x.announcementType)==='Ищу работу'){
    cacheCandidateForRich_(x);
    var candidateBlocks=sanitizeRichBlocks_(richCandidateBlocks_(x,false));
    if(!candidateBlocks.length)throw new Error('Не удалось сформировать Rich Message соискателя: пустой контент');
    var cp={chat_id:chat,rich_message:{blocks:candidateBlocks}};
    var cm=channelCandidateReplyMarkup_(x);if(cm)cp.reply_markup=cm;
    return telegramRequest('sendRichMessage',cp);
  }
  var vacancyBlocks=sanitizeRichBlocks_(richChannelBlocks(x));
  if(!vacancyBlocks.length){
    // Не меняем формат публикации: это всё ещё Rich Message.
    // Добавляем гарантированный текстовый блок только если генератор каким-то образом вернул пустой массив.
    vacancyBlocks=[{type:'paragraph',text:'📢 Объявление о работе'}];
  }
  var p={chat_id:chat,rich_message:{blocks:vacancyBlocks}};
  var am=channelActionMarkup_(x);if(am)p.reply_markup=am;
  return telegramRequest('sendRichMessage',p);
}
function sendTelegramMessage(chat,text,markup){var p={chat_id:chat,text:text,parse_mode:'HTML',disable_web_page_preview:true};if(markup)p.reply_markup=markup;return telegramRequest('sendMessage',p);}
function processNewVacancy(x){
  x=normalizeForModeration(x);
  saveSubmissionRecord(x,'На модерации');
  enqueueSubmissionForModeration(x);
  return {ok:true,queued:true,id:x.id};
}
function saveSubmissionRecord(x,status){if(x.type==='Ищу работу'){saveCandidate(x,status);return;}if(x.type==='Бригада ищет работу'){saveBrigade(x,status);return;}if(x.type==='Ищу бригаду'){saveBrigadeRequest(x,status);return;}saveVacancyRecord(x,status);}
function findSubmissionById(id){var specs=[['Вакансии','ID','Предлагаю работу'],['Объявления соискателей','announcement_id','Ищу работу'],['Соискатели','profile_id','Ищу работу'],['Бригады','brigade_id','Бригада ищет работу'],['Ищу бригаду','brigade_request_id','Ищу бригаду']];for(var i=0;i<specs.length;i++){var o=getById(specs[i][0],id,specs[i][1]);if(o){o._sheet=specs[i][0];o._idHeader=specs[i][1];o._defaultType=specs[i][2];return hydrateStoredSubmission(o);}}return null;}
function hydrateStoredSubmission(o){
  var type=o['Тип объявления']||o._defaultType||'';
  var title=type==='Ищу работу'?o['Желаемая должность']:type==='Бригада ищет работу'?o['Название бригады']:type==='Ищу бригаду'?o['Профессия']:o['Название вакансии'];
  var x={_sheet:o._sheet,_idHeader:o._idHeader,id:o.ID||o.announcement_id||o.profile_id||o.brigade_id||o.brigade_request_id,type:type,announcementType:type,userId:o.user_id||o['ID пользователя']||o['Telegram ID']||'',telegramId:o['Telegram ID']||o['ID пользователя']||o.user_id||'',telegramUsername:o['Telegram']||'',telegramFirstName:o['Имя']||'',telegramLastName:o['Фамилия']||'',candidateName:o['Имя']||'',title:title||'',profession:o['Профессия']||'',category:o['Категория']||'',city:o['Город']||'',allCzechia:o['Вся Чехия']==='Да'||o['Готов по всей Чехии']==='Да',salaryFrom:o['Зарплата от']||o['Желаемая зарплата от']||'',salaryTo:o['Зарплата до']||o['Желаемая зарплата до']||'',salaryUnit:o['Единица оплаты']||'',workType:o['Формат сотрудничества']||o['Тип работы']||'',employmentType:o['Занятость']||o['Тип занятости']||'',schedule:o['График']||'',housing:o['Жильё']||'',languages:arr(o['Языки']),languageLevel:o['Требования к языку']||o['Уровень языка']||'',documents:arr(o['Документы']),experience:o['Опыт']||o['Опыт лет']||'',experienceRequired:o['Опыт']||'',drivingLicenses:o['Водительские права']||'',licenseCategories:arr(o['Категории прав']),automobile:o['Автомобиль']||'',qualification:o['Квалификация']||'',skills:o['Навыки']||'',readyDate:o['Дата начала']||o['Дата готовности к работе']||'',description:o['Описание']||o['О себе']||'',contact:o['Контакт']||'',telegramUsername:o['Telegram']||'',employerId:o['employer_id']||'',profileId:o['profile_id']||'',brigadeId:o['brigade_id']||'',brigadeRequestId:o['brigade_request_id']||'',files:arr(o['Файлы']),brigadeSize:o['Количество человек']||'',specialization:o['Специализация']||'',professions:o['Профессии']||'',workTypes:o['Виды работ']||o['Профессии']||'',mobility:o['Мобильность']||'',transport:o['Транспорт']||'',ownEquipment:o['Свой инструмент / техника']||'',requirements:o['Требования']||'',photo:o['Фото']||'',resume:o['Файл резюме']||'',generatedImage:o['Сгенерированная картинка']||''};
  return taxonomyNormalizeEntity_(x);
}
function publishVacancyToChannel(x){
  var type=x.type||x.announcementType;
  var channel=type==='Ищу работу'?JOB_SEEKERS_CHANNEL_USERNAME:type==='Бригада ищет работу'?BRIGADES_CHANNEL_USERNAME:type==='Ищу бригаду'?BRIGADE_REQUESTS_CHANNEL_USERNAME:CHANNEL_USERNAME;
  return sendRichChannelMessage(channel,null,null,x);
}
function handleTelegramCallback(q){
  if(!q)return;
  var d=String(q.data||'');
  // В объявлениях соискателей бесплатное раскрытие делает сам Telegram через RichMessage details.
  // Поэтому details:/collapse: callbacks здесь больше не нужны.
  if(d.indexOf('details:')===0 || d.indexOf('collapse:')===0){
    try{answerCallbackQuery(q.id,'');}catch(e0){}
    return;
  }

  if(String(q.from&&q.from.id)!==String(ADMIN_ID)){try{answerCallbackQuery(q.id,'⛔ У вас нет доступа.');}catch(e1){}return;}
  if(d.indexOf('approve:')===0){
    answerCallbackQuery(q.id,'⏳ Публикуем...');
    updateModerationMessage(q.message,'publishing');
    try{
      var ok=approveVacancy(d.slice(8),q.message);
      if(ok===false) updateModerationMessage(q.message,'approved');
    }catch(e){
      updateModerationMessage(q.message,'error',e&&e.message?e.message:String(e));
    }
  }else if(d.indexOf('reject:')===0){
    try{
      rejectVacancy(d.slice(7),q.message);
      answerCallbackQuery(q.id,'Отклонено ❌');
    }catch(e){
      answerCallbackQuery(q.id,'Ошибка ❌');
      updateModerationMessage(q.message,'error',e&&e.message?e.message:String(e));
    }
  }
}
function answerCallbackQuery(id,text){return telegramRequest('answerCallbackQuery',{callback_query_id:id,text:text||''});}
function waitForGeneratedImage_(sheetName,id,idHeader,timeoutMs){
  var started=Date.now(),last=null;
  while(Date.now()-started<timeoutMs){
    last=getById(sheetName,id,idHeader);
    if(last&&String(last['Сгенерированная картинка']||'').trim())return last;
    Utilities.sleep(350);
  }
  return last;
}
function approveVacancy(id,message){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(3000))throw new Error('Объявление уже обрабатывается. Попробуйте ещё раз.');
  try{
    var x=findSubmissionById(id);
    if(!x)throw new Error('Объявление не найдено: '+id);
    var currentStatus=getById(x._sheet,id,x._idHeader);
    var status=currentStatus?String(currentStatus['Статус']||''):'';
    if(status==='Опубликована'||status==='Опубликован')return false;
    if(status==='Публикуется')return false;
    var originalSheet=x._sheet,originalHeader=x._idHeader;
    // Rich Message: для профессий с настроенным баннером изображение обязательно.
    var resolvedType=String(x.type||x.announcementType||'');x=hydrateStoredSubmission(Object.assign({},currentStatus||{}, {_defaultType:resolvedType, _sheet:originalSheet, _idHeader:originalHeader}));x.id=id;x.type=resolvedType;x.announcementType=resolvedType;x._sheet=originalSheet;x._idHeader=originalHeader;
    updateStatusFast_(x._sheet,id,x._idHeader,'Публикуется');
    var r=publishVacancyToChannel(x);
    if(!r||!r.ok)throw new Error('Не удалось опубликовать в Telegram');
    var publishedMessageId=r.result&&r.result.message_id;
    if(publishedMessageId){savePublishedMessageId(x._sheet,id,x._idHeader,publishedMessageId);}
    try{
      if(x.type==='Ищу работу'){
        var ca=getById('Объявления соискателей',id,'announcement_id'),cp=ca?getById('Соискатели',String(ca.profile_id||''),'profile_id'):null;
        if(ca)cachePublicEntityPersistent_('candidateAnnouncement',id,{announcement:ca,profile:publicCandidateAnnouncement_(ca,cp||{},false)});
      }else if(x.type==='Предлагаю работу'){
        var vv=getById('Вакансии',id,'ID');if(vv)cachePublicEntityPersistent_('vacancy',id,vv);
      }else if(x.type==='Бригада ищет работу'){
        var bb=getById('Бригады',id,'brigade_id');if(bb)cachePublicEntityPersistent_('brigade',id,publicBrigade_(bb));
      }else if(x.type==='Ищу бригаду'){
        var rr=getById('Ищу бригаду',id,'brigade_request_id');if(rr)cachePublicEntityPersistent_('request',id,rr);
      }
    }catch(warmErr){console.warn('Не удалось прогреть public cache:',warmErr);}
    updateStatusFast_(x._sheet,id,x._idHeader,x.type==='Ищу работу'||x.type==='Бригада ищет работу'?'Опубликован':'Опубликована');
    try{invalidateSearchCaches_();}catch(cacheErr2){console.warn('Не удалось обновить кэш поиска после публикации:',cacheErr2);}
    if(x.type==='Ищу работу'){
      try{
        var candidateProfileId=String(x.profileId||id);
        var freshCandidate=getById('Соискатели',candidateProfileId,'profile_id');
        if(freshCandidate){
          var warmed=publicCandidate(freshCandidate,true);
          cachePublicCandidateProfile(candidateProfileId,warmed);
          cachePublicCandidateProfilePersistent_(candidateProfileId,warmed);
        }
      }catch(cacheErr){console.warn('Не удалось прогреть cache профиля соискателя:',cacheErr);}
    }
    if(message)updateModerationMessage(message,'approved');
    return true;
  }catch(e){
    try{var x2=findSubmissionById(id);if(x2)updateStatusFast_(x2._sheet,id,x2._idHeader,'На модерации');}catch(ignore){}
    throw e;
  }finally{lock.releaseLock();}
}
function rejectVacancy(id,message){var x=findSubmissionById(id);if(!x)throw new Error('Объявление не найдено: '+id);updateStatusFast_(x._sheet,id,x._idHeader,'Отклонена');if(message)updateModerationMessage(message,'rejected');}
function updateModerationMessage(message,state,errorText){
  if(!message||!message.chat)return;
  var text=message.text||'';
  var prefix=state==='approved'?'✅ <b>ОПУБЛИКОВАНО</b>\n\n':state==='rejected'?'❌ <b>ОТКЛОНЕНО</b>\n\n':state==='publishing'?'⏳ <b>ПУБЛИКУЕТСЯ...</b>\n\n':state==='error'?'❌ <b>ОШИБКА ПУБЛИКАЦИИ</b>\n'+htmlEscape(errorText||'Неизвестная ошибка')+'\n\n':'';
  var markup={inline_keyboard:[]};
  if(state==='error'){var mm=String(message.text||'').match(/ID[^\n]*?([A-Z]+-\d+)/);if(mm&&mm[1])markup={inline_keyboard:[[{text:'🔄 Опубликовать снова',callback_data:'approve:'+mm[1]}]]};}
  try{
    telegramRequest('editMessageText',{chat_id:message.chat.id,message_id:message.message_id,text:prefix+text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:markup});
  }catch(e){console.error(e);}
}
