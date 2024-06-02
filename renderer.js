const { dialog } = require('electron').remote;
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const { exec } = require('child_process');
const CodeMirror = require('codemirror');
require('codemirror/mode/stex/stex');
require('codemirror/lib/codemirror.css');

// Initialize CodeMirror for LaTeX editing
const editor = CodeMirror(document.getElementById('editor'), {
  mode: 'stex',
  lineNumbers: true,
  theme: 'default'
});

// Load LaTeX file
function loadProject() {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'LaTeX Files', extensions: ['tex'] }]
  }).then(result => {
    if (!result.canceled) {
      const filePath = result.filePaths[0];
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('An error occurred reading the file:', err);
          return;
        }
        editor.setValue(data);
      });
    }
  }).catch(err => {
    console.error('An error occurred:', err);
  });
}

// Save LaTeX content as PDF
function saveAsPDF(latexContent) {
  const tempDir = temp.mkdirSync('latex');
  const texFile = path.join(tempDir, 'resume.tex');
  const pdfFile = path.join(tempDir, 'resume.pdf');

  fs.writeFileSync(texFile, latexContent);

  exec(`pdflatex -output-directory=${tempDir} ${texFile}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error generating PDF:', stderr);
      return;
    }
    console.log('PDF generated successfully:', pdfFile);
    dialog.showSaveDialog({
      defaultPath: 'resume.pdf'
    }).then(saveResult => {
      if (!saveResult.canceled) {
        fs.copyFileSync(pdfFile, saveResult.filePath);
        console.log('PDF saved to:', saveResult.filePath);
      }
    }).catch(saveErr => {
      console.error('An error occurred while saving the PDF:', saveErr);
    });
  });
}

// Event listeners
document.getElementById('loadProject').addEventListener('click', loadProject);
document.getElementById('save').addEventListener('click', () => {
  const latexContent = editor.getValue();
  saveAsPDF(latexContent);
});
