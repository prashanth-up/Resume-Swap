const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const temp = require('temp').track();
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('load-project', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'LaTeX Files', extensions: ['tex'] }],
  });

  if (!result.canceled) {
    const filePath = result.filePaths[0];
    console.log('Project loaded from:', filePath);
    return filePath;
  }
  return null;
});

ipcMain.handle('save-dialog', async (event, defaultPath) => {
  console.log('Opening save dialog for:', defaultPath);
  const result = await dialog.showSaveDialog({
    defaultPath: defaultPath,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  console.log('Save dialog result:', result);
  return result;
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] }]
  });
  if (!result.canceled) {
    const filePath = result.filePaths[0];
    console.log('Image selected:', filePath);
    return filePath;
  }
  return null;
});

ipcMain.handle('generate-pdf', async (event, latexContent) => {
  const tempDir = temp.mkdirSync('latex');
  const texFile = path.join(tempDir, 'document.tex');
  const pdfFile = path.join(tempDir, 'document.pdf');

  fs.writeFileSync(texFile, latexContent);

  return new Promise((resolve, reject) => {
    exec(`pdflatex -output-directory=${tempDir} ${texFile}`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(pdfFile);
      }
    });
  });
});
