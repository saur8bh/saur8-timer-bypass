document.addEventListener('DOMContentLoaded', function() {
  const domainsTextArea = document.getElementById('domains');
  const saveButton = document.getElementById('save');
  const statusElement = document.getElementById('status');

  // Load saved domains
  chrome.storage.local.get(['bypassDomains'], function(result) {
    domainsTextArea.value = result.bypassDomains || '';
  });

  // Save domains
  saveButton.addEventListener('click', function() {
    const domains = domainsTextArea.value.trim();
    chrome.storage.local.set({ 'bypassDomains': domains }, function() {
      statusElement.textContent = 'Domains saved!';
      setTimeout(() => { statusElement.textContent = ''; }, 3000);

      // Notify the background script that domains have been updated
      chrome.runtime.sendMessage({ action: "domainsUpdated" });
    });
  });
});