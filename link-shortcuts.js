// Riftdecks navigates these rows even when their matching link is modified.
document.addEventListener('click', (event) => {
  if (event.button !== 0 || !(event.metaKey || event.ctrlKey || event.shiftKey)) return;
  if (event.defaultPrevented || !(event.target instanceof Element)) return;

  const link = event.target.closest('a[href]');
  const row = link?.closest('tr[data-href]');
  if (!row?.closest('table.table-clickable tbody') || row.hasAttribute('data-href-layer')) return;
  if (link.hasAttribute('download') || link.isContentEditable || link.hasAttribute('data-bs-toggle')) return;
  const role = link.getAttribute('role');
  if ((role && role.toLowerCase() !== 'link') || link.getAttribute('aria-disabled') === 'true') return;

  try {
    const destination = new URL(row.getAttribute('data-href'), document.baseURI);
    if ((destination.protocol === 'http:' || destination.protocol === 'https:') && destination.href === link.href) {
      // Stop the click before it reaches the row; keep the native link action.
      link.addEventListener('click', (linkEvent) => {
        if (linkEvent === event) linkEvent.stopPropagation();
      }, { once: true });
    }
  } catch {
    // Leave malformed destinations to the site.
  }
}, true);
