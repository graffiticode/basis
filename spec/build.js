const specMarkdown = require('spec-md');
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'spec.md');
const dest = path.join(__dirname, 'spec.html');

const copyButtonHead = `
<style>
pre {
  position: relative;
}
.copy-button {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 3px 8px;
  border: 1px solid var(--color-pre-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-grey);
  font-family: var(--font-family);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
pre:hover .copy-button {
  opacity: 1;
}
.copy-button:hover {
  background: var(--color-pre-border);
}
</style>
<script>
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("pre > code").forEach(function (code) {
    var pre = code.parentElement;
    var btn = document.createElement("button");
    btn.className = "copy-button";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy"; }, 1500);
      });
    });
    pre.appendChild(btn);
  });
});
</script>`;

const html = specMarkdown.html(source, { head: copyButtonHead });
fs.writeFileSync(dest, html);
