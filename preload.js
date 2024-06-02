const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const { exec } = require('child_process');

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
  saveAsPDF: (latexContent, engine = 'pdflatex', preview = false) => {
    return new Promise((resolve, reject) => {
      const tempDir = temp.mkdirSync('latex');
      const texFile = path.join(tempDir, 'document.tex');
      const pdfFile = path.join(tempDir, 'document.pdf');
      const tempImageFile = path.join(tempDir, 'example-image.png');

      console.log('Temporary directory:', tempDir);
      console.log('Writing LaTeX content to:', texFile);
      fs.writeFileSync(texFile, latexContent);

      const containsGraphics = latexContent.includes('\\includegraphics');

      const proceedWithImageCheck = () => {
        fs.access(tempImageFile, fs.constants.F_OK, async (err) => {
          if (err) {
            console.error('Placeholder image not found:', tempImageFile);
            try {
              const selectedImage = await ipcRenderer.invoke('select-image');
              if (selectedImage) {
                fs.copyFileSync(selectedImage, tempImageFile);
              } else {
                reject('Image file is required to generate the PDF');
                return;
              }
            } catch (selectImageError) {
              reject('Failed to select an image file');
              return;
            }
          }
          convertToPDF();
        });
      };

      const convertToPDF = () => {
        fs.access(texFile, fs.constants.F_OK, (err) => {
          if (err) {
            console.error('File not found after writing:', texFile);
            reject('File not found after writing');
            return;
          }
          console.log('File write successful:', texFile);

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

                if (preview) {
                  resolve(pdfFile);
                } else {
                  ipcRenderer.invoke('save-dialog', pdfFile).then((saveResult) => {
                    console.log('Save dialog result:', saveResult);
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
                }
              });
            }
          });
        });
      };

      if (containsGraphics) {
        proceedWithImageCheck();
      } else {
        convertToPDF();
      }
    });
  }
});
