/**
 * =================================================================
 * Salon Information System (SIS) - js/api.js [Version 4.0.0]
 * [役割: 外部API通信・fetch通信専門（二重定義排除・設定初期化特化版）]
 * =================================================================
 */

// システム設定の初期ロードとUI動的変更ロジック
async function initializeSystemSettings() {
  try {
    // 1. カレンダーの過去制限（当日は常に最低限セット）
    const nowJST = new Date(Date.now() + (9 * 60 * 60 * 1000)); 
    const todayStr = nowJST.toISOString().split('T')[0];
    dateInput.min = todayStr;

    // 2. Code.gsのgetSystemSettings窓口から最新の設定値を取得
    const response = await fetch(`${CONFIG.GAS_WEB_APP_URL}?method=getSystemSettings`);
    if (!response.ok) throw new Error('設定データの取得に失敗しました');
    const settings = await response.json();

    if (!settings.success) {
      console.error("サーバー側での設定取得エラー:", settings.message);
      return;
    }

    // 3. 未来予約制限日数を動的適用
    const maxFutureDays = settings.maxFutureDays || 30;
    const maxDateObj = new Date(nowJST.getTime() + (maxFutureDays * 24 * 60 * 60 * 1000));
    const maxDateStr = maxDateObj.toISOString().split('T')[0];
    dateInput.max = maxDateStr;

    // 4. スタッフプルダウンおよび表示グループの動的組み立て
    const staffGroup = document.getElementById('staff-group');
    staffSelect.innerHTML = ''; // 既存の選択肢をクリア

    if (settings.showStaffSelector === false) {
      if (staffGroup) staffGroup.style.display = 'none';
      if (settings.staffList && settings.staffList.length > 0) {
        staffSelect.innerHTML = `<option value="${settings.staffList[0]}">${settings.staffList[0]}</option>`;
        staffSelect.value = settings.staffList[0];
      }
    } else {
      if (staffGroup) staffGroup.style.display = 'block';

      if (settings.allowNoAssign === true) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '指名なし';
        defaultOpt.textContent = '指名なし (店舗全体の空き状況)';
        staffSelect.appendChild(defaultOpt);
      } else {
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = '担当スタッフを選択してください';
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        staffSelect.appendChild(placeholderOpt);
      }

      if (settings.staffList && settings.staffList.length > 0) {
        settings.staffList.forEach(staffName => {
          const opt = document.createElement('option');
          opt.value = staffName;
          opt.textContent = staffName;
          staffSelect.appendChild(opt);
        });
      }
    }

    // 5. メニュープルダウンの動的組み立て
    menuSelect.innerHTML = ''; 
    const menuPlaceholder = document.createElement('option');
    menuPlaceholder.value = '';
    menuPlaceholder.textContent = 'メニューを選択してください';
    menuPlaceholder.disabled = true;
    menuPlaceholder.selected = true;
    menuSelect.appendChild(menuPlaceholder);

    if (settings.menuList && settings.menuList.length > 0) {
      settings.menuList.forEach(menuName => {
        const opt = document.createElement('option');
        opt.value = menuName;
        opt.textContent = menuName;
        menuSelect.appendChild(opt);
      });
    }

    if (changeModeData && changeModeData.oldMenu) {
      menuSelect.value = changeModeData.oldMenu;
    }

  } catch (error) {
    console.error("システム設定の初期化中にエラーが発生しました:", error);
  }
}