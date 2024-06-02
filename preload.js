const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const { exec } = require('child_process');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => {
    let validChannels = ['load-project', 'save-dialog', 'select-image'];
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
  saveAsPDF: (latexContent, engine = 'pdflatex') => { // Add engine parameter with default to pdflatex
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
        // Verify if the placeholder image exists
        fs.access(tempImageFile, fs.constants.F_OK, async (err) => {
          if (err) {
            console.error('Placeholder image not found:', tempImageFile);
            
            // Prompt the user to select an image file
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

          // Proceed with LaTeX to PDF conversion
          convertToPDF();
        });
      };

      const convertToPDF = () => {
        // Verify file write success
        fs.access(texFile, fs.constants.F_OK, (err) => {
          if (err) {
            console.error('File not found after writing:', texFile);
            reject('File not found after writing');
            return;
          }
          console.log('File write successful:', texFile);

          // Execute the specified LaTeX engine
          exec(`${engine} -output-directory=${tempDir} ${texFile}`, (error, stdout, stderr) => {
            console.log(`${engine} stdout:`, stdout);
            console.log(`${engine} stderr:`, stderr);

            if (error) {
              console.error(`Error generating PDF with ${engine}:`, stderr);
              reject(stderr);
            } else {
              console.log('PDF generated successfully:', pdfFile);

              // Check if PDF file exists
              fs.access(pdfFile, fs.constants.F_OK, (pdfErr) => {
                if (pdfErr) {
                  console.error('PDF file not found after generation:', pdfFile);
                  reject('PDF file not found after generation');
                  return;
                }

                console.log('Invoking save-dialog for PDF file:', pdfFile);
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
