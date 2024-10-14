function updateNotifications() {
    const notificationList = document.getElementById('notificationList');
    
    // In a real application, you would fetch new incidents from the server
    // For this example, we'll simulate new incidents
    const newIncident = {
        title: "Simulated Incident",
        timestamp: new Date().toISOString()
    };

    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.textContent = `${newIncident.title} - ${new Date(newIncident.timestamp).toLocaleString()}`;
    
    notificationList.prepend(listItem);

    // Remove oldest notification if there are more than 5
    if (notificationList.children.length > 5) {
        notificationList.removeChild(notificationList.lastChild);
    }
}

// Update notifications every 30 seconds
setInterval(updateNotifications, 30000);

document.addEventListener('DOMContentLoaded', updateNotifications);
