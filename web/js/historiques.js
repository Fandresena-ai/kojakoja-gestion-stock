function formatAr(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR') + ' Ar';
}

async function chargerHistorique() {
    try {
      const data = await window.pywebview.api.get_historique_ventes();
      if (data.success) {
        const aujList = document.getElementById('ventes-aujourdhui');
        const hierList = document.getElementById('ventes-hier');
  
        aujList.innerHTML = '';
        hierList.innerHTML = '';
  
        data.aujourdhui.forEach(v => {
          aujList.innerHTML += `<tr><td>${v.nom}</td>
          <td>${formatAr(v.prix)}</td></tr>`;
        });
  
        data.hier.forEach(v => {
          hierList.innerHTML += `<tr><td>${v.nom}</td> 
          <td> ${formatAr(v.prix)}</td></tr>`;
        });
  
        document.getElementById('total-aujourdhui').innerText = formatAr(data.total_aujourdhui);
        document.getElementById('total-hier').innerText = formatAr(data.total_hier);
      }
    } catch (e) {
      console.error('Erreur chargement historique:', e);
    }
  }
  