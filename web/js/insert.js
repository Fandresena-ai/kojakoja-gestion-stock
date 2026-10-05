function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // garde le data:image/... complet
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
  const form = document.getElementById('formProduit');
  const message = document.getElementById('message');
  const fileInput = document.getElementById('image');
  const btnImage = document.getElementById('btnImage');
  const nomFichierImage = document.getElementById('nomFichierImage');

  btnImage.addEventListener('click', () => {
    fileInput.click();
  });
  
  // 👇 Affiche le nom du fichier sélectionné
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      nomFichierImage.textContent = fileInput.files[0].name;
    } else {
      nomFichierImage.textContent = "";
    }
  });

  form.addEventListener('submit', async (e) =>{

    e.preventDefault();

    // Récupérer valeurs
    const nom = document.getElementById('nom').value.trim();
    const caracteristique = document.getElementById('caracteristique').value.trim();
    const prix_achat = document.getElementById('prix_achat').value.replace(/[^\d.]/g, '');
    const prix_vente = document.getElementById('prix_vente').value.replace(/[^\d.]/g, '');
    const quantite = document.getElementById('quantite').value;
    const place = document.getElementById('place').value.trim();
    const file = fileInput.files[0];
    let imageBase64 = "";

    if (file) {
      imageBase64 = await getBase64(file);
    }


    if (!nom || !caracteristique) {
      message.textContent = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    // Appel API Python
    const result = await window.pywebview.api.ajouter_produit(
      nom, caracteristique, prix_achat, prix_vente, imageBase64, quantite, place
    );

    if (result.success) {
      message.style.color = 'green';
      message.textContent = result.message;
      form.reset();
      nomFichierImage.textContent = "";
      // 👉 On passe le bouton "Liste Produits"
      const listeBtn = document.querySelector('.sidebar .item[data-target="liste"]');
      showPage('liste', listeBtn);
    } else {
      message.style.color = 'red';
      message.textContent = 'Erreur : ' + result.message;
    }
  })