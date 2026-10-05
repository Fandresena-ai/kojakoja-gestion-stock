async function enregistrerNotes() {
  const message = document.getElementById('notes_message');
  const contenu = document.getElementById('notes_text').value.trim();
  const noteId = document.getElementById('notes_text').dataset.editingId;

  if (!contenu) {
    message.style.color = 'red';
    message.textContent = 'Le champ note est vide.';
    return;
  }

  let result;
  if (noteId) {
    result = await window.pywebview.api.modifier_note(parseInt(noteId), contenu);
  } else {
    result = await window.pywebview.api.ajouter_notes(contenu);
  }

  if (result.success) {
    message.style.color = 'green';
    message.textContent = result.message;
    document.getElementById('notes_text').value = '';
    document.getElementById('notes_text').dataset.editingId = '';
    await chargerNotes();
  } else {
    message.style.color = 'red';
    message.textContent = 'Erreur : ' + result.message;
  }
}

async function chargerNotes() {
  const res = await window.pywebview.api.lister_notes();
  const message = document.getElementById('notes_message');

  if (res.success) {
    affichernotes(res.notes);
    message.textContent = '';
  } else {
    message.style.color = 'red';
    message.textContent = 'Erreur : ' + res.message;
  }
}

function affichernotes(notes) {
  const container = document.querySelector('.liste_noter');
  container.innerHTML = '';

  if (!notes.length) {
    container.innerHTML = '<p>Aucune note enregistrée.</p>';
    return;
  }

  notes.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'carte-note';

    const date = new Date(note.date_creation).toLocaleString('fr-FR');

    card.innerHTML = `
      <p><span class="note-icon"></span><strong>${note.contenu}</strong></p>
      <p><small>Ajoutée le ${date}</small></p>
      <div class="note-actions">
        <button onclick="editerNote(${note.id}, \`${note.contenu.replace(/`/g, '\\`')}\`)" class="btn-note-modifier">Modifier</button>
        <button onclick="supprimerNote(${note.id})" class="btn-note-supprimer">Supprimer</button>
      </div>
    `;
    container.appendChild(card);
  });
}


function editerNote(id, contenu) {
  const textarea = document.getElementById('notes_text');
  textarea.value = contenu;
  textarea.dataset.editingId = id;
  document.getElementById('notes_message').textContent = 'Modification en cours...';
}

async function supprimerNote(id) {
  const confirmer = confirm("Voulez-vous supprimer cette note ?");
  if (!confirmer) return;

  const res = await window.pywebview.api.supprimer_note(id);
  const message = document.getElementById('notes_message');

  if (res.success) {
    message.style.color = 'green';
    message.textContent = res.message;
    await chargerNotes();
  } else {
    message.style.color = 'red';
    message.textContent = 'Erreur : ' + res.message;
  }
}
// John lennon