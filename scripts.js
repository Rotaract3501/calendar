// ============================================================
// 定義全域變數
const API_KEY = 'AIzaSyBrZmnf8ZRNDPPIQeoz9dTNUtybGw-V0Xc'; // Google API 金鑰
const CALENDAR_ID = '92d1a248705ec24dafd9c6452b2098b70c5b7c0bed76cdf3b2c6b99acf5b9515@group.calendar.google.com'; // 主行事曆 ID
const REP_CALENDAR_ID = '76e1c69e567a4d7f10e0c3a4ecc03cd52a4799b062a0cae930e82a013f275144@group.calendar.google.com'; // 代表行程日曆 ID
const REP_CATEGORY = '代表行程'; // 代表行程分類名稱

const PRESET_CATEGORY_COLORS = {
  '地區': { bg:'#FFCED9', color:'#E9305E', border:'#FF6C91' }, // 地區 粉紅
  '扶輪': { bg:'#FFF0D3', color:'#F5A810', border:'#FFBE3C' }, // 扶輪 橙色
  '會議': { bg:'#FFD3D3', color:'#cc0e0e', border:'#DA5454' }, // 會議 紅色
  '西北': { bg:'#F0D7F7', color:'#510864', border:'#9833B1' }, // 西北
  '聯大': { bg:'#F0D7F7', color:'#510864', border:'#9833B1' }, // 聯大
  '中壢': { bg:'#F0D7F7', color:'#510864', border:'#9833B1' }, // 中壢
  '中央': { bg:'#F0D7F7', color:'#510864', border:'#9833B1' }, // 中央
  '國際': { bg:'#EDE7F6', color:'#5E35B1', border:'#B39DDB' }, // 國際 紫色
  '職業': { bg:'#D3E6FF', color:'#17427E', border:'#3A73C3' }, // 職業 藍色
  '社區': { bg:'#E8F5E9', color:'#2E7D32', border:'#81C784' }, // 社區 綠色
  '社務': { bg:'#FFF2C4', color:'#FFD12B', border:'#FFDF6A' }, // 社務 黃色
};

const PRESET_CATEGORY_ORDER = [
  '地區', '扶輪', '會議', '西北', '聯大', '中壢', '中央', '國際', '職業', '社區', '社務'
];

const CATEGORY_COLORS = [
  { bg:'#FCE4EC', color:'#AD1457', border:'#F48FB1' }, // 淡粉紅
  { bg:'#E8EAF6', color:'#283593', border:'#9FA8DA' }, // 深藍
  { bg:'#E0F7FA', color:'#00838F', border:'#80DEEA' }, // 青色
  { bg:'#F3E5F5', color:'#7B1FA2', border:'#CE93D8' }, // 紫紅
];

const REP_COLOR = { bg:'#E8EAF6', color:'#3A73C3', border:'#3A73C3' }; // 代表行程顏色

let currentYear = new Date().getFullYear(); // 當前年份
let allEvents = []; // 所有活動資料
let repEvents = []; // 代表行程資料
let categories = new Map(); // 活動分類
let activeFilter = 'all'; // 預設篩選狀態為全部

// ============================================================
// 註冊 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// ============================================================
// 檢查網路狀態
function checkOnlineStatus() {
  const offlineBanner = document.getElementById('offlineBanner');
  if (!navigator.onLine) {
    offlineBanner.style.display = 'block'; // 顯示離線提示
  } else {
    offlineBanner.style.display = 'none'; // 隱藏離線提示
  }
}

window.addEventListener('offline', checkOnlineStatus);
window.addEventListener('online', checkOnlineStatus);
checkOnlineStatus(); // 初始化檢查網路狀態

// ============================================================
// 從 Google 日曆 API 獲取行事曆資料
async function fetchCalendar(calendarId) {
  const timeMin = `${currentYear}-01-01T00:00:00+08:00`;
  const timeMax = `${currentYear}-12-31T23:59:59+08:00`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=500`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// ============================================================
// 處理活動資料
function processEvents(items, isRep) {
  const tempEvents = [];
  items.forEach(ev => {
    const start = ev.start.dateTime || ev.start.date;
    const end = ev.end?.dateTime || ev.end?.date;
    const matches = [...(ev.summary?.matchAll(/【(.+?)】/g) || [])];
    const cats = matches.length > 0 ? matches.map(m => m[1]) : ['未分類'];
    const title = ev.summary?.replace(/【.+?】\s*/g, '') || '（無標題）';

    if (!isRep) {
      cats.forEach(category => {
        if (!categories.has(category)) {
          categories.set(
            category,
            PRESET_CATEGORY_COLORS[category] || CATEGORY_COLORS[categories.size % CATEGORY_COLORS.length]
          );
        }
      });
    }

    tempEvents.push({
      title,
      categories: cats,
      start: new Date(start),
      end: end ? new Date(end) : null,
      location: ev.location || '',
      allDay: !ev.start.dateTime,
      isRep,
      description: ev.description || '',
    });
  });

  return tempEvents;
}

// ============================================================
// 獲取活動資料
async function fetchEvents() {
  const loading = document.getElementById('loadingIndicator');
  const timeline = document.getElementById('timeline');
  const noEvents = document.getElementById('noEvents');

  loading.style.display = 'block';
  timeline.style.display = 'none';
  noEvents.style.display = 'none';

  try {
    const [mainItems, repItems] = await Promise.all([
      fetchCalendar(CALENDAR_ID),
      fetchCalendar(REP_CALENDAR_ID).catch(() => [])
    ]);

    categories.clear();

    allEvents = processEvents(mainItems, false);
    repEvents = processEvents(repItems, true);

    allEvents.sort((a, b) => a.start - b.start);
    repEvents.sort((a, b) => a.start - b.start);

    buildFilterPills();
    renderTimeline();
  } catch (err) {
    console.error(err);
    handleOfflineData(loading, timeline, noEvents);
  }
}

// ============================================================
// 處理離線模式的數據
async function handleOfflineData(loading, timeline, noEvents) {
  console.error('API 無法訪問，嘗試載入緩存數據...');
  const cache = await caches.open('3501-pwa-cache-v1');
  const cachedResponse = await cache.match(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`);
  if (cachedResponse) {
    const data = await cachedResponse.json();
    allEvents = processEvents(data.items, false);
    renderTimeline();
  } else {
    loading.innerHTML = `
      <div style="color:#D91B5C;">
        ⚠️ 無法載入行事曆<br>
        <span style="font-size:13px;color:#888;display:block;margin-top:8px;">
          請確認您已連接網路，或稍後再試。
        </span>
      </div>
    `;
  }
}

// ============================================================
// 建立分類篩選按鈕
function buildFilterPills() {
  const bar = document.getElementById('filterBar');
  const allBtn = bar.querySelector('.filter-pill-all');
  bar.innerHTML = '';
  allBtn.classList.toggle('active', activeFilter === 'all');
  bar.appendChild(allBtn);

  PRESET_CATEGORY_ORDER.forEach(category => {
    if (categories.has(category)) {
      bar.appendChild(createCategoryPill(category, activeFilter === category));
    }
  });

  Array.from(categories.keys())
    .filter(category => !PRESET_CATEGORY_ORDER.includes(category))
    .forEach(category => {
      bar.appendChild(createCategoryPill(category, activeFilter === category));
    });

  if (repEvents.length > 0) {
    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:28px;background:#ddd;margin:0 4px;align-self:center;';
    bar.appendChild(sep);

    const pill = createCategoryPill(REP_CATEGORY, activeFilter === REP_CATEGORY);
    bar.appendChild(pill);
  }
}

// 創建分類按鈕
function createCategoryPill(category, isActive) {
  const colors = categories.get(category) || REP_COLOR;
  const pill = document.createElement('div');
  pill.className = 'filter-pill' + (isActive ? ' active' : '');
  pill.dataset.category = category;
  pill.onclick = () => filterCategory(category, pill);
  pill.innerHTML = `<span class="color-dot" style="background:${colors.border}"></span>${category}`;

  if (isActive) {
    setActivePillStyle(pill, colors);
  }
  return pill;
}

// 設定按鈕的樣式
function setActivePillStyle(pill, colorConfig) {
  pill.style.background = colorConfig.bg;
  pill.style.color = colorConfig.color;
  pill.style.borderColor = colorConfig.border;
}

// ============================================================
// 篩選活動分類
function filterCategory(cat, el) {
  activeFilter = cat;
  document.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.remove('active');
    if (!p.classList.contains('filter-pill-all')) {
      p.style.background = '#f0f0f0';
      p.style.color = '#555';
      p.style.borderColor = 'transparent';
    }
  });

  el.classList.add('active');
  if (!el.classList.contains('filter-pill-all')) {
    const c = categories.get(cat) || REP_COLOR;
    setActivePillStyle(el, c);
  }
  renderTimeline();
}

// ============================================================
// 渲染時間軸
function renderTimeline() {
  // 與原始程式碼一致，省略...
}

// ============================================================
// 切換視圖（時間軸或月曆）
function switchView(view, btn) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('timelineSection').style.display = view === 'timeline' ? 'block' : 'none';
  document.getElementById('calendarSection').style.display = view === 'calendar' ? 'block' : 'none';
}

// ============================================================
// 切換年份
function changeYear(d) {
  currentYear += d;
  document.getElementById('yearLabel').textContent = currentYear + '年';
  categories.clear();
  activeFilter = 'all';

  const bar = document.getElementById('filterBar');
  bar.querySelectorAll('.filter-pill:not(.filter-pill-all)').forEach(p => p.remove());
  bar.querySelectorAll('div[style*="width:1px"]').forEach(s => s.remove());
  bar.querySelector('.filter-pill-all').classList.add('active');

  fetchEvents();
}

// ============================================================
// 初始化
document.getElementById('yearLabel').textContent = currentYear + '年';
fetchEvents();
