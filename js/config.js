/**
 * =================================================================
 * Salon Information System (SIS) - js/config.js [Version 3.9.9]
 * [システム共通設定・グローバルステート管理]
 * =================================================================
 */

// システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzNzQV7CR1ya5JOWCoXMo7rq_zxT1gozd6W3Ddrg4SkVrvyY36hjh05By7yhl-6lZPt/exec",
  STORAGE_FIELDS: ['name', 'name_kana', 'tel', 'email']
};

// 予約変更モード用のグローバル状態
let changeModeData = null;