const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const { exec } = require('child_process');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => {
    let validChannels = ['load-project', 'save-dialog'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },
  saveAsPDF: (latexContent) => {
    return new Promise((resolve, reject) => {
      const tempDir = temp.mkdirSync('latex');
      const texFile = path.join(tempDir, 'test.tex');
      const pdfFile = path.join(tempDir, 'test.pdf');

      console.log('Temporary directory:', tempDir);
      console.log('Writing LaTeX content to:', texFile);
      fs.writeFileSync(texFile, latexContent);

      // Verify file write success
      fs.access(texFile, fs.constants.F_OK, (err) => {
        if (err) {
          console.error('File not found:', texFile);
          reject('File not found after writing');
          return;
        }
        console.log('File write successful:', texFile);

        // Execute pdflatex
        exec(`pdflatex -output-directory=${tempDir} ${texFile}`, (error, stdout, stderr) => {
          console.log('pdflatex stdout:', stdout);
          console.log('pdflatex stderr:', stderr);

          if (error) {
            console.error('Error generating PDF:', stderr);
            reject(stderr);
          } else {
            console.log('PDF generated successfully:', pdfFile);

            // Check if PDF file exists
            fs.access(pdfFile, fs.constants.F_OK, (pdfErr) => {
              if (pdfErr) {
                console.error('PDF file not found:', pdfFile);
                reject('PDF file not found after generation');
                return;
              }

              ipcRenderer.invoke('save-dialog', pdfFile).then((saveResult) => {
                if (!saveResult.canceled) {
                  try {
                    fs.copyFileSync(pdfFile, saveResult.filePath);
                    console.log('PDF saved to:', saveResult.filePath);
                    resolve(saveResult.filePath);
                  } catch (copyError) {
                    console.error('Error copying PDF:', copyError);
                    reject(copyError);
                  }
                } else {
                  console.log('Save dialog was canceled');
                  resolve(null);
                }
              }).catch((saveErr) => {
                console.error('Error during save dialog:', saveErr);
                reject(saveErr);
              });
            });
          }
        });
      });
    });
  }
});
