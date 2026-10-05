let produitsListeModifier = [];
let currentPageModifier = 1;
const produitsParPageModifier = 6;

// Format prix
function formatAr(value) {
  const num = parseFloat(value.toString().replace(/\s|Ar|,/g, ''));
  return isNaN(num) ? '' : num.toLocaleString('fr-FR') + ' Ar';
}

// Parse prix
function parseAr(value) {
  return parseFloat(value.toString().replace(/\s|Ar|\./g, '').replace(',', '.'));
}

// Afficher produits avec pagination
function afficherListeProduits(produits) {
  const container = document.getElementById('liste_produits_modifier');
  const msg = document.getElementById('msgModifier');
  container.innerHTML = '';

  if (!produits || produits.length === 0) {
    container.innerHTML = '<p>Aucun produit disponible.</p>';
    msg.textContent = '';
    return;
  }

  const totalPages = Math.ceil(produits.length / produitsParPageModifier);
  if (currentPageModifier > totalPages) currentPageModifier = totalPages;
  if (currentPageModifier < 1) currentPageModifier = 1;

  const start = (currentPageModifier - 1) * produitsParPageModifier;
  const end = start + produitsParPageModifier;
  const produitsPage = produits.slice(start, end);

  produitsPage.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'item-produit-modifier';
    card.innerHTML = `
      <div class="modifier-flex">
        <h3>${prod.nom}</h3>
        <p> Place: ${prod.place}</p>
        <p>Quantité: ${prod.quantite}</p>
        <p>Prix de vente: ${formatAr(prod.prix_vente)}</p>
      </div>
      <button onclick="chargerProduit(${prod.id})" class="btn-edit"><i class="fa fa-edit"></i></button>
    `;
    container.appendChild(card);
  });

  // Pagination boutons
  // const pagination = document.createElement('div');
  // pagination.className = 'flex-pagination';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'prev';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = currentPageModifier === 1;
  prevBtn.onclick = () => {
    currentPageModifier--;
    afficherListeProduits(produits);
  };

  const nextBtn = document.createElement('button');
  nextBtn.className = 'next';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPageModifier === totalPages;
  nextBtn.onclick = () => {
    currentPageModifier++;
    afficherListeProduits(produits);
  };

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
  // container.appendChild(pagination);

  msg.textContent = `Page ${currentPageModifier} / ${totalPages}`;
}

// Chargement initial
async function chargerProduitsModifier() {
  const result = await window.pywebview.api.lister_produits();
  if (result.success) {
    produitsListeModifier = result.produits;
    currentPageModifier = 1;
    afficherListeProduits(produitsListeModifier);
  } else {
    document.getElementById('liste_produits_modifier').innerHTML = '<p>Erreur chargement des produits.</p>';
  }
}

function showLoader() {
  document.getElementById('loaderModifier').style.display = 'block';
}
function hideLoader() {
  document.getElementById('loaderModifier').style.display = 'none';
}

async function chargerProduit(id) {
  const msg = document.getElementById('msgModifier');
  showLoader();

  try {
    const data = await window.pywebview.api.get_produit_by_id(id);
    if (!data || data.error) {
      msg.textContent = data.message || 'Produit introuvable.';
      return;
    }

    // Affiche le produit à modifier
    const container = document.getElementById('liste_produits_modifier');
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'item-produit-modifier';
    card.innerHTML = `
      <h3>${data.nom}</h3>
      <p>Quantité: ${data.quantite}</p>
      <p>Prix de vente: ${formatAr(data.prix_vente)}</p>
    `;
    container.appendChild(card);

    // Remplir formulaire
    document.getElementById('mod_id').value = data.id;
    document.getElementById('mod_nom').value = data.nom;
    document.getElementById('mod_place').value = data.place;
    document.getElementById('mod_caracteristique').value = data.caracteristique;
    document.getElementById('mod_prix_achat').value = formatAr(data.prix_achat);
    document.getElementById('mod_prix_vente').value = formatAr(data.prix_vente);
    document.getElementById('mod_quantite').value = data.quantite;

    const form = document.getElementById('formModifier');
    form.style.display = 'block';
    setTimeout(() => form.classList.add('show'), 10);
    msg.textContent = '';
  } catch (e) {
    msg.textContent = 'Erreur : ' + e.message;
  } finally {
    hideLoader();
  }
}

document.getElementById('formModifier').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('mod_id').value;
  const nom = document.getElementById('mod_nom').value.trim();
  const place = document.getElementById('mod_place').value;
  const caracteristique = document.getElementById('mod_caracteristique').value.trim();
  const prix_achat = parseAr(document.getElementById('mod_prix_achat').value);
  const prix_vente = parseAr(document.getElementById('mod_prix_vente').value);
  const quantite = parseInt(document.getElementById('mod_quantite').value);
  const msg = document.getElementById('msgModifier');

  if (!nom || !place || !caracteristique || isNaN(prix_achat) || isNaN(prix_vente) || isNaN(quantite)) {
    msg.style.color = 'red';
    msg.textContent = 'Tous les champs sont obligatoires.';
    return;
  }

  try {
    const data = await window.pywebview.api.modifier_produit({
      id, nom, place, caracteristique, prix_achat, prix_vente, quantite
    });

    if (data.success) {
      msg.style.color = 'green';
      msg.textContent = 'Produit modifié avec succès.';
      document.getElementById('formModifier').style.display = 'none';
      await chargerProduitsModifier();
      showNotification('Produit modifié avec succès');
    } else {
      msg.style.color = 'red';
      msg.textContent = 'Erreur : ' + data.message;
    }
  } catch (e) {
    msg.style.color = 'red';
    msg.textContent = 'Erreur : ' + e.message;
  }
});

function resetFormModifier() {
  document.getElementById('formModifier').style.display = 'none';
  document.getElementById('formModifier').reset();
  document.getElementById('msgModifier').textContent = '';
  chargerProduitsModifier();
}

// Recherche en direct
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('recherche_mod');
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const filtres = produitsListeModifier.filter(prod =>
      prod.nom.toLowerCase().includes(query)
    );
    currentPageModifier = 1;
    afficherListeProduits(filtres);
  });
});

// Charger produits au démarrage
window.onload = () => {
  chargerProduitsModifier();
};
