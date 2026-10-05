let produitsListe = [];  // tous les produits
let currentPage = 1;
const produitsParPage = 6;
let triAsc = true;  // Pour gérer le tri A-Z / Z-A


/* fonction sécurisée pour récupérer la quantité, quel que soit le nom utilisé */
function getQuantite(prod) {
  return (
    prod.quantite ??
    prod.stock ??
    prod.qte ??
    prod.quantite_stock ??
    prod.quantiteDispo ??
    0
  );
}


function formatAr(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR') + ' Ar';
}


async function chargerProduits() {
  const result = await window.pywebview.api.lister_produits();
  if (result.success) {
    produitsListe = result.produits;
    currentPage = 1;
    afficherPageProduits();
  } else {
    console.error("Erreur lors du chargement des produits :", result.message);
    document.getElementById('liste_produits').innerHTML =
      '<p>Erreur lors du chargement des produits.</p>';
  }
}


function afficherPageProduits(filtrés) {
  const liste = Array.isArray(filtrés) ? filtrés : produitsListe;
  const container = document.getElementById('liste_produits');
  const msgListe = document.getElementById('msgListe');
  container.innerHTML = '';

  if (!liste.length) {
    container.innerHTML = '<p>Aucun produit trouvé.</p>';
    return;
  }

  const totalPages = Math.ceil(liste.length / produitsParPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * produitsParPage;
  const endIndex = startIndex + produitsParPage;
  const produitsPage = liste.slice(startIndex, endIndex);

  // boutons prev / next
  const prevBtn = document.createElement('button');
  prevBtn.className = 'prev';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = (currentPage === 1);
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      afficherPageProduits(liste);
    }
  };

  const nextBtn = document.createElement('button');
  nextBtn.className = 'next';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = (currentPage === totalPages);
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      afficherPageProduits(liste);
    }
  };

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);

  const cartesWrapper = document.createElement('div');
  cartesWrapper.classList.add('cartes-wrapper');

  produitsPage.forEach(prod => {
    const quantite = getQuantite(prod);  // <-- correction ici
    console.log("PRODUIT :", prod);

    const card = document.createElement('div');
    card.className = 'carte-produit';
    card.dataset.id = prod.id;

    card.innerHTML = `
      <div class="emplacement">${prod.place}</div>
      <div class="img-produit-carte">
        <img src="${prod.image}" alt="${prod.nom}" class="image-produit" />
      </div>
      <div class="flex-produit-carte">
        <div class="line-font"> 
          <h3 class="title-produit">${prod.nom}</h3>
          <p class="quantite-produit">Celle-ci a une particularité pour le: <strong>${prod.caracteristique}</strong></p>
          <p class="quantite-produit">Avec une quantité de: ${quantite}</p>
          <p class="stars">⭐️⭐️⭐️⭐️⭐️</p>
        </div>
        <div class="plaque-prix">
          <div class="prix-ariary"><p>${formatAr(prod.prix_vente)}</p></div>
          <div class="btn-flex-produit-carte">
              <i data-id="${prod.id}" class="fa fa-shopping-cart" title="Ajouter au panier"></i>
              <i data-id="${prod.id}" class="fa fa-trash" title="Supprimer le produit"></i>
          </div>
        </div>
      </div>
    `;

    cartesWrapper.appendChild(card);
  });

  container.appendChild(cartesWrapper);
  msgListe.textContent = `Page ${currentPage} / ${totalPages}`;
}


function chercherListeProduits() {
  const nom = document.getElementById('recherche_liste').value.trim().toLowerCase();
  if (!nom) {
    currentPage = 1;
    afficherPageProduits();
    return;
  }
  const filtres = produitsListe.filter(p => p.nom.toLowerCase().includes(nom));
  currentPage = 1;
  afficherPageProduits(filtres);
}


function trierAZ() {
  const tri = [...produitsListe].sort((a, b) =>
    triAsc ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom)
  );

  triAsc = !triAsc;
  const btn = document.querySelector('#btn-trie');
  if (btn) btn.textContent = triAsc ? 'Trier A-Z' : 'Trier Z-A';

  currentPage = 1;
  afficherPageProduits(tri);
}


async function supprimerProduit(id) {
  if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;

  const result = await window.pywebview.api.supprimer_produit(id);
  if (result.success) {
    produitsListe = produitsListe.filter(p => p.id !== id);
    const totalPages = Math.ceil(produitsListe.length / produitsParPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    afficherPageProduits();
    document.getElementById('msgListe').textContent = 'Produit supprimé avec succès.';
  } else {
    document.getElementById('msgListe').textContent =
      'Erreur : ' + result.message;
  }
}


function vendreProduit(id) {
  const msgListe = document.getElementById('msgListe');
  msgListe.style.color = 'black';
  msgListe.textContent = '';

  const produit = produitsListe.find(p => p.id === id);

  if (!produit) {
    msgListe.textContent = "Produit introuvable.";
    return;
  }

  const quantiteDispo = getQuantite(produit);  // <-- Correction

  if (quantiteDispo <= 0) {
    msgListe.textContent = `Désolé, "${produit.nom}" est en rupture de stock.`;
    return;
  }

  let panier = JSON.parse(sessionStorage.getItem('panier') || '[]');
  const exist = panier.find(p => p.id === id);

  if (exist) {
    if (exist.quantiteAchat < quantiteDispo) {
      exist.quantiteAchat += 1;
    } else {
      msgListe.textContent = `Stock insuffisant pour "${exist.nom}".`;
      return;
    }
  } else {
    const nouvelleQuantite = quantiteDispo - 1;
    panier.push({
      id: produit.id,
      nom: produit.nom,
      prix_vente: produit.prix_vente,
      quantiteDispo: nouvelleQuantite,     // <-- Correction
      quantiteAchat: 1
    });
  }

  try {
    sessionStorage.setItem('panier', JSON.stringify(panier));
    majPanierCount();
    msgListe.style.color = 'green';
    msgListe.textContent = `"${produit.nom}" ajouté au panier.`;
  } catch (e) {
    msgListe.style.color = 'red';
    msgListe.textContent = "Erreur : impossible d’ajouter le produit.";
  }
}


document.getElementById('liste_produits').addEventListener('click', (event) => {
  const target = event.target;
  if (target.classList.contains('fa-shopping-cart')) {
    const id = parseInt(target.dataset.id);
    if (!isNaN(id)) vendreProduit(id);
  } else if (target.classList.contains('fa-trash')) {
    const id = parseInt(target.dataset.id);
    if (!isNaN(id)) supprimerProduit(id);
  }
});


window.onload = async () => {
  await chargerProduits();
  majPanierCount();
};
