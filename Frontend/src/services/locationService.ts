/**
 * Service to handle location-related helper calls, e.g., Reverse Geocoding.
 */

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'vi, en',
          'User-Agent': 'SmartTravelSystemFoodRecommend/1.0',
        },
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch reverse geocode');
    }
    const data = await response.json();
    
    if (data.address) {
      const parts = [];
      const addr = data.address;
      
      // Select most relevant parts for a compact address representation
      const road = addr.road || addr.suburb || addr.neighbourhood || addr.amenity;
      const ward = addr.subdistrict || addr.quarter || addr.ward;
      const district = addr.district || addr.city_district || addr.suburb;
      const city = addr.city || addr.town || addr.province || addr.state;
      
      if (road) parts.push(road);
      if (ward) parts.push(ward);
      if (district) parts.push(district);
      if (city) {
        // Remove common redundant substrings
        const sanitizedCity = city.replace(/(Tỉnh |Thành phố )/g, '');
        parts.push(sanitizedCity);
      }
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Error fetching address from coordinates:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
