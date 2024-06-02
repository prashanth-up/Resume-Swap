const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const { exec } = require('child_process');

const mcdowellcvPath = path.resolve(__dirname, './TESTS/mcdowellcv.cls');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => {
    let validChannels = ['load-project', 'save-dialog', 'select-image', 'generate-pdf'];
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
  saveAsPDF: (latexContent, engine = 'xelatex', preview = false) => {
    return new Promise((resolve, reject) => {
      const tempDir = temp.mkdirSync('latex');
      const texFile = path.join(tempDir, 'document.tex');
      const clsFile = path.join(tempDir, 'mcdowellcv.cls');
      const pdfFile = path.join(tempDir, 'document.pdf');

      console.log('Temporary directory:', tempDir);
      console.log('Writing LaTeX content to:', texFile);
      fs.writeFileSync(texFile, latexContent);

      console.log('Writing mcdowellcv.cls content to:', clsFile);
      fs.writeFileSync(clsFile, fs.readFileSync(mcdowellcvPath));

      exec(`${engine} -output-directory=${tempDir} ${texFile}`, (error, stdout, stderr) => {
        console.log(`${engine} stdout:`, stdout);
        console.log(`${engine} stderr:`, stderr);

        if (error) {
          console.error(`Error generating PDF with ${engine}:`, stderr);
          reject(stderr);
        } else {
          console.log('PDF generated successfully:', pdfFile);

          fs.access(pdfFile, fs.constants.F_OK, (pdfErr) => {
            if (pdfErr) {
              console.error('PDF file not found after generation:', pdfFile);
              reject('PDF file not found after generation');
              return;
            }

            resolve(pdfFile);
          });
        }
      });
    });
  }
});
