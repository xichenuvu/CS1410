
let pyodideReady = null;
const editors = new Map();

function initEditors() {
  document.querySelectorAll(".runner").forEach(runner => {
    const textarea = runner.querySelector("textarea.codebox");
    if (!textarea) return;

    const starter = textarea.value;
    runner.dataset.starter = starter;

    const editor = CodeMirror.fromTextArea(textarea, {
      mode: "python",
      theme: "eclipse",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: false
    });

    editors.set(runner, editor);

    runner.querySelector(".run-btn")?.addEventListener("click", () => runPython(runner));
    runner.querySelector(".reset-btn")?.addEventListener("click", () => resetRunner(runner));
  });
}

async function loadRuntime() {
  if (pyodideReady) return pyodideReady;

  pyodideReady = (async () => {
    document.querySelectorAll(".output").forEach(out => {
      if (!out.dataset.touched) {
        out.textContent = "Loading Python runtime (Pyodide)...";
        out.classList.add("loading");
      }
    });

    const pyodide = await loadPyodide();

    document.querySelectorAll(".output").forEach(out => {
      if (!out.dataset.touched) {
        out.textContent = "Python runtime loaded. You can run code now.";
        out.classList.remove("loading");
        out.classList.add("success");
      }
    });

    return pyodide;
  })();

  return pyodideReady;
}

async function runPython(runner) {
  const editor = editors.get(runner);
  const out = runner.querySelector(".output");
  const code = editor.getValue();

  out.dataset.touched = "true";
  out.textContent = "Running...";
  out.classList.remove("error", "success");
  out.classList.add("loading");

  try {
    const pyodide = await loadRuntime();
    pyodide.globals.set("user_code", code);

    await pyodide.runPythonAsync(`
import io, traceback
from contextlib import redirect_stdout, redirect_stderr

_stdout = io.StringIO()
_stderr = io.StringIO()
_ns = {}

with redirect_stdout(_stdout), redirect_stderr(_stderr):
    try:
        exec(user_code, _ns, _ns)
    except Exception:
        traceback.print_exc()

output_text = _stdout.getvalue() + _stderr.getvalue()
`);

    const result = pyodide.globals.get("output_text");
    out.textContent = result || "[no output]";
    out.classList.remove("loading", "error");
    out.classList.add("success");
  } catch (err) {
    out.textContent = "Error loading or running Python:\n" + err;
    out.classList.remove("loading", "success");
    out.classList.add("error");
  }
}

function resetRunner(runner) {
  const editor = editors.get(runner);
  const out = runner.querySelector(".output");

  editor.setValue(runner.dataset.starter || "");
  out.textContent = "Code reset. Click Run to execute this Python code in the browser.";
  out.dataset.touched = "true";
  out.classList.remove("loading", "error", "success");
}

document.addEventListener("DOMContentLoaded", () => {
  initEditors();

  if (window.Reveal) {
    Reveal.on("slidechanged", event => {
      event.currentSlide.querySelectorAll(".runner").forEach(runner => {
        editors.get(runner)?.refresh();
      });
    });
  }
});
