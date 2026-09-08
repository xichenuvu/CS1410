
(() => {
  let pyodidePromise = null;
  const editors = new Map();

  function loadPython() {
    if (!pyodidePromise) {
      pyodidePromise = loadPyodide();
    }
    return pyodidePromise;
  }

  function setupMonaco() {
    require.config({
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' }
    });

    require(['vs/editor/editor.main'], () => {
      document.querySelectorAll('.runner').forEach((runner, index) => {
        const textarea = runner.querySelector('.codebox');
        const host = runner.querySelector('.monaco-host');
        const runBtn = runner.querySelector('.run-btn');
        const resetBtn = runner.querySelector('.reset-btn');
        const output = runner.querySelector('.output');
        if (!textarea || !host) return;

        const starter = textarea.value;
        const editor = monaco.editor.create(host, {
          value: starter,
          language: 'python',
          theme: 'vs',
          fontSize: 18,
          lineHeight: 26,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'off',
          padding: { top: 10, bottom: 10 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true
        });

        editors.set(runner, { editor, starter });

        runBtn.addEventListener('click', async () => {
          output.textContent = 'Running...';
          try {
            const py = await loadPython();
            let buffer = '';
            py.setStdout({ batched: text => { buffer += text + '\n'; } });
            py.setStderr({ batched: text => { buffer += text + '\n'; } });
            await py.runPythonAsync(editor.getValue());
            output.textContent = buffer || '[no output]';
          } catch (err) {
            output.textContent = String(err);
          }
        });

        resetBtn.addEventListener('click', () => {
          editor.setValue(starter);
          output.textContent = 'Code reset. Click Run to execute this Python code in the browser.';
        });
      });

      if (window.Reveal) {
        Reveal.on('slidechanged', () => {
          setTimeout(() => {
            document.querySelectorAll('.runner').forEach(r => {
              const item = editors.get(r);
              if (item) item.editor.layout();
            });
          }, 80);
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMonaco);
  } else {
    setupMonaco();
  }

  // ---------------------------------------------------------
  // Three-state scroll status cue for long slides
  // Top -> Middle -> Bottom. Does not control Reveal.js.
  // ---------------------------------------------------------
  function setupSlideScrollStatus() {
    document.querySelectorAll('.slide-scroll').forEach((box) => {
      let status = box.querySelector(':scope > .slide-scroll-status');

      if (!status) {
        status = document.createElement('div');
        status.className = 'slide-scroll-status';
        status.setAttribute('aria-hidden', 'true');
        box.appendChild(status);
      }

      const update = () => {
        const maxScroll = Math.max(0, box.scrollHeight - box.clientHeight);

        // If content does not actually overflow, hide the cue.
        if (maxScroll <= 2) {
          status.style.display = 'none';
          return;
        }

        status.style.display = 'block';

        const atTop = box.scrollTop <= 5;
        const atBottom = box.scrollTop >= maxScroll - 5;

        status.classList.remove('at-top', 'in-middle', 'at-bottom');

        if (atTop) {
          status.textContent = '↓ Top of slide';
          status.classList.add('at-top');
        } else if (atBottom) {
          status.textContent = '✓ End of slide';
          status.classList.add('at-bottom');
        } else {
          status.textContent = '↕ More content';
          status.classList.add('in-middle');
        }
      };

      if (box.dataset.scrollStatusReady !== '1') {
        box.dataset.scrollStatusReady = '1';
        box.addEventListener('scroll', update, { passive: true });
      }

      update();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(setupSlideScrollStatus, 100);
    });
  } else {
    setTimeout(setupSlideScrollStatus, 100);
  }

})();
