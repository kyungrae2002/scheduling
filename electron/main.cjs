const { app, BrowserWindow, Tray, nativeImage, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 환경변수 로드 (.env.local)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}
loadEnv();

const isDev = !app.isPackaged;
let tray = null;
let mainWindow = null;

function createWindow() {
  // 화면 크기 가져오기
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    show: true, // 사용자가 바로 볼 수 있게 열리도록 설정
    frame: true, // 프레임 없는 스타일을 끕니다 (테스트 시 직관성 향상)
    resizable: true,
    skipTaskbar: false, // 태스크바에도 보이도록 설정 (현재 테스트용)
    alwaysOnTop: true, // 항상 위에 유지시키기 위한 옵션
    transparent: false,
    backgroundColor: '#F4F4F5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 구글 로그인 팝업 창 차단 해제 로직
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.includes("firebaseapp.com") || details.url.includes("google.com/accounts") || details.url.includes("oauth2")) {
      return { action: 'allow' };
    }
    return { action: 'deny' }; 
  });

  mainWindow.center(); // 정중앙에 배치

  // 개발 모드와 프로덕션 모드 분기
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // 프로덕션: 구글 로그인을 위해 file:// 대신 내부 로컬 서버 구동
    startLocalServer().then((port) => {
      mainWindow.loadURL(`http://localhost:${port}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(__dirname, '..', 'dist', urlPath === '/' ? 'index.html' : urlPath);
      
      const extname = String(path.extname(filePath)).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', 
        '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
      };
      
      const contentType = mimeTypes[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            fs.readFile(path.join(__dirname, '..', 'dist', 'index.html'), (err, fallbackContent) => {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(fallbackContent, 'utf-8');
            });
          } else {
            res.writeHead(500); res.end('Server Error');
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    const FIXED_PORT = 47321;
    server.listen(FIXED_PORT, '127.0.0.1', () => {
      resolve(server.address().port);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // 포트 충돌: 이미 서버가 실행 중이므로 같은 포트 재사용
        resolve(FIXED_PORT);
      } else {
        reject(err);
      }
    });
  });
}

let currentActiveTask = null;

function updateTrayMenu() {
  if (!tray) return;

  const menuItems = [];
  
  if (currentActiveTask) {
    menuItems.push({ label: `현재 코어 온: ${currentActiveTask.title}`, enabled: false });
    menuItems.push({ 
      label: '🚫 이 작업 코어 끄기', 
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('turn-off-task', currentActiveTask.id);
        }
      } 
    });
  } else {
    menuItems.push({ label: '현재 코어를 켠 작업이 없습니다.', enabled: false });
  }

  menuItems.push({ type: 'separator' });
  menuItems.push({ 
    label: 'Core Tab 설정 열기', 
    click: () => { 
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    } 
  });
  menuItems.push({ label: '종료', role: 'quit' });

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);

  // 상단바 텍스트 변경 (macOS 전용)
  if (process.platform === 'darwin') {
    if (currentActiveTask) {
      const title = ` CORE: ${currentActiveTask.title.substring(0, 8)}${currentActiveTask.title.length > 8 ? '...' : ''}`;
      tray.setTitle(title);
      console.log(`[Tray] Title Updated: ${title}`);
    } else {
      tray.setTitle(' 🎯 Core Tab');
      console.log('[Tray] Title Updated: Default');
    }
  }
}

function createTray() {
  console.log('[Tray] Initializing Tray...');
  const iconPath = path.join(__dirname, 'tray-iconTemplate.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    console.log(`[Tray] Icon found at: ${iconPath}`);
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    console.warn('[Tray] Icon not found! using empty image');
    trayIcon = nativeImage.createEmpty();
  }
  
  trayIcon.setTemplateImage(true);
  
  try {
    tray = new Tray(trayIcon);
    tray.setToolTip('Core Tab - Priority Focus System');
    if (process.platform === 'darwin') {
      tray.setTitle(' 🎯 Core Tab');
    }

    // 트레이 클릭 시 창 토글 (Windows/Linux)
    tray.on('click', (_event, bounds) => {
      toggleWindow(bounds);
    });

    // 첫 메뉴 조립
    updateTrayMenu();
    console.log('[Tray] Tray created successfully');
  } catch (err) {
    console.error('[Tray] Failed to create tray:', err);
  }
}

ipcMain.on('sync-task-state', (_event, activeTask) => {
  currentActiveTask = activeTask;
  updateTrayMenu();
});

ipcMain.on('open-notification-settings', () => {
  shell.openExternal('x-apple.systempreferences:com.apple.preference.notifications');
});

// [Step 2 - IPC] 포모도로 상태 수신 → 트레이 타이틀 반영
ipcMain.on('sync-pomodoro-state', (_event, data) => {
  if (!tray) return;
  try {
    if (!data) {
      updateTrayMenu();
      return;
    }
    if (process.platform === 'darwin') {
      const { sessionType, round } = data;
      const labels = { work: '🍅 집중', shortBreak: '☕ 휴식', longBreak: '🛌 긴 휴식' };
      const label = labels[sessionType] || '🍅';
      tray.setTitle(` ${label} ${round ? `(${round}R)` : ''}`);
    }
  } catch (err) {
    console.error('[Pomodoro] tray sync error:', err);
  }
});

function toggleWindow(bounds) {
  if (!mainWindow) {
    createWindow();
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    const windowBounds = mainWindow.getBounds();
    const x = Math.round(bounds.x - windowBounds.width / 2 + bounds.width / 2);
    const y = bounds.y + bounds.height + 4;

    mainWindow.setPosition(x, y, false);
    mainWindow.show();
    mainWindow.focus();
  }
}

// OpenAI API 호출은 이제 보안 프록시(/api-proxy/v1/chat/completions)를 통해서만 이루어집니다.
// 메인 프로세스에서의 직접 호출은 보안상 제거되었습니다.

// ===== 단일 인스턴스 잠금 =====
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 이미 실행 중인 인스턴스가 있으면 즉시 종료
  app.quit();
} else {
  // 두 번째 실행 시도가 오면 기존 창을 앞으로 가져오기
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ===== App Lifecycle =====
app.whenReady().then(() => {
  createTray();
  createWindow();

  // 테스트 기간 동안은 Dock 아이콘을 표시하도록 유지 (히든 해제)
  // if (process.platform === 'darwin') {
  //   app.dock.hide();
  // }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
