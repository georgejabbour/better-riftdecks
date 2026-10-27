// AdThrive can pair its usual selectors with new names on each page load.
// Only follow aliases paired with selectors that identify its ad containers.
(() => {
  const anchor = /^(?:\.adthrive-(?:ad|ad-cls|sticky-outstream)|#AdThrive_[\w-]+)$/i;
  const simpleSelector = /^[.#][a-zA-Z_][\w-]*$/;
  const aliases = new Set();
  const pendingStyles = new Set();
  let stylesheet;
  let scanAll = false;
  let scheduled = false;

  function inspectRules(rules) {
    for (const rule of rules) {
      if (rule.cssRules) inspectRules(rule.cssRules);
      if (!rule.selectorText) continue;
      const selectors = rule.selectorText.split(',').map((value) => value.trim());
      if (!selectors.some((value) => anchor.test(value))) continue;
      for (const selector of selectors) {
        if (simpleSelector.test(selector) && !anchor.test(selector)) aliases.add(selector);
      }
    }
  }

  function inspectStyle(element) {
    if (element === stylesheet || !element.sheet) return;
    try {
      inspectRules(element.sheet.cssRules);
    } catch {
      // Inaccessible stylesheets do not provide aliases for this fallback.
    }
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const count = aliases.size;
      if (scanAll) {
        for (const style of document.querySelectorAll('style')) inspectStyle(style);
      } else {
        for (const style of pendingStyles) inspectStyle(style);
      }
      scanAll = false;
      pendingStyles.clear();
      if (aliases.size === count) return;
      if (!stylesheet) {
        stylesheet = document.createElement('style');
        (document.head || document.documentElement).appendChild(stylesheet);
      }
      stylesheet.textContent = `${[...aliases].join(',\n')} { display: none !important; }`;
    });
  }

  function inspectNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE || node === stylesheet) return;
    if (node.tagName === 'STYLE') pendingStyles.add(node);
    if (node.tagName === 'IFRAME' && isAdFrame(node)) scanAll = true;
    for (const child of node.querySelectorAll('style, iframe')) {
      if (child === stylesheet) continue;
      if (child.tagName === 'STYLE') pendingStyles.add(child);
      else if (isAdFrame(child)) scanAll = true;
    }
  }

  function isAdFrame(frame) {
    if (/advertis|ad content/i.test(frame.title)) return true;
    try {
      const hostname = new URL(frame.src, location.href).hostname;
      return ['googlesyndication.com', 'doubleclick.net', 'adthrive.com']
        .some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.target === stylesheet) continue;
      const parent = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target.parentElement;
      if (parent?.tagName === 'STYLE') pendingStyles.add(parent);
      if (mutation.type === 'attributes' && parent?.tagName === 'IFRAME' && isAdFrame(parent)) {
        scanAll = true;
      }
      for (const node of mutation.addedNodes) inspectNode(node);
    }
    if (scanAll || pendingStyles.size) scheduleScan();
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['src', 'title'],
  });
  scanAll = true;
  scheduleScan();
})();
