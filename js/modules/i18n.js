import { STORAGE_KEYS, NOTE_DISPLAY_NAMES, CHORD_TYPE_DISPLAY_NAMES } from './state/constants.js';
import { state } from './state/stores.js';
import { el } from './dom.js';

const FAQ_SECTIONS = {
  ru: [
    { title: '1) Верхняя панель и сохранение', items: ['Поле «Название песни» нужно для сохранения текущего набора аккордов или текста песни под понятным именем.', 'Кнопка «OK» сохраняет текущий набор выбранных аккордов как отдельную песню.', 'Кнопка FAQ открывает эту инструкцию, а кнопка RUS / ENG переключает весь интерфейс сайта между русским и английским языком.'] },
    { title: '2) Цветные кнопки с иконками', items: ['Папка открывает список сохранённых песен. Там можно открыть песню, удалить её или поставить в избранное.', 'Палитра переключает вид нот между цветными блоками и обычными светлыми блоками.', 'Клавиши переключают отображение выбранных аккордов в режим пианино.', 'Корзина очищает весь текущий список выбранных аккордов.', 'Кнопка вставки текста открывает окно работы с текстом песни и поиском аккордов внутри текста.', 'Полный экран открывает большой режим просмотра аккордов и позволяет сохранить PDF.'] },
    { title: '3) Панель групп и фильтров', items: ['Под основным блоком есть отдельная панель управления группами.', 'Кнопка «Развернуть все группы / Свернуть все группы» открывает или закрывает все корневые группы аккордов сразу.', 'Ниже находятся фильтры семейств аккордов: мажорные, минорные, доминантовые, maj7/9, m7/9/11, sus и dim. Они не меняют базу, а только быстро фильтруют отображение списка.'] },
    { title: '4) Как добавлять и прослушивать аккорды в группах', items: ['Нажмите на название аккорда в списке групп снизу, и он добавится в область «Выбранные аккорды».', 'Один и тот же аккорд можно добавлять много раз, если он повторяется в песне.', 'Цифра слева в строке показывает, сколько раз этот аккорд уже добавлен.', 'Маленькая кнопка воспроизведения справа в строке аккорда проигрывает этот аккорд, не добавляя его в список.'] },
    { title: '5) Как работать с выбранными карточками аккордов', items: ['Нажмите на шапку карточки аккорда, чтобы удалить только этот аккорд.', 'Перетаскивайте карточки за ручку слева сверху, чтобы менять порядок.', 'Нажатие по зоне клавиш или нотных блоков внутри карточки проигрывает аккорд.', 'Если название длинное, строка с басом автоматически переносится ниже названия.'] },
    { title: '6) Меню одного аккорда на телефоне и на ПК', items: ['На телефоне меню аккорда открывается долгим тапом по шапке карточки.', 'На ПК то же меню открывается правой кнопкой мыши по шапке карточки.', 'Через это меню можно изменить только один аккорд: сбросить его в основное положение, перевести в 1 или 2 обращение и транспонировать отдельно от остальных.'] },
    { title: '7) Что делают кнопки ОСН / 1 обр / 2 обр / Умное обр', items: ['ОСН возвращает все выбранные аккорды в основное положение.', '1 обр и 2 обр переводят все выбранные аккорды в соответствующее обращение.', 'Умное обр автоматически подбирает обращения так, чтобы переходы между аккордами были плавнее между соседними аккордами.'] },
    { title: '8) Что делает транспонирование', items: ['Кнопки -1 и +1 сдвигают все текущие аккорды на полтона вниз или вверх.', 'Это полезно, если нужно быстро изменить тональность песни под голос, инструмент или привычную аппликатуру.'] },
    { title: '9) Поиск и отображение аккордов', items: ['Поле «Поиск аккорда» фильтрует группы по началу названия.', 'Когда поиск активен, подходящие группы автоматически раскрываются.', 'В обычном режиме аккорды показываются как блоки нот, в цветном режиме каждая нота окрашивается своим цветом, а в режиме клавиш аккорд показывается как мини-клавиатура пианино.'] },
    { title: '10) Полный экран и PDF', items: ['Полный экран показывает крупные карточки аккордов для репетиции, игры или печати.', 'В этом режиме доступны те же действия с режимами аккордов, транспонированием и умным обращением.', 'Кнопка PDF открывает печать или сохранение раскладки в файл.'] },
    { title: '11) Песни и сохранение', items: ['Введите название в верхнем поле и нажмите «OK», чтобы сохранить текущую раскладку аккордов.', 'Через кнопку папки можно открыть сохранённые песни, удалить ненужные или отметить избранные.', 'Если сохранена текстовая версия песни, при открытии сразу показывается окно текста с аккордами и кнопками действий.'] },
    { title: '12) Окно текста с аккордами', items: ['Через кнопку вставки текста можно вставить текст песни и найти в нём аккорды автоматически.', 'Кнопка «Найти аккорды» подсвечивает найденные аккорды в тексте.', 'Кнопка «Добавить в список» переносит найденные аккорды в основную сетку выбранных аккордов.', 'Кнопка «Добавить аккорды» в уже сохранённой текстовой песне делает то же самое прямо из режима просмотра.', 'Кнопка «Сохранить песню» сохраняет сам текст песни вместе с аккордами.'] },
    { title: '13) Мягкий режим и работа с текстом', items: ['Мягкий режим помогает находить аккорды даже в строках, где аккорд встречается одиночно.', 'Это полезно для неидеально оформленных текстов песен.', 'Подсвеченные аккорды в тексте кликабельны: по нажатию открывается просмотр конкретного аккорда, где тоже можно переключать вид и воспроизводить аккорд.'] },
    { title: '14) Режимы аккордов внутри текста', items: ['В окне текста можно переключать отображение аккорда между видами «Клавиши / Цвет / Обыч».', 'Там же доступны общие кнопки ОСН / 1 обр / 2 обр / Умное обр / -1 / +1 для всех аккордов текста сразу.', 'Это удобно, когда нужно быстро переписать весь текст в другом обращении или в другой тональности.'] },
    { title: '15) MIDI: свободная игра и тренировка', items: ['По умолчанию сайт открывается в режиме «Свободная игра». В нём звучат любые MIDI-ноты и любые сочетания нот, даже если список выбранных аккордов пустой.', 'Режим «Тренировка аккордов» срабатывает только на точное совпадение с выбранным аккордом без лишних нот. Когда аккорд зажат правильно, его карточка подсвечивается и звучат только ноты этого аккорда.', 'Если список выбранных аккордов пустой, а подключено реальное MIDI-устройство, сайт показывает распознанный аккорд в центре окна аккордов.', 'В окне текста песни MIDI всегда работает как свободная игра, чтобы можно было играть бас, аккорды и мелодию поверх текста.'] },
    { title: '16) Что важно знать про браузер', items: ['MIDI на сайте лучше всего работает в Chromium-браузерах: Google Chrome, Microsoft Edge, Opera, Яндекс Браузер и других браузерах на Chromium.', 'После первого запуска звуков сайт может один раз подгрузить нужные сэмплы, после чего воспроизведение работает быстрее.', 'Если браузер запросил доступ к MIDI или звуку, его нужно разрешить, иначе соответствующие функции работать не будут.'] }
  ],
  en: [
    { title: '1) Top bar and saving', items: ['The “Song title” field is used to save the current chord layout or a lyrics-with-chords entry under a clear name.', 'The “OK” button saves the current selected chord set as a song entry.', 'The FAQ button opens this guide, and the RUS / ENG button switches the entire interface between Russian and English.'] },
    { title: '2) Colored icon buttons', items: ['The folder opens the list of saved songs. There you can open a song, delete it, or mark it as favorite.', 'The palette switches note display between colored blocks and plain light blocks.', 'The piano button switches selected chords to the mini-keyboard view.', 'The trash button clears the whole current selected chord list.', 'The import text button opens the lyrics-with-chords workspace.', 'Fullscreen opens the large chord view and lets you save or print a PDF.'] },
    { title: '3) Group and filter panel', items: ['Below the main panel there is a separate section for group controls.', 'The “Expand All Groups / Collapse All Groups” button opens or closes all root groups at once.', 'Below it you will find family filters: major, minor, dominant, maj7/9, m7/9/11, sus and dim. They do not modify the database, they only filter what is currently shown.'] },
    { title: '4) Adding and previewing chords in groups', items: ['Click a chord name in the groups list below and it will be added to the selected chords area.', 'The same chord can be added many times if it repeats in the song.', 'The number on the left shows how many times that chord has already been added.', 'The small play button on the right side of the row previews the chord without adding it.'] },
    { title: '5) Working with selected chord cards', items: ['Click the chord card header to remove only that chord.', 'Drag cards by the handle in the top-left corner to change their order.', 'Clicking the keyboard or note-block area inside a card plays that chord.', 'If the title is long, the bass line is automatically moved below the main title.'] },
    { title: '6) Single-chord menu on phone and desktop', items: ['On phones the chord menu opens with a long press on the card header.', 'On desktop the same menu opens with a right click on the card header.', 'This menu lets you change only that one chord: reset it to root position, move it to 1st or 2nd inversion, or transpose it separately from the rest.'] },
    { title: '7) What Root / 1st Inv / 2nd Inv / Smart Inv do', items: ['Root returns all selected chords to root position.', '1st Inv and 2nd Inv move all selected chords to the corresponding inversion.', 'Smart Inv automatically chooses inversions that make neighboring chord transitions smoother.'] },
    { title: '8) What transposition does', items: ['The -1 and +1 buttons transpose all current chords down or up by one semitone.', 'This is useful when you need to change the song key quickly for a voice, an instrument, or a preferred fingering shape.'] },
    { title: '9) Search and chord display modes', items: ['The “Search chord...” field filters groups by the beginning of the chord name.', 'When search is active, matching groups open automatically.', 'In normal mode, chords are shown as note blocks; in color mode, each note gets its own color; in keyboard mode, the chord is shown as a mini piano keyboard.'] },
    { title: '10) Fullscreen and PDF', items: ['Fullscreen shows large chord cards for rehearsal, playing, or printing.', 'In this mode the same inversion, smart inversion, and transpose controls remain available.', 'The PDF button opens print or save-to-file.'] },
    { title: '11) Songs and saving', items: ['Enter a name in the top field and press “OK” to save the current chord layout.', 'Through the folder button you can open saved songs, delete them, or mark favorites.', 'If a text-based song was saved, opening it will immediately show the lyrics-with-chords workspace instead of the plain chord grid.'] },
    { title: '12) Lyrics & chords workspace', items: ['With the import text button you can paste song lyrics and automatically detect chords inside the text.', 'The “Find Chords” button highlights the found chords in the text.', 'The “Add to List” button sends the found chords to the main selected chords grid.', 'The “Add Chords” button in an already saved text song does the same directly from view mode.', 'The “Save Song” button stores the lyrics together with the chords.'] },
    { title: '13) Soft mode and working with text', items: ['Soft mode helps detect chords even in lines where a chord appears only once.', 'This is useful for badly formatted lyrics sheets.', 'Highlighted chords inside the text are clickable: clicking opens a dedicated chord view where you can also switch display mode and preview the chord.'] },
    { title: '14) Chord controls inside song text', items: ['Inside the lyrics window you can switch chord display between Keyboard / Color / Plain.', 'The same window also provides Root / 1st Inv / 2nd Inv / Smart Inv / -1 / +1 for all detected chords at once.', 'This is useful when you want to rewrite the entire song text into another inversion pattern or another key.'] },
    { title: '15) MIDI: Free Play and Training', items: ['By default the site opens in Free Play mode. In this mode any MIDI notes and combinations can sound even when the selected chord list is empty.', 'Training mode only reacts to an exact match with the selected chord and no extra notes. When the chord is played correctly, its card is highlighted and only those notes sound.', 'If the selected chord list is empty but a real MIDI device is connected, the site shows the recognized chord centered in the chord area.', 'Inside the lyrics window MIDI always works as Free Play so you can play bass, chords and melody over the text.'] },
    { title: '16) Browser notes', items: ['Web MIDI works best in Chromium-based browsers: Google Chrome, Microsoft Edge, Opera, Yandex Browser, and similar Chromium browsers.', 'After the first launch the site may need one initial sample preload before chord preview becomes instant.', 'If the browser asks for MIDI or audio permission, you need to allow it, otherwise the related features will not work.'] }
  ]
};

const UI_TEXT = {
  ru: {
    pageTitle: 'Аккорды Фортепиано',
    faq: 'FAQ / Инструкция',
    songNamePlaceholder: 'Название песни...',
    songs: 'Песни',
    color: 'Цвет',
    piano: 'Пианино',
    clear: 'Очистить',
    insertText: 'Вставить текст',
    fullscreen: 'Полный экран',
    modeRoot: 'ОСН',
    modeInv1: '1 обр',
    modeInv2: '2 обр',
    modeSmart: 'Умное обр',
    freePlay: 'Свободная игра',
    training: 'Тренировка аккордов',
    searchPlaceholder: 'Поиск аккорда...',
    searchHint: 'Нажмите на название аккорда, чтобы добавить его',
    expandAll: 'Развернуть все группы',
    collapseAll: 'Свернуть все группы',
    filterAll: 'Все',
    filterMajor: 'Мажор',
    filterMinor: 'Минор',
    siteApk: 'Android (apk) версия сайта',
    siteAuthor: 'Автор сайта',
    close: 'Закрыть',
    songsTitle: 'Песни (★ — избранное)',
    chordActions: 'Действия с аккордом',
    songTextTitle: 'Текст с аккордами',
    addChords: 'Добавить аккорды',
    softMode: 'Мягкий режим (считывать одиночные аккорды в строке)',
    songTextPlaceholder: 'Вставьте текст песни с аккордами...',
    findChords: 'Найти аккорды',
    addToList: 'Добавить в список',
    saveSong: 'Сохранить песню',
    keyboard: 'Клавиши',
    plain: 'Обыч',
    highlightHint: 'Нажмите «Найти аккорды», чтобы подсветить текст.',
    songsOpen: 'Открыть',
    songsDelete: 'Удалить',
    chordsFallbackTitle: 'Аккорды',
    enterSongName: 'Введите название песни',
    songSaved: 'Песня сохранена',
    chordsNotFound: 'Аккорды не найдены.',
    chordsAlreadyAdded: 'Аккорды уже добавлены',
    chordsAdded: 'Аккорды добавлены',
    previewVerb: 'Прослушать',
    midiUnsupported: 'Этот браузер не поддерживает Web MIDI. Откройте сайт в Chrome, Edge, Opera или Яндекс Браузере.',
    midiConnecting: 'Подключение MIDI и загрузка звуков...',
    midiConnected: 'MIDI подключён: {names}.',
    midiAccessGranted: 'Доступ к MIDI получен. Подключите реальное MIDI-устройство и нажмите кнопку ещё раз, если оно появилось позже.',
    midiDenied: 'Доступ к MIDI отклонён. Разрешите MIDI в браузере и нажмите кнопку снова.',
    midiStartHint: 'Для работы MIDI режима - нажмите на кнопку "Свободная игра", которая находится выше.',
    audioLoadError: 'Не удалось загрузить звуки пианино. Проверьте сеть и обновите страницу.',
    previewPrepareError: 'Не удалось подготовить звук аккорда. Проверьте сеть и обновите страницу.',
    midiAccessBrowserDenied: 'Браузер не дал доступ к MIDI. Разрешите подключение устройства в окне браузера.',
    midiUnavailable: 'В этом браузере Web MIDI недоступен.',
    midiConnectError: 'Не удалось подключить MIDI. Попробуйте Chrome или Edge и нажмите кнопку ещё раз.',
    loadingSounds: 'Загрузка звуков: {completed}/{total}',
    pdfTitle: 'Сохранить / напечатать PDF',
    languageToggleTitle: 'Switch to English',
    languageToggleLabel: 'RUS / ENG',
    bass: 'Бас',
    fullModeKeyboard: 'Клавиши',
    fullModeColor: 'Цвет',
    fullModePlain: 'Обыч'
  },
  en: {
    pageTitle: 'Piano Chords',
    faq: 'FAQ / Guide',
    songNamePlaceholder: 'Song title...',
    songs: 'Songs',
    color: 'Color',
    piano: 'Piano',
    clear: 'Clear',
    insertText: 'Import text',
    fullscreen: 'Fullscreen',
    modeRoot: 'Root',
    modeInv1: '1st Inv',
    modeInv2: '2nd Inv',
    modeSmart: 'Smart Inv',
    freePlay: 'Free Play',
    training: 'Chord Training',
    searchPlaceholder: 'Search chord...',
    searchHint: 'Click a chord name to add it',
    expandAll: 'Expand All Groups',
    collapseAll: 'Collapse All Groups',
    filterAll: 'All',
    filterMajor: 'Major',
    filterMinor: 'Minor',
    siteApk: 'Android (APK) version',
    siteAuthor: 'Site author',
    close: 'Close',
    songsTitle: 'Songs (★ — favorites)',
    chordActions: 'Chord Actions',
    songTextTitle: 'Lyrics & Chords',
    addChords: 'Add Chords',
    softMode: 'Soft mode (detect single chords in a line)',
    songTextPlaceholder: 'Paste song lyrics with chords...',
    findChords: 'Find Chords',
    addToList: 'Add to List',
    saveSong: 'Save Song',
    keyboard: 'Keyboard',
    plain: 'Plain',
    highlightHint: 'Press “Find Chords” to highlight the text.',
    songsOpen: 'Open',
    songsDelete: 'Delete',
    chordsFallbackTitle: 'Chords',
    enterSongName: 'Enter a song title',
    songSaved: 'Song saved',
    chordsNotFound: 'No chords found.',
    chordsAlreadyAdded: 'Chords already added',
    chordsAdded: 'Chords added',
    previewVerb: 'Preview',
    midiUnsupported: 'This browser does not support Web MIDI. Open the site in Chrome, Edge, Opera, or Yandex Browser.',
    midiConnecting: 'Connecting MIDI and loading sounds...',
    midiConnected: 'MIDI connected: {names}.',
    midiAccessGranted: 'MIDI access granted. Connect a real MIDI device and press the button again if it appears later.',
    midiDenied: 'MIDI access denied. Allow MIDI in the browser and press the button again.',
    midiStartHint: 'To use MIDI mode, press the “Free Play” button above.',
    audioLoadError: 'Could not load piano sounds. Check your connection and reload the page.',
    previewPrepareError: 'Could not prepare chord audio. Check your connection and reload the page.',
    midiAccessBrowserDenied: 'The browser denied MIDI access. Allow device access in the browser dialog.',
    midiUnavailable: 'Web MIDI is unavailable in this browser.',
    midiConnectError: 'Could not connect MIDI. Try Chrome or Edge and press the button again.',
    loadingSounds: 'Loading sounds: {completed}/{total}',
    pdfTitle: 'Save / print PDF',
    languageToggleTitle: 'Переключить на русский',
    languageToggleLabel: 'RUS / ENG',
    bass: 'Bass',
    fullModeKeyboard: 'Keyboard',
    fullModeColor: 'Color',
    fullModePlain: 'Plain'
  }
};

function getCurrentLanguage() {
  return state.language === 'en' ? 'en' : 'ru';
}

function setLanguage(language) {
  const next = language === 'en' ? 'en' : 'ru';
  state.language = next;
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, next);
  return next;
}

function toggleLanguage() {
  return setLanguage(getCurrentLanguage() === 'ru' ? 'en' : 'ru');
}

function template(str, params = {}) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    str
  );
}

function t(key, params = {}) {
  const lang = getCurrentLanguage();
  const value = UI_TEXT[lang][key] ?? UI_TEXT.ru[key] ?? key;
  return template(value, params);
}

function getLocalizedNoteName(note, language = getCurrentLanguage()) {
  return NOTE_DISPLAY_NAMES[language]?.[note] || NOTE_DISPLAY_NAMES.ru[note] || note;
}

function getLocalizedChordTypeName(suffix, language = getCurrentLanguage()) {
  return CHORD_TYPE_DISPLAY_NAMES[language]?.[suffix] || CHORD_TYPE_DISPLAY_NAMES.ru[suffix] || suffix;
}

function renderFaqSections() {
  const container = document.querySelector('.faq-body');
  if (!container) return;
  const sections = FAQ_SECTIONS[getCurrentLanguage()] || FAQ_SECTIONS.ru;
  container.innerHTML = '';
  sections.forEach((section) => {
    const block = document.createElement('div');
    block.className = 'faq-section';
    const title = document.createElement('div');
    title.className = 'faq-title';
    title.textContent = section.title;
    block.appendChild(title);
    section.items.forEach((itemText) => {
      const item = document.createElement('div');
      item.className = 'faq-item';
      item.textContent = itemText;
      block.appendChild(item);
    });
    container.appendChild(block);
  });
}

function setText(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}

function setPlaceholder(id, text) {
  const node = el(id);
  if (node) node.placeholder = text;
}

function applyStaticTranslations() {
  const lang = getCurrentLanguage();
  document.documentElement.lang = lang;
  document.title = t('pageTitle');

  setText('openFaqTop', t('faq'));
  setPlaceholder('songName', t('songNamePlaceholder'));
  setText('mode0', t('modeRoot'));
  setText('mode1', t('modeInv1'));
  setText('mode2', t('modeInv2'));
  setText('smartInv', t('modeSmart'));
  setPlaceholder('search', t('searchPlaceholder'));
  const hint = document.querySelector('.hint');
  if (hint) hint.textContent = t('searchHint');
  const filterButtons = document.querySelectorAll('.chord-filter-btn');
  const filterTexts = ['filterAll', 'filterMajor', 'filterMinor', null, null, null, null, null];
  filterButtons.forEach((button, index) => {
    const key = filterTexts[index];
    if (key) button.textContent = t(key);
  });

  setText('fullMode0', t('modeRoot'));
  setText('fullMode1', t('modeInv1'));
  setText('fullMode2', t('modeInv2'));
  setText('fullSmartInv', t('modeSmart'));
  const printPdf = el('printPdf');
  if (printPdf) printPdf.title = t('pdfTitle');
  setText('fullClose', t('close'));

  const songsTitle = document.querySelector('#songsModal .title');
  if (songsTitle) songsTitle.textContent = t('songsTitle');
  setText('songsClose', t('close'));

  const chordModalTitle = document.querySelector('#chordModal .title');
  if (chordModalTitle) chordModalTitle.textContent = t('chordActions');
  setText('actMode0', t('modeRoot'));
  setText('actMode1', t('modeInv1'));
  setText('actMode2', t('modeInv2'));
  setText('actClose', t('close'));

  const songTextTitle = document.querySelector('.song-text-title');
  if (songTextTitle) songTextTitle.textContent = t('songTextTitle');
  setText('songTextAddSaved', t('addChords'));
  setText('songTextFull', t('fullscreen'));
  setText('songTextClose', t('close'));
  setPlaceholder('songTextTitle', t('songNamePlaceholder'));
  setPlaceholder('songTextInput', t('songTextPlaceholder'));
  const softModeLabel = document.querySelector('.import-toggle');
  if (softModeLabel) {
    const input = softModeLabel.querySelector('input');
    softModeLabel.textContent = '';
    if (input) softModeLabel.appendChild(input);
    softModeLabel.appendChild(document.createTextNode(` ${t('softMode')}`));
  }
  setText('songTextFind', t('findChords'));
  setText('songTextAdd', t('addToList'));
  setText('songTextSave', t('saveSong'));
  setText('songTextMode0', t('modeRoot'));
  setText('songTextMode1', t('modeInv1'));
  setText('songTextMode2', t('modeInv2'));
  setText('songTextSmart', t('modeSmart'));
  setText('songTextViewPiano', t('keyboard'));
  setText('songTextViewColor', t('color'));
  setText('songTextViewNormal', t('plain'));
  const previewEmpty = document.querySelector('.song-text-preview .empty');
  if (previewEmpty) previewEmpty.textContent = t('highlightHint');

  const songTextFullTitle = document.querySelector('#songTextFullModal .title');
  if (songTextFullTitle) songTextFullTitle.textContent = t('songTextTitle');
  setText('songTextFullClose', t('close'));

  setText('chordViewColor', t('color'));
  setText('chordViewNormal', t('plain'));
  setText('chordViewPiano', t('keyboard'));
  setText('chordActMode0', t('modeRoot'));
  setText('chordActMode1', t('modeInv1'));
  setText('chordActMode2', t('modeInv2'));

  const faqTitle = document.querySelector('#faqModal .title');
  if (faqTitle) faqTitle.textContent = t('faq');
  setText('faqClose', t('close'));
  renderFaqSections();

  const links = document.querySelectorAll('.site-author a');
  if (links[0]) links[0].textContent = t('siteApk');
  if (links[1]) links[1].textContent = t('siteAuthor');

  const iconMap = [
    ['openSongs', 'songs'],
    ['toggleColor', 'color'],
    ['togglePiano', 'piano'],
    ['clearAll', 'clear'],
    ['openImport', 'insertText'],
    ['fullScreen', 'fullscreen']
  ];
  iconMap.forEach(([id, key]) => {
    const node = el(id);
    if (!node) return;
    node.setAttribute('aria-label', t(key));
    node.title = t(key);
  });

  const langButton = el('langToggle');
  if (langButton) {
    langButton.textContent = t('languageToggleLabel');
    langButton.title = t('languageToggleTitle');
    langButton.setAttribute('aria-label', t('languageToggleTitle'));
    langButton.classList.toggle('is-en', lang === 'en');
  }
}

export {
  getCurrentLanguage,
  setLanguage,
  toggleLanguage,
  t,
  getLocalizedNoteName,
  getLocalizedChordTypeName,
  applyStaticTranslations
};
