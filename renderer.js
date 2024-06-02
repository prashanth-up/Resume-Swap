const editor = CodeMirror(document.getElementById('editor'), {
    mode: 'stex',
    lineNumbers: true,
    theme: 'default',
  });
  
  // Load LaTeX file
  async function loadProject() {
    try {
      const filePath = await window.electron.invoke('load-project');
      if (filePath) {
        const data = await window.electron.readFile(filePath);
        editor.setValue(data);
      }
    } catch (err) {
      console.error('An error occurred:', err);
    }
  }
  
  // Save LaTeX content as PDF
  async function saveAsPDF(latexContent) {
    try {
      const filePath = await window.electron.saveAsPDF(latexContent);
      if (filePath) {
        console.log('PDF saved to:', filePath);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  }
  
  document.getElementById('loadProject').addEventListener('click', loadProject);
  document.getElementById('save').addEventListener('click', () => {
    const latexContent = editor.getValue();
    console.log('Saving as PDF:', latexContent);
    saveAsPDF(latexContent);
  });
  