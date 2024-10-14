import random

# Transmilenio stations data
TRANSMILENIO_STATIONS = [
    {"name": "Portal Norte", "latitude": 4.7545, "longitude": -74.0457},
    {"name": "Calle 100", "latitude": 4.6866, "longitude": -74.0491},
    {"name": "Calle 72", "latitude": 4.6583, "longitude": -74.0652},
    {"name": "Calle 45", "latitude": 4.6322, "longitude": -74.0715},
    {"name": "Calle 26", "latitude": 4.6159, "longitude": -74.0706},
    {"name": "Ricaurte", "latitude": 4.6131, "longitude": -74.0958},
    {"name": "Portal Suba", "latitude": 4.7437, "longitude": -74.0936},
    {"name": "Portal 80", "latitude": 4.7106, "longitude": -74.1113},
    {"name": "Portal Américas", "latitude": 4.6297, "longitude": -74.2052},
    {"name": "Portal Sur", "latitude": 4.5781, "longitude": -74.1428},
    {"name": "Calle 187", "latitude": 4.7652, "longitude": -74.0446},
    {"name": "Terminal", "latitude": 4.6007, "longitude": -74.0823},
    {"name": "Calle 146", "latitude": 4.7268, "longitude": -74.0468},
    {"name": "Calle 127", "latitude": 4.7031, "longitude": -74.0513},
    {"name": "Pepe Sierra", "latitude": 4.6759, "longitude": -74.0541}
]

def get_all_stations():
    """
    Return all Transmilenio stations
    """
    return TRANSMILENIO_STATIONS

def get_route_information(route_id):
    """
    Fetch information about a specific route (mock data)
    """
    routes = {
        "1": {"name": "Troncal Caracas", "stations": ["Portal Norte", "Calle 100", "Calle 72", "Calle 45", "Calle 26"]},
        "2": {"name": "Troncal NQS", "stations": ["Portal Sur", "Ricaurte", "Calle 26"]},
        "3": {"name": "Troncal Suba", "stations": ["Portal Suba", "Calle 127", "Pepe Sierra", "Calle 100"]},
        "4": {"name": "Troncal Calle 80", "stations": ["Portal 80", "Calle 72", "Terminal"]}
    }
    return routes.get(route_id, {"name": "Unknown Route", "stations": []})
