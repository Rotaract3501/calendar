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

// 檢查網路狀態
function checkOnlineStatus() {
  const offlineBanner = document.getElementById('offlineBanner');
  if (!navigator.onLine) {
    offlineBanner.style.display = 'block';
  } else {
    offlineBanner.style.display = 'none';
  }
}

// 初始化頁面
window.addEventListener('offline', checkOnlineStatus);
window.addEventListener('online', checkOnlineStatus);
checkOnlineStatus();

// 其他行事曆邏輯（保留原本的 fetchEvents、renderTimeline 等函數）...
