/**
 * Service to handle location-related helper calls, e.g., Reverse Geocoding.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/location/reverse?lat=${lat}&lng=${lng}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch reverse geocode from backend proxy');
    }
    const data = await response.json();
    return data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Error fetching address from coordinates via backend:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

