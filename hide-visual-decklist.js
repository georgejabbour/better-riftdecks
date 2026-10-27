(() => {
  function hideVisualDecklist(heading) {
    if (!heading.matches('#content h2') || heading.textContent.trim() !== 'Visual Decklist') return;
    const visual = heading.nextElementSibling;
    if (!visual?.matches('div.px-0')) return;

    heading.classList.add('better-riftdecks-hidden');
    visual.classList.add('better-riftdecks-hidden');
  }

  function inspect(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'H2') hideVisualDecklist(node);
    if (node.previousElementSibling?.tagName === 'H2') hideVisualDecklist(node.previousElementSibling);
    for (const heading of node.querySelectorAll('#content h2')) hideVisualDecklist(heading);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.target.nodeType === Node.ELEMENT_NODE && mutation.target.tagName === 'H2') {
        hideVisualDecklist(mutation.target);
      }
      for (const node of mutation.addedNodes) inspect(node);
    }
  });
  observer.observe(document, { childList: true, subtree: true });
  for (const heading of document.querySelectorAll('#content h2')) hideVisualDecklist(heading);
})();
