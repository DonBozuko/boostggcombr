document.addEventListener('DOMContentLoaded', () => {
  const provider = document.getElementById('provider');
  const apiKey = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Carregar config
  chrome.storage.local.get(['provider', 'apiKey'], (result) => {
    if (result.provider) provider.value = result.provider;
    if (result.apiKey) apiKey.value = result.apiKey;
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      provider: provider.value,
      apiKey: apiKey.value
    }, () => {
      status.textContent = '✅ Configurações salvas com sucesso!';
      status.style.color = '#22c55e';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
});
