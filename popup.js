document.addEventListener('DOMContentLoaded', function() {
  const domainsTextArea = document.getElementById('domains');
  const urlPatternsInput = document.getElementById('urlPatterns');
  const saveButton = document.getElementById('save');
  const statusElement = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['bypassDomains', 'urlPatterns'], function(result) {
    domainsTextArea.value = result.bypassDomains || '';
    urlPatternsInput.value = result.urlPatterns || '';
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    const domains = domainsTextArea.value.trim();
    const urlPatterns = urlPatternsInput.value.trim();
    chrome.storage.local.set({ 'bypassDomains': domains, 'urlPatterns': urlPatterns }, function() {
      statusElement.textContent = 'Settings saved!';
      setTimeout(() => { statusElement.textContent = ''; }, 3000);

      // Notify the background script that settings have been updated
      chrome.runtime.sendMessage({ action: "settingsUpdated" });
    });
  });
});
