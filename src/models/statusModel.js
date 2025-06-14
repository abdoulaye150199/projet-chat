const API_URL = 'http://localhost:3000';

let statuses = [];

function loadStatuses() {
  try {
    const savedStatuses = localStorage.getItem('whatsapp_statuses');
    if (savedStatuses) {
      const parsedStatuses = JSON.parse(savedStatuses);
      // Filtrer les statuts expirés (plus de 24h)
      const now = Date.now();
      statuses = parsedStatuses.filter(status => {
        const expirationTime = new Date(status.expiresAt).getTime();
        return now < expirationTime;
      });
      // Sauvegarder après nettoyage
      saveStatuses();
    }
  } catch (error) {
    console.error('Erreur lors du chargement des statuts:', error);
    statuses = [];
  }
}

function saveStatuses() {
  try {
    localStorage.setItem('whatsapp_statuses', JSON.stringify(statuses));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des statuts:', error);
  }
}

async function addStatus(status) {
  const newStatus = {
    id: Date.now().toString(),
    userId: status.userId,
    content: status.content,
    type: status.type,
    backgroundColor: status.backgroundColor || '#00a884',
    caption: status.caption || '',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    viewedBy: [],
    isOwn: true
  };

  try {
    // Ajouter au stockage local
    statuses.unshift(newStatus);
    saveStatuses();

    // Ajouter à l'API
    const response = await fetch(`${API_URL}/statuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newStatus)
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'ajout du statut');
    }

    return newStatus;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du statut:', error);
    throw error;
  }
}

function getMyStatuses(userId) {
  loadStatuses(); // Recharger et nettoyer les statuts expirés
  return statuses.filter(status => status.userId === userId);
}

function getContactStatuses(contactIds) {
  loadStatuses(); // Recharger et nettoyer les statuts expirés
  return statuses.filter(status => contactIds.includes(status.userId));
}

export { addStatus, getMyStatuses, getContactStatuses };