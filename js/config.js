/**
 * =================================================================
 * Salon Information System (SIS) - js/config.js [Version 3.9.9]
 * [システム共通設定・グローバルステート管理]
 * =================================================================
 */

// システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyV-hEmTj3F0uN3PfbCOafhOKtFRvFoH6MFAbkv7bwZ7nNH-7maKbaj8xYKn0IujJs_/exec",
  STORAGE_FIELDS: ['name', 'name_kana', 'tel', 'email']
};

// 予約変更モード用のグローバル状態
let changeModeData = null;