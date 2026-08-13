document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.tab');
  const inputLabel = document.getElementById('inputLabel');
  const aiInput = document.getElementById('aiInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsArea = document.getElementById('resultsArea');
  const openSettings = document.getElementById('openSettings');

  let currentMode = 'PLAN';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      
      if (currentMode === 'PLAN') {
        inputLabel.textContent = 'PLANO DA IA';
        aiInput.placeholder = 'Cole aqui o plano que a IA sugeriu...';
      } else if (currentMode === 'PROMPT') {
        inputLabel.textContent = 'REQUISITOS / PLANO';
        aiInput.placeholder = 'Cole o que você quer que a IA faça...';
      } else {
        inputLabel.textContent = 'CÓDIGO / RESULTADO';
        aiInput.placeholder = 'Cole aqui o código ou evidências da implementação...';
      }
    });
  });

  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'PROCESSANDO ANÁLISE...';
    
    // Simulação de processamento - em produção chamaria a engine de IA
    setTimeout(() => {
      resultsArea.style.display = 'block';
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'EXECUTAR ANÁLISE ADVERSÁRIA';
      
      // Lógica de mock para demonstrar UI
      const confidence = Math.floor(Math.random() * (100 - 60) + 60);
      document.getElementById('confidenceValue').textContent = `Score: ${confidence}%`;
    }, 1500);
  });

  openSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
