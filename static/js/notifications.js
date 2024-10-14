// Connect to the SocketIO server
const socket = io();

socket.on('connect', () => {
    console.log('Connected to SocketIO server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from SocketIO server');
});

socket.on('new_incident', (data) => {
    updateNotifications(data);
});

socket.on('push_notification', (data) => {
    const notification = JSON.parse(data);
    showPushNotification(notification);
});

function updateNotifications(newIncident) {
    const notificationList = document.getElementById('notificationList');
    
    if (!notificationList) {
        console.error('Notification list element not found');
        return;
    }

    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.textContent = `${newIncident.incident_type} - ${new Date(newIncident.timestamp).toLocaleString()}`;
    
    notificationList.prepend(listItem);

    // Remove oldest notification if there are more than 5
    if (notificationList.children.length > 5) {
        notificationList.removeChild(notificationList.lastChild);
    }

    // Update notification badge
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        const currentCount = parseInt(notificationBadge.textContent) || 0;
        notificationBadge.textContent = currentCount + 1;
        notificationBadge.classList.remove('d-none');
    }
}

function showPushNotification(notification) {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        new Notification("New Incident Reported", {
            body: `${notification.incident_type} - ${new Date(notification.timestamp).toLocaleString()}`,
            icon: "/static/img/notification-icon.png" // Make sure to add this icon to your static files
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                new Notification("New Incident Reported", {
                    body: `${notification.incident_type} - ${new Date(notification.timestamp).toLocaleString()}`,
                    icon: "/static/img/notification-icon.png"
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const notificationButton = document.getElementById('notificationButton');
    const notificationBadge = document.getElementById('notificationBadge');

    if (notificationButton && notificationBadge) {
        notificationButton.addEventListener('click', () => {
            notificationBadge.textContent = '0';
            notificationBadge.classList.add('d-none');
        });
    }

    // Request notification permission when the page loads
    if ("Notification" in window) {
        Notification.requestPermission();
    }
});
