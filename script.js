// ⚙️ システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbxnqGEOer4igLHmvlzzQcWNfp1I-6FnfaTcOjYBPciwIWsxR1yzUwHxFhD9F5E60gm1/exec",
  STORAGE_FIELDS: ['name', 'name_kana', 'tel', 'email']
};

let changeModeData = null;

// タブ切り替え制御
function switchTab(buttonEl, tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  if (buttonEl) {
    buttonEl.classList.add('active');
  }
  document.getElementById(tabId).classList.add('active');
}

// 予約フォーム要素
const form = document.getElementById('reservation-form');
const dateInput = document.getElementById('date');
const staffSelect = document.getElementById('staff');
const menuSelect = document.getElementById('menu');
const timeSelect = document.getElementById('time');
const submitBtn = document.getElementById('submit-btn');

// 今日の日付をカレンダーの最小値に設定
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

// ローカルストレージから前回入力値を復元
CONFIG.STORAGE_FIELDS.forEach(field => {
  const saved = localStorage.getItem(`sis_${field}`);
  if (saved) {
    document.getElementById(field).value = saved;
    if (field === 'tel') document.getElementById('check-tel').value = saved;
    if (field === 'email') document.getElementById('check-email').value = saved;
  }
});

// 入力変更時の空き時間取得イベントを設定
[dateInput, staffSelect, menuSelect].forEach(element => {
  element.addEventListener('change', updateAvailableTimes);
});

// 空き時間枠のAPI取得と選択肢更新 (★修正・最適化版)
async function updateAvailableTimes() {
  const dateVal = dateInput.value;
  const staffVal = staffSelect.value;
  const menuVal = menuSelect.value;

  if (!dateVal || !staffVal || !menuVal) {
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">日時とメニューを選択してください</option>';
    submitBtn.disabled = true;
    return;
  }

  timeSelect.disabled = true;
  timeSelect.innerHTML = '<option value="">空き状況を確認中...</option>';
  submitBtn.disabled = true;

  try {
    let fetchUrl = `${CONFIG.GAS_WEB_APP_URL}?method=getSlotStatuses&date=${dateVal}&staff=${encodeURIComponent(staffVal)}&menu=${encodeURIComponent(menuVal)}`;
    
    if (changeModeData && changeModeData.resId) {
      fetchUrl += `&resId=${encodeURIComponent(changeModeData.resId)}`;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error('データ取得に失敗しました');
    const slotStatuses = await response.json();

    timeSelect.innerHTML = '<option value="">時間を選択してください</option>';

    if (slotStatuses.SHOP_HOLIDAY) {
      timeSelect.innerHTML = '<option value="">本日は定休日・または休業日です</option>';
      return;
    }

    const timeKeys = Object.keys(slotStatuses).sort();
    let selectableCount = 0;

    timeKeys.forEach(timeStr => {
      const status = slotStatuses[timeStr];
      const option = document.createElement('option');
      option.value = timeStr;

      // 💡 複雑なフロント側での過去時間判定(isPast)は完全撤去。
      // 全てGAS(Availability.gs)が「○」「×」の判定を済ませてくれているため、それをそのまま信用します。
      if (status === "○") {
        option.textContent = `${timeStr}  〇`;
        selectableCount++;
      } else {
        option.textContent = `${timeStr}  ×`;
        option.disabled = true;
      }
      timeSelect.appendChild(option);
    });

    if (selectableCount > 0) {
      timeSelect.disabled = false;
      submitBtn.disabled = false;
    } else {
      timeSelect.innerHTML = '<option value="">申し訳ありません。本日はいっぱいです</option>';
    }

  } catch (error) {
    console.error('通信エラー:', error);
    timeSelect.innerHTML = '<option value="">エラーが発生しました。再試行してください</option>';
  }
}