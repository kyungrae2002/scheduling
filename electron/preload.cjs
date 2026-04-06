const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스(React 앱)에 안전한 API를 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // OpenAI API 호출 (메인 프로세스를 통해 안전하게)
  callOpenAI: (requestBody) => ipcRenderer.invoke('openai-chat', requestBody),
  
  // Tray 실시간 동기화 상태 전송
  syncTaskState: (data) => ipcRenderer.send('sync-task-state', data),
  
  // Tray 메뉴로부터의 카드 끄기 역제어 수신
  onTurnOffTask: (callback) => {
    ipcRenderer.removeAllListeners('turn-off-task');
    ipcRenderer.on('turn-off-task', (_event, value) => callback(value));
  },
  
  // 시스템 설정 다이렉트 오픈 API
  openNotificationSettings: () => ipcRenderer.send('open-notification-settings'),

  // [Step 2 - IPC] 포모도로 세션 상태를 트레이에 전달
  // sessionType: 'work' | 'shortBreak' | 'longBreak' | null (null = 포모도로 종료)
  syncPomodoroState: (data) => ipcRenderer.send('sync-pomodoro-state', data),
  
  // Electron 환경 감지용
  isElectron: true,
  
  // 앱 버전
  getVersion: () => ipcRenderer.invoke('get-version'),
});
