function sendQuery(query) {
  if (!query || !query.trim()) return;
  window.postMessage({ type: 'newtab-query', query: query.trim() }, '*');
  document.getElementById('searchInput').value = '';
}

// Enter key in search box
document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendQuery(e.target.value);
  }
});

// Send button click
document.getElementById('sendBtn').addEventListener('click', () => {
  sendQuery(document.getElementById('searchInput').value);
});

// Quick action buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const query = btn.getAttribute('data-query');
    sendQuery(query);
  });
});
