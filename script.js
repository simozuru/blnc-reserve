// ⚙️ システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyZgYK3G6OtiBedUUWSUfX-fre3XCrWkfilymufDlv9bINohyw_jkYI2J_IqoGQjCgr/exec",
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

// ==========================================
// 💡【キャッシュ最優先復元】ページを開いた時に即座に復元
// ==========================================
function restoreCachedCustomerData() {
  CONFIG.STORAGE_FIELDS.forEach(field => {
    const saved = localStorage.getItem(`sis_${field}`);
    if (saved) {
      const el = document.getElementById(field);
      if (el) el.value = saved;
      
      // 確認用タブ側の入力欄にも自動セット
      if (field === 'tel') {
        const checkTel = document.getElementById('check-tel');
        if (checkTel) checkTel.value = saved;
      }
      if (field === 'email') {
        const checkEmail = document.getElementById('check-email');
        if (checkEmail) checkEmail.value = saved;
      }
    }
  });
}
// 即時実行
restoreCachedCustomerData();


// --- カレンダーの過去・未来予約制限（JST対応・安全装置付き） ---
try {
  const nowJST = new Date(Date.now() + (9 * 60 * 60 * 1000)); 
  const todayStr = nowJST.toISOString().split('T')[0];
  dateInput.min = todayStr;

  const bridgeEl = document.getElementById('gas-config-bridge');
  let maxFutureDays = 30;
  
  if (bridgeEl) {
    const rawDays = bridgeEl.getAttribute('data-max-future-days');
    if (rawDays && !isNaN(rawDays)) {
      maxFutureDays = parseInt(rawDays, 10);
    }
  }

  const maxDateObj = new Date(nowJST.getTime() + (maxFutureDays * 24 * 60 * 60 * 1000));
  const maxDateStr = maxDateObj.toISOString().split('T')[0];
  dateInput.max = maxDateStr;
} catch (configError) {
  console.error("カレンダー限界値の設定中にエラーが発生しました:", configError);
}


// 入力変更時の空き時間取得イベントを設定
[dateInput, staffSelect, menuSelect].forEach(element => {
  element.addEventListener('change', updateAvailableTimes);
});

// 空き時間枠のAPI取得と選択肢更新
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

// 予約登録・変更の送信処理
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const confirmMsg = changeModeData 
    ? '選択した新しい日時で予約を変更してもよろしいですか？' 
    : 'この内容で予約を確定してもよろしいですか？';
    
  if (!confirm(confirmMsg)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = changeModeData ? '予約を変更中...' : '予約を登録中...';

  // 💡送信直前に入力データを確実にローカルストレージへ保存
  CONFIG.STORAGE_FIELDS.forEach(field => {
    localStorage.setItem(`sis_${field}`, document.getElementById(field).value);
  });

  const submittedTel = document.getElementById('tel').value;
  const submittedEmail = document.getElementById('email').value;

  const formData = new URLSearchParams();
  
  if (changeModeData) {
    formData.append('action', 'change');
    formData.append('resId', changeModeData.resId);
    formData.append('newDate', dateInput.value);
    formData.append('newTime', timeSelect.value);
  } else {
    formData.append('date', dateInput.value);
    formData.append('time', timeSelect.value);
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
      
      // 💡確認用タブの入力欄を更新
      document.getElementById('check-tel').value = submittedTel;
      document.getElementById('check-email').value = submittedEmail;

      // 💡【キャッシュ保護の核心】form.reset() を使わず、入力選択系のみを安全にリセット
      dateInput.value = '';
      staffSelect.selectedIndex = 0; // 「指名なし」へ戻す
      menuSelect.selectedIndex = 0;  // 「選択してください」へ戻す
      timeSelect.innerHTML = '<option value="">日付を選択してください</option>';
      timeSelect.disabled = true;
      document.getElementById('memo').value = '';

      // お客様の個人情報キャッシュを念のため再ロードして表示を固める
      restoreCachedCustomerData();

      // 変更処理が正常完了した場合、確認タブへ切り替えて一覧をリロード
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
    submitBtn.textContent = '上記の内容で予約を確定する';
    updateAvailableTimes();
  }
});

// 予約状況の取得とカード描画
async function fetchReservations() {
  const telInput = document.getElementById('check-tel').value.trim();
  const emailInput = document.getElementById('check-email').value.trim();
  const resultsArea = document.getElementById('check-results-area');
  const checkBtn = document.getElementById('check-btn');

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
      resultsArea.innerHTML = `<div class="no-data" style="color: red;">${result.message}</div>`;
      return;
    }

    if (result.reservations.length === 0) {
      resultsArea.innerHTML = '<div class="no-data">現在、条件に一致する今日以降のご予約はありません。</div>';
      return;
    }

    let htmlContent = '<h3 style="font-size:14px; margin-bottom:15px; color:var(--primary-color);">お客様のご予約状況</h3>';
    
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
          <div class="res-row" style="margin-top: 10px; border-top: 1px dashed #e0e0e0; padding-top: 8px;">
            <span class="res-label">予約ID</span> 
            <span class="res-id-badge">${safeId}</span>
          </div>
          <div class="res-created" style="border-top: none; padding-top: 0; margin-top: 5px;">⏱ 受付時間：${res.createdAt}</div>
          <div class="btn-action-group">
            <button type="button" class="btn-change" 
                    data-id="${safeId}" 
                    data-date="${res.date}" 
                    data-time="${res.time}" 
                    data-staff="${safeStaff}" 
                    data-menu="${safeMenu}" 
                    data-memo="${safeMemo}" 
                    onclick="startChangeMode(this)">日時を変更する</button>
            <button type="button" class="btn-cancel" data-id="${safeId}" onclick="requestCancel(this)">この予約をキャンセルする</button>
          </div>
        </div>
      `;
    });

    resultsArea.innerHTML = htmlContent;

  } catch (error) {
    console.error('予約検索エラー:', error);
    resultsArea.innerHTML = '<div class="no-data" style="color: red;">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'ご予約状況を確認する';
  }
}

// 変更モードの開始設定
function startChangeMode(buttonEl) {
  changeModeData = {
    resId: buttonEl.getAttribute('data-id'),
    oldDate: buttonEl.getAttribute('data-date'),
    oldTime: buttonEl.getAttribute('data-time'),
    oldStaff: buttonEl.getAttribute('data-staff'),
    oldMenu: buttonEl.getAttribute('data-menu')
  };

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
  submitBtn.textContent = '上記の内容で変更を確定する';

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

  submitBtn.textContent = '上記の内容で予約を確定する';
  
  // フォーム全体の初期化
  dateInput.value = '';
  staffSelect.selectedIndex = 0;
  menuSelect.selectedIndex = 0;
  timeSelect.innerHTML = '<option value="">日付を選択してください</option>';
  timeSelect.disabled = true;
  document.getElementById('memo').value = '';
  
  // キャッシュから個人情報を再セット
  restoreCachedCustomerData();
}

// キャンセルリクエスト送信
async function requestCancel(buttonEl) {
  const resId = buttonEl.getAttribute('data-id');
  if (!resId) return;

  if (!confirm(`ご予約（ID: ${resId}）をキャンセルしてもよろしいですか？\n\n※この操作は取り消せません。`)) return;

  const resultsArea = document.getElementById('check-results-area');
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