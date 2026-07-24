/**
 * =================================================================
 * Salon Information System (SIS) - js/ui.js [Version 4.0.0]
 * [DOM操作・UI制御・タイムテーブル動的生成・イベントハンドリング]
 * =================================================================
 */

// 予約フォームDOM要素
const form = document.getElementById('reservation-form');
const dateInput = document.getElementById('date');
const staffSelect = document.getElementById('staff');
const menuSelect = document.getElementById('menu');
const submitBtn = document.getElementById('submit-btn');
const checkBtn = document.getElementById('check-btn');
const cancelChangeBtn = document.getElementById('cancel-change-btn');
const resultsArea = document.getElementById('check-results-area');

// 💡【ver.4.0.0】セレクトボックスの代わりに新設されたコンテナと隠しフィールドを取得
const timetableContainer = document.getElementById('timetable-container');
const timetableLoading = document.getElementById('timetable-loading');
const selectedDateInput = document.getElementById('selected-date');
const selectedTimeInput = document.getElementById('selected-time');

// タブ切り替え制御
function switchTab(buttonEl, tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  if (buttonEl) {
    buttonEl.classList.add('active');
  }
  document.getElementById(tabId).classList.add('active');
}

/**
 * 💡【ver.4.0.0 新設】サーバーから取得した複数日データをもとにテーブルを画面に描画する
 */
function renderTimetable(multiDayStatuses) {
  if (!multiDayStatuses || Object.keys(multiDayStatuses).length === 0) {
    timetableContainer.innerHTML = '<div class="no-data text-danger">空き状況の取得に失敗しました。</div>';
    return;
  }

  const dateKeys = Object.keys(multiDayStatuses).sort();
  
  // 縦軸（時間枠）の一覧を定義（Configから取得するか、最初の営業日から抽出）
  let timeSlots = [];
  for (const dKey of dateKeys) {
    if (!multiDayStatuses[dKey].SHOP_HOLIDAY) {
      timeSlots = Object.keys(multiDayStatuses[dKey]).sort();
      break;
    }
  }
  
  // すべての日が休みだった場合のフォールバック
  if (timeSlots.length === 0) {
    timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  }

  let html = '<table class="timetable-table"><thead><tr><th>時間</th>';
  
  // ヘッダー（日付行）の作成
  dateKeys.forEach(dStr => {
    const d = new Date(dStr.replace(/-/g, '/'));
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const label = `${d.getMonth() + 1}/${d.getDate()}(${dayLabels[d.getDay()]})`;
    html += `<th>${label}</th>`;
  });
  html += '</tr></thead><tbody>';

  // 各時間ごとの行を組み立て
  timeSlots.forEach(timeStr => {
    html += `<tr><td class="time-col">${timeStr}</td>`;
    
    dateKeys.forEach(dStr => {
      const dayData = multiDayStatuses[dStr];
      
      // 🔍 店舗休みの文字列が埋め込まれている場合（時間軸の最初だけ結合表示し、他はスキップさせる処理の簡略版）
      if (dayData && dayData.SHOP_HOLIDAY) {
        // テーブルの表現上、お休みの日は特別な表示スタイルにする
        if (timeSlots.indexOf(timeStr) === 0) {
          html += `<td rowspan="${timeSlots.length}" class="shop-holiday-cell"><strong>${dayData.HOLIDAY_TEXT || '休業日'}</strong></td>`;
        }
        return;
      }
      
      const status = dayData ? dayData[timeStr] : '×';
      if (status === '○') {
        html += `<td class="slot-cell slot-available" data-date="${dStr}" data-time="${timeStr}">○</td>`;
      } else {
        html += `<td class="slot-cell slot-unavailable">×</td>`;
      }
    });
    
    html += '</tr>';
  });

  html += '</tbody></table>';
  timetableContainer.innerHTML = html;

  // セルがクリックされた時の選択イベントを設定
  document.querySelectorAll('.slot-available').forEach(cell => {
    cell.addEventListener('click', (e) => {
      document.querySelectorAll('.slot-available').forEach(c => c.classList.remove('selected'));
      const target = e.currentTarget;
      target.classList.add('selected');
      
      selectedDateInput.value = target.getAttribute('data-date');
      selectedTimeInput.value = target.getAttribute('data-time');
      
      submitBtn.disabled = false;
      submitBtn.textContent = changeModeData ? '上記の内容で変更を確定する' : '上記の内容で予約を確定する';
    });
  });
}

/**
 * 💡【ver.4.0.0 修正】非同期での空枠状況リフレッシュ
 */
async function updateAvailableTimes() {
  const dateVal = dateInput.value;
  const staffVal = staffSelect.value;
  const menuVal = menuSelect.value;

  if (!dateVal || !staffVal || !menuVal) {
    timetableContainer.innerHTML = '<div class="no-data">日付、スタッフ、メニューを選択すると、ここに空き状況が表示されます。</div>';
    submitBtn.disabled = true;
    submitBtn.textContent = '日時を選択してください';
    return;
  }

  if (timetableLoading) timetableLoading.style.display = 'block';
  
  try {
    const resIdParam = (changeModeData && changeModeData.resId) ? `&resId=${changeModeData.resId}` : '';
    const url = `${CONFIG.GAS_WEB_APP_URL}?method=getSlotStatuses&date=${dateVal}&staff=${encodeURIComponent(staffVal)}&menu=${encodeURIComponent(menuVal)}${resIdParam}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('空き枠データの通信に失敗しました');
    const multiDayStatuses = await response.json();
    
    // テーブルを描画
    renderTimetable(multiDayStatuses);
    
    // 日時を再選択させるため、隠しフィールドをリセット
    selectedDateInput.value = '';
    selectedTimeInput.value = '';
    submitBtn.disabled = true;
    submitBtn.textContent = '日時を選択してください';

  } catch (error) {
    console.error('空き状況更新エラー:', error);
    timetableContainer.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    if (timetableLoading) timetableLoading.style.display = 'none';
  }
}

// 予約状況の取得とカード描画
async function fetchReservations() {
  const telInput = document.getElementById('check-tel').value.trim();
  const emailInput = document.getElementById('check-email').value.trim();

  if (!telInput || !emailInput) {
    alert('携帯電話番号とメールアドレスの両方を入力してください。');
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = '検索中...';
  resultsArea.innerHTML = '<div class="no-data">予約データを検索しています。少々お待ちください...</div>';

  localStorage.setItem('sis_tel', telInput);
  localStorage.setItem('sis_email', emailInput);

  try {
    const response = await fetch(`${CONFIG.GAS_WEB_APP_URL}?method=getCustomerReservations&tel=${encodeURIComponent(telInput)}&email=${encodeURIComponent(emailInput)}`);
    if (!response.ok) throw new Error('通信エラーが発生しました');
    
    const result = await response.json();

    if (!result.success) {
      resultsArea.innerHTML = `<div class="no-data text-danger">${result.message}</div>`;
      return;
    }

    if (result.reservations.length === 0) {
      resultsArea.innerHTML = '<div class="no-data">現在、条件に一致する今日以降のご予約はありません。</div>';
      return;
    }

    let htmlContent = '<h3 class="results-title">お客様のご予約状況</h3>';
    
    result.reservations.forEach((res) => {
      const dateParts = res.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日` : res.date;

      const timeParts = res.time.split(':');
      const formattedTime = timeParts.length >= 2 ? `${timeParts[0]}時${timeParts[1]}分` : res.time;

      const safeMenu = (res.menu || '').replace(/"/g, '&quot;');
      const safeStaff = (res.staff || '').replace(/"/g, '&quot;');
      const safeMemo = (res.memo || '').replace(/"/g, '&quot;');
      const safeId = (res.id || '').replace(/"/g, '&quot;');

      htmlContent += `
        <div class="reservation-card">
          <div class="res-row"><span class="res-label">予約日</span> ${formattedDate}</div>
          <div class="res-row"><span class="res-label">予約時間</span> ${formattedTime}</div>
          <div class="res-row"><span class="res-label">メニュー</span> ${res.menu}</div>
          <div class="res-row"><span class="res-label">担当</span> ${res.staff}</div>
          ${res.memo ? `<div class="res-row"><span class="res-label">備考・メモ</span> ${res.memo}</div>` : ''}
          <div class="res-card-divider">
            <span class="res-label">予約ID</span> 
            <span class="res-id-badge">${safeId}</span>
          </div>
          <div class="res-created-time">⏱ 受付時間：${res.createdAt}</div>
          <div class="btn-action-group">
            <button type="button" class="btn-change" 
                    data-id="${safeId}" 
                    data-date="${res.date}" 
                    data-time="${res.time}" 
                    data-staff="${safeStaff}" 
                    data-menu="${safeMenu}" 
                    data-memo="${safeMemo}">日時を変更する</button>
            <button type="button" class="btn-cancel" data-id="${safeId}">この予約をキャンセルする</button>
          </div>
        </div>
      `;
    });

    resultsArea.innerHTML = htmlContent;

  } catch (error) {
    console.error('予約検索エラー:', error);
    resultsArea.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'ご予約状況を確認する';
  }
}

// 変更モードの開始設定
async function startChangeMode(buttonEl) {
  changeModeData = {
    resId: buttonEl.getAttribute('data-id'),
    oldDate: buttonEl.getAttribute('data-date'),
    oldTime: buttonEl.getAttribute('data-time'),
    oldStaff: buttonEl.getAttribute('data-staff'),
    oldMenu: buttonEl.getAttribute('data-menu')
  };

  await initializeSystemSettings();

  staffSelect.value = changeModeData.oldStaff;
  menuSelect.value = changeModeData.oldMenu;
  document.getElementById('memo').value = buttonEl.getAttribute('data-memo');
  dateInput.value = changeModeData.oldDate;

  const prevDateParts = changeModeData.oldDate.split('-');
  const formattedOldDate = prevDateParts.length === 3 ? `${prevDateParts[0]}年${prevDateParts[1]}月${prevDateParts[2]}日` : changeModeData.oldDate;
  
  document.getElementById('prev-id').textContent = changeModeData.resId;
  document.getElementById('prev-datetime').textContent = `${formattedOldDate}  ${changeModeData.oldTime}`;
  document.getElementById('prev-menu').textContent = changeModeData.oldMenu;
  document.getElementById('prev-staff').textContent = changeModeData.oldStaff;

  document.getElementById('change-banner').style.display = 'block';
  submitBtn.textContent = '日時を選択してください';

  const reserveTabBtn = document.getElementById('tab-btn-reserve');
  switchTab(reserveTabBtn, 'reserve-tab');

  updateAvailableTimes();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 変更モードの中止
function abortChangeMode() {
  changeModeData = null;
  document.getElementById('change-banner').style.display = 'none';
  
  document.getElementById('prev-id').textContent = '';
  document.getElementById('prev-datetime').textContent = '';
  document.getElementById('prev-menu').textContent = '';
  document.getElementById('prev-staff').textContent = '';

  submitBtn.textContent = '日時を選択してください';
  
  dateInput.value = '';
  if (staffSelect.options.length > 0) staffSelect.selectedIndex = 0;
  if (menuSelect.options.length > 0) menuSelect.selectedIndex = 0;
  
  selectedDateInput.value = '';
  selectedTimeInput.value = '';
  timetableContainer.innerHTML = '<div class="no-data">日付、スタッフ、メニューを選択すると、ここに空き状況が表示されます。</div>';
  submitBtn.disabled = true;
  document.getElementById('memo').value = '';
  
  restoreCachedCustomerData();
  initializeSystemSettings();
}

// キャンセルリクエスト送信
async function requestCancel(buttonEl) {
  const resId = buttonEl.getAttribute('data-id');
  if (!resId) return;

  if (!confirm(`ご予約（ID: ${resId}）をキャンセルしてもよろしいですか？\n\n※この操作は取り消せません。`)) return;

  resultsArea.innerHTML = '<div class="no-data">予約のキャンセル処理を行っています。少々お待ちください...</div>';

  const formData = new URLSearchParams();
  formData.append('action', 'cancel');
  formData.append('resId', resId);

  try {
    const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await response.json();

    if (data.success) {
      alert('ご予約のキャンセルが正常に完了しました。');
    } else {
      alert('キャンセルに失敗しました: ' + data.message);
    }
    fetchReservations();
  } catch (error) {
    console.error('キャンセル通信エラー:', error);
    alert('通信エラーが発生しました。時間を置いて再度お試しください。');
    fetchReservations();
  }
}

// 予約登録・変更の送信処理
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const confirmMsg = changeModeData 
    ? '選択した新しい日時で予約を変更してもよろしいですか？' 
    : 'この内容で予約を確定してもよろしいですか？';
    
  if (!confirm(confirmMsg)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = changeModeData ? '予約を変更中...' : '予約を登録中...';

  CONFIG.STORAGE_FIELDS.forEach(field => {
    const el = document.getElementById(field);
    if (el) localStorage.setItem(`sis_${field}`, el.value);
  });

  const submittedTel = document.getElementById('tel').value;
  const submittedEmail = document.getElementById('email').value;

  const formData = new URLSearchParams();
  
  // 💡【ver.4.0.0】送信データを隠しフィールドの値（selectedDate / selectedTime）から抽出
  if (changeModeData) {
    formData.append('action', 'change');
    formData.append('resId', changeModeData.resId);
    formData.append('newDate', selectedDateInput.value);
    formData.append('newTime', selectedTimeInput.value);
  } else {
    formData.append('date', selectedDateInput.value);
    formData.append('time', selectedTimeInput.value);
  }
  
  formData.append('staff', staffSelect.value);
  formData.append('menu', menuSelect.value);
  formData.append('name', document.getElementById('name').value);
  formData.append('name_kana', document.getElementById('name_kana').value);
  formData.append('tel', submittedTel);
  formData.append('email', submittedEmail);
  formData.append('memo', document.getElementById('memo').value);

  try {
    const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await response.json();
    
    if (data.success) {
      const isChangeMode = !!changeModeData;

      if (isChangeMode) {
        alert('ご予約の変更が正常に完了しました！');
        abortChangeMode();
      } else {
        const msg = data.resId ? `ご予約が完了しました！\n【ご予約ID: ${data.resId}】` : 'ご予約が完了しました！';
        alert(msg);
      }
      
      document.getElementById('check-tel').value = submittedTel;
      document.getElementById('check-email').value = submittedEmail;

      dateInput.value = '';
      if (staffSelect.options.length > 0) staffSelect.selectedIndex = 0; 
      if (menuSelect.options.length > 0) menuSelect.selectedIndex = 0; 
      
      selectedDateInput.value = '';
      selectedTimeInput.value = '';
      timetableContainer.innerHTML = '<div class="no-data">日付、スタッフ、メニューを選択すると、ここに空き状況が表示されます。</div>';
      submitBtn.disabled = true;
      document.getElementById('memo').value = '';

      restoreCachedCustomerData();
      await initializeSystemSettings();

      if (isChangeMode) {
        const checkTabBtn = document.getElementById('tab-btn-check');
        switchTab(checkTabBtn, 'check-tab');
        await fetchReservations();
      }
      
    } else {
      alert('処理に失敗しました: ' + data.message);
    }
  } catch (error) {
    console.error('送信エラー:', error);
    alert('通信エラーが発生しました。カレンダー等をご確認ください。');
  } finally {
    submitBtn.disabled = false;
    updateAvailableTimes();
  }
});

// イベントリスナーの一元管理
function initializeEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = e.currentTarget.getAttribute('data-tab');
      switchTab(e.currentTarget, tabId);
    });
  });

  if (checkBtn) {
    checkBtn.addEventListener('click', fetchReservations);
  }

  if (cancelChangeBtn) {
    cancelChangeBtn.addEventListener('click', abortChangeMode);
  }

  [dateInput, staffSelect, menuSelect].forEach(element => {
    if (element) {
      element.addEventListener('change', updateAvailableTimes);
    }
  });

  if (resultsArea) {
    resultsArea.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-change')) {
        startChangeMode(target);
      } else if (target.classList.contains('btn-cancel')) {
        requestCancel(target);
      }
    });
  }
}

// ページ読み込み時の初期化処理
window.addEventListener('DOMContentLoaded', () => {
  initializeSystemSettings();
  initializeEvents();
});