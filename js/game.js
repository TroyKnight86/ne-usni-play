/* =====================================================================
   ОСОЗНАЙСЯ — кирпич №2: перепланировка (Антон, 29.08)
   Спальня (старт) + ванная при спальне + гостиная-хаб + кухня + детская.
   Акт 1 = анкета Марка: каждый предмет — графа. Всё важно в будущем.
   Семья: жена ВЕРА, дочь АЛИСА, сын МАКСИМ. Машина: ПЕРВОПРОХОДЕЦ 4WD.
   Под капотом НИКАКИХ видимых цифр. Только строка HUD.
   ===================================================================== */

const S = {
  scene: null,
  time: 'morning',       // morning | evening
  flags: {},
  seen: {},
  personality: 75,       // НЕ показывается. никогда.
  axis: { ches: 0 },     // оси. НЕ показываются. дрейф — только в речи.
  karma: 0,              // тоже под капотом. регрессия игрока живёт здесь.
  mental: 0,             // менталка. минусы копятся. не показывается.
  vera: { called: 0, missed: 0, callback: 0, ignored: 0 }, // телефонная летопись:
  // Вера ПОМНИТ, что он не берёт трубку. накопится — начнёт докапываться
  // про память. следователь №2, снаружи.
  roomActions: {},       // лимит 3 действия на комнату (утро) — Марка тянет дальше
  log: [],
};

/* ---------- лимит действий: 3 на комнату утром, дальше Марка тянет ---------- */
const HURRY = {
  bedroom: 'Времени мало. Скоро работа. И кофе ещё не пил.',
  living:  'Так. КОФЕ. Быстро. Потом работа.',
};
function gated(room, fn, nightOk) {
  // ночь: Марк устал — до большинства предметов дела нет (фидбек Сашки)
  if (S.time === 'evening' && !nightOk) {
    const tired = [
      'Не сейчас. Спать.',
      'Утром. Всё утром.',
      'Сил нет даже смотреть.',
      'Мимо. Кровать зовёт.',
    ];
    dialog(null, [{ sp:'МАРК', t: tired[Math.floor(Math.random() * tired.length)] }]);
    return;
  }
  if (S.time === 'morning' && (S.roomActions[room] || 0) >= 3) {
    dialog(null, [{ sp:'МАРК', t: HURRY[room] || 'Потом. Времени нет.' }]);
    return;
  }
  if (S.time === 'morning') S.roomActions[room] = (S.roomActions[room] || 0) + 1;
  fn();
}

/* ---------- HUD ---------- */
function hudShow(text) {
  const hud = document.getElementById('hud');
  hud.textContent = text;
  hud.classList.add('show');
  setTimeout(() => hud.classList.remove('show'), 3500);
}
function hudRemember(subject) { hudShow(subject + ' это запомнит'); }
function choiceMade() {
  if (!S.flags.choiceMadeShown) {
    S.flags.choiceMadeShown = true;
    hudShow('выбор сделан');
  }
}

/* ---------- диалоги: клик = следующая реплика ---------- */
const D = { lines:null, idx:0, after:null, id:null, active:false };
function say(sp, t, narr) {
  document.getElementById('speaker').textContent = sp || '';
  const el = document.getElementById('text');
  if (narr) el.innerHTML = '<span class="narr">' + t + '</span>';
  else el.textContent = t;
}
function dialog(id, lines, after) {
  D.lines = lines; D.idx = 0; D.after = after || null; D.id = id;
  D.active = true;
  document.getElementById('shield').classList.add('on');
  document.getElementById('panel').classList.add('talk');
  document.getElementById('choices').innerHTML = '';
  document.getElementById('skip').style.display =
    (id && S.seen[id]) ? 'block' : 'none';
  showLine();
}
function showLine() {
  const L = D.lines[D.idx];
  say(L.sp, L.t, L.narr);
  document.getElementById('more').style.display =
    (D.idx < D.lines.length - 1) ? 'block' : 'none';
}
function advance() {
  if (!D.active) return;
  if (D.idx < D.lines.length - 1) { D.idx++; showLine(); }
  else endDialog();
}
function endDialog(skipped) {
  D.active = false;
  if (D.id) S.seen[D.id] = true;
  document.getElementById('shield').classList.remove('on');
  document.getElementById('panel').classList.remove('talk');
  document.getElementById('more').style.display = 'none';
  document.getElementById('skip').style.display = 'none';
  if (skipped) {
    const L = D.lines[D.lines.length - 1];
    say(L.sp, L.t, L.narr);
  }
  if (D.after) { const f = D.after; D.after = null; f(); }
}
document.getElementById('panel').addEventListener('click', (e) => {
  if (e.target.closest('#skip') || e.target.closest('.choice')) return;
  advance();
});
document.getElementById('skip').addEventListener('click', () => {
  if (D.active) endDialog(true);
});
function choices(list) {
  const c = document.getElementById('choices');
  c.innerHTML = '';
  list.forEach(o => {
    const d = document.createElement('div');
    d.className = 'choice'; d.textContent = o.label;
    d.onclick = (e) => { e.stopPropagation(); c.innerHTML = ''; o.fn(); };
    c.appendChild(d);
  });
}

/* ---------- сцены: сервис ---------- */
function goScene(name) {
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  setTimeout(() => {
    SCENES[name].build();
    S.scene = name;
    fade.classList.remove('on');
  }, 700);
}
function el(tag, cls, style, parent) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  Object.assign(d.style, style || {});
  (parent || document.getElementById('scene')).appendChild(d);
  return d;
}
let sceneTimers = []; // анимации живут только внутри своей сцены
function tick(fn, ms) { const id = setInterval(fn, ms); sceneTimers.push(id); return id; }
function clearScene() {
  sceneTimers.forEach(clearInterval); sceneTimers = []; // мушки-беглецы, стоп
  const sc = document.getElementById('scene');
  sc.innerHTML = '<div id="hud"></div><div id="shield"></div>';
  return sc;
}
function hot(style, tagText, fn) {
  const h = el('div', 'hot', style);
  const t = document.createElement('div');
  t.className = 'tag'; t.textContent = tagText; h.appendChild(t);
  h.onclick = fn;
  return h;
}

/* ---------- пиксель-фон сцены + свечение объектов ---------- */
let glowImg = null;
function setBg(src) { // фон-кадр сцены
  const bg = document.createElement('div');
  bg.className = 'bg-cover';
  bg.style.backgroundImage = 'url(' + src + ')';
  document.getElementById('scene').appendChild(bg);
  return bg;
}
function glowSetup(src) { // дубль для свечения — та же геометрия, что setBg
  glowImg = document.createElement('div');
  glowImg.className = 'glow-img';
  glowImg.style.backgroundImage = 'url(' + src + ')';
  document.getElementById('scene').appendChild(glowImg);
}
function glowHot(style, poly, tagText, fn) {
  const h = el('div', 'hot-glow', style);
  const t = document.createElement('div');
  t.className = 'tag'; t.textContent = tagText; h.appendChild(t);
  h.onclick = fn;
  h.onmouseenter = () => { if (glowImg) { glowImg.style.clipPath = poly; glowImg.style.opacity = 1; } };
  h.onmouseleave = () => { if (glowImg) glowImg.style.opacity = 0; };
  return h;
}

/* =====================================================================
   РЕДАКТОР ЗОН (F2): тяни мышью прямоугольник по объекту, введи имя —
   готовая строка glowHot копируется в буфер и печатается в консоль (F12).
   Размечает Антон, вшивает Клод. Разделение труда, как везде.
   ===================================================================== */
let zEdit = false, zStart = null, zBox = null;
const zCollected = []; // все снятые зоны копятся здесь — F4 отдаёт пакетом
window.addEventListener('keydown', (e) => {
  if (e.key === 'F2') {
    zEdit = !zEdit;
    hudShow(zEdit ? 'редактор зон: ВКЛ — тяни мышью по объекту (F4 — забрать всё)' : 'редактор зон: выкл');
  }
  if (e.key === 'F4') {
    const old = document.getElementById('zdump');
    if (old) { old.remove(); return; }
    const ta = document.createElement('textarea');
    ta.id = 'zdump';
    ta.value = zCollected.length
      ? zCollected.join('\n\n')
      : '(зон пока не снято — F2 и тяни мышью)';
    Object.assign(ta.style, { position:'fixed', left:'10%', top:'10%',
      width:'80%', height:'70%', zIndex:99, background:'#0d0d11',
      color:'#c9c4b8', border:'1px solid #6e6858', padding:'12px',
      font:'13px monospace' });
    document.body.appendChild(ta);
    ta.focus(); ta.select(); // Ctrl+C — и весь пакет твой. F4 ещё раз — закрыть
  }
});
(function zoneEditor() {
  const sc = document.getElementById('scene');
  const pct = (e) => {
    const r = sc.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)),
             y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) };
  };
  sc.addEventListener('mousedown', (e) => {
    if (!zEdit) return;
    e.preventDefault(); e.stopPropagation();
    zStart = pct(e);
    zBox = document.createElement('div');
    Object.assign(zBox.style, { position:'absolute', border:'1px solid #ffd700',
      background:'rgba(255,215,0,.18)', zIndex:60, pointerEvents:'none' });
    sc.appendChild(zBox);
  }, true);
  sc.addEventListener('mousemove', (e) => {
    if (!zEdit || !zStart || !zBox) return;
    const p = pct(e);
    const l = Math.min(zStart.x, p.x), t = Math.min(zStart.y, p.y);
    const w = Math.abs(p.x - zStart.x), h = Math.abs(p.y - zStart.y);
    Object.assign(zBox.style, { left:l+'%', top:t+'%', width:w+'%', height:h+'%' });
  }, true);
  sc.addEventListener('mouseup', (e) => {
    if (!zEdit || !zStart) return;
    e.preventDefault(); e.stopPropagation();
    const p = pct(e);
    const l = Math.min(zStart.x, p.x).toFixed(1), t = Math.min(zStart.y, p.y).toFixed(1);
    const r = Math.max(zStart.x, p.x).toFixed(1), b = Math.max(zStart.y, p.y).toFixed(1);
    const w = (r - l).toFixed(1), h = (b - t).toFixed(1);
    zStart = null;
    if (zBox) { zBox.remove(); zBox = null; }
    if (parseFloat(w) < 1 || parseFloat(h) < 1) {
      hudShow('зона нулевая — ТЯНИ рамку, не кликай');
      return;
    }
    const name = prompt('Имя зоны (отмена = выбросить):');
    if (!name) return;
    const code = "// [" + S.scene + "] " + name + "\n" +
      "glowHot({ left:'" + l + "%', top:'" + t + "%', width:'" + w + "%', height:'" + h + "%' },\n" +
      "  'polygon(" + l + "% " + t + "%, " + r + "% " + t + "%, " + r + "% " + b + "%, " + l + "% " + b + "%)', '" + name + "', () => {})";
    zCollected.push(code);
    console.log('=== ЗОНА [' + S.scene + '] «' + name + '» ===\n' + code);
    say('', 'Зона «' + name + '» снята (всего: ' + zCollected.length + ').\nF4 — забрать весь пакет разом.', true);
  }, true);
  // в режиме редактора клики не должны дёргать хотспоты
  sc.addEventListener('click', (e) => {
    if (zEdit) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

/* ---------- живой аквариум: рыбки + дыхание воды + пузырьки ---------- */
function aquarium(x, y, w, h) { // границы воды в % сцены
  el('div', 'aqua-glow', { left:x+'%', top:y+'%', width:w+'%', height:h+'%' });
  for (let i = 0; i < 3; i++) {
    const f = el('div', 'fish', { width:'6px', height:'3px',
      left:(x + w*0.2 + i*w*0.2)+'%', top:(y + h*0.3 + i*h*0.2)+'%' });
    tick(() => {
      const nx = x + w*0.08 + Math.random() * w*0.8;
      f.style.transform = (nx < parseFloat(f.style.left)) ? 'scaleX(-1)' : 'none';
      f.style.left = nx + '%';
      f.style.top  = (y + h*0.15 + Math.random() * h*0.7) + '%';
    }, 2600 + i*900);
  }
  tick(() => {
    const b = el('div', 'bubble', {
      left:(x + w*0.15 + Math.random()*w*0.7)+'%', top:(y + h*0.85)+'%' });
    setTimeout(() => b.remove(), 3300);
  }, 2400);
}
function exit(style, label, arrow, fn) {
  const ex = el('div','exit', style);
  ex.innerHTML = arrow + '<small>' + label + '</small>';
  ex.onclick = fn;
  return ex;
}
function notYet() { // утром якоря не трогаем
  dialog(null, [{ narr:true, t:'Не сейчас. На работу пора — рельсы ждут.' }]);
}

/* ---------- звук: всратый рингтон на WebAudio (канон) ---------- */
let AC = null;
function beep(freq, dur, when, vol) {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.value = vol || 0.05;
  o.connect(g); g.connect(AC.destination);
  const t = AC.currentTime + (when || 0);
  o.start(t); o.stop(t + dur);
}
function ringOnce() { beep(880, .12, 0); beep(880, .12, .2); beep(660, .16, .42); }

/* =====================================================================
   ТЕЛЕФОН: менеджер входящего (А сам / Б музыка глушит / В нет / Г карма)
   ===================================================================== */
let phoneEl = null, ringTimer = null;

function phoneEvent() {
  if (S.flags.phoneEventDone || S.scene !== 'living' || S.time !== 'morning') return;
  S.flags.phoneEventDone = true;
  let variant;
  if (S.flags.boombox) variant = 'B';
  else { const r = Math.random(); variant = r < .5 ? 'A' : (r < .75 ? 'V' : 'G'); }
  S.flags.phoneVariant = variant;
  S.log.push('утро: входящий звонок, вариант ' + variant);
  if (variant === 'V') return; // иногда никто не звонит. так бывает.
  S.flags.phoneRinging = variant;
  if (phoneEl) phoneEl.classList.add('ringing');
  let rings = 0;
  ringTimer = setInterval(() => {
    if (variant !== 'B') ringOnce();
    if (++rings >= 9) stopRinging(true);
  }, 900);
}
function stopRinging(missed) {
  clearInterval(ringTimer); ringTimer = null;
  if (phoneEl) phoneEl.classList.remove('ringing');
  const v = S.flags.phoneRinging;
  S.flags.phoneRinging = null;
  if (missed && v) {
    S.flags.missedCall = v; // Вера не ждёт — она уже на вызове
    S.vera.missed++;        // она это запомнит
    S.log.push('утро: звонок пропущен (' + v + ')');
    if (v === 'B') S.axis.ches++;
    if (v === 'B' || v === 'G') setTimeout(choiceMade, 900);
  }
}
function longBeep() { beep(425, .8, 0, .04); beep(425, .8, 1.6, .04); beep(425, .8, 3.2, .04); }

/* =====================================================================
   СЦЕНА: СПАЛЬНЯ (старт; «своя зона, слабая»)
   ===================================================================== */
const SCENES = {};

SCENES.bedroom = { build() {
  clearScene();
  setBg('assets/bedroom_px.png');
  glowSetup('assets/bedroom_px.png');

  // --- интерактив ---
  glowHot({ left:'31.2%', top:'57.1%', width:'36.9%', height:'27.5%' },
    'polygon(31.2% 57.1%, 68.1% 57.1%, 68.1% 84.6%, 31.2% 84.6%)', 'кровать', () => {
    if (S.time === 'evening') {
      dialog('bed_night', [
        { narr:true, t:'Кровать. Верина половина всё ещё ровная — она ещё на смене.\nТвоя — ждёт. Полпервого ночи, завтра снова день.' },
      ], () => choices(S.flags.nightWash ? [
        { label:'ЛЕЧЬ СПАТЬ', fn: endDay1 },
        { label:'ЕЩЁ НЕ ВСЁ', fn: () => dialog('bed_later', [{ narr:true,
            t:'Дом ждёт ночного обхода. Или не ждёт. Твоё «ещё не всё» — тебе виднее, что в него входит.' }]) },
      ] : [
        { label:'СНАЧАЛА УМЫТЬСЯ', fn: () => goScene('bathroom') },
        { label:'ЛЕЧЬ ТАК', fn: () => {
            S.log.push('ночь: лёг не умывшись, без ревизии дня');
            dialog('bed_dirty', [{ narr:true,
              t:'День остаётся на лице. Ну и ладно.\nЗеркало подождёт до утра — вместе со всем, что могло бы в нём вспомниться.' }],
              endDay1);
        }},
        { label:'ЕЩЁ НЕ ВСЁ', fn: () => dialog('bed_later', [{ narr:true,
            t:'Дом ждёт ночного обхода. Или не ждёт. Твоё «ещё не всё» — тебе виднее, что в него входит.' }]) },
      ]));
      return;
    }
    gated('bedroom', () =>
      dialog('bed', [{ narr:true,
        t:'Верина половина кровати заправлена по-аптечному ровно. Твоя — как после короткого боя.\nВы даже спите с разным почерком.' }]));
  });

  glowHot({ left:'17.6%', top:'29.4%', width:'4.0%', height:'5.7%' },
    'polygon(17.6% 29.4%, 21.6% 29.4%, 21.6% 35.1%, 17.6% 35.1%)', 'часы', () => gated('bedroom', () => {
    S.flags.watch = true; S.log.push('якоря: нашёл часы отца');
    dialog('watch', [
      { narr:true, t:'Между горшком и книгами — часы. Отцовские. Стоят на 14:12 — лет двадцать уже.' },
      { sp:'МАРК', t:'Батарейку бы сменить... или не менять. Они и так дважды в сутки показывают точное время.\nБольше, чем некоторые люди.' },
    ]);
  }));

  glowHot({ left:'11.5%', top:'24.4%', width:'5.6%', height:'9.7%' },
    'polygon(11.5% 24.4%, 17.1% 24.4%, 17.1% 34.1%, 11.5% 34.1%)', 'книги на полке', () => gated('bedroom', () =>
    dialog('books', [{ narr:true,
      t:'Две книги, обе с закладками:\n«Как управлять сознанием» и «Курсы осознанных сновидений для чайников».' }],
      () => choices([
        { label:'«КАК УПРАВЛЯТЬ СОЗНАНИЕМ»', fn: () =>
            dialog('book1', [
              { narr:true, t:'«...сознание — не хозяин дома, а квартирант, который громче всех хлопает дверью...»' },
              { sp:'МАРК', t:'Сильно. Ничего не понял, но сильно.' },
            ])},
        { label:'«КУРСЫ ОС ДЛЯ ЧАЙНИКОВ»', fn: () =>
            dialog('book2', [
              { narr:true, t:'«Проверка реальности: посмотрите на руки. Посмотрите на часы. Спросите себя: я сплю?\nДелайте это днём — до автоматизма. Однажды вы спросите это во сне».' },
            ])},
      ]))));

  glowHot({ left:'79.8%', top:'5.8%', width:'19.3%', height:'92.1%' },
    'polygon(79.8% 5.8%, 99.1% 5.8%, 99.1% 97.9%, 79.8% 97.9%)', 'шкаф', () => gated('bedroom', () => {
    if (!S.flags.belt) {
      S.flags.belt = true; S.log.push('якоря: вспомнил ремень (которого нет)');
      dialog('belt', [
        { narr:true, t:'Рубашки. Свитера, которые никто не носит. Коробка с проводами — как у всех.' },
        { sp:'МАРК', t:'...а ремень где? Отцовский. Армейский. Кожа, бляха со звездой...' },
        { narr:true, t:'Рука шарит по верхней полке. Пусто.\nРемня здесь нет. Ремня здесь никогда не было.\nЕго выкинули тридцать лет назад — и не ты. И шкаф этот куплен позже.\nПочему рука знала, где искать?' },
      ]);
    } else {
      dialog('belt2', [{ narr:true, t:'Верхняя полка. Пусто. Рука всё равно проверяет — уже вторая привычка.' }]);
    }
  }));

  glowHot({ left:'27.3%', top:'24.1%', width:'16.5%', height:'19.5%' },
    'polygon(27.3% 24.1%, 43.8% 24.1%, 43.8% 43.6%, 27.3% 43.6%)', 'чайки', () => gated('bedroom', () =>
    dialog('gulls', [
      { narr:true, t:'Белые чайки на стене. Верины. Летят всей стаей в сторону окна —\nкоторый год. Никуда не улетели. Хороший, в общем-то, пример.' },
    ])));

  glowHot({ left:'6.5%', top:'36.6%', width:'17.0%', height:'42.0%' },
    'polygon(6.5% 36.6%, 23.5% 36.6%, 23.5% 78.6%, 6.5% 78.6%)', 'уголок Веры', () => gated('bedroom', () =>
    dialog('vera_corner', [
      { narr:true, t:'Стол для макияжа: овальное зеркало с подсветкой, духи, кисти, штуки,\nназваний которых ты не знаешь. Пахнет Верой.' },
      { narr:true, t:'За раму зеркала заткнуто фото: Вера смеётся — не в камеру,\nа на того, кто снимал. Снимал ты.' },
    ])));

  glowHot({ left:'56.0%', top:'24.8%', width:'19.6%', height:'29.8%' },
    'polygon(56.0% 24.8%, 75.6% 24.8%, 75.6% 54.6%, 56.0% 54.6%)', 'окно', () => gated('bedroom', () => {
    if (S.time === 'evening') {
      dialog('window_bedroom_n', [
        { narr:true, t:'Панельки почти погасли. Два-три окна ещё горят.' },
        { sp:'МАРК', t:'Кто-то тоже не спит. Интересно, у него тоже... а, неважно.' },
        { narr:true, t:'Неважно. У каждого горящего окна — своя причина.\nТвоя завтра снова встанет в 06:40.' },
      ]);
      return;
    }
    S.log.push('экспозиция: мечта о лоджии');
    dialog('window_bedroom', [
      { narr:true, t:'Двор. Серое утро подкрашивает крыши.' },
      { sp:'МАРК', t:'Сюда бы лоджию. Кресло, плед, стекло от пола...\nНо лоджия — это только в своём доме. В квартире — увы.' },
      { narr:true, t:'«В своём доме». Лоджия здесь, кабинет с окном там, аквариум поближе...\nТы собираешь этот дом из дыр этой квартиры — комнату за комнатой.\nАдрес, по которому пока никто не живёт. Пока.' },
    ]);
  }, true));

  glowHot({ left:'45.4%', top:'51.1%', width:'3.7%', height:'7.2%' },
    'polygon(45.4% 51.1%, 49.1% 51.1%, 49.1% 58.3%, 45.4% 58.3%)', 'тумба', () => gated('bedroom', () =>
    dialog('tumba', [
      { sp:'МАРК', t:'Когда я был помоложе, тут хранилось больше презервативов,\nчем таблеток перед сном. Теперь — наоборот.' },
      { narr:true, t:'А во второй ящик ты не заглядывал уже много лет.\nИнтересно было бы. Когда-нибудь.' },
    ])));

  glowHot({ left:'37.3%', top:'62.7%', width:'5.6%', height:'7.1%' },
    'polygon(37.3% 62.7%, 42.9% 62.7%, 42.9% 69.8%, 37.3% 69.8%)', 'тетрадь', () => gated('bedroom', () => {
    // (nightOk ниже — тетрадь как раз вечерний якорь)
    if (S.time === 'evening') {
      S.flags.notebook = true; S.log.push('якоря: тетрадь');
      dialog('nb', [{ narr:true,
        t:'Тетрадь, 96 листов. «Глава 1. Начало пути» — твой почерк, твои подчёркивания.\nОдну страницу — вот эту, с загнутым углом — ты не помнишь, как писал.' }],
        checkAnchors);
    } else {
      dialog('nb_day', [{ narr:true,
        t:'Тетрадь ждёт вечера. Дневные глаза для неё слишком быстрые.' }]);
    }
  }, true));

  // выходы: дверь в ванную — на кадре (стрелка по зоне Антона), коридор — за кадром
  exit({ left:'0.2%', top:'39.9%', width:'4.6%', height:'16.5%' }, 'ванная', '←',
    () => goScene('bathroom'));
  exit({ left:'44%', top:'88%', width:'14%', height:'11%' }, 'в коридор', '↓',
    () => goScene('corridor'));

  if (S.time === 'morning' && !S.flags.bedroomShown) {
    S.flags.bedroomShown = true;
    say('', 'Спальня. Половина кровати — пустая и ровная: Веру в шесть забрала смена.\nСкорая не умеет ждать — этим вы с ней и различаетесь.', true);
  } else if (S.time === 'evening') {
    say('', 'Спальня. Вечер. Дом звучит тише, чем утром — или это ты слышишь иначе.', true);
  } else {
    say('', 'Спальня. Твоя зона. Слабая — но твоя.', true);
  }
}};

/* =====================================================================
   СЦЕНА: ВАННАЯ (при спальне)
   ===================================================================== */
SCENES.bathroom = { build() {
  clearScene();
  setBg('assets/bathroom_pixel_test.png');
  // моргание лампы — затемняющий слой поверх кадра
  const dim = el('div','',{ position:'absolute', inset:'0', background:'#000',
    opacity:'0', pointerEvents:'none' });
  tick(() => { dim.style.opacity = Math.random() > .82 ? .18 : 0; }, 300);

  glowSetup('assets/bathroom_pixel_test.png');

  glowHot({ left:'45.2%', top:'7.1%', width:'19.6%', height:'43.6%' },
    'polygon(45.2% 7.1%, 64.8% 7.1%, 64.8% 50.7%, 45.2% 50.7%)', 'зеркало', () => {
    // ночь: зеркало-экзамен дня — ВСПОМНИТЬ наконец работает
    if (S.time === 'evening') {
      if (S.flags.nightWash) {
        dialog('mirror_n2', [{ narr:true, t:'Умыт. День смыт. Насколько смылся — покажет ночь.' }]);
        return;
      }
      dialog('mirror_n1', [
        { narr:true, t:'Холодная вода. Лицо в зеркале — в полутени, как утром.\nДень стоит за плечом и ждёт ревизии.' },
        { sp:'МАРК', t:'Так. Я сегодня ничего не забыл?' },
      ], () => choices([
        { label:'ВСПОМНИТЬ', fn: () => {
            S.flags.nightWash = true;
            const missed = [];
            if (!S.flags.fishFed) missed.push('...рыбы. Сегодня был их день. БЫЛ.');
            if (S.flags.litterSkipped) missed.push('...лоток. «Завтра». Ну-ну.');
            if (S.flags.latch) missed.push('...щеколда. Зачем ты её задвинул — у Веры же только ключи от замка.');
            if (S.flags.doorSkipped) missed.push('...дверь. Ты так и не проверил дверь.');
            if (!S.flags.wcNightDone) missed.push('...свет в санузле так и горит. Полоска под дверью — как укор.');
            S.log.push('ночь: зеркало-ревизия, забыто ' + missed.length);
            if (missed.length === 0) {
              dialog('mirror_ok', [
                { narr:true, t:'Ты перебираешь день — и день собирается весь, без дыр.\nРыбы. Лоток. Дверь. Свет. Всё на месте.' },
                { narr:true, t:'Сегодня вспоминается всё. Редкий день.\nЗапомни его. Хотя бы попробуй.' },
              ]);
            } else {
              dialog('mirror_miss', [
                { narr:true, t:'Ты перебираешь день — и день отвечает не весь. Из темноты всплывает:' },
                ...missed.map(t => ({ sp:'МАРК', t })),
                { narr:true, t:'Утром эта кнопка выдавала пустоту, помнишь?\nТеперь ты знаешь: пустота — не «нечего вспоминать».\nПустота — это когда БЫЛО что.' },
              ]);
            }
        }},
        { label:'ДА НУ, СПАТЬ', fn: () => {
            S.flags.nightWash = true;
            S.karma--; // не проверил день — регрессия тихая, игроковая
            S.log.push('ночь: отказался от ревизии дня');
            dialog('mirror_skipn', [{ narr:true,
              t:'Вода смывает вопрос. До завтра. Он умеет ждать —\nты сам его научил.' }]);
        }},
      ]));
      return;
    }
    if (!S.flags.mirror) {
      S.flags.mirror = true;
      dialog('mirror1',
        [{ sp:'МАРК', t:'Я вчера должен был что-то сделать. Что-то... чёрт.' }],
        () => choices([
          { label:'ВСПОМНИТЬ', fn: () => {
              S.log.push('пролог: пытался вспомнить');
              document.getElementById('fade').classList.add('on');
              setTimeout(() => {
                document.getElementById('fade').classList.remove('on');
                dialog('mirror1a', [{ narr:true,
                  t:'Пусто. Не «забыл» — именно ПУСТО, как полка, с которой сняли коробку.\nПопытка не засчитана. Некоторые кнопки уже не работают.' }]);
              }, 1200);
          }},
          { label:'УМЫТЬСЯ И ЗАБИТЬ', fn: () => {
              S.log.push('пролог: забил');
              dialog('mirror1b', [{ narr:true,
                t:'Вода тёплая. Вопрос смывается. До завтра. Он умеет ждать.' }]);
          }},
        ]));
    } else {
      dialog('mirror2', [{ narr:true, t:'Лицо в полутени, не в фокусе. Ну, лампочка же.' }]);
    }
  });

  glowHot({ left:'48.4%', top:'54.3%', width:'14.3%', height:'10.1%' },
    'polygon(48.4% 54.3%, 62.7% 54.3%, 62.7% 64.4%, 48.4% 64.4%)', 'раковина', () =>
    dialog('tap', [{ sp:'МАРК',
      t:'Подтекает. Прокладку бы сменить... в выходные. В какие-нибудь выходные.' }]));

  glowHot({ left:'68.2%', top:'69.8%', width:'31.2%', height:'29.6%' },
    'polygon(68.2% 69.8%, 99.4% 69.8%, 99.4% 99.4%, 68.2% 99.4%)', 'ванна', () =>
    dialog('bath', [{ narr:true,
      t:'Ванна. Полежать бы. По статистике дома ты видишь её чаще всех — по семь минут в день.' }]));

  glowHot({ left:'73.2%', top:'3.3%', width:'12.9%', height:'63.3%' },
    'polygon(73.2% 3.3%, 86.1% 3.3%, 86.1% 66.6%, 73.2% 66.6%)', 'душ', () =>
    dialog('shower', [{ narr:true,
      t:'Золотая стойка. Верин выбор — «как в отеле, в котором мы были один раз».\nТы не помнишь этот отель. Она помнит за двоих.' }]));

  glowHot({ left:'25.2%', top:'17.9%', width:'13.8%', height:'51.5%' },
    'polygon(25.2% 17.9%, 39.0% 17.9%, 39.0% 69.4%, 25.2% 69.4%)', 'полотенца', () =>
    dialog('towel', [{ narr:true,
      t:'Полотенца висят идеально ровно, узором наружу. Верин почерк — даже здесь.' }]));

  glowHot({ left:'0.4%', top:'28.4%', width:'21.1%', height:'71.0%' },
    'polygon(0.4% 28.4%, 21.5% 28.4%, 21.5% 99.4%, 0.4% 99.4%)', 'стиралка и цветы', () =>
    dialog('washer', [{ narr:true,
      t:'Стиральная машина, а над ней — белые розы. Искусственные, но подобраны с душой.\nВера умеет делать красиво даже там, где стирают носки.' }]));

  exit({ left:'42%', top:'86%', width:'16%', height:'12%' }, 'в спальню', '↓',
    () => goScene('bedroom'));

  if (S.time === 'morning' && !S.flags.introShown) {
    S.flags.introShown = true;
    say('', '06:40. Ты проснулся за минуту до будильника. Так всегда.\nПлан утра прост, как всегда: умыться, кофе, позвонить Вере — и за работу.\nПорядок — это всё, что у тебя есть.', true);
  } else {
    say('', 'Ванная при спальне. Лампочка моргает — всё руки не доходят.', true);
  }
}};

/* =====================================================================
   СЦЕНА: КОРИДОР — мини-хаб на 4 направления (планировка Антона, из жизни)
   Рабочее место Марка — у ВХОДНОЙ ДВЕРИ, спиной ко всей квартире.
   ===================================================================== */
SCENES.corridor = { build() {
  clearScene();
  setBg('assets/corridor_px.png');
  glowSetup('assets/corridor_px.png');
  aquarium(21.5, 47.5, 12.5, 15.5); // рыбы в воде (зона Антона), не в воздухе

  glowHot({ left:'2.5%', top:'52.6%', width:'18.6%', height:'25.0%' },
    'polygon(2.5% 52.6%, 21.1% 52.6%, 21.1% 77.6%, 2.5% 77.6%)', 'рабочее место', () =>
    dialog('desk', [
      { narr:true, t:'Стол в углу коридора, впритык к стене детской: сорок сантиметров и гипсокартон\nмежду тобой и спящими детьми. Ближе всех в доме. И спиной ко всем — лицом к выходу.\nДомочадцы ходят сзади: в кухню, в спальню. Могут пройти и не увидеть тебя. Ты — их.' },
      { narr:true, t:'Четыре розетки — ты заложил их ещё в проекте, сам чертил, до последнего миллиметра.\nСначала спланировал, куда воткнёшь технику. Потом — всё остальное.' },
      { sp:'МАРК', t:'Зато никто не отвлекает. Стратегическая позиция.' },
      { narr:true, t:'Стратегическая, да. Видишь только дверь.\nКак охранник. Или как тот, кто собирается первым уйти.' },
      { narr:true, t:'Окна здесь нет. К обеду — духота, хоть топор вешай.\nВ коридорах окон не бывает. Это, в общем, главное, что нужно знать о коридорах —\nи о жизни, которая в них проходит.' },
      { sp:'МАРК', t:'В своём доме кабинет будет с окном. В сад. И аквариум перевезу — поближе.\nЧтоб дышало.' },
    ]));

  glowHot({ left:'21.0%', top:'46.4%', width:'13.7%', height:'17.5%' },
    'polygon(21.0% 46.4%, 34.7% 46.4%, 34.7% 63.9%, 21.0% 63.9%)', 'аквариум', () => {
    if (S.time === 'evening' && !S.flags.fishFed) {
      S.flags.fishFed = true; S.log.push('вечер: покормил рыб');
      dialog('fish_feed', [
        { narr:true, t:'Корм сыплется — рыбы поднимаются. Все. Сразу. К тебе.\nЕдинственное, что сегодня посмотрело на тебя в ответ.\nОтметь этот момент. Не для сюжета. Просто отметь.' },
      ]);
    } else {
      dialog('fish', [{ narr:true,
        t:'Аквариум у рабочего стола. Верина идея: «чтоб ты хоть на что-то живое смотрел».\nРыбам всё равно, какой сегодня дедлайн. Завидная позиция.' }]);
    }
  });

  glowHot({ left:'1.4%', top:'14.9%', width:'17.1%', height:'35.5%' },
    'polygon(1.4% 14.9%, 18.5% 14.9%, 18.5% 50.4%, 1.4% 50.4%)', 'карта мира', () =>
    dialog('worldmap', [
      { narr:true, t:'Деревянная карта мира. Собирал сам, выравнивал по лазерному уровню.\nСтраны, где ты был, планировалось подсвечивать.' },
      { sp:'МАРК', t:'...так и не подключил подсветку. Да и подсвечивать пока — Турцию разве что.' },
      { narr:true, t:'Карта висит. Мир ждёт. Всё в этом доме умеет ждать.' },
    ]));

  glowHot({ left:'44.1%', top:'43.4%', width:'22.2%', height:'42.0%' },
    'polygon(44.1% 43.4%, 66.3% 43.4%, 66.3% 85.4%, 44.1% 85.4%)', 'стеллаж с гитарой', () =>
    dialog('guitar_shelf', [
      { narr:true, t:'Белый стеллаж: настолки, сувениры — и гитара. Классика, честная, с нейлоном.' },
      { sp:'МАРК', t:'Три аккорда я ещё помню. Четвёртый — под вопросом.' },
      { narr:true, t:'Она стоит так, чтобы её было видно с рабочего места.\nТы поставил её туда сам. Зачем — не сформулировал. Но поставил.' },
    ]));

  exit({ left:'38%', top:'88%', width:'20%', height:'11%' }, 'входная дверь (за спиной)', '⟲',
    () => {
    if (S.time !== 'evening') {
      dialog('front_door', [{ narr:true,
        t:'Входная дверь. Ты видишь её чаще, чем лица своих.\nОна закрыта. Вопрос «от кого» оставим на потом.' }]);
      return;
    }
    if (S.flags.latchDecided) {
      dialog('door_done', [{ narr:true, t: S.flags.latch
        ? 'Щеколда задвинута. Крепость спит.'
        : 'Замок закрыт, щеколда откинута. Дверь ждёт Веру.' }]);
      return;
    }
    dialog('door_night', [
      { narr:true, t:'Перед сном ты всегда проверяешь дверь. Замок закрыт.\nВопрос один — щеколда.' },
      { sp:'МАРК', t: S.flags.lunchAnswered
          ? 'Вера сказала — будет к часу. Щеколду не трогаем, у неё ключи только от замка.'
          : 'Веры ещё нет... Где она вообще? Смена давно кончилась... наверное.' },
    ], () => choices([
      { label:'ЗАДВИНУТЬ ЩЕКОЛДУ', fn: () => {
          S.flags.latchDecided = true; S.flags.latch = true;
          S.log.push('ночь: задвинул щеколду (Вера не дома)');
          dialog('latch_on', [
            { narr:true, t:'Щёлк. Дом заперт изнутри. Надёжно.\nНадёжность — это когда никто не войдёт. Вообще никто.' },
          ]);
      }},
      { label:'ОСТАВИТЬ ТОЛЬКО ЗАМОК', fn: () => {
          S.flags.latchDecided = true; S.flags.latch = false;
          S.log.push('ночь: оставил дверь для Веры');
          dialog('latch_off', [
            { narr:true, t:'Замок — закрыт, щеколда — нет. У Веры ключи.\nДверь будет ждать её, как умеет ждать всё в этом доме.' },
          ]);
      }},
      { label:'ДА НУ ЕЁ, СПАТЬ ОХОТА', fn: () => {
          S.flags.latchDecided = true; S.flags.latch = false; S.flags.doorSkipped = true;
          S.axis.ches++; // рокзвёзды дверями не занимаются
          S.log.push('ночь: забил на дверь (Чес-стиль)');
          dialog('latch_skip', [
            { sp:'МАРК', t:'Да закрыта и закрыта. Не в первый раз.' },
            { narr:true, t:'Проверять двери — забота оседлых. Кто-то в тебе сегодня\nуже немного на гастролях.' },
          ]);
      }},
    ]));
  });

  glowHot({ left:'90.6%', top:'21.1%', width:'6.9%', height:'74.5%' },
    'polygon(90.6% 21.1%, 97.5% 21.1%, 97.5% 95.6%, 90.6% 95.6%)', 'санузел', () => {
    if (S.time !== 'evening') {
      dialog('wc', [
        { narr:true, t:'Общий санузел — прямо за твоей спиной.' },
        { sp:'МАРК', t:'Семья считает, что я тут живу. Ну... статистически они почти правы.\nВидимся, когда они мимо ходят. График встреч — по мочевому пузырю.' },
        { narr:true, t:'Смеёшься. Смешно же. Смешно?' },
      ]);
      return;
    }
    // ночь: дети не закрыли дверь и не выключили свет
    if (!S.flags.wcNightDone) {
      S.flags.wcNightDone = true;
      const litterDirty = S.flags.kidsUnfed || S.flags.tvChannel === 'cartoons';
      dialog('wc_night', [
        { narr:true, t:'Дверь санузла приоткрыта, изнутри — свет: дети. Как обычно.\nПолоска света режет тёмный коридор пополам.' + (litterDirty
          ? '\nИ лоток. За день к нему, судя по запаху, не подходил никто.' : '') },
      ], () => {
        const opts = [
          { label:'ВЫКЛЮЧИТЬ СВЕТ', fn: () => {
              S.flags.lightOff = true;
              dialog('light_off', [{ narr:true,
                t:'Щёлк. Коридор становится целым.\nМаленький порядок. Из тех, что держат большие.' }],
                () => litterDirty ? litterChoice() : null);
          }},
          { label:'ОСТАВИТЬ — ПУСТЬ ГОРИТ', fn: () => {
              dialog('light_on', [{ narr:true,
                t:'Пусть горит. Кто-то ночью пойдёт — не споткнётся.\nИли просто лень. Игра не уточняет. Ты — тоже.' }],
                () => litterDirty ? litterChoice() : null);
          }},
        ];
        choices(opts);
      });
      function litterChoice() {
        dialog('litter_q', [{ sp:'МАРК', t:'...и лоток. Ну конечно. Мультики важнее.' }],
          () => choices([
            { label:'УБРАТЬ ЛОТОК', fn: () => {
                S.flags.litterCleaned = true;
                S.log.push('ночь: убрал лоток');
                dialog('litter_ok', [{ narr:true,
                  t:'Три минуты немой работы. Кот наблюдает из темноты — весь внимание.\nУ котов хорошая память на такие три минуты.' }]);
            }},
            { label:'ЗАВТРА. ВСЁ ЗАВТРА', fn: () => {
                S.flags.litterSkipped = true;
                S.log.push('ночь: забил на лоток');
                dialog('litter_no', [{ narr:true,
                  t:'Завтра. Ещё одно слово, на котором держится полдома.\nИз темноты на тебя смотрят. Смотрят — и делают выводы.' }]);
            }},
          ]));
      }
    } else {
      dialog('wc_night2', [{ narr:true, t:'Санузел. Ночная ревизия проведена. Спи спокойно... попробуй.' }]);
    }
  });

  // мини-хаб: детская — приоткрытая дверь слева в проёме (вход через хаб,
  // но СТЕНА детской — та, у которой стол: 40 см и гипсокартон живут)
  glowHot({ left:'66.5%', top:'28%', width:'5%', height:'32%' },
    'polygon(66.5% 28%, 71.5% 28%, 71.5% 60%, 66.5% 60%)', 'детская', () => goScene('nursery'));
  // обычные переходы-плашки. за правым поворотом — ДВЕ двери
  // (кто сказал, что не может? планировка Антона, канон)
  exit({ left:'72.6%', top:'60.4%', width:'5.4%', height:'8.9%' }, 'кухня', '↑',
    () => goScene('kitchen'));
  exit({ left:'79.5%', top:'49.5%', width:'5.0%', height:'8.9%' }, 'гостиная', '→',
    () => goScene('living'));
  exit({ left:'79.5%', top:'60.4%', width:'5.0%', height:'8.9%' }, 'спальня', '→',
    () => goScene('bedroom'));

  // сесть работать (утро; гейт — звонок Вере)
  exit({ left:'4%', top:'88%', width:'16%', height:'11%' }, 'сесть работать', '⌨',
    () => {
      if (S.time !== 'morning') {
        dialog('door_e', [{ narr:true, t:'Вечер. Рабочий день кончился. Формально.' }]);
        return;
      }
      if (S.flags.phoneRinging) return;
      if (!S.flags.wifeCall) {
        if (!S.flags.boombox) {
          dialog('nocall', [{ narr:true,
            t:'Телефон в гостиной молчит. Ты никогда не начинаешь день, не позвонив Вере.\nПривычка старше тебя.' }]);
          return;
        }
        S.flags.skippedWife = true;
        S.axis.ches++;
        S.log.push('утро: сел работать под музыку, не позвонив Вере');
        stopRinging(false);
        dialog('nocall_music', [
          { narr:true, t:'Надо бы позвонить Вере. Ты никогда не начинаешь день, не позвонив.\nНо сегодня музыка громче привычки.' },
          { sp:'МАРК', t:'Позвоню потом. В обед. Дела.' },
          { narr:true, t:'Не позвонит. И знает это уже сейчас.\nНастроение такое: слушать — и не слушать.' },
        ], () => {
          choiceMade();
          dayCard('В наушниках до обеда — тот припев. Хорошее было утро.\nЧьё-то.');
        });
        return;
      }
      stopRinging(false);
      dayCard('Хорошая память, говорят коллеги.\nПросто она хранит то, что нужно для работы.\nОстальное сдано на хранение. Квитанцию не выдали.');
    });

  if (S.time === 'morning') {
    say('', 'Коридор — перекрёсток квартиры. Четыре двери, один стол.\nЗа столом проходит твоя жизнь. Мимо стола — жизнь остальных.', true);
  } else if (!S.flags.midnightShown) {
    S.flags.midnightShown = true;
    say('', '00:14. Коридор в темноте. За спиной пощёлкивает, остывая, комп —\nединственный в доме, кто сегодня работал столько же.\nВид у рабочего места — как у собаки, которую не взяли гулять.', true);
  } else if (S.flags.kidsUnfed && !S.flags.veraScolded) {
    S.flags.veraScolded = true;
    S.vera.ignored++; // в её летописи это тоже зачтётся
    dialog('vera_scold', [
      { narr:true, t:'Звонок. Вера. Голос — рабочий, тот, которым она сообщает родственникам плохое.' },
      { sp:'ВЕРА', t:'Марк. Дети с УТРА не ели. Мультики до вечера — это как вообще?\nЯ на смене людей откачиваю, а ты дома одного обеда не откачал.' },
      { sp:'МАРК', t:'Вер, я работал. Они большие уже, могли бы и сами...' },
      { sp:'ВЕРА', t:'Большие. Ага. Кто из вас троих большой — вот вопрос дня.\nВсё, у меня вызов.' },
      { narr:true, t:'Гудки. Короткие. У неё даже гудки — по делу.' },
    ]);
  } else {
    say('', 'Коридор вечером. Кресло остыло. Монитор спит.\nВид у рабочего места — как у собаки, которую не взяли гулять.', true);
  }
}};

/* =====================================================================
   СЦЕНА: ГОСТИНАЯ
   ===================================================================== */
SCENES.living = { build() {
  clearScene();
  setBg('assets/living_px.png');
  glowSetup('assets/living_px.png');

  const eq = el('div','eq',{ left:'50.5%', top:'61%', height:'4%', zIndex:3 });
  for (let i = 0; i < 4; i++) el('i','', { height:'20%' }, eq);
  let eqTimer = null;
  function eqRun(on) {
    clearInterval(eqTimer);
    eq.style.display = on ? 'flex' : 'none'; // молчит — не видно (мушки, прощайте)
    [...eq.children].forEach(b => b.style.height = '12%');
    if (on) eqTimer = tick(() =>
      [...eq.children].forEach(b => b.style.height = (12 + Math.random()*80) + '%'), 160);
  }
  eqRun(S.flags.boombox);

  /* --- кот: приходит только в тишину (и если лоток не проигнорен) --- */
  if (S.time === 'evening' && !S.flags.tvOn && !S.flags.boombox && !S.flags.litterSkipped) {
    el('div','',{ position:'absolute', left:'26.5%', top:'75.5%', width:'5.5%', height:'5%',
      background:'#3a352c', borderRadius:'50% 50% 40% 40%', zIndex:3 }); // кот (наконец-то на лежанке)
    el('div','',{ position:'absolute', left:'30.5%', top:'73.5%', width:'2.4%', height:'3.4%',
      background:'#3a352c', borderRadius:'50%', zIndex:3 });             // голова
    hot({ left:'24%', top:'70%', width:'12%', height:'15%' }, 'кот', () => {
      S.flags.catMet = true;
      let line;
      if (S.axis.ches >= 2) {
        line = 'Кот приоткрывает глаз. Смотрит. Долго.\nПотом встаёт и уходит в темноту — без комментариев.\nБудто ждал кого-то другого.';
      } else if (S.karma < 0) {
        line = 'Кот позволяет руку. Терпит. Смотрит при этом мимо тебя —\nв точку за твоим плечом. Мурчания нет. Аудиенция окончена.';
      } else {
        S.flags.catPurred = true;
        line = 'Кот щурится, подставляет ухо и заводит мотор.\nМур. Свои. Проверка пройдена — хозяин дома.';
      }
      S.log.push('ночь: кот — ' + (S.flags.catPurred ? 'мурчал' : 'не принял'));
      dialog('cat', [{ narr:true, t: line }]);
    });
  }

  /* --- телефон: вся логика звонков --- */
  phoneEl = glowHot({ left:'75.5%', top:'58.8%', width:'3.3%', height:'9.5%' },
    'polygon(75.5% 58.8%, 78.8% 58.8%, 78.8% 68.3%, 75.5% 68.3%)', 'телефон', () => {
    // ночь: пропущенный от Веры (если днём не поговорили)
    if (S.time === 'evening' && S.flags.lunchMissed && !S.flags.eveningMissedHeard) {
      S.flags.eveningMissedHeard = true;
      dialog('evening_missed', [
        { narr:true, t:'Огонёк мигает. Автоответчик, голос Веры — усталый, перекрывающий сирену:' },
        { sp:'ВЕРА', t:'«Марк, ну ты как всегда... Я задержусь, буду к часу.\nПокорми детей — они сами не вспомнят. Лоток убери, кота пожалей.\nИ рыб! Сегодня их день. Всё, у меня вызов».' },
        { narr:true, t:'Сообщение оставлено в 14:31. Сейчас — половина первого ночи.\nСписок из трёх пунктов. Проверь себя сам, без подсказок.' },
      ]);
      return;
    }
    if (S.flags.phoneRinging === 'A') {
      stopRinging(false);
      dialog('incoming', [
        { sp:'МАРК', t:'Алло.' },
        { narr:true, t:'Тишина. Дыхание? Нет. Просто тишина.' },
        { sp:'МАРК', t:'Алло? ...Сбросили.' },
        { narr:true, t:'Не туда попали, наверное.\nНаверное.' },
      ]);
      return;
    }
    if (S.flags.phoneRinging === 'G') {
      dialog('phantom', [{ sp:'МАРК', t:'...показалось.' }]);
      return; // телефон продолжает звонить. Марк не слышит. Игрок — слышит.
    }
    // --- пропущенный: автоответчик (Вера не ждёт — она рванула на вызов) ---
    if (S.flags.missedCall && !S.flags.missedHandled) {
      S.flags.missedHandled = true;
      const wasG = S.flags.missedCall === 'G';
      const wasB = S.flags.missedCall === 'B';
      dialog('missed1', [
        { narr:true, t:'На телефоне мигает огонёк. Автоответчик, казённым голосом:\n«Вам звонил абонент... восемь... девятьсот...»' },
        { sp:'МАРК', t: wasG
            ? 'Блин. Вера звонила. Не успел взять...\nСтранно. Я и звонка не слышал.'
            : (wasB
              ? 'Блин. Вера звонила. Под музыку прослушал.'
              : 'Блин. Вера звонила. Не успел взять трубку.') },
      ], () => choices([
        { label:'ПЕРЕЗВОНИТЬ', fn: () => {
            S.flags.wifeCall = true; // позвонил. не дозвонился — но позвонил.
            S.vera.callback++;
            S.log.push('утро: перезвонил Вере после пропущенного');
            longBeep();
            dialog('missed2', [
              { narr:true, t:'Гудок. Ещё гудок. Ещё.\nХолодные, ровные, как кафель в приёмнике.' },
              { sp:'МАРК', t:'Да... видимо, уже уехали на вызов.' },
              { narr:true, t:'Она на работе почти никогда не берёт. Ей тупо некогда. Ты привык.\nПривычка — это когда перестаёт царапать.\nПерестало?' },
            ]);
        }},
        { label:'НЕ ПЕРЕЗВАНИВАТЬ', fn: () => {
            S.karma--; // путь ИГРОКА. не Марка, не Чеса. честный человеческий — и вниз.
            S.vera.ignored++; // и это она тоже запомнит
            S.log.push('утро: не перезвонил Вере (выбор игрока: регрессия)');
            dialog('missed3', [
              { sp:'МАРК', t:'Не буду отвлекать. Ничего ж срочного... наверное?' },
              { narr:true, t:'Наверное. Огонёк мигает. Подождёт.\nВсё в этом доме умеет ждать — научилось у хозяина.' },
            ]);
        }},
      ]));
      return;
    }
    if (!S.flags.wifeCall) {
      S.flags.wifeCall = true;
      S.vera.called++;
      dialog('wife1', [
        { sp:'МАРК', t:'Вер... мне кажется, я снова что-то забыл.' },
        { narr:true, t:'На том конце — рация, чей-то стон, хлопок дверцы. Её смена уже началась.' },
        { sp:'ВЕРА', t:'Марк, ты просто переработал. Снова сидел за компом до ночи. Отдыхать надо.\nВсё, у меня вызов. Целую. Дома буду к восьми.' },
        { sp:'МАРК', t:'Да. Наверное. Лягу сегодня пораньше.' },
        { narr:true, t:'Слово «снова» проехало дважды. Никто не заметил. Даже ты.\nЕё шкала настроена по тем, кого откачивают. Усталый муж — лёгкий случай. Жить будет.' },
      ], () => hudRemember('МИР'));
    } else if (S.axis.ches > 0 && !S.flags.shinodaTried) {
      S.flags.shinodaTried = true;
      S.log.push('утро: пытался набрать «приятеля-японца»');
      dialog('shinoda', [
        { narr:true, t:'Телефон сам оказывается в руке. Палец знает маршрут...\nнет. Не тот маршрут.' },
        { sp:'МАРК', t:'Может, набрать старому приятелю? Как он там поживает...\nкоторый косплеит японца...' },
        { narr:true, t:'Пальцы зависают над цифрами. Номер не вспоминается.\nПо уважительной причине: ты его никогда не знал.' },
        { sp:'МАРК', t:'...ладно. Не важно.' },
        { narr:true, t:'Не важно. У тебя ведь и приятеля такого никогда не было.\nПравда?' },
      ]);
    } else {
      dialog('wife2', [{ narr:true, t:'Телефон сам оказывается в руке. Палец знает маршрут.' }]);
    }
  });

  /* --- колонка БОЛТУН (при работающем ТВ — какофония за отдельную цену) --- */
  glowHot({ left:'50.2%', top:'59.8%', width:'3.4%', height:'8.5%' },
    'polygon(50.2% 59.8%, 53.6% 59.8%, 53.6% 68.3%, 50.2% 68.3%)', 'колонка «Болтун»', () => {
    if (S.flags.boombox) {
      S.flags.boombox = false;
      eqRun(false);
      dialog('boom0', [{ narr:true, t:'Тишина. Слышно холодильник. И себя.' }]);
      return;
    }
    if (S.flags.tvOn && !S.flags.cacophonyWarned) {
      S.flags.cacophonyWarned = true;
      dialog('boom_block', [
        { sp:'МАРК', t:'...и колонку поверх ящика? Будет какофония.\nЧё я фигнёй занимаюсь вообще.' },
        { narr:true, t:'Огрызнулся сам на себя. Бывает. Чаще, чем ты замечаешь.' },
      ]);
      return;
    }
    S.flags.boombox = true;
    eqRun(true);
    if (S.flags.tvOn) { // настоял. умудрился. получи оба источника сразу
      S.mental--;
      S.log.push('утро: врубил ОБА — телек и колонку (какофония)');
      dialog('cacophony', [
        { narr:true, t:'«Ленин Брат» сцепился с телевизором. Звук превращается в кашу,\nв которой не выжить ни песне, ни словам.' },
        { sp:'МАРК', t:'Во. Теперь как в голове.' },
      ]);
      return;
    }
    S.log.push('утро: включил музыку');
    dialog('boom1', [
      { sp:'МАРК', t:'Болтун, врубай «Ленин Брат». Старое.' },
      { narr:true, t:'Колонка думает секунду — и кухня, коридор, весь дом становятся на пару лет моложе.\nГромко. Как надо.' },
      { narr:true, t:'Болтуна, кстати, подарили дети — «чтоб у папы была хоть одна железка не для работы».\nТы пользуешься умной колонкой как кассетником. Дети ржут. Ты не понимаешь, над чем.' },
    ]);
  });

  /* --- полки, письмо, альбом --- */
  glowHot({ left:'85.0%', top:'22.4%', width:'14.9%', height:'70.9%' },
    'polygon(85.0% 22.4%, 99.9% 22.4%, 99.9% 93.3%, 85.0% 93.3%)', 'книжные полки', () => gated('living', () =>
    dialog('shelves', [{ narr:true,
      t:'Библиотека. Собрана с любовью и почти не тронута тобой: читает Вера.\nТы собирал. Она читает. Разделение труда, как везде.' }])));

  glowHot({ left:'88.8%', top:'42.8%', width:'4.7%', height:'7.4%' },
    'polygon(88.8% 42.8%, 93.5% 42.8%, 93.5% 50.2%, 88.8% 50.2%)', 'письмо', () => {
    if (S.time !== 'evening') { notYet(); return; }
    if (S.flags.letter) {
      dialog('let3', [{ narr:true, t:'Конверт умеет ждать. Он уже ждал.' }]);
      return;
    }
    dialog('let1', [{ sp:'МАРК', t:'Письмо. Бумажное. Обратный адрес — Дальний Восток...' }],
      () => choices([
        { label:'ПРОЧИТАТЬ', fn: () => {
            S.flags.letter = 'read'; S.log.push('якоря: прочитал письмо');
            dialog('let1a', [{ narr:true,
              t:'Строчки есть. Буквы есть. Ты ведёшь глазами — текст уплывает, как под водой.\nЧитается одна строка, ручкой с нажимом: «...смотри на что-нибудь, слышишь?..»\nОстальное память НЕ ОТДАЁТ. Ты его уже читал когда-то. Квитанции нет.' }],
              checkAnchors);
        }},
        { label:'ПОЛОЖИТЬ НА МЕСТО', fn: () => {
            S.flags.letter = 'kept'; S.log.push('якоря: отложил письмо');
            dialog('let1b', [{ narr:true,
              t:'Конверт ложится между книг. Он умеет ждать. Он уже ждал.' }],
              checkAnchors);
        }},
      ]));
  });

  glowHot({ left:'94.3%', top:'84.1%', width:'5.6%', height:'4.7%' },
    'polygon(94.3% 84.1%, 99.9% 84.1%, 99.9% 88.8%, 94.3% 88.8%)', 'фотоальбом', () => {
    if (S.time !== 'evening') { notYet(); return; }
    S.flags.album = true; S.log.push('якоря: открыл альбом');
    dialog('alb', [
      { narr:true, t:'Заречный. Две трубы парят — город дышит. Мать у подъезда — ЧЁТКАЯ, каждая пуговица.\nРядом фигурка, метр с кепкой. Размытая.' },
      { sp:'МАРК', t:'...не проснулся что ль. Плёнка, наверное. Дешёвая была плёнка.' },
    ], checkAnchors);
  });

  /* --- телевизор: либо он, либо Болтун (какофония стоит менталки) --- */
  glowHot({ left:'51.0%', top:'29.3%', width:'20.5%', height:'25.8%' },
    'polygon(51.0% 29.3%, 71.5% 29.3%, 71.5% 55.1%, 51.0% 55.1%)', 'телевизор', () => {
    if (S.time !== 'morning') {
      if (S.flags.tvOn) {
        S.flags.tvOn = false;
        dialog('tv_off_night', [{ narr:true,
          t:'Щёлк. Он орал с утра. Наконец-то тихо — в ушах ещё звенит послевкусие.' }]);
      } else {
        dialog('tv_e', [{ narr:true, t:'Вечером телевизор смотрит на тебя чёрным зеркалом. Хватит с тебя зеркал.' }]);
      }
      return;
    }
    if (S.flags.tvOn) {
      S.flags.tvOn = false; S.flags.tvChannel = null;
      dialog('tv_off', [{ narr:true, t:'Щёлк. Тишина. Так лучше.' }]);
      return;
    }
    if (S.flags.boombox) {
      dialog('tv_blocked', [{ sp:'МАРК',
        t:'Сперва колонку выключить надо... да и времени уже нет.\nЛибо музыка, либо ящик. Я ж не оркестр.' }]);
      return;
    }
    gated('living', () =>
      dialog('tv_on', [
        { sp:'МАРК', t:'Гляну, что показывают. Всё хорошее — ящик показывает, ага.' },
      ], () => choices([
        { label:'НОВОСТИ', fn: () => {
            S.flags.tvOn = true; S.flags.tvChannel = 'news'; S.mental--;
            S.log.push('утро: включил новости');
            dialog('tv_news', [{ narr:true,
              t:'Курс, фронт, рост тарифов, эксперт с лицом человека, который сам не верит.\nНастроение оседает, как пыль. Зачем ты это включил — вопрос без ответа.' }]);
        }},
        { label:'МУЗЫКА', fn: () => {
            S.flags.tvOn = true; S.flags.tvChannel = 'music'; S.axis.ches++;
            S.log.push('утро: музыкальный канал (клип Ленин Брат)');
            dialog('tv_music', [
              { narr:true, t:'Музыкальный канал. И — надо же — «Ленин Брат», живьём, Москва.\nВокалист висит на стойке, как будто она держит его, а не он её.' },
              { sp:'МАРК', t:'...я же был на этом концерте. Или хотел быть. Или...' },
              { narr:true, t:'Или. Хорошее слово. Оставим его здесь.' },
            ]);
        }},
        { label:'МУЛЬТИКИ', fn: () => {
            S.flags.tvOn = true; S.flags.tvChannel = 'cartoons';
            S.log.push('утро: мультики');
            dialog('tv_cart', [
              { narr:true, t:'Мультики. Те самые интонации, под которые Алиса замирает с ложкой у рта.' },
              { sp:'МАРК', t:'Проснутся — пусть смотрят. Хоть поедят перед теликом по-человечески.' },
              { narr:true, t:'«По-человечески». Ты сейчас про еду перед экраном. Услышал бы себя.' },
            ]);
        }},
      ])));
  });

  glowHot({ left:'38.6%', top:'26.3%', width:'8.3%', height:'19.8%' },
    'polygon(38.6% 26.3%, 46.9% 26.3%, 46.9% 46.1%, 38.6% 46.1%)', 'фотографии семьи', () => gated('living', () =>
    dialog('family_photos', [
      { narr:true, t:'Алиса на велосипеде — first ride, колёсики только сняли.\nМаксим с телескопом, который выпросил на день рождения и разобрал за неделю. Не сломал — РАЗОБРАЛ, посмотреть, как устроен.' },
      { sp:'МАРК', t:'Весь в... — а в кого, кстати. Ну, допустим, в меня.' },
    ])));

  glowHot({ left:'24.5%', top:'72.3%', width:'9.9%', height:'11.5%' },
    'polygon(24.5% 72.3%, 34.4% 72.3%, 34.4% 83.8%, 24.5% 83.8%)', 'лежанка', () => gated('living', () =>
    dialog('cat_bed', [{ narr:true,
      t:'Лежанка кота. Кота на ней нет — кот спит где угодно, кроме неё.\nКупили лучшую. Он выбрал коробку. Знакомая жизненная стратегия, да?' }])));

  glowHot({ left:'38.8%', top:'54.8%', width:'7.4%', height:'16.1%' },
    'polygon(38.8% 54.8%, 46.2% 54.8%, 46.2% 70.9%, 38.8% 70.9%)', 'детские рисунки', () => gated('living', () =>
    dialog('kids_art', [
      { narr:true, t:'«Творчество». Снять — рука не поднимается. Оставить — портит весь вид.\nДомашний пат.' },
      { narr:true, t:'Вера решает его втихую: рисунки исчезают, когда дети уезжают к бабушке.\nВсе делают вид, что так и было.' },
    ])));

  glowHot({ left:'59.9%', top:'71.8%', width:'8.2%', height:'5.8%' },
    'polygon(59.9% 71.8%, 68.1% 71.8%, 68.1% 77.6%, 59.9% 77.6%)', 'игровая приставка', () => gated('living', () =>
    dialog('console', [
      { narr:true, t:'Приставка. Подарок Веры на день рождения.\nИграть тупо некогда, а дети предпочитают свои компы и телефоны.' },
      { sp:'МАРК', t:'Надо бы хоть раз в году её включать.' },
    ])));

  glowHot({ left:'3.5%', top:'15.3%', width:'20.6%', height:'43.0%' },
    'polygon(3.5% 15.3%, 24.1% 15.3%, 24.1% 58.3%, 3.5% 58.3%)', 'окно во двор', () => gated('living', () =>
    dialog('window_yard', [{ narr:true,
      t:'Двор. Панелька напротив глядит рядами жёлтых окон.\nДетская площадка пустая — качели легонько ходят сами.\nОт ветра. Просто от ветра.' }])));
    // TODO (Антон): здесь будет диалог — придумаем

  /* --- дверь --- */
  exit({ left:'42%', top:'86%', width:'14%', height:'12%' }, 'в коридор', '↓',
    () => goScene('corridor'));

  if (S.time === 'morning') {
    say('', 'Гостиная. Сердце дома: здесь громко по субботам и тихо по будням.\nСейчас — будни.', true);
    setTimeout(phoneEvent, 8000 + Math.random() * 8000);
  } else if (S.axis.ches > 0) {
    say('', 'Вечер. Дом молчит — и это, если честно, неплохо.\nНикого не слушать. In the end это твой вечер, так ведь?', true);
  } else {
    say('', 'Вечер. Гостиная в вечернем свете выглядит добрее.\nИли ты — спокойнее. Кто-то из вас двоих точно.', true);
  }
}};

function dayCard(tail) {
  // колонка не выключена → дети проснутся и выскажут (потом всё равно работать)
  if (S.flags.boombox && !S.flags.kidsWoke) {
    S.flags.kidsWoke = true;
    S.log.push('утро: музыка разбудила детей');
    dialog('kids_wake', [
      { narr:true, t:'Из детской — шаги. Двое взъерошенных, хором:\n«Пап, НУ! Мы СПИМ вообще-то! Сделай тише!»' },
      { sp:'МАРК', t:'Каникулы у вас, а не спячка. Нечего дрыхнуть до обеда!' },
      { narr:true, t:'Контраргумент принят не был. Дверь детской хлопнула.\nСчёт по хлопкам дверей: дети ведут.' },
    ], () => dayCard2(tail));
    return;
  }
  dayCard2(tail);
}
function dayCard2(tail) {
  let text = 'День пролетает махом — не выходя из коридора.\n\nЗвонки. Таблицы. Ты называешь ФИО клиента раньше,\nчем он представился. Пятнадцать лет — вся картотека.\nЗа спиной дважды прошли в туалет и один раз на кухню.\nКто именно — ты не обернулся.';
  const tv = S.flags.tvOn ? S.flags.tvChannel : null;
  const music = S.flags.boombox;
  // последствия невыключенного фона — на весь рабочий день
  if (tv === 'news') { S.mental--; S.flags.underworked = true;
    text += '\n\nНовости бубнили весь день. К четырём ты выжат, как после смены Веры.\nСвернулся раньше — «доделаю потом». Не доделаешь.'; }
  if (tv === 'music' || (music && !tv)) { S.mental--;
    text += '\n\nМузыка играла весь день — и весь день всё валилось из рук:\nцифры плыли, ФИО путались. Отвлекает. Слишком своё.'; }
  if (tv === 'cartoons') { S.flags.kidsUnfed = true;
    text += '\n\nМультики шли до вечера. Дети смотрели. Про еду забыли все трое.'; }
  if (tv && music) { S.flags.insomnia = true; S.mental--;
    text += '\n\nЯщик и колонка орали хором до самого вечера.\nВ голове — каша с металлическим привкусом.\nЧто-то подсказывает: уснуть сегодня будет непросто.'; }
  showCard(text + '\n\n' + tail, () => goScene('lunch'));
}

/* =====================================================================
   СЦЕНА: ОБЕД (14:20) — перерыв, холодный кофе и звонок Веры
   ===================================================================== */
SCENES.lunch = { build() {
  clearScene();
  setBg('assets/kitchen_px.png');
  glowSetup('assets/kitchen_px.png');
  phoneEl = exit({ left:'2%', top:'86%', width:'18%', height:'13%' }, 'телефон — в гостиной', '☎',
    () => phoneClickLunch());

  // Вера звонит в обед — всегда (если утром уже поговорили 2 раза — не звонит)
  const veraCallsToday = S.vera.called + S.vera.callback;
  const willRing = veraCallsToday < 2;
  if (willRing) {
    S.flags.lunchRinging = true;
    phoneEl.classList.add('ringing');
    let rings = 0;
    ringTimer = setInterval(() => {
      ringOnce();
      if (++rings >= 10) { // не взял — Вера не ждёт
        clearInterval(ringTimer);
        phoneEl.classList.remove('ringing');
        if (S.flags.lunchRinging) {
          S.flags.lunchRinging = false;
          S.flags.lunchMissed = true;
          S.vera.missed++;
          S.log.push('обед: пропустил звонок Веры');
        }
      }
    }, 900);
  }

  glowHot({ left:'54%', top:'28%', width:'16%', height:'30%' },
    'polygon(54% 28%, 70% 28%, 70% 58%, 54% 58%)', 'турка', () => {
    if (!S.flags.coffee && !S.flags.coldCoffee) {
      S.flags.coldCoffee = true; S.mental--;
      S.log.push('обед: холодный кофе (утром не выпил)');
      dialog('cold_coffee', [
        { narr:true, t:'Голова чугунная: ты так и не выпил утром кофе.\nВ турке — утренний, Верин, ледяной. Разогревать лень. Пьёшь так.' },
        { sp:'МАРК', t:'...гадость. Редкостная.' },
        { narr:true, t:'Заслуженная.' },
      ]);
    } else {
      dialog('turka', [{ narr:true, t:'Турка пустая. Кофеиновый вопрос на сегодня закрыт.' }]);
    }
  });

  exit({ right:'2%', top:'42%', width:'8%', height:'16%' }, 'к работе', '⌨',
    () => {
      if (S.flags.lunchRinging) return; // телефон ЗВОНИТ. реши уже что-нибудь.
      showCard('Остаток дня — как один длинный звонок.\n\nУ заказчиков закрытие квартала: таблицы плодятся быстрее,\nчем ты их закрываешь. Куда-то уехали шесть часов.\n\n00:14. Ты закрываешь последнюю форму.\nКомп остывает — слышно, как пощёлкивает железо.\nДвенадцать с лишним часов. Ты просидел их не вставая.',
        () => { S.time = 'evening'; goScene('corridor'); });
    });

  say('', 'ОБЕД. 14:20. Ты разрешил себе двадцать минут.\nС кухни слышно всё, что происходит в квартире. Особенно телефон в гостиной.', true);
}};

function phoneClickLunch() {
  if (S.flags.lunchRinging) {
    S.flags.lunchRinging = false;
    clearInterval(ringTimer);
    if (phoneEl) phoneEl.classList.remove('ringing');
    S.flags.lunchAnswered = true;
    S.vera.called++;
    S.log.push('обед: взял звонок Веры');
    dialog('lunch_vera', [
      { sp:'МАРК', t:'Вер, привет. Как смена?' },
      { sp:'ВЕРА', t:'Не спрашивай. Слушай, я задержусь — завал, буду к часу, не раньше.\nПоешь сам, ладно? И детей покорми — они сами не вспомнят.\nЛоток глянь. И рыб — сегодня их день, ты помнишь.' },
      { sp:'МАРК', t:'Помню, помню. Не переживай. Работай спокойно.' },
      { narr:true, t:'«Помню» — сказал ты. Слово на сегодня выбрано смелое.' },
    ]);
  } else if (S.flags.lunchMissed) {
    dialog('lunch_missed_look', [{ narr:true,
      t:'Пропущенный: Вера. Перезванивать в разгар её смены — без шансов.\nУзнаешь вечером, что хотела. Или не узнаешь.' }]);
  } else {
    dialog('lunch_phone_q', [{ narr:true, t:'Телефон молчит. И это тоже информация.' }]);
  }
}

/* =====================================================================
   СЦЕНА: ДЕТСКАЯ (6 утра, все спят — на цыпочках)
   ===================================================================== */
SCENES.nursery = { build() {
  clearScene();
  setBg('assets/nursery_px.png');
  glowSetup('assets/nursery_px.png');

  glowHot({ left:'1%', top:'20%', width:'26%', height:'70%' },
    'polygon(1% 20%, 27% 20%, 27% 90%, 1% 90%)', 'кровать', () =>
    dialog('n_bed', [
      { narr:true, t:'Верхний отвернулся к стене и сполз с подушки — как всегда:\nк утру голова там, где положено быть ногам. Физика сна, восьмой класс.' },
      { narr:true, t:'Нижняя зарылась с головой — фирменная берлога.\nНе буди. Каникулы — их профессия.' },
    ]));

  glowHot({ left:'8%', top:'62%', width:'8%', height:'12%' },
    'polygon(8% 62%, 16% 62%, 16% 74%, 8% 74%)', 'подушка-чипсы', () =>
    dialog('n_chips', [{ narr:true,
      t:'Подушка в виде пачки чипсов. Подарок школьной подруги.\nНе еда и не мусор — талисман. Попробуй тронь.' }]));

  glowHot({ left:'27%', top:'14%', width:'14%', height:'62%' },
    'polygon(27% 14%, 41% 14%, 41% 76%, 27% 76%)', 'шкаф', () =>
    dialog('n_wardrobe', [
      { narr:true, t:'Наклейки городов — куда-то они собрались. Все сразу.' },
      { narr:true, t:'На шкафу — коробки от видеокарт. Трофеи.\nУпаковку не выбрасывает. Весь в отца — только отец хранит в гараже.' },
    ]));

  glowHot({ left:'42%', top:'30%', width:'16%', height:'46%' },
    'polygon(42% 30%, 58% 30%, 58% 76%, 42% 76%)', 'стол Максима', () =>
    dialog('n_desk1', [{ narr:true,
      t:'Максимов комп. RGB дышит даже во сне — тихая радуга под столом.\nКак аквариум. Только жрёт больше.' }]));

  glowHot({ left:'58%', top:'42%', width:'16%', height:'34%' },
    'polygon(58% 42%, 74% 42%, 74% 76%, 58% 76%)', 'диван и укулеле', () =>
    dialog('n_couch', [{ narr:true,
      t:'Диван с голубым пледом. Рядом укулеле — четыре струны, все на месте.\nДомашние концерты здесь дают по настроению. Вход всегда свободный.' }]));

  glowHot({ left:'74%', top:'56%', width:'25%', height:'36%' },
    'polygon(74% 56%, 99% 56%, 99% 92%, 74% 92%)', 'стол Сашки', () =>
    dialog('n_desk2', [{ narr:true,
      t:'Сашкин стол. Новый, с антресолью — подарок к школе.\nМонитор спит. Хозяйка тоже. Порядок в доме начинается с малого.' }]));

  glowHot({ left:'80%', top:'8%', width:'19%', height:'44%' },
    'polygon(80% 8%, 99% 8%, 99% 52%, 80% 52%)', 'стеллаж', () =>
    dialog('n_shelf', [{ narr:true,
      t:'Глобус, робот, записки на доске. Государство двоих —\nсо своими законами, границами и валютой из фантиков.' }]));

  glowHot({ left:'58%', top:'8%', width:'21%', height:'38%' },
    'polygon(58% 8%, 79% 8%, 79% 46%, 58% 46%)', 'окно', () =>
    dialog('n_window', [{ narr:true,
      t:'Серый рассвет сквозь тюль. Панельки ещё спят.\nВесь город ещё спит. Только ты уже нет.' }]));

  exit({ left:'42%', top:'88%', width:'16%', height:'11%' }, 'выйти тихо', '↓',
    () => goScene('corridor'));

  say('', 'Ты заглянул. Сопят. Двое — в две разные стороны, как договорились.\nНочники сторожат. Постой секунду в дверях...\nВсё. Дальше — на цыпочках.', true);
}};

/* =====================================================================
   СЦЕНА: КУХНЯ
   ===================================================================== */
SCENES.kitchen = { build() {
  clearScene();
  setBg('assets/kitchen_px.png');
  glowSetup('assets/kitchen_px.png');

  glowHot({ left:'28.5%', top:'49.9%', width:'18.0%', height:'24.7%' },
    'polygon(28.5% 49.9%, 46.5% 49.9%, 46.5% 74.6%, 28.5% 74.6%)', 'стол', () => {
    if (S.time === 'evening') {
      if (!S.flags.dinnerChecked) {
        S.flags.dinnerChecked = true;
        dialog('table_night', [
          { narr:true, t:'Стол пуст. Веры нет — нет и ужина. Логистика этого дома проста и печальна.' },
          { sp:'МАРК', t:'Бутерброд. Стоя. Классика жанра.' },
          { narr:true, t:'Ты ешь над раковиной, глядя в тёмное окно. Где-то там Вера\nтоже, наверное, ест что-то холодное. Вы даже ужинаете синхронно —\nпросто в разных точках города.' },
        ]);
      } else {
        dialog('table_night2', [{ narr:true, t:'Крошки от бутерброда. Улики скромного пира.' }]);
      }
      return;
    }
    dialog('table', [{ narr:true,
      t:'Стол на четверых. В учебное время Вера завтракает с детьми в шесть — перед сменой.\nСейчас каникулы: дети едят когда-нибудь. Ты — тоже, в принципе, когда-нибудь.\nВ полном составе этот стол работает... по воскресеньям? Когда-нибудь. Хорошее слово,\nна нём тут полдома держится.' }]);
  });

  glowHot({ left:'33.5%', top:'48.8%', width:'2.2%', height:'5.5%' },
    'polygon(33.5% 48.8%, 35.7% 48.8%, 35.7% 54.3%, 33.5% 54.3%)', 'кофе', () => {
    if (S.time === 'evening') {
      // Костя и Сашка сошлись: «точно не кофе пить» :D
      dialog('coffee_n', [{ sp:'МАРК', t:'Кофе в полночь? Даже я не настолько.' }]);
      return;
    }
    S.flags.coffee = true;
    dialog('coffee', [{ narr:true, t:'Кофе — быстро, стоя, как на вокзале.' }]);
  });

  glowHot({ left:'39.9%', top:'49.8%', width:'3.3%', height:'4.8%' },
    'polygon(39.9% 49.8%, 43.2% 49.8%, 43.2% 54.6%, 39.9% 54.6%)', 'чеки', () =>
    dialog('bills', [
      { narr:true, t:'Чеки ЖЭК, разложены Вериной рукой по месяцам. Снова плюс пять процентов.' },
      { sp:'МАРК', t:'Пять процентов... Каждый год по пять — и никто не спрашивает, потянул ли ты предыдущие.' },
      { narr:true, t:'Ты потянешь. Ты всегда тянешь. Это твоя суперспособность и твой диагноз — в одном флаконе.' },
    ]));

  glowHot({ left:'87.5%', top:'16.9%', width:'12.0%', height:'82.2%' },
    'polygon(87.5% 16.9%, 99.5% 16.9%, 99.5% 99.1%, 87.5% 99.1%)', 'холодильник', () =>
    dialog('fridge', [{ narr:true,
      t:'Холодильник. Гудит ровно, как хорошо настроенный сервер.\nВнутри — Верин порядок. Не трогай систему, если она работает.' }]));
    // TODO (Антон): холодильнику придумаем задачу

  glowHot({ left:'93.8%', top:'35.1%', width:'5.0%', height:'13.3%' },
    'polygon(93.8% 35.1%, 98.8% 35.1%, 98.8% 48.4%, 93.8% 48.4%)', 'календарик', () => {
    S.flags.calendar = true;
    dialog('cal', [{ sp:'МАРК',
      t:'Пятница обведена. «РЫБЫ» — моя рука, красный маркер. Покормить вечером.' }]);
  });

  glowHot({ left:'88.5%', top:'28.1%', width:'5.8%', height:'32.2%' },
    'polygon(88.5% 28.1%, 94.3% 28.1%, 94.3% 60.3%, 88.5% 60.3%)', 'рисунок на холодильнике', () =>
    dialog('alisa_art', [
      { narr:true, t:'Рисунок Алисы под магнитом: дом, четыре человека, кот размером с полдома.\nУ всех руки-палочки. У фигуры с надписью «папа» в руках — телефон.' },
      { sp:'МАРК', t:'...' },
      { narr:true, t:'Дети рисуют не то, что видят. Дети рисуют то, что видят ЧАЩЕ ВСЕГО.' },
    ]));

  glowHot({ left:'26.9%', top:'14.2%', width:'20.4%', height:'32.4%' },
    'polygon(26.9% 14.2%, 47.3% 14.2%, 47.3% 46.6%, 26.9% 46.6%)', 'окно на парковку', () =>
    dialog('parking', [
      { narr:true, t:'Парковка. Твой «Первопроходец» 4WD — новый, чёрный, стоит ровно там же, где вчера.\nИ позавчера. Полный привод, понижайка, брод восемьдесят сантиметров.' },
      { sp:'МАРК', t:'Школа через дом. Работа — в двадцати шагах от кровати. Брод... брода по маршруту нет.' },
      { narr:true, t:'Машина для дорог, по которым ты не ездишь. Пока не ездишь.\nОна ждёт. Она из тех вещей, которые умеют ждать.' },
    ]));

  glowHot({ left:'67.5%', top:'44.9%', width:'10.1%', height:'6.8%' },
    'polygon(67.5% 44.9%, 77.6% 44.9%, 77.6% 51.7%, 67.5% 51.7%)', 'плита', () =>
    dialog('stove', [{ narr:true,
      t:'Плита. Турка на конфорке — Верина, утренняя.\nЗдесь ты умеешь всё: лесенка от картошки до молекулярки. Когда есть настроение.\nНастроение бывает... когда-нибудь.' }]));

  glowHot({ left:'13.3%', top:'54.4%', width:'7.2%', height:'25.0%' },
    'polygon(13.3% 54.4%, 20.5% 54.4%, 20.5% 79.4%, 13.3% 79.4%)', 'когтеточка', () =>
    dialog('cat_tree', [
      { narr:true, t:'Когтеточка-небоскрёб. Куплена, чтобы спасти мебель.\nМебель спасена: кот дерёт коробку у детской. Небоскрёб служит смотровой площадкой —\nоттуда удобно наблюдать, как ты варишь кофе. Работа у него такая.' },
    ]));

  exit({ left:'40%', top:'90%', width:'18%', height:'9%' }, 'в коридор', '↓',
    () => goScene('corridor'));

  say('', S.time === 'morning'
    ? 'Кухня. Пахнет вчерашним ужином и сегодняшним кофе. Хронология дома — по запахам.'
    : (S.flags.tvChannel === 'cartoons'
      ? 'Кухня в полночь. В раковине — гора: дети ели что нашли, посуду копили как трофеи.\nМультики съели день у всех троих.'
      : 'Кухня в полночь. Посуда перемыта — детьми, вот это поворот.\nНа сушилке кружка. Твоя. Одинокая, как её хозяин в этот час.'), true);
}};

/* ---------- сбор якорей → навык ---------- */
function checkAnchors() {
  const got = ['notebook','letter','album'].filter(k => S.flags[k]).length;
  if (got >= 3 && !S.flags.skillGained) {
    S.flags.skillGained = true;
    setTimeout(() => {
      hudRemember('МАРК');
      setTimeout(() => showCard(
        '>>> НАВЫК ПОЛУЧЕН: ОСОЗНАТЬСЯ <<<\n\nПосмотри на руки. Посмотри на часы. Спроси: я сплю?\nДелай это до автоматизма — однажды спросишь во сне.\nИ услышишь ответ.',
        () => say('', 'Якоря собраны. Дом ждёт ночного обхода — а кровать ждёт тебя.', true)), 2000);
    }, 1200);
  }
}

/* ---------- конец дня 1 ---------- */
function endDay1() {
  S.log.push('день 1 завершён');
  const cards = [];
  // расплата за щеколду: Вера возвращается к часу — игрок слышит, Марк нет
  if (S.flags.latch) {
    S.vera.ignored++;
    cards.push('Темнота. Сквозь первый, самый вязкий слой сна —\nзвонок в дверь. Ещё один. Ещё.\n\nТы не слышишь. Ты уже далеко.\n\nСлышишь только ты — по эту сторону экрана.');
  }
  if (S.flags.doorSkipped) {
    cards.push('Засыпая, ты пытаешься вспомнить, закрыл ли ты дверь.\nМысль тонет раньше ответа.\n\nГде-то в городе Вера заканчивает четырнадцатый час смены.');
  }
  if (S.flags.insomnia) {
    cards.push('Ты закрываешь глаза.\n\nПотолок. 01:40. Потолок. 02:55. Потолок. 03:40.\nЯщик и колонка доиграли — а голова нет: каша с металлическим\nпривкусом крутится без остановки.\n\nСон не пришёл. Совсем.\n\n— КОНЕЦ ДНЯ 1 (БЕЗ НОЧИ) —\n\nНочь 1 — в следующем коммите. Но не для тебя, боец.');
  } else {
    cards.push('Ты закрываешь глаза. День отпускает не сразу —\nФИО, таблицы, полоска света под дверью санузла...\n\nА потом — запах. Тёплый. Знакомый. С той кухни.\n\n— КОНЕЦ ДНЯ 1 —\n\nНочь 1 — в следующем коммите. Она уже пахнет.');
  }
  let i = 0;
  const next = () => { if (i < cards.length) showCard(cards[i++], next);
    else showCard('ОСОЗНАЙСЯ\n\nspasibo za test :)\nнож и блокнот ждут', () => {}); };
  next();
}

/* ---------- карточки-титры ---------- */
let cardCb = null;
function showCard(text, cb) {
  const c = document.getElementById('card');
  c.firstChild.textContent = text;
  c.classList.remove('hidden');
  cardCb = cb;
}
function cardNext() {
  const c = document.getElementById('card');
  c.classList.add('hidden');
  if (cardCb) { const f = cardCb; cardCb = null; f(); }
  else if (!S.scene) goScene('bathroom'); // день начинается у зеркала. как положено.
}