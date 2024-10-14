// State management
let currentScreen = 'main';
let isAuthenticated = false;
let locationEnabled = false;
let notifications = [];

// DOM elements
const app = document.getElementById('app');
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const notificationButton = document.getElementById('notificationButton');
const notificationBadge = document.getElementById('notificationBadge');

// Event listeners
menuButton.addEventListener('click', toggleSideMenu);
notificationButton.addEventListener('click', showNotifications);

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    checkAuthStatus();
    renderCurrentScreen();
    initializeSocket();
}

function checkAuthStatus() {
    // In a real app, this would check with the server
    isAuthenticated = document.body.classList.contains('authenticated');
    locationEnabled = localStorage.getItem('locationEnabled') === 'true';
}

function renderCurrentScreen() {
    // This function would normally fetch and render the appropriate content
    // For now, we'll just update the active state of the navigation buttons
    updateActiveNavButton();
}

function setCurrentScreen(screen) {
    currentScreen = screen;
    renderCurrentScreen();
}

function updateActiveNavButton() {
    const navButtons = document.querySelectorAll('footer nav button');
    navButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('onclick').includes(currentScreen)) {
            button.classList.add('active');
        }
    });
}

function toggleSideMenu() {
    sideMenu.classList.toggle('translate-x-full');
}

function showNotifications() {
    // This would normally show a modal or update a notifications list
    console.log('Showing notifications:', notifications);
}

function initializeSocket() {
    const socket = io();

    socket.on('connect', () => {
        console.log('Connected to SocketIO server');
    });

    socket.on('new_incident', (data) => {
        notifications.push(data);
        updateNotificationBadge();
    });
}

function updateNotificationBadge() {
    notificationBadge.textContent = notifications.length;
    notificationBadge.classList.toggle('hidden', notifications.length === 0);
}

// Lucide icon initialization
lucide.createIcons();
