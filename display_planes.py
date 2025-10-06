import os
import time
import sys
import requests
import math

# Configuration and Constants
BASE_URL = 'https://api.airplanes.live/v2/point/'

# --- Command-Line Arguments ---

try:
    _latitude = float(sys.argv[1])
    _longitude = float(sys.argv[2])
except IndexError:
    print("Error: Please provide latitude and longitude as command-line arguments.")
    sys.exit(1)
except ValueError:
    print("Error: Latitude and longitude must be valid numbers.")
    sys.exit(1)


_radius = 5  # nautical miles
_distance_threshold = 7000  # feet

# 1 Nautical Mile in feet (for distance calculation)
NM_TO_FEET = 6076.115

# Construct the URL
URL = BASE_URL + f"{round(_latitude, 3)}/{round(_longitude, 3)}/{_radius}"

def _update():
    """Fetches plane data and processes"""
    try:
        response = requests.get(URL, timeout=10)
        response.raise_for_status() # Raise an exception for bad status codes
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        time.sleep(1.01)
        return

    aircraft_list = data.get('ac', [])
    total_found = data.get('total', 0)

    if not aircraft_list:
        print("Could not find planes")
        time.sleep(1.01)
        return

    # Filter and process data
    
    air_borne = []
    
    for ac in aircraft_list:
        alt_baro = ac.get('alt_baro')
        gs = ac.get('gs')
        dst = ac.get('dst') # Distance in Nautical Miles (NM)

        # 1. Filter out ground planes (alt_baro must not be 'ground') and check for required data
        if alt_baro == 'ground' or alt_baro is None or dst is None or gs is None:
            continue

        try:
            # 2. Convert necessary string values to float
            alt_ft = float(alt_baro)
            dst_nm = float(dst)
            gs_val = float(gs)
        except (ValueError, TypeError):
            # Skip if conversion fails
            continue

        # 3. Apply altitude mask (3500 ft > alt > 0 ft)
        if 0 < alt_ft < 3500:
            
            # 4. Calculate 'distance' (hypotenuse calculation)
            # Distance = sqrt((Horizontal Distance in feet)^2 + (Altitude in feet)^2)
            # Horizontal Distance in feet = dst_nm * NM_TO_FEET
            horizontal_dist_ft = dst_nm * NM_TO_FEET
             
            
distance_ft = math.sqrt(horizontal_dist_ft**2 + alt_ft**2)

            # Store the final, filtered, and calculated data
            air_borne.append({
                'alt_baro': alt_ft,
                'gs': gs_val,
                'dst_nm': dst_nm, # Keeping this for context
                'distance': distance_ft
            })

    clear_screen()
    
    if air_borne:
        print(f"Total found {total_found}")
        print("Airborne planes (0-3500 ft):")
        
        # Simple formatted output
        print("ALT_FT | GS | DST_NM | DISTANCE_FT")
        print("---------------------------------------")
        for p in air_borne:
             print(f"{p['alt_baro']:<6} | {p['gs']:<2} | {p['dst_nm']:<6.2f} | {p['distance']:<11.2f}")
        
        print("\nNoisy planes (< 7000 ft total distance):")
        
        # Apply the distance threshold filter
        noisy_planes = [p for p in air_borne if p['distance'] < _distance_threshold]

        if noisy_planes:
            # Simple formatted output
            print("ALT_FT | GS | DST_NM | DISTANCE_FT")
            print("---------------------------------------")
            for p in noisy_planes:
                 print(f"{p['alt_baro']:<6} | {p['gs']:<2} | {p['dst_nm']:<6.2f} | {p['distance']:<11.2f}")
        else:
            print("None")
            
        print("---------------------------------------")

    else:
        print("No airborne planes found in the specified altitude range.")
        
    time.sleep(1.01)

def clear_screen():
    """Clears the console screen."""
    if os.name == 'nt':  # For Windows
        os.system('cls')
    else:  # For macOS and Linux
        os.system('clear')

if __name__ == "__main__":
    while True:
        _update()
