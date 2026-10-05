let produitsVendus = [];

async function chargerVendus() {
  try {
    const res = await window.pywebview.api.get_vendus_hier_auj();
    if (res.success) {
      produitsVendus = res.data;
      afficherVendus(produitsVendus);
    } else {
      document.getElementById('conteneur_vendus').innerHTML = `<p>Erreur: ${res.message}</p>`;
    }
  } catch (err) {
    document.getElementById('conteneur_vendus').innerHTML = `<p>Erreur: ${err.message}</p>`;
  }
}

function afficherVendus(liste) {
  const conteneur = document.getElementById('conteneur_vendus');
  if (liste.length === 0) {
    conteneur.innerHTML = '<p>Aucun produit vendu hier ou aujourd\'hui.</p>';
    return;
  }
  conteneur.innerHTML = '';

  liste.forEach(p => {
    const div = document.createElement('div');
    div.classList.add('carte');
    div.innerHTML = `
      <h3>${p.nom}</h3>
      <p>Prix de vente: ${formatAr(p.prix_vente)}</p>
      <p>Quantité vendue: ${p.quantite_vendue}</p>
      <p>Date vente: ${p.date_vente}</p>
    `;
    conteneur.appendChild(div);
  });
}

function filtrerVendus() {
  const filtre = document.getElementById('searchVendus').value.toLowerCase();
  const filtredList = produitsVendus.filter(p => p.nom.toLowerCase().includes(filtre));
  afficherVendus(filtredList);
}

function onPageListeVendusVisible() {
  chargerVendus();
}
