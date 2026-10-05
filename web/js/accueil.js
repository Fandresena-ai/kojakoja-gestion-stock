function formatAr(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR') + ' Ar';
}

async function afficherStats() {
  try {
    const res = await window.pywebview.api.get_stats();
    if (!res.success) {
      console.error('Erreur backend:', res.message);
      return;
    }

    const { benefices_jour, benefices_mois, ventes_mois, produits_plus_vendus } = res;

    // Fonction pour formater les montants en Ariary
    const formatAr = (val) => parseFloat(val || 0).toLocaleString('fr-FR') + ' Ar';

    // Calcul du max pour le pourcentage des cercles
    const maxVal = Math.max(benefices_jour, benefices_mois, ventes_mois, 1);

    // Mise à jour des cercles avec animation
    animateCircle('circle1', 'pct-jour', 'val-jour', benefices_jour, maxVal);
    animateCircle('circle2', 'pct-mois', 'val-mois', benefices_mois, maxVal);
    animateCircle('circle3', 'pct-ventes', 'val-ventes', ventes_mois, maxVal);

    // Mise à jour texte des valeurs avec format monétaire
    document.getElementById('val-jour').textContent = formatAr(benefices_jour);
    document.getElementById('val-mois').textContent = formatAr(benefices_mois);
    document.getElementById('val-ventes').textContent = formatAr(ventes_mois);

    // Affichage de la liste des produits les plus vendus
    const liste = document.getElementById('liste-produits');
    liste.innerHTML = '';
    if (produits_plus_vendus.length === 0) {
      liste.innerHTML = '<li>Aucun produit vendu ce mois-ci</li>';
      return;
    }

    produits_plus_vendus.forEach(p => {
      const tr = document.createElement('tr');
      const montantFormatted = formatAr(p.montant);
      tr.innerHTML = `
        <td>${p.nom}</td>
        <td>${montantFormatted}</td>
        <td>${p.quantite} vendu(s)</td>`;
      liste.appendChild(tr);
    });

  } catch (error) {
    console.error('Erreur JS (frontend stats):', error);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  afficherStats();
});

function animateCircle(idCircle, idPct, idVal, value, maxValue) {
  const pctElem = document.getElementById(idPct);
  const circle = document.getElementById(idCircle);
  const r = circle.getAttribute('r');
  const circ = 2 * Math.PI * r;
  const pct = maxValue ? Math.round((value / maxValue) * 100) : 0;

  circle.style.strokeDasharray = circ;
  circle.style.strokeDashoffset = circ;

  let count = 0;
  const step = pct > 0 ? Math.ceil(pct / 20) : 1;

  const interval = setInterval(() => {
    count = Math.min(count + step, pct);
    pctElem.textContent = count + '%';
    circle.style.strokeDashoffset = circ * (1 - count / 100);
    if (count >= pct) clearInterval(interval);
  }, 50);
}

// const percentage = document.querySelectorAll(".percentage p");


// async function fetchStats() {
//   const bj = await window.pywebview.api.stats_benefices_jour();
//   const bm = await window.pywebview.api.stats_benefices_mois();
//   const vm = await window.pywebview.api.stats_ventes_mois();
//   return { bj, bm, vm };
//   console.log("Produits vendu jours :", bj);
//   console.log("Produits vendu mois :", bm);
//   console.log("Produits totale vendus :", vm);
// }
  
// window.onload = async () => {
//   await fetchStats();
// };

// function animateCircle(idCircle, idPct, idVal, value, maxValue) {
//   const pctElem = document.getElementById(idPct);
//   const valElem = document.getElementById(idVal);
//   const circle = document.getElementById(idCircle);
//   const r = circle.getAttribute('r');
//   const circ = 2 * Math.PI * r;
//   const pct = maxValue ? Math.round((value / maxValue) * 100) : 0;
//   const offset = circ * (1 - pct / 100);

//   circle.style.strokeDasharray = circ;
//   circle.style.strokeDashoffset = circ * (1 - pct / 100);
//   valElem.textContent = value ? value.toLocaleString('fr-FR') + ' Ar' : '0 Ar';

//   let count = 0;
//   const step = pct > 0 ? Math.ceil(pct / 20) : 1;
//   const interval = setInterval(() => {
//     count = Math.min(count + step, pct);
//     pctElem.textContent = count + '%';
//     circle.style.strokeDashoffset = circ * (1 - count / 100);
//     if (count >= pct) clearInterval(interval);
//   }, 50);
// } 

// percentage.forEach((e,i)=>{//chaque fois qu'on recupere les element percentage
//   // je vais le parcourir un par un
//   let val = parseInt(e.textContent);//on peut recuperer le contenu et le changer on int
//   console.log(val);
//   let circle = document.getElementById(`circle${i+1}`);//on recupere l'element circle un par un 
//   let r = circle.getAttribute("r");//apres on recupere le rayon izay manana attribut rayon
//   let circ = Math.PI  * 2 *r;//on calcule la circonference 
//   let counter = 0;//on va initialiser le counter
//   let fillValue =(circ * (100-val)) / 100;//on calcule le valeur de remplissage de stroke
//   setInterval(()=>{//une fois calculer le remplissage on fait une interval
//       if(counter === val){//lorsque le counter est egale à la valeur dans notre cercle
//           clearInterval();//on arrete l'interval
//       } else {//sinon 
//           counter += 1;//on continu a incrementer
//           e.innerText = counter + "%";//et on prend la valeur et l'on ajout a la valeur de percentage
//           circle.style.strokeDashoffset = fillValue;//apres on prend le circle on ajoute la style css strokeDashoffsetet met 
//           // la valeur de remplissage
//       }
//   }, 1000 / val);//a chaque une seconde diviser par la valeur qui se trouve dans le cercle
// })

// async function afficherProduitsPlusVendus() {
//   const produits = await window.pywebview.api.produits_plus_vendus();
//   const liste = document.getElementById('liste-produits');
//   liste.innerHTML = ''; // Vide l’ancienne liste

//   if (!produits || produits.length === 0) {
//     liste.innerHTML = '<li>Aucun produit vendu ce mois-ci</li>';
//     return;
//   }

//   produits.forEach(p => {
//     const li = document.createElement('li');
//     const montantFormatted = p.montant ? p.montant.toLocaleString('fr-FR') + ' Ar' : '0 Ar';
//     li.textContent = `${p.nom} – ${p.quantite} vendu(s), ${montantFormatted}`;
//     liste.appendChild(li);
//   });
// }
  // async function init() {
  //   const { bj, bm, vm } = await fetchStats();
  //   const max = Math.max(bj, bm, vm, 1);
  //   animateCircle('circle1', 'pct-jour', 'val-jour', bj, max);
  //   animateCircle('circle2', 'pct-mois', 'val-mois', bm, max);
  //   animateCircle('circle3', 'pct-ventes', 'val-ventes', vm, max);

  //   await afficherProduitsPlusVendus();
  // }
  
  // window.addEventListener('DOMContentLoaded', init);
  
  // window.addEventListener('DOMContentLoaded', () => {
  //   fetchStats().then(({bj, bm, vm}) => {
  //     const maxVal = Math.max(bj, bm, vm, 1);
  //     animateCircle('circle1', 'pct-jour', 'val-jour', bj, maxVal);
  //     animateCircle('circle2', 'pct-mois', 'val-mois', bm, maxVal);
  //     animateCircle('circle3', 'pct-ventes', 'val-ventes', vm, maxVal);
  //   });
  //   afficherProduitsPlusVendus();
  //   chargerHistorique();  // Si cette fonction existe
  //   updatePanierCount();  // Si cette fonction existe
  // });