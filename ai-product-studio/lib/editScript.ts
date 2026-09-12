/**
 * 注入到生成产物 iframe 中的"点选编辑"脚本：
 * - 父窗口发 {__aps:'edit-mode', on} 切换编辑模式；
 * - 编辑模式下 hover 高亮元素，点击时拦截默认行为，
 *   把元素信息 postMessage 回父窗口（{__aps:'element-selected', payload}）。
 */
const EDIT_SCRIPT = `
<script>
(function () {
  var apsOn = false;
  var apsLast = null;
  var apsPrevOutline = "";

  function cssPath(el) {
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 6) {
      var part = node.tagName.toLowerCase();
      if (node.id) {
        part += "#" + node.id;
        parts.unshift(part);
        break;
      }
      var cls = (node.className && typeof node.className === "string")
        ? node.className.trim().split(/\\s+/).slice(0, 2).join(".")
        : "";
      if (cls) part += "." + cls;
      var parent = node.parentElement;
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) {
          return c.tagName === node.tagName;
        });
        if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function clearHover() {
    if (apsLast) {
      apsLast.style.outline = apsPrevOutline;
      apsLast = null;
    }
  }

  window.addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.__aps === "edit-mode") {
      apsOn = !!d.on;
      document.documentElement.style.cursor = apsOn ? "crosshair" : "";
      if (!apsOn) clearHover();
    }
  });

  document.addEventListener("mouseover", function (e) {
    if (!apsOn) return;
    var t = e.target;
    if (!t || t === document.body || t === document.documentElement) return;
    clearHover();
    apsPrevOutline = t.style.outline;
    t.style.outline = "2px solid #e2532f";
    t.style.outlineOffset = "2px";
    apsLast = t;
  }, true);

  document.addEventListener("click", function (e) {
    if (!apsOn) return;
    e.preventDefault();
    e.stopPropagation();
    var t = e.target;
    if (!t || t === document.body || t === document.documentElement) return;
    parent.postMessage({
      __aps: "element-selected",
      payload: {
        tag: t.tagName.toLowerCase(),
        text: (t.innerText || "").trim().slice(0, 300),
        selector: cssPath(t),
        html: (t.outerHTML || "").slice(0, 1500)
      }
    }, "*");
  }, true);
})();
</script>`;

export function injectEditScript(html: string): string {
  const idx = html.lastIndexOf("</body>");
  if (idx >= 0) {
    return html.slice(0, idx) + EDIT_SCRIPT + html.slice(idx);
  }
  return html + EDIT_SCRIPT;
}
