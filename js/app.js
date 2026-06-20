const COLORS = [
  '#e94560', '#0f3460', '#1a9e8f', '#e4a11b',
  '#7c3aed', '#06b6d4', '#f43f5e', '#10b981',
  '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'
];

let tiles = [];
let currentAudio = null;
let currentTileId = null;
let audioCtx = null;
let dragSrcId = null;

const grid = document.getElementById('tileGrid');
const emptyState = document.getElementById('emptyState');
const nowBar = document.getElementById('nowBar');
const nowLabel = document.getElementById('nowLabel');
const nowProgress = document.getElementById('nowProgress');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getColor(i) {
  return COLORS[i % COLORS.length];
}

function renderTiles() {
  grid.innerHTML = '';
  if (tiles.length === 0) {
    grid.style.display = 'flex';
    grid.style.flex = '1';
    grid.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }
  grid.style.display = '';
  grid.style.flex = '';
  emptyState.style.display = 'none';
  tiles.forEach((tile, i) => {
    const div = document.createElement('div');
    div.className = 'tile';
    div.dataset.id = tile.id;
    div.draggable = true;
    div.style.setProperty('--tile-color', getColor(i));

    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = tile.label;

    const playIcon = document.createElement('span');
    playIcon.className = 'tile-icon';
    playIcon.textContent = '▶';

    div.appendChild(playIcon);
    div.appendChild(label);

    if (currentTileId === tile.id && currentAudio && !currentAudio.paused) {
      div.classList.add('playing');
    }

    div.addEventListener('click', () => playTile(tile));

    div.addEventListener('dragstart', e => {
      dragSrcId = tile.id;
      e.dataTransfer.effectAllowed = 'move';
    });
    div.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.tile').forEach(t => t.classList.remove('drag-over'));
      div.classList.add('drag-over');
    });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('drag-over');
      if (dragSrcId && dragSrcId !== tile.id) reorderTiles(dragSrcId, tile.id);
      dragSrcId = null;
    });
    div.addEventListener('dragend', () => {
      grid.querySelectorAll('.tile').forEach(t => t.classList.remove('drag-over'));
    });

    let touchStartY, touchStartX, dragging;
    div.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      dragging = false;
      dragSrcId = tile.id;
    }, { passive: true });
    div.addEventListener('touchmove', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (!dragging && Math.hypot(dx, dy) < 12) return;
      e.preventDefault();
      dragging = true;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.classList.contains('tile') && el.dataset.id !== tile.id) {
        grid.querySelectorAll('.tile').forEach(t => t.classList.remove('drag-over'));
        el.classList.add('drag-over');
      }
    }, { passive: false });
    div.addEventListener('touchend', e => {
      if (!dragging) return;
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      grid.querySelectorAll('.tile').forEach(t => t.classList.remove('drag-over'));
      if (el && el.classList.contains('tile') && el.dataset.id !== dragSrcId && dragSrcId) {
        const targetId = el.dataset.id;
        reorderTiles(dragSrcId, targetId);
      }
      dragSrcId = null;
      dragging = false;
    });

    grid.appendChild(div);
  });
}

function reorderTiles(fromId, toId) {
  const fromIdx = tiles.findIndex(t => t.id === fromId);
  const toIdx = tiles.findIndex(t => t.id === toId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = tiles.splice(fromIdx, 1);
  tiles.splice(toIdx, 0, moved);
  tiles.forEach((t, i) => t.order = i);
  renderTiles();
  db.updateOrder(tiles.map(t => ({ id: t.id, order: t.order })));
}

function playTile(tile) {
  stopCurrent();

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const blob = tile.fileData;
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentTileId = tile.id;

  audio.addEventListener('loadedmetadata', () => {
    nowBar.classList.remove('hidden');
    nowLabel.textContent = tile.label;
    nowProgress.max = audio.duration || 100;
    playBtn.textContent = '⏸';
  });

  audio.addEventListener('timeupdate', () => {
    nowProgress.value = audio.currentTime;
  });

  audio.addEventListener('ended', () => {
    stopCurrent();
  });

  audio.addEventListener('error', () => {
    URL.revokeObjectURL(url);
    stopCurrent();
  });

  audio.play().catch(() => {
    URL.revokeObjectURL(url);
    stopCurrent();
  });

  renderTiles();
}

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio.load();
    currentAudio = null;
  }
  if (currentTileId) {
    currentTileId = null;
    renderTiles();
  }
  nowBar.classList.add('hidden');
  nowLabel.textContent = '';
  nowProgress.value = 0;
  playBtn.textContent = '▶';
}

function togglePlay() {
  if (!currentAudio) return;
  if (currentAudio.paused) {
    currentAudio.play();
    playBtn.textContent = '⏸';
  } else {
    currentAudio.pause();
    playBtn.textContent = '▶';
  }
}

async function initAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

playBtn.addEventListener('click', togglePlay);
stopBtn.addEventListener('click', stopCurrent);

settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.remove('hidden');
  if (typeof loadSettings === 'function') loadSettings();
});

settingsClose.addEventListener('click', () => {
  settingsOverlay.classList.add('hidden');
});

async function loadTiles() {
  tiles = await db.getAll();
  tiles.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTiles();
}

loadTiles();

document.addEventListener('click', () => initAudioCtx(), { once: true });

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
