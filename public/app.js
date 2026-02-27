// DOM Elements
const tabs = document.querySelectorAll('.tab');
const askInput = document.getElementById('ask-input');
const reviewInput = document.getElementById('review-input');
const decideInput = document.getElementById('decide-input');
const deliberateBtn = document.getElementById('deliberate');
const clearBtn = document.getElementById('clear');
const outputSection = document.getElementById('output');
const deliberationContent = document.getElementById('deliberation-content');
const addOptionBtn = document.getElementById('add-option');
const modelSelect = document.getElementById('model-select');
const modelsInput = document.getElementById('models');

let currentMode = 'ask';
let optionCount = 2;
let allModels = [];
let defaultModels = [];

// Fetch models on load
async function loadModels(filter = {}) {
  try {
    const params = new URLSearchParams();
    if (filter.free) params.set('free', 'true');
    if (filter.maxCost) params.set('maxCost', filter.maxCost);
    params.set('limit', '50');
    
    const response = await fetch(`/api/models?${params}`);
    const data = await response.json();
    allModels = data.models;
    defaultModels = data.defaults;
    renderModelOptions();
  } catch (error) {
    console.error('Failed to load models:', error);
    modelSelect.innerHTML = '<option disabled>Failed to load models</option>';
  }
}

function renderModelOptions() {
  modelSelect.innerHTML = '';
  
  for (const model of allModels) {
    const cost = model.pricing.prompt === 0 && model.pricing.completion === 0
      ? 'FREE'
      : `$${((model.pricing.prompt + model.pricing.completion) / 2).toFixed(2)}/1M`;
    const ctx = model.context_length >= 1000000 
      ? `${(model.context_length / 1000000).toFixed(1)}M`
      : `${Math.round(model.context_length / 1000)}k`;
    
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.id} (${cost}, ${ctx})`;
    option.selected = defaultModels.includes(model.id);
    modelSelect.appendChild(option);
  }
  
  updateModelsInput();
}

function updateModelsInput() {
  const selected = Array.from(modelSelect.selectedOptions).map(o => o.value);
  modelsInput.value = selected.length > 0 ? selected.join(',') : defaultModels.join(',');
}

// Model filter buttons
document.getElementById('show-free')?.addEventListener('click', () => loadModels({ free: true }));
document.getElementById('show-cheap')?.addEventListener('click', () => loadModels({ maxCost: '1' }));
document.getElementById('show-all')?.addEventListener('click', () => loadModels());

modelSelect?.addEventListener('change', updateModelsInput);

// Load models on start
loadModels();

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    
    askInput.classList.toggle('hidden', currentMode !== 'ask');
    reviewInput.classList.toggle('hidden', currentMode !== 'review');
    decideInput.classList.toggle('hidden', currentMode !== 'decide');
  });
});

// Add option for decide mode
addOptionBtn.addEventListener('click', () => {
  optionCount++;
  const container = document.getElementById('options-container');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'option-input';
  input.placeholder = `Option ${String.fromCharCode(64 + optionCount)}`;
  container.appendChild(input);
});

// Clear output
clearBtn.addEventListener('click', () => {
  deliberationContent.innerHTML = '';
  outputSection.classList.add('hidden');
});

// Main deliberation
deliberateBtn.addEventListener('click', async () => {
  const agents = parseInt(document.getElementById('agents').value);
  const rounds = parseInt(document.getElementById('rounds').value);
  const models = document.getElementById('models').value.split(',').map(m => m.trim());
  
  let endpoint, body;
  
  if (currentMode === 'ask') {
    const question = document.getElementById('question').value.trim();
    if (!question) {
      alert('Please enter a question');
      return;
    }
    endpoint = '/api/deliberate/stream';
    body = { question, agents, rounds, models };
  } else if (currentMode === 'review') {
    const fileContent = document.getElementById('code-content').value.trim();
    const filePath = document.getElementById('file-path').value.trim();
    if (!fileContent) {
      alert('Please paste code to review');
      return;
    }
    endpoint = '/api/review';
    body = { fileContent, filePath, agents, rounds, models };
  } else if (currentMode === 'decide') {
    const optionInputs = document.querySelectorAll('.option-input');
    const options = Array.from(optionInputs).map(i => i.value.trim()).filter(Boolean);
    if (options.length < 2) {
      alert('Please enter at least 2 options');
      return;
    }
    endpoint = '/api/decide';
    body = { options, agents, rounds, models };
  }
  
  // Show output section and loading state
  outputSection.classList.remove('hidden');
  deliberationContent.innerHTML = '<div class="loading">Council deliberating...</div>';
  deliberateBtn.disabled = true;
  
  try {
    if (currentMode === 'ask') {
      await streamDeliberation(endpoint, body);
    } else {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      
      const result = await response.json();
      renderResult(result);
    }
  } catch (error) {
    deliberationContent.innerHTML = `<div style="color: #ef4444;">Error: ${error.message}</div>`;
  } finally {
    deliberateBtn.disabled = false;
  }
});

// Stream deliberation with SSE
async function streamDeliberation(endpoint, body) {
  deliberationContent.innerHTML = '';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error('Stream request failed');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentTurnDiv = null;
  let currentRound = 0;
  let isSynthesis = false;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'round') {
            if (data.round > currentRound) {
              currentRound = data.round;
              const header = document.createElement('div');
              header.className = 'round-header';
              header.textContent = `Round ${data.round}`;
              deliberationContent.appendChild(header);
            }
            
            const turnDiv = document.createElement('div');
            turnDiv.className = 'persona-turn';
            turnDiv.innerHTML = `
              <div class="persona-name">${data.persona}</div>
              <div class="turn-content"></div>
            `;
            deliberationContent.appendChild(turnDiv);
            currentTurnDiv = turnDiv.querySelector('.turn-content');
          } else if (data.type === 'token' && currentTurnDiv) {
            currentTurnDiv.textContent += data.content;
            deliberationContent.scrollTop = deliberationContent.scrollHeight;
          } else if (data.type === 'done') {
            // Add synthesis
            const synthesisHeader = document.createElement('div');
            synthesisHeader.className = 'synthesis-header';
            synthesisHeader.textContent = '✨ Synthesis';
            deliberationContent.appendChild(synthesisHeader);
            
            const synthesisDiv = document.createElement('div');
            synthesisDiv.className = 'synthesis-content';
            synthesisDiv.textContent = data.result.synthesis;
            deliberationContent.appendChild(synthesisDiv);
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') {
            console.error('Parse error:', e);
          }
        }
      }
    }
  }
}

// Render non-streamed result
function renderResult(result) {
  deliberationContent.innerHTML = '';
  
  for (const round of result.rounds) {
    const header = document.createElement('div');
    header.className = 'round-header';
    header.textContent = `Round ${round.number}`;
    deliberationContent.appendChild(header);
    
    for (const turn of round.turns) {
      const turnDiv = document.createElement('div');
      turnDiv.className = 'persona-turn';
      turnDiv.innerHTML = `
        <div class="persona-name">
          ${turn.persona.name}
          <span class="persona-model">(${turn.model})</span>
        </div>
        <div class="turn-content">${turn.content}</div>
      `;
      deliberationContent.appendChild(turnDiv);
    }
  }
  
  const synthesisHeader = document.createElement('div');
  synthesisHeader.className = 'synthesis-header';
  synthesisHeader.textContent = '✨ Synthesis';
  deliberationContent.appendChild(synthesisHeader);
  
  const synthesisDiv = document.createElement('div');
  synthesisDiv.className = 'synthesis-content';
  synthesisDiv.textContent = result.synthesis;
  deliberationContent.appendChild(synthesisDiv);
}
