async function verifierStockFaible() {
    try {
      const res = await window.pywebview.api.get_produits_stock_faible();
      if (res.success) {
        if (res.data.length > 0) {
          const noms = res.data.map(p => p.nom).join('; ');
          afficherNotification(`Stock faible pour : ${noms}`);
        }
      }
    } catch (err) {
      console.error('Erreur notification stock faible:', err);
    }
  }
  
  function afficherNotification(message) {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.width = '200px';
    notif.style.top = '100px';
    notif.style.right = '10px';
    notif.style.backgroundColor = '#ff6666';
    notif.style.color = '#fff';
    notif.style.padding = '10px 20px';
    notif.style.borderRadius = '5px';
    notif.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    notif.textContent = message;
  
    document.body.appendChild(notif);
  
    setTimeout(() => {
      notif.remove();
    }, 8000);
  }
  
  // Appeler la vérification au démarrage de la page ou toutes les X minutes (exemple 5 minutes)
  window.addEventListener('load', () => {
    verifierStockFaible();
    setInterval(verifierStockFaible, 2 * 60 * 1000);
  });
  