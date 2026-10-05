async function afficherStockFaible() {
    const section = document.getElementById('stock_faible_section');
    const liste = document.getElementById('stock_faible_liste');
    try {
      const res = await window.pywebview.api.get_produits_stock_faible(5); // seuil = 5
      if (res.success && res.data.length > 0) {
        liste.innerHTML = '';
        res.data.forEach(item => {
          const li = document.createElement('li');
          li.textContent = `Il vous reste que ${item.quantite} quantité${item.quantite > 1 ? 's' : ''} de ${item.nom}.`;
          liste.appendChild(li);
        });
      }
    } catch (e) {
      console.error('Erreur affichage stock faible :', e);
      section.style.display = 'none';
    }
}

// window.onload = () => {
//     afficherStockFaible();
// };  