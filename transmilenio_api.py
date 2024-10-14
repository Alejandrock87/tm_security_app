import requests
from datetime import datetime
import os
import random

# Transmilenio API base URL (this is a placeholder, replace with the actual API URL)
API_BASE_URL = "https://api.transmilenio.gov.co/api/v1"

# API key (replace with the actual API key or use environment variable)
API_KEY = os.environ.get("TRANSMILENIO_API_KEY", "your_api_key_here")

def get_real_time_bus_locations():
    """
    Fetch real-time bus locations from Transmilenio API
    """
    endpoint = f"{API_BASE_URL}/buses/locations"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching real-time bus locations: {e}")
        return []  # Return an empty list instead of None

def get_station_status():
    """
    Fetch current status of Transmilenio stations
    """
    endpoint = f"{API_BASE_URL}/stations/status"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching station status: {e}")
        return []  # Return an empty list instead of None

def get_route_information(route_id):
    """
    Fetch information about a specific route
    """
    endpoint = f"{API_BASE_URL}/routes/{route_id}"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching route information: {e}")
        return None

# Mock data for testing purposes
def generate_mock_bus_locations():
    return [
        {
            "id": f"bus_{i}",
            "latitude": 4.6097 + random.uniform(-0.1, 0.1),
            "longitude": -74.0817 + random.uniform(-0.1, 0.1),
            "route": f"route_{random.randint(1, 5)}"
        }
        for i in range(10)
    ]

def generate_mock_station_status():
    stations = ["Portal Norte", "Calle 100", "Calle 72", "Calle 45", "Calle 26"]
    statuses = ["Normal", "Crowded", "Delayed", "Closed"]
    return [
        {
            "name": station,
            "latitude": 4.6097 + random.uniform(-0.1, 0.1),
            "longitude": -74.0817 + random.uniform(-0.1, 0.1),
            "status": random.choice(statuses)
        }
        for station in stations
    ]

# Use mock data if API is not available
def get_bus_locations():
    real_data = get_real_time_bus_locations()
    return real_data if real_data else generate_mock_bus_locations()

def get_stations_status():
    real_data = get_station_status()
    return real_data if real_data else generate_mock_station_status()
