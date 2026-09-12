import type { ChatMessage, Spec, StyleOption, Suggestion } from "./types";

/** 演示模式：一键载入的 mock 数据，无需 API Key 即可体验完整预览效果。 */

export const DEMO_MESSAGES: ChatMessage[] = [
  { role: "user", content: "我想做一个帮我记录每天喝水的小工具" },
  {
    role: "assistant",
    content:
      "明白啦～你想要一个提醒自己多喝水、并且能看到坚持情况的小工具。\n\n我按「打开就能打卡、越用越有成就感」来设计：核心是一键记一杯，配上每日目标和最近一周的坚持情况，让你一眼看到自己的进步。方案已经生成，请在右侧确认 👉",
  },
  {
    role: "assistant",
    content: "（这是演示模式：以上对话和右侧成品都是预置的示例数据，用于展示完整流程效果。填入 API Key 后即可生成属于你自己的产品。）",
  },
];

export const DEMO_SPEC: Spec = {
  productName: "水滴打卡",
  tagline: "轻轻一点，记下每一杯水",
  targetUsers: "想养成喝水习惯、但总是忘记的上班族和学生",
  coreValue: "把喝水变成有成就感的小仪式：一键打卡，进度和坚持天数一目了然",
  scenarios: [
    "工作间隙喝完一杯水，顺手点一下记录",
    "下午看看进度环，发现还差 3 杯，提醒自己起身接水",
    "周末回顾本周打卡情况，为连续达标感到满足",
  ],
  modules: [
    { name: "一键打卡", desc: "点一下记一杯，误点可以撤销", priority: "core" },
    { name: "每日目标", desc: "自定义每天要喝几杯，进度环实时显示完成度", priority: "core" },
    { name: "本周回顾", desc: "最近 7 天的柱状图，达标的日子会亮起来", priority: "core" },
    { name: "连续达标徽章", desc: "连续达标天数越多，徽章越亮眼", priority: "plus" },
  ],
  checklist: [
    { id: "data-local", label: "数据保存", desc: "记录保存在你自己的设备上，无需注册登录", defaultOn: true, enabled: true },
    { id: "multi-device", label: "多端适配", desc: "手机和电脑都能舒适使用", defaultOn: true, enabled: true },
    { id: "offline", label: "离线可用", desc: "断网也能正常打卡", defaultOn: true, enabled: true },
    { id: "share-export", label: "分享导出", desc: "本周成绩可以保存下来分享给朋友", defaultOn: false, enabled: false },
  ],
};

export const DEMO_STYLES: StyleOption[] = [
  {
    id: "aqua",
    name: "清泉",
    description: "像一杯干净的水：清爽的蓝绿底色配暖橙点缀，看着就想喝水。",
    mood: "清爽治愈",
    palette: { bg: "#eef6f6", surface: "#ffffff", primary: "#1f6f78", accent: "#ff8552", text: "#16323a" },
    fonts: { heading: "现代无衬线（黑体系）", body: "现代无衬线（黑体系）" },
    radius: "round",
  },
  {
    id: "ink",
    name: "墨白",
    description: "极简黑白灰，数据是唯一的主角，适合喜欢利落感的人。",
    mood: "极简利落",
    palette: { bg: "#f7f7f5", surface: "#ffffff", primary: "#1a1a1a", accent: "#3d7a5d", text: "#222222" },
    fonts: { heading: "现代无衬线（黑体系）", body: "现代无衬线（黑体系）" },
    radius: "sharp",
  },
  {
    id: "sunset",
    name: "暖阳",
    description: "奶油底色配珊瑚橙，温暖亲和，每次打卡都像被鼓励了一下。",
    mood: "温暖亲和",
    palette: { bg: "#faf4ec", surface: "#fffdf9", primary: "#c9572e", accent: "#e8b64c", text: "#3a2e26" },
    fonts: { heading: "人文衬线（宋体系）", body: "现代无衬线（黑体系）" },
    radius: "soft",
  },
];

export const DEMO_STYLE_ID = "aqua";

export const DEMO_SUGGESTIONS: Suggestion[] = [
  { label: "加每日喝水提醒时段", instruction: "在设置里增加提醒时段选择（如每小时/上午下午各一次），到点时页面内弹出温和的提醒条。" },
  { label: "支持自定义杯子容量", instruction: "允许用户设置一杯的毫升数，进度按总毫升数显示，默认 250ml。" },
  { label: "本周成绩导出成图片", instruction: "增加一个「晒成绩」按钮，把本周柱状图和连续达标天数渲染成一张可下载的分享图片。" },
  { label: "夜间深色模式", instruction: "增加浅色/深色主题切换，跟随系统偏好，保持现有配色气质。" },
];

export const DEMO_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>水滴打卡</title>
<style>
  :root {
    --bg: #eef6f6; --surface: #ffffff; --primary: #1f6f78;
    --accent: #ff8552; --text: #16323a; --muted: #5f7d82;
    --line: #dcebeb; --radius: 18px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: var(--bg); color: var(--text); min-height: 100vh;
    display: flex; justify-content: center; padding: 24px 16px 48px;
  }
  .app { width: 100%; max-width: 430px; display: flex; flex-direction: column; gap: 16px; }
  header { text-align: center; padding: 8px 0 4px; }
  header h1 { font-size: 24px; letter-spacing: 0.06em; color: var(--primary); }
  header p { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .card {
    background: var(--surface); border-radius: var(--radius);
    padding: 22px; box-shadow: 0 2px 12px rgba(31,111,120,0.08);
  }
  .ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .ring { position: relative; width: 190px; height: 190px; }
  .ring svg { transform: rotate(-90deg); }
  .ring .track { stroke: var(--line); }
  .ring .fill { stroke: var(--primary); stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
  .ring-center {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
  }
  .ring-center .cups { font-size: 40px; font-weight: 800; color: var(--primary); }
  .ring-center .goal { font-size: 13px; color: var(--muted); }
  .done-tag {
    font-size: 12px; color: #fff; background: var(--accent);
    padding: 2px 12px; border-radius: 99px; margin-top: 4px;
    opacity: 0; transform: scale(0.8); transition: all 0.3s;
  }
  .done-tag.show { opacity: 1; transform: scale(1); }
  .btn-row { display: flex; gap: 12px; align-items: center; }
  .big-btn {
    background: var(--primary); color: #fff; border: none; cursor: pointer;
    font-size: 17px; font-weight: 700; padding: 14px 34px; border-radius: 99px;
    box-shadow: 0 4px 14px rgba(31,111,120,0.3); transition: transform 0.12s, box-shadow 0.12s;
    font-family: inherit;
  }
  .big-btn:active { transform: scale(0.95); box-shadow: 0 2px 6px rgba(31,111,120,0.3); }
  .small-btn {
    background: transparent; border: 1.5px solid var(--line); color: var(--muted);
    width: 42px; height: 42px; border-radius: 50%; font-size: 20px; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .small-btn:hover { border-color: var(--muted); color: var(--text); }
  .section-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
  .goal-row { display: flex; align-items: center; justify-content: space-between; }
  .goal-ctrl { display: flex; align-items: center; gap: 14px; }
  .goal-num { font-size: 22px; font-weight: 800; color: var(--primary); min-width: 40px; text-align: center; }
  .week { display: flex; justify-content: space-between; align-items: flex-end; height: 120px; padding-top: 8px; }
  .day { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 12%; }
  .bar-track { width: 100%; max-width: 26px; height: 84px; background: var(--bg); border-radius: 8px; display: flex; align-items: flex-end; overflow: hidden; }
  .bar { width: 100%; background: var(--line); border-radius: 8px; transition: height 0.5s ease; min-height: 4px; }
  .bar.hit { background: linear-gradient(180deg, var(--accent), var(--primary)); }
  .day-label { font-size: 11px; color: var(--muted); }
  .day.today .day-label { color: var(--accent); font-weight: 700; }
  .streak { display: flex; align-items: center; gap: 12px; }
  .streak-badge {
    width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), #ffb38a);
    display: flex; align-items: center; justify-content: center; font-size: 24px;
    box-shadow: 0 3px 10px rgba(255,133,82,0.35);
  }
  .streak-text b { font-size: 17px; }
  .streak-text p { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
  footer { text-align: center; }
  .reset-link { background: none; border: none; color: var(--muted); font-size: 12px; cursor: pointer; text-decoration: underline; font-family: inherit; }
  .toast {
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: var(--text); color: #fff; font-size: 13px;
    padding: 9px 20px; border-radius: 99px; opacity: 0; pointer-events: none; transition: opacity 0.25s;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>💧 水滴打卡</h1>
    <p id="today-date">今天</p>
  </header>

  <div class="card ring-wrap">
    <div class="ring">
      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle class="track" cx="95" cy="95" r="82" fill="none" stroke-width="14"></circle>
        <circle class="fill" id="ring-fill" cx="95" cy="95" r="82" fill="none" stroke-width="14"></circle>
      </svg>
      <div class="ring-center">
        <div class="cups" id="cup-count">0</div>
        <div class="goal" id="goal-label">目标 8 杯</div>
        <div class="done-tag" id="done-tag">今日达标 🎉</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="small-btn" id="minus-btn" title="撤销一杯">−</button>
      <button class="big-btn" id="add-btn">＋ 喝了一杯</button>
    </div>
  </div>

  <div class="card">
    <div class="goal-row">
      <div class="section-title" style="margin:0">每日目标</div>
      <div class="goal-ctrl">
        <button class="small-btn" id="goal-minus">−</button>
        <span class="goal-num" id="goal-num">8</span>
        <button class="small-btn" id="goal-plus">＋</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">本周回顾 <span style="font-weight:400;font-size:12px;color:var(--muted)">达标的日子会亮起来</span></div>
    <div class="week" id="week"></div>
  </div>

  <div class="card streak">
    <div class="streak-badge">🔥</div>
    <div class="streak-text">
      <b id="streak-num">连续达标 0 天</b>
      <p>坚持就是胜利，明天也要记得喝水哦</p>
    </div>
  </div>

  <footer><button class="reset-link" id="reset-btn">清空示例数据，从今天开始记录</button></footer>
</div>
<div class="toast" id="toast"></div>

<script>
(function () {
  var KEY = 'water-checkin-v1';
  var state = null;

  function todayStr(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function seed() {
    var days = {};
    var sample = [6, 8, 9, 5, 8, 10];
    for (var i = 1; i <= 6; i++) days[todayStr(i)] = sample[i - 1];
    days[todayStr(0)] = 5;
    return { goal: 8, days: days };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.days) return s; }
    } catch (e) {}
    var s2 = seed();
    save(s2);
    return s2;
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  var C = 2 * Math.PI * 82;

  function render() {
    var today = todayStr(0);
    var cups = state.days[today] || 0;
    var goal = state.goal;

    document.getElementById('cup-count').textContent = cups;
    document.getElementById('goal-label').textContent = '目标 ' + goal + ' 杯';
    document.getElementById('goal-num').textContent = goal;

    var pct = Math.min(1, goal > 0 ? cups / goal : 0);
    var ring = document.getElementById('ring-fill');
    ring.setAttribute('stroke-dasharray', String(C));
    ring.setAttribute('stroke-dashoffset', String(C * (1 - pct)));
    document.getElementById('done-tag').classList.toggle('show', cups >= goal && goal > 0);

    var labels = ['日', '一', '二', '三', '四', '五', '六'];
    var weekEl = document.getElementById('week');
    weekEl.innerHTML = '';
    var max = goal;
    for (var i = 6; i >= 0; i--) {
      var key = todayStr(i);
      var n = state.days[key] || 0;
      if (n > max) max = n;
    }
    for (var j = 6; j >= 0; j--) {
      var k = todayStr(j);
      var count = state.days[k] || 0;
      var d = new Date();
      d.setDate(d.getDate() - j);
      var day = document.createElement('div');
      day.className = 'day' + (j === 0 ? ' today' : '');
      var h = max > 0 ? Math.round((count / max) * 100) : 0;
      day.innerHTML =
        '<div class="bar-track"><div class="bar' + (count >= state.goal && count > 0 ? ' hit' : '') +
        '" style="height:' + h + '%"></div></div>' +
        '<div class="day-label">' + (j === 0 ? '今天' : '周' + labels[d.getDay()]) + '</div>';
      day.title = count + ' 杯';
      weekEl.appendChild(day);
    }

    var streak = 0;
    for (var s = 0; s < 60; s++) {
      var c = state.days[todayStr(s)] || 0;
      if (c >= state.goal && state.goal > 0) streak++;
      else if (s === 0) continue; // 今天还没达标不打断连续
      else break;
    }
    document.getElementById('streak-num').textContent = '连续达标 ' + streak + ' 天';
  }

  document.getElementById('add-btn').addEventListener('click', function () {
    var t = todayStr(0);
    state.days[t] = (state.days[t] || 0) + 1;
    save(state); render();
    if (state.days[t] === state.goal) toast('太棒了，今天达标啦 🎉');
  });

  document.getElementById('minus-btn').addEventListener('click', function () {
    var t = todayStr(0);
    if ((state.days[t] || 0) <= 0) { toast('今天还没有记录哦'); return; }
    state.days[t] -= 1;
    save(state); render();
  });

  document.getElementById('goal-plus').addEventListener('click', function () {
    if (state.goal >= 20) return;
    state.goal += 1; save(state); render();
  });

  document.getElementById('goal-minus').addEventListener('click', function () {
    if (state.goal <= 1) return;
    state.goal -= 1; save(state); render();
  });

  document.getElementById('reset-btn').addEventListener('click', function () {
    if (!confirm('确定要清空所有记录，从今天重新开始吗？')) return;
    state = { goal: state.goal, days: {} };
    save(state); render();
    toast('已清空，开始新的记录吧');
  });

  var now = new Date();
  document.getElementById('today-date').textContent =
    now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · 喝水记录';

  state = load();
  render();
})();
</script>
</body>
</html>`;
