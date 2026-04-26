import React, { useEffect, useState } from 'react';

const i18nMap: Record<string, Record<string, string>> = {
  en: {
    usageLimitLabel: "Usage Limit (Minutes before cat appears)",
    breakTimeLabel: "Break Time (Minutes)",
    saveButton: "Save",
    savedMessage: "Saved!",
    dismissButton: "Dismiss Cat (Break finished)",
    version: "Version:"
  },
  ja: {
    usageLimitLabel: "使用制限 (猫が出るまでの分数)",
    breakTimeLabel: "休憩時間 (分数)",
    saveButton: "保存",
    savedMessage: "保存しました！",
    dismissButton: "猫を消す (休憩終了)",
    version: "バージョン:"
  },
  zh: {
    usageLimitLabel: "使用限制 (猫咪出现前的分钟数)",
    breakTimeLabel: "休息时间 (分钟)",
    saveButton: "保存",
    savedMessage: "已保存！",
    dismissButton: "解除猫咪 (休息结束)",
    version: "版本:"
  }
};

export default function Settings() {
  const [usageLimit, setUsageLimit] = useState(60);
  const [breakTime, setBreakTime] = useState(5);
  const [language, setLanguage] = useState<'en'|'ja'|'zh'>('en');
  const [version, setVersion] = useState('');
  const [catIsActive, setCatIsActive] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-version').then((v: unknown) => setVersion(v as string));
    window.electron.ipcRenderer.invoke('get-settings').then((settings: any) => {
      if (settings.usageLimit) setUsageLimit(settings.usageLimit);
      if (settings.breakTime) setBreakTime(settings.breakTime);
      if (settings.language) setLanguage(settings.language as any);
      if (settings.version) setVersion(settings.version);
    });

    const cleanup = window.electron.ipcRenderer.on('cat-status-changed', (isActive: unknown) => {
      setCatIsActive(Boolean(isActive));
    });
    return cleanup;
  }, []);

  const t = i18nMap[language] || i18nMap['en'];

  const handleSave = () => {
    const settings = { usageLimit, breakTime, language, version };
    window.electron.ipcRenderer.sendMessage('save-settings', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDismiss = () => {
    window.electron.ipcRenderer.sendMessage('dismiss-cat');
  };

  return (
    <div className="settings-container">
      <h1>🐱 Cat Gatekeeper</h1>
      
      <div className="section">
        <label className="block-label">Language / 言語 / 语言</label>
        <select className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value as any)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div className="section">
        <label className="block-label">{t.usageLimitLabel}</label>
        <input 
          type="number" 
          value={usageLimit} 
          min={1} 
          max={480} 
          onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)} 
        />
      </div>

      <div className="section">
        <label className="block-label">{t.breakTimeLabel}</label>
        <input 
          type="number" 
          value={breakTime} 
          min={1} 
          max={60} 
          onChange={(e) => setBreakTime(parseInt(e.target.value) || 1)} 
        />
      </div>

      {catIsActive && (
        <button className="secondary" onClick={handleDismiss}>
          {t.dismissButton}
        </button>
      )}

      <button className="primary" onClick={handleSave}>
        {t.saveButton}
      </button>

      {saved && <div className="saved">{t.savedMessage}</div>}

      <div className="section" style={{ marginTop: '20px' }}>
        <label className="block-label">{t.version}</label>
        <input 
          disabled
          type="text" 
          value={version} 
          onChange={(e) => setVersion(e.target.value)}
          className="lang-select"
          style={{ textAlign: 'center' }}
        />
      </div>
    </div>
  );
}
