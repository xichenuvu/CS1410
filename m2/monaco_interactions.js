(() => {
  "use strict";

  const MONACO_BASE =
    "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";

  let pyodidePromise = null;
  const editorRecords = [];

  function loadPyodideOnce() {
    if (!pyodidePromise) {
      pyodidePromise = window.loadPyodide();
    }
    return pyodidePromise;
  }

  function configureMonacoWorker() {
    const workerMain = `${MONACO_BASE}/base/worker/workerMain.js`;
    window.MonacoEnvironment = {
      getWorkerUrl: function () {
        const source =
          `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};` +
          `importScripts('${workerMain}');`;
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
      }
    };
  }

  function initializeEditors() {
    if (!window.require) {
      console.error("Monaco AMD loader was not loaded.");
      return;
    }

    configureMonacoWorker();
    window.require.config({ paths: { vs: MONACO_BASE } });

    window.require(["vs/editor/editor.main"], () => {
      window.monaco.editor.defineTheme("cs1410-light", {
        base: "vs",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#fffdf7",
          "editorLineNumber.foreground": "#9aa6ac",
          "editorLineNumber.activeForeground": "#1f6fa8",
          "editorIndentGuide.background1": "#e8e1cf",
          "editorIndentGuide.activeBackground1": "#c9bfa7"
        }
      });

      document.querySelectorAll(".runner").forEach((runner, index) => {
        const textarea = runner.querySelector("textarea.codebox");
        if (!textarea || runner.dataset.monacoReady === "true") return;

        runner.dataset.monacoReady = "true";

        const starter = textarea.value;
        const host = document.createElement("div");
        host.className = "monaco-editor-host";
        host.setAttribute("aria-label", "Python code editor");

        textarea.insertAdjacentElement("afterend", host);
        textarea.classList.add("monaco-source-hidden");

        const editor = window.monaco.editor.create(host, {
          value: starter,
          language: "python",
          theme: "cs1410-light",
          automaticLayout: true,
          fontSize: 18,
          lineHeight: 25,
          tabSize: 4,
          insertSpaces: true,
          tabFocusMode: false,
          detectIndentation: false,
          autoIndent: "full",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "off",
          roundedSelection: false,
          bracketPairColorization: { enabled: true },
          automaticClosingBrackets: "always",
          automaticClosingQuotes: "always",
          padding: { top: 10, bottom: 10 }
        });



        // Monaco-native keyboard handling only.
        // Force Tab to remain an editor indentation key instead of moving browser focus.
        editor.updateOptions({
          tabFocusMode: false,
          tabSize: 4,
          insertSpaces: true,
          detectIndentation: false
        });

        editor.onDidFocusEditorText(() => {
          editor.updateOptions({ tabFocusMode: false });
        });

        editor.onKeyDown((e) => {
          if (e.keyCode !== window.monaco.KeyCode.Tab) return;

          e.preventDefault();
          e.stopPropagation();

          if (e.shiftKey) {
            editor.trigger("keyboard", "editor.action.outdentLines", null);
            return;
          }

          const selection = editor.getSelection();
          if (!selection) return;

          if (!selection.isEmpty() || selection.startLineNumber !== selection.endLineNumber) {
            editor.trigger("keyboard", "editor.action.indentLines", null);
            return;
          }

          editor.executeEdits("tab-4-spaces", [{
            range: selection,
            text: "    ",
            forceMoveMarkers: true
          }]);
          editor.pushUndoStop();
        });

        // Custom indentation shortcuts for macOS / Windows.
        // Command/Ctrl + Right Arrow  -> indent
        // Command/Ctrl + Left Arrow   -> outdent
        editor.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.RightArrow,
          () => {
            editor.trigger("keyboard", "editor.action.indentLines", null);
          }
        );

        editor.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.LeftArrow,
          () => {
            editor.trigger("keyboard", "editor.action.outdentLines", null);
          }
        );

        const runBtn = runner.querySelector(".run-btn");
        const resetBtn = runner.querySelector(".reset-btn");
        const output = runner.querySelector(".output");

        if (runBtn && output) {
          runBtn.addEventListener("click", async () => {
            runBtn.disabled = true;
            output.classList.remove("error");
            output.textContent = "Loading Python / running...";

            try {
              const pyodide = await loadPyodideOnce();
              const chunks = [];

              pyodide.setStdout({
                batched: (message) => chunks.push(message)
              });

              pyodide.setStderr({
                batched: (message) => chunks.push(message)
              });

              await pyodide.runPythonAsync(editor.getValue());

              output.textContent =
                chunks.length > 0
                  ? chunks.join("\n")
                  : "(Program finished with no output.)";
            } catch (error) {
              output.classList.add("error");
              output.textContent = String(error);
            } finally {
              runBtn.disabled = false;
            }
          });
        }

        if (resetBtn) {
          resetBtn.addEventListener("click", () => {
            editor.setValue(starter);
            editor.focus();
          });
        }

        editorRecords.push({ runner, editor, index });
      });

      relayoutEditors();

      if (window.Reveal) {
        window.Reveal.on("ready", relayoutEditors);
        window.Reveal.on("slidechanged", relayoutEditors);
        window.Reveal.on("resize", relayoutEditors);
      }

      window.addEventListener("resize", relayoutEditors);
    });
  }

  function relayoutEditors() {
    window.setTimeout(() => {
      editorRecords.forEach(({ editor }) => editor.layout());
    }, 60);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEditors);
  } else {
    initializeEditors();
  }
})();
