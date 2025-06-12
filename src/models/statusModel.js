const API_URL = 'https://serveur2.onrender.com';

let statuses = [];

function loadStatuses() {
  const savedStatuses = localStorage.getItem('statuses');
  if (savedStatuses) {
    statuses = JSON.parse(savedStatuses);
  }
}

function saveStatuses() {
  localStorage.setItem('statuses', JSON.stringify(statuses));
}

async function addStatus(status) {
  const newStatus = {
    id: Date.now(),
    userId: status.userId,
    content: status.content,
    type: status.type, // 'text', 'image', ou 'video'
    timestamp: new Date().toISOString(),
    views: [],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expire après 24h
  };

  statuses.unshift(newStatus);
  saveStatuses();

  return newStatus;
}

function getMyStatuses(userId) {
  return statuses.filter(status => status.userId === userId);
}

function getContactStatuses(contactIds) {
  return statuses.filter(status => contactIds.includes(status.userId));
}

export { addStatus, getMyStatuses, getContactStatuses };