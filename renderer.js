const editor = CodeMirror(document.getElementById('editor'), {
    mode: 'stex',
    lineNumbers: true,
    theme: 'default',
    lineWrapping: true
  });
  
  // Load LaTeX file
  async function loadProject() {
    try {
      const filePath = await window.electron.invoke('load-project');
      if (filePath) {
        const data = await window.electron.readFile(filePath);
        editor.setValue(data);
        updatePreview(data);
      }
    } catch (err) {
      console.error('An error occurred:', err);
    }
  }
  
  // Save LaTeX content as PDF
  async function saveAsPDF(latexContent, engine) {
    try {
      const filePath = await window.electron.saveAsPDF(latexContent, engine);
      if (filePath) {
        console.log('PDF saved to:', filePath);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  }
  
  // Update the PDF preview
  async function updatePreview(latexContent) {
    try {
      const pdfPath = await window.electron.saveAsPDF(latexContent, 'pdflatex', true);
      if (pdfPath) {
        document.getElementById('preview').src = pdfPath;
      }
    } catch (err) {
      console.error('Error updating preview:', err);
    }
  }
  
  document.getElementById('loadProject').addEventListener('click', loadProject);
  document.getElementById('save').addEventListener('click', () => {
    const latexContent = editor.getValue();
    const engine = document.getElementById('engineSelect').value;
    console.log('Saving as PDF with engine:', engine);
    saveAsPDF(latexContent, engine);
  });
  
  // Update preview on content change
  editor.on('change', () => {
    const latexContent = editor.getValue();
    updatePreview(latexContent);
  });
  
  // Adjust the height of CodeMirror when the window resizes
  window.addEventListener('resize', () => {
    editor.setSize(null, '100%');
  });
  
  // Set initial height
  editor.setSize(null, '100%');
  