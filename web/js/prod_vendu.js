async function afficherTotalArticles() {
    try {
      const totalRes = await window.pywebview.api.get_total_articles();
      if (totalRes.success) {
        const totalArticlesElem = document.getElementById('total-articles');
        if (totalArticlesElem) {
          totalArticlesElem.textContent = totalRes.total_articles.toLocaleString('fr-FR');
        }
      } else {
        console.error("Erreur lors de la récupération du total des articles:", totalRes.message);
      }
    } catch (error) {
      console.error("Erreur JS:", error);
    }
}
  
window.onload = async () => {
    await afficherTotalArticles();
};