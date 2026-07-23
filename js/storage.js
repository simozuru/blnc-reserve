/**
 * =================================================================
 * Salon Information System (SIS) - js/storage.js [Version 3.9.9]
 * [ローカルストレージ・キャッシュ操作専門]
 * =================================================================
 */

// 【キャッシュ最優先復元】ページを開いた時に即座に復元
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

// 読み込み時に即時実行してUIへ反映
restoreCachedCustomerData();