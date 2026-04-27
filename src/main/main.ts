/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, screen, Tray, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let displayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function getDefaultSettings() {
  let lang = 'en';
  if (app.isReady()) {
    const locale = app.getLocale();
    if (locale.startsWith('zh')) lang = 'zh';
    else if (locale.startsWith('ja')) lang = 'ja';
  }
  return {
    usageLimit: 60,
    breakTime: 5,
    language: lang,
    version: '0.0.1'
  };
}

function getSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return { ...getDefaultSettings(), ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to read settings', e);
  }
  return getDefaultSettings();
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    startTimer();
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

let catTimer: ReturnType<typeof setInterval> | null = null;
let isCatActive = false;

function startTimer() {
  if (catTimer) clearInterval(catTimer);
  isCatActive = false;
  if (mainWindow) {
    mainWindow.webContents.send('cat-status-changed', false);
  }

  const settings = getSettings();
  const usageLimitMs = settings.usageLimit * 60 * 1000;
  
  catTimer = setTimeout(() => {
    showDisplayWindow();
  }, usageLimitMs);
}

function showDisplayWindow() {
  isCatActive = true;
  if (mainWindow) {
    mainWindow.webContents.send('cat-status-changed', true);
  }

  if (displayWindow) {
    displayWindow.show();
    return;
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const { bounds } = screen.getPrimaryDisplay();
  
  displayWindow = new BrowserWindow({
    show: false,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  const displayUrl = new URL(resolveHtmlPath('index.html'));
  displayUrl.hash = '#/display';
  displayWindow.loadURL(displayUrl.href);

  displayWindow.on('ready-to-show', () => {
    if (!displayWindow) return;
    displayWindow.show();
    displayWindow.focus();
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

function dismissCat() {
  isCatActive = false;
  if (displayWindow) {
    displayWindow.close();
  }
  if (mainWindow) {
    mainWindow.webContents.send('cat-status-changed', false);
  }
  startTimer();
}

ipcMain.handle('get-settings', () => getSettings());
ipcMain.on('save-settings', (event, settings) => saveSettings(settings));
ipcMain.handle('get-version', () => "0.0.1");
ipcMain.on('dismiss-cat', () => dismissCat());
ipcMain.handle('get-asset-path', (_event, filename: string) => {
  const assetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
  // Convert to file:// URL with forward slashes (required on Windows)
  return `file://${assetsPath.replace(/\\/g, '/')}/${filename}`;
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 600,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  const mainUrl = new URL(resolveHtmlPath('index.html'));
  mainUrl.hash = '#/';
  mainWindow.loadURL(mainUrl.href);

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Tray initialization
  tray = new Tray(getAssetPath('icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Settings', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  tray.setToolTip('Cat Gatekeeper');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());

  // eslint-disable-next-line
  new AppUpdater();

  // Start the underlying cat timer
  startTimer();
};

app.on('window-all-closed', () => {
  // We want to keep the app running in the tray on all platforms.
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.setName('Cat Gatekeeper');

app
  .whenReady()
  .then(() => {
    if (process.platform === 'darwin') {
      const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');
      app.dock?.setIcon(path.join(RESOURCES_PATH, 'icon.png'));
    }
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
  })
  .catch(console.log);
