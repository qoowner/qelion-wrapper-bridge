const chat = document.getElementById('chat');
const imageInput = document.getElementById('imageFile');
const textInput = document.getElementById('textFile');
const pdfInput = document.getElementById('pdfFile');
const fileButtons = Array.from(document.querySelectorAll('.picker__btn'));
const picker = document.getElementById('picker');
const pickerClose = document.getElementById('pickerClose');
const promptInput = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const modelSelect = document.getElementById('modelSelect');
const languageSelect = document.getElementById('languageSelect');
const addBtn = document.getElementById('addBtn');
const titleEl = document.querySelector('[data-i18n="title"]');
const metaEl = document.querySelector('[data-i18n="metaPrefix"]');

const localeStrings = {
  en: {
    htmlLang: 'en',
    title: "Let's talk!",
    metaPrefix: 'Apple OCR × Ollama',
    modelLabel: 'Model',
    modelLoading: 'Loading…',
    modelLoadError: 'Failed to load models',
    modelEmpty: 'No models found',
    langLabel: 'Language',
    placeholder: 'Type a message…',
    send: 'Send',
    addTitle: 'Attach image or document',
    thoughtsSummary: '💭 Model thoughts',
    error: 'Error',
    ready: 'Done',
    network: 'Network error: ',
    uploadTitle: 'What do you want to upload?',
    uploadImage: 'Photo',
    uploadText: 'Text file',
    uploadPdf: 'PDF document',
    uploadCancel: 'Cancel',
    warning_text_truncated: 'The document is too long; it will be truncated for this model.',
    warning_pdf_truncated: 'The PDF is too long; only the beginning will be processed.',
  },
  ru: {
    htmlLang: 'ru',
    title: 'Поговорим!',
    metaPrefix: 'Apple OCR × Ollama',
    modelLabel: 'Модель',
    modelLoading: 'Загрузка…',
    modelLoadError: 'Не удалось загрузить модели',
    modelEmpty: 'Модели не найдены',
    langLabel: 'Язык',
    placeholder: 'Напиши сообщение…',
    send: 'Отправить',
    addTitle: 'Прикрепить изображение или документ',
    thoughtsSummary: '💭 Мысли модели',
    error: 'Ошибка',
    ready: 'Готово',
    network: 'Сеть недоступна: ',
    uploadTitle: 'Что загрузить?',
    uploadImage: 'Фото',
    uploadText: 'Текстовый файл',
    uploadPdf: 'PDF документ',
    uploadCancel: 'Отмена',
    warning_text_truncated: 'Файл слишком большой — будет использована только часть текста.',
    warning_pdf_truncated: 'PDF превышает лимит модели — обработаны будут только первые страницы.',
  },
  de: {
    htmlLang: 'de',
    title: 'Lass uns reden!',
    metaPrefix: 'Apple OCR × Ollama',
    modelLabel: 'Modell',
    modelLoading: 'Lädt…',
    modelLoadError: 'Modelle konnten nicht geladen werden',
    modelEmpty: 'Keine Modelle gefunden',
    langLabel: 'Sprache',
    placeholder: 'Schreibe eine Nachricht…',
    send: 'Senden',
    addTitle: 'Bild oder Dokument anhängen',
    thoughtsSummary: '💭 Gedanken des Modells',
    error: 'Fehler',
    ready: 'Fertig',
    network: 'Netzwerkfehler: ',
    uploadTitle: 'Was möchtest du hochladen?',
    uploadImage: 'Foto',
    uploadText: 'Textdatei',
    uploadPdf: 'PDF-Dokument',
    uploadCancel: 'Abbrechen',
    warning_text_truncated: 'Die Datei ist zu lang – nur ein Teil wird genutzt.',
    warning_pdf_truncated: 'Das PDF ist zu groß – nur der Anfang wird verarbeitet.',
  },
  fr: {
    htmlLang: 'fr',
    title: 'Discutons !',
    metaPrefix: 'Apple OCR × Ollama',
    modelLabel: 'Modèle',
    modelLoading: 'Chargement…',
    modelLoadError: 'Impossible de charger les modèles',
    modelEmpty: 'Aucun modèle trouvé',
    langLabel: 'Langue',
    placeholder: 'Écris un message…',
    send: 'Envoyer',
    addTitle: 'Joindre une image ou un document',
    thoughtsSummary: '💭 Réflexions du modèle',
    error: 'Erreur',
    ready: 'Terminé',
    network: 'Erreur réseau : ',
    uploadTitle: 'Que souhaites-tu importer ?',
    uploadImage: 'Photo',
    uploadText: 'Fichier texte',
    uploadPdf: 'Document PDF',
    uploadCancel: 'Annuler',
    warning_text_truncated: 'Le fichier est trop long — seule une partie sera utilisée.',
    warning_pdf_truncated: 'Le PDF dépasse la limite — seules les premières pages seront lues.',
  },
};

const localePrompts = {
  en: 'You are a helpful assistant. Reply in English.',
  ru: 'Ты — полезный помощник. Отвечай на русском языке.',
  de: 'Du bist ein hilfsbereiter Assistent. Antworte auf Deutsch.',
  fr: 'Tu es un assistant utile. Réponds en français.',
};

const localeLangCodes = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  fr: 'fr-FR',
};

const LOCAL_CHAR_LIMITS = {
  '1b': 4000,
  '2b': 6000,
  '3b': 8000,
  '4b': 10000,
  '7b': 14000,
  '8b': 16000,
  '14b': 22000,
  '32b': 30000,
  '70b': 45000,
  '110b': 60000,
  '480b': 100000,
};

let history = [];
let currentLocale = 'en';
let modelsState = { status: 'loading', items: [] };
let selectedModel = 'qwen3:4b';
let pendingUpload = null;

function t(key){
  const table = localeStrings[currentLocale] || localeStrings.en;
  if(Object.prototype.hasOwnProperty.call(table, key)){
    return table[key];
  }
  const fall = localeStrings.en;
  return Object.prototype.hasOwnProperty.call(fall, key) ? fall[key] : key;
}

function translateWarning(code){
  if(!code) return null;
  const key = `warning_${code}`;
  return t(key);
}

function estimateCharLimitLocal(modelName){
  const lower = (modelName || '').toLowerCase();
  for(const token in LOCAL_CHAR_LIMITS){
    if(lower.includes(token)) return LOCAL_CHAR_LIMITS[token];
  }
  return 16000;
}

function findModelInfo(name){
  if(!name || !Array.isArray(modelsState.items)) return null;
  return modelsState.items.find((item) => item && item.name === name) || null;
}

function charLimitForModel(name){
  const info = findModelInfo(name);
  if(info){
    const ctx = Number(info.context_length);
    if(Number.isFinite(ctx) && ctx > 0){
      return Math.round(ctx * 4);
    }
    if(typeof info.parameter_size === 'string'){ // fallback using parameter size tokens
      const lower = info.parameter_size.toLowerCase();
      for(const token in LOCAL_CHAR_LIMITS){
        if(lower.includes(token)) return LOCAL_CHAR_LIMITS[token];
      }
    }
  }
  return estimateCharLimitLocal(name);
}

function syncSystemPrompt(){
  const prompt = localePrompts[currentLocale] || localePrompts.en;
  if(history.length === 0){
    history.push({ role: 'system', content: prompt });
  } else {
    history[0] = { ...history[0], content: prompt };
  }
}

function updateMeta(){
  if(!metaEl) return;
  metaEl.textContent = t('metaPrefix');
}

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if(!key) return;
    const text = t(key);
    if(node instanceof HTMLInputElement){
      node.placeholder = text;
    } else {
      node.textContent = text;
    }
  });
}

function applyLocale(locale){
  if(!localeStrings[locale]){
    locale = 'en';
  }
  currentLocale = locale;
  const strings = localeStrings[currentLocale];

  document.documentElement.lang = strings.htmlLang;
  if(titleEl) titleEl.textContent = strings.title;
  if(promptInput) promptInput.placeholder = strings.placeholder;
  if(sendBtn) sendBtn.textContent = strings.send;
  if(addBtn) addBtn.title = strings.addTitle;
  if(languageSelect) languageSelect.value = currentLocale;

  applyTranslations();
  renderModelOptions();
  updateMeta();
  syncSystemPrompt();
}

function renderModelOptions(){
  if(!modelSelect) return;
  modelSelect.innerHTML = '';

  if(modelsState.status === 'loading'){
    const opt = new Option(t('modelLoading'), '', true, true);
    opt.disabled = true;
    opt.dataset.i18n = 'modelLoading';
    modelSelect.add(opt);
    modelSelect.disabled = true;
    return;
  }

  if(modelsState.status === 'error'){
    const opt = new Option(t('modelLoadError'), '', true, true);
    opt.disabled = true;
    opt.dataset.i18n = 'modelLoadError';
    modelSelect.add(opt);
    modelSelect.disabled = true;
    return;
  }

  if(modelsState.items.length === 0){
    const opt = new Option(t('modelEmpty'), '', true, true);
    opt.disabled = true;
    opt.dataset.i18n = 'modelEmpty';
    modelSelect.add(opt);
    modelSelect.disabled = true;
    return;
  }

  const candidates = modelsState.items.map((item) => item.name);
  const fallback = candidates.includes(selectedModel) ? selectedModel : candidates[0];

  modelsState.items.forEach((item) => {
    const opt = new Option(item.name, item.name, false, false);
    modelSelect.add(opt);
  });

  modelSelect.value = fallback;
  selectedModel = fallback;
  modelSelect.disabled = false;
}

async function loadModels(){
  modelsState = { status: 'loading', items: [] };
  renderModelOptions();

  try{
    const res = await fetch('/api/models');
    const data = await res.json();
    if(!res.ok){
      throw new Error(data.error || res.statusText);
    }
    const items = Array.isArray(data.models) ? data.models.filter((m) => m && m.name) : [];
    modelsState = { status: 'loaded', items };
  }catch(err){
    console.error('Failed to load models', err);
    modelsState = { status: 'error', items: [] };
  }

  renderModelOptions();
  updateMeta();
}

function el(tag, cls, text){
  const node = document.createElement(tag);
  if(cls) node.className = cls;
  if(typeof text === 'string') node.textContent = text;
  return node;
}

function scrollChat(){
  chat.scrollTop = chat.scrollHeight;
}

function makeWarning(code){
  const text = translateWarning(code);
  if(!text) return null;
  return el('div', 'msg__warning', text);
}

function addAttachmentChip(container, upload){
  const wrap = el('div', 'msg__files');
  const isImage = upload.kind === 'image';
  const classes = ['thumb'];
  if(upload.kind === 'pdf'){
    classes.push('thumb--pdf');
  } else if(!isImage){
    classes.push('thumb--doc');
  }
  const chip = el('div', classes.join(' '));

  if(isImage && upload.previewUrl){
    const thumb = el('img');
    thumb.src = upload.previewUrl;
    thumb.alt = upload.file.name;
    thumb.addEventListener('load', () => {
      try{ URL.revokeObjectURL(upload.previewUrl); }catch(_err){}
    });
    chip.appendChild(thumb);
  } else {
    chip.appendChild(el('span', null, upload.kind === 'pdf' ? 'PDF' : 'TXT'));
  }

  chip.appendChild(el('span', null, upload.file.name));

  if(upload.kind === 'text' && upload.previewText){
    chip.appendChild(el('span', null, `— ${upload.previewText}`));
  }

  wrap.appendChild(chip);
  container.appendChild(wrap);
}

function addUserCard(promptText, upload){
  const wrap = el('div', 'msg msg--user');
  const bubble = el('div', 'msg__bubble', promptText || '');
  wrap.appendChild(bubble);

  if(upload){
    addAttachmentChip(wrap, upload);
    if(upload.warningCode){
      const warn = makeWarning(upload.warningCode);
      if(warn) wrap.appendChild(warn);
    }
  }

  chat.appendChild(wrap);
  scrollChat();
}

function splitReply(raw){
  if(!raw) return { answer: '', thoughts: null };
  const match = raw.match(/think>([\s\S]*?)<\s*\/think>/i);
  if(!match) return { answer: raw.trim(), thoughts: null };
  const thoughts = match[1].trim();
  const answer = (raw.slice(0, match.index) + raw.slice(match.index + match[0].length)).trim();
  return { answer, thoughts };
}

function buildBotCard(){
  const wrap = el('div', 'msg msg--bot');
  const bubble = el('div', 'msg__bubble', '…');
  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  scrollChat();
  return { wrap, bubble };
}

function mountThoughts(parent, thoughts){
  if(!thoughts) return;
  const details = el('details', 'msg__thoughts');
  const summary = el('summary', null, t('thoughtsSummary'));
  const body = el('div', 'msg__thoughts-body', thoughts);
  details.appendChild(summary);
  details.appendChild(body);
  parent.appendChild(details);
  scrollChat();
}

function mountWarning(parent, code){
  const node = makeWarning(code);
  if(node){
    parent.appendChild(node);
    scrollChat();
  }
}

function getSelectedModel(){
  if(modelSelect && !modelSelect.disabled && modelSelect.value){
    return modelSelect.value;
  }
  return selectedModel || 'qwen3:4b';
}

function hidePicker(){
  picker.classList.add('picker--hidden');
}

function showPicker(){
  picker.classList.remove('picker--hidden');
}

function openFileInput(input){
  if(!input) return;
  if(typeof input.showPicker === 'function'){
    try{
      input.showPicker();
      return;
    }catch(err){
      console.warn('showPicker failed, falling back to click()', err);
    }
  }
  input.click();
}

function resetInputs(){
  if(imageInput) imageInput.value = '';
  if(textInput) textInput.value = '';
  if(pdfInput) pdfInput.value = '';
}

function prepareImageUpload(file){
  if(!file) return;
  pendingUpload = {
    file,
    kind: 'image',
    previewUrl: URL.createObjectURL(file),
    warningCode: null,
  };
  hidePicker();
}

function prepareTextUpload(file){
  if(!file) return;
  pendingUpload = {
    file,
    kind: 'text',
    previewText: '',
    warningCode: null,
    loading: true,
  };
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : '';
    const limit = charLimitForModel(getSelectedModel());
    const warning = text.length > limit ? 'text_truncated' : null;
    if(pendingUpload && pendingUpload.file === file){
      pendingUpload.previewText = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      pendingUpload.warningCode = warning;
      pendingUpload.loading = false;
    }
    hidePicker();
  };
  reader.onerror = () => {
    console.error('Failed to read text file');
    if(pendingUpload && pendingUpload.file === file){
      pendingUpload = null;
    }
    hidePicker();
  };
  reader.readAsText(file);
}

function preparePdfUpload(file){
  if(!file) return;
  const charLimit = charLimitForModel(getSelectedModel());
  const approxChars = file.size; // coarse approximation
  const warning = approxChars > charLimit * 2 ? 'pdf_truncated' : (file.size > 4 * 1024 * 1024 ? 'pdf_truncated' : null);
  pendingUpload = {
    file,
    kind: 'pdf',
    warningCode: warning,
  };
  hidePicker();
}

async function send(){
  if(pendingUpload && pendingUpload.loading){
    return;
  }
  const prompt = promptInput.value.trim();
  if(!prompt && !pendingUpload){
    promptInput.focus();
    return;
  }

  const uploadSnapshot = pendingUpload ? { ...pendingUpload } : null;
  addUserCard(prompt, uploadSnapshot);

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('history', JSON.stringify(history));
  form.append('model', getSelectedModel());

  const langCode = localeLangCodes[currentLocale];
  if(langCode){
    form.append('lang', langCode);
  }

  if(pendingUpload){
    form.append('upload_kind', pendingUpload.kind);
    const file = pendingUpload.file;
    const name = file ? file.name : 'upload';
    if(pendingUpload.kind === 'image'){
      if(file){
        form.append('image', file, name);
        form.append('upload', file, name);
      }
    } else if(file){
      form.append('upload', file, name);
    }
  }

  promptInput.value = '';

  const botCard = buildBotCard();

  try{
    const res = await fetch('/api/chat', { method: 'POST', body: form });
    const data = await res.json();
    if(!res.ok){
      botCard.bubble.textContent = data.error || t('error');
    } else {
      const { answer, thoughts } = splitReply(data.reply || '');
      botCard.bubble.textContent = answer || t('ready');
      mountThoughts(botCard.wrap, thoughts);
      if(data.document_warning){
        mountWarning(botCard.wrap, data.document_warning);
      }
      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: data.reply || '' });
    }
  }catch(e){
    botCard.bubble.textContent = t('network') + e;
  }finally{
    pendingUpload = null;
    resetInputs();
  }
}

sendBtn.addEventListener('click', send);
promptInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    send();
  }
});

if(languageSelect){
  languageSelect.addEventListener('change', (e) => {
    applyLocale(e.target.value);
  });
}

if(modelSelect){
  modelSelect.addEventListener('change', () => {
    selectedModel = modelSelect.value;
  });
}

if(addBtn){
  addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showPicker();
  });
}

if(pickerClose){
  pickerClose.addEventListener('click', hidePicker);
}

picker.addEventListener('click', (e) => {
  if(e.target === picker){
    hidePicker();
  }
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && !picker.classList.contains('picker--hidden')){
    hidePicker();
  }
});

fileButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.upload;
    if(type === 'image'){
      openFileInput(imageInput);
    }
    if(type === 'text'){
      openFileInput(textInput);
    }
    if(type === 'pdf'){
      openFileInput(pdfInput);
    }
  });
});

if(imageInput){
  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
    if(file) prepareImageUpload(file);
  });
}

if(textInput){
  textInput.addEventListener('change', () => {
    const file = textInput.files && textInput.files[0] ? textInput.files[0] : null;
    if(file) prepareTextUpload(file);
  });
}

if(pdfInput){
  pdfInput.addEventListener('change', () => {
    const file = pdfInput.files && pdfInput.files[0] ? pdfInput.files[0] : null;
    if(file) preparePdfUpload(file);
  });
}

applyLocale(currentLocale);
loadModels();
