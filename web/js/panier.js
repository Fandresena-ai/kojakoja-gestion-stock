// panier.js

function formatAr(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR') + ' Ar';
}

function afficherPanier() {
  const panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const container = document.getElementById('panier_produits');
  const msgBox = document.querySelector('.panierMsg');
  container.innerHTML = '';
  msgBox.textContent = '';

  if (panier.length === 0) {
    container.innerHTML = '<p>Le panier est vide.</p>';
    return;
  }

  let totalGeneral = 0;

  panier.forEach((prod, index) => {
    const prixTotalProduit = prod.prix_vente * prod.quantiteAchat;
    totalGeneral += prixTotalProduit;
    const isOutOfStock = prod.quantiteAchat > prod.quantite;

    const card = document.createElement('div');
    card.className = 'carte-panier';
    card.innerHTML = `
      <h3>${prod.nom}</h3>
      <p>Prix unitaire: ${formatAr(prod.prix_vente)}</p>
      <label for="quantite_input_${index}">Quantité:</label>
      <input type="number" 
             id="quantite_input_${index}" 
             class="input-quantite"
             min="1" 
             value="${prod.quantiteAchat}" 
             ${prod.quantite <= 0 ? 'disabled' : ''}
             onchange="changerQuantiteInput(${index}, this.value)"
             oninput="this.value = this.value.replace(/[^0-9]/g, '')"
      /> 
      <p>Quantité dispo: ${prod.quantiteDispo}</p>
      ${isOutOfStock ? `<p style="color: red;">Stock insuffisant pour cette quantité.</p>` : ''}
      <p>Prix total: <span id="prix_total_${index}">${formatAr(prixTotalProduit)}</span></p>
      <button onclick="supprimerDuPanier(${index})" class="btn-delete-panier">Supprimer</button>
    `;
    container.appendChild(card);
  });

  const totalDiv = document.createElement('div');
  totalDiv.id = 'total_general_panier';
  totalDiv.style.fontWeight = 'bold';
  totalDiv.style.marginTop = '15px';
  totalDiv.textContent = `Total général : ${formatAr(totalGeneral)}`;
  container.appendChild(totalDiv);
}

function changerQuantiteInput(index, value) {
  let panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  let prod = panier[index];
  const msgBox = document.querySelector('.panierMsg');
  msgBox.textContent = '';

  if (!prod) return;

  let stockMax = prod.quantite;
  let nouvelleQuantite = parseInt(value);

  if (isNaN(nouvelleQuantite) || nouvelleQuantite < 1) {
    nouvelleQuantite = 1;
    msgBox.textContent = "La quantité doit être au moins de 1.";
  } else if (nouvelleQuantite > stockMax) {
    msgBox.textContent = `Stock insuffisant pour "${prod.nom}". Max: ${stockMax}`;
  }

  prod.quantiteAchat = nouvelleQuantite;
  sessionStorage.setItem('panier', JSON.stringify(panier));

  afficherPanier();
  majPanierCount();
}

function modifierQuantite(index, delta) {
  let panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  let prod = panier[index];
  if (!prod) return;

  let nouvelleQuantite = prod.quantiteAchat + delta;
  if (nouvelleQuantite < 1) return;

  prod.quantiteAchat = nouvelleQuantite;
  sessionStorage.setItem('panier', JSON.stringify(panier));

  afficherPanier();
  majPanierCount();
}

function supprimerDuPanier(index) {
  let panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  panier.splice(index, 1);
  sessionStorage.setItem('panier', JSON.stringify(panier));
  afficherPanier();
  majPanierCount();
}

// -------------------------
// Anti double-clic
// -------------------------
let actionEnCours = false;
function desactiverBoutonsPendant(ms = 2000) {
  actionEnCours = true;
  setTimeout(() => (actionEnCours = false), ms);
}

// -------------------------
// Enregistrer + ouvrir PDF
// -------------------------
async function enregistrerPdf() {
  if (actionEnCours) return;
  desactiverBoutonsPendant();

  const panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const msgBox = document.querySelector('.panierMsg');
  msgBox.textContent = '';

  if (panier.length === 0) {
    msgBox.style.color = 'red';
    msgBox.textContent = "Panier vide. Impossible d'enregistrer.";
    return;
  }

  try {
    const result = await window.pywebview.api.enregistrer_vente(JSON.stringify(panier));

    if (result.success) {
      msgBox.style.color = 'green';
      msgBox.textContent = `Vente enregistrée : ${result.filename}`;

      await window.pywebview.api.ouvrir_pdf(result.path);

      sessionStorage.removeItem('panier');
      afficherPanier();
      majPanierCount();

      if (typeof chargerHistorique === 'function') {
        await chargerHistorique();
      }
    } else {
      msgBox.style.color = 'red';
      msgBox.textContent = 'Erreur : ' + result.message;
    }
  } catch (e) {
    msgBox.style.color = 'red';
    msgBox.textContent = 'Erreur de communication avec le backend.';
    console.error(e);
  }
}

// -------------------------
// Enregistrer + générer PNG (pour impression smartphone)
// -------------------------
async function enregistrerPng() {
  if (actionEnCours) return;
  desactiverBoutonsPendant();

  const panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const msgBox = document.querySelector('.panierMsg');
  msgBox.textContent = '';

  if (panier.length === 0) {
    msgBox.style.color = 'red';
    msgBox.textContent = "Panier vide. Impossible de générer le ticket.";
    return;
  }

  try {
    const result = await window.pywebview.api.enregistrer_vente_png(JSON.stringify(panier));

    if (result.success) {
      msgBox.style.color = 'green';
      msgBox.textContent = `Ticket PNG prêt pour smartphone : ${result.filename}`;

      // Ouvre le PNG avec la visionneuse par défaut
      await window.pywebview.api.ouvrir_pdf(result.path);

      sessionStorage.removeItem('panier');
      afficherPanier();
      majPanierCount();

      if (typeof chargerHistorique === 'function') {
        await chargerHistorique();
      }
    } else {
      msgBox.style.color = 'red';
      msgBox.textContent = 'Erreur : ' + result.message;
    }
  } catch (e) {
    msgBox.style.color = 'red';
    msgBox.textContent = 'Erreur de communication avec le backend.';
    console.error(e);
  }
}

// -------------------------
// Prévisualiser (PDF sans enregistrement BDD)
// -------------------------
async function previewVente() {
  if (actionEnCours) return;
  desactiverBoutonsPendant();

  const panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const msgBox = document.querySelector('.panierMsg');
  msgBox.textContent = '';

  if (panier.length === 0) {
    msgBox.style.color = 'red';
    msgBox.textContent = 'Panier vide. Impossible de prévisualiser.';
    return;
  }

  try {
    const result = await window.pywebview.api.previsualiser_pdf(panier);

    if (result.success) {
      msgBox.style.color = 'green';
      msgBox.textContent = 'Prévisualisation ouverte.';
    } else {
      msgBox.style.color = 'red';
      msgBox.textContent = result.message;
    }
  } catch (e) {
    msgBox.style.color = 'red';
    msgBox.textContent = 'Erreur de communication avec le backend.';
    console.error(e);
  }
}

// -------------------------
// Historique des ventes
// -------------------------
async function chargerHistorique() {
  try {
    const result = await window.pywebview.api.get_historique_ventes();
    if (!result.success) throw new Error(result.message);

    const ventesAuj = result.aujourdhui || [];
    const tbodyAuj = document.getElementById('ventes-aujourdhui');
    tbodyAuj.innerHTML = '';
    let totalAuj = 0;
    ventesAuj.forEach(vente => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${vente.nom}</td><td>${vente.prix.toLocaleString('fr-FR')} Ar</td>`;
      tbodyAuj.appendChild(tr);
      totalAuj += vente.prix;
    });
    document.getElementById('total-aujourdhui').textContent = totalAuj.toLocaleString('fr-FR') + ' Ar';

    const ventesHier = result.hier || [];
    const tbodyHier = document.getElementById('ventes-hier');
    tbodyHier.innerHTML = '';
    let totalHier = 0;
    ventesHier.forEach(vente => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${vente.nom}</td><td>${vente.prix.toLocaleString('fr-FR')} Ar</td>`;
      tbodyHier.appendChild(tr);
      totalHier += vente.prix;
    });
    document.getElementById('total-hier').textContent = totalHier.toLocaleString('fr-FR') + ' Ar';
  } catch (e) {
    console.error('Erreur chargement historique:', e);
  }
}

// -------------------------
// Utilitaires panier
// -------------------------
function onPagePanierVisible() {
  afficherPanier();
}

function majPanierCount() {
  const btnPanier = document.querySelector('button.item[data-target="panier"] .panier-count');
  if (!btnPanier) return;
  const panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const totalCommandes = panier.reduce((acc, p) => acc + (p.quantiteAchat || 0), 0);
  btnPanier.textContent = totalCommandes;
}

window.onload = async () => {
  afficherPanier();
  majPanierCount();
  if (typeof chargerHistorique === 'function') {
    await chargerHistorique();
  }
};