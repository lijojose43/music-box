const settingsList = document.getElementById('settingsList');
const addBtn = document.getElementById('addTileBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalLabel = document.getElementById('modalLabel');
const modalFile = document.getElementById('modalFile');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');
const modalDelete = document.getElementById('modalDelete');

let editingId = null;

function loadSettings() {
  settingsList.innerHTML = '';
  tiles.forEach((tile, i) => {
    const item = document.createElement('div');
    item.className = 'settings-item';

    const colorBar = document.createElement('div');
    colorBar.className = 'settings-color';
    colorBar.style.background = getColor(i);

    const info = document.createElement('div');
    info.className = 'settings-info';
    const name = document.createElement('span');
    name.textContent = tile.label;
    const file = document.createElement('small');
    file.textContent = tile.fileName || 'Unknown file';
    info.appendChild(name);
    info.appendChild(file);

    const actions = document.createElement('div');
    actions.className = 'settings-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEdit(tile));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteTile(tile.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(colorBar);
    item.appendChild(info);
    item.appendChild(actions);
    settingsList.appendChild(item);
  });
}

function openAdd() {
  editingId = null;
  modalTitle.textContent = 'Add Tile';
  modalLabel.value = '';
  modalFile.value = '';
  modalDelete.classList.add('hidden');
  modal.classList.remove('hidden');
}

function openEdit(tile) {
  editingId = tile.id;
  modalTitle.textContent = 'Edit Tile';
  modalLabel.value = tile.label;
  modalFile.value = '';
  modalDelete.classList.remove('hidden');
  modal.classList.remove('hidden');
}

async function deleteTile(id) {
  if (!confirm('Delete this tile?')) return;
  await db.remove(id);
  tiles = tiles.filter(t => t.id !== id);
  renderTiles();
  loadSettings();
}

modalCancel.addEventListener('click', () => {
  modal.classList.add('hidden');
});

modalSave.addEventListener('click', async () => {
  const label = modalLabel.value.trim();
  if (!label) return alert('Please enter a label');

  const file = modalFile.files[0];

  if (editingId) {
    const idx = tiles.findIndex(t => t.id === editingId);
    if (idx === -1) return;

    if (file) {
      const blob = file;
      tiles[idx].fileData = blob;
      tiles[idx].fileName = file.name;
    }
    tiles[idx].label = label;
    tiles[idx].updatedAt = new Date().toISOString();

    await db.put(tiles[idx]);
  } else {
    if (!file) return alert('Please select an audio file');

    const blob = file;
    const tile = {
      id: genId(),
      label,
      fileName: file.name,
      fileData: blob,
      order: tiles.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.add(tile);
    tiles.push(tile);
  }

  modal.classList.add('hidden');
  renderTiles();
  loadSettings();
});

modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

addBtn.addEventListener('click', openAdd);
