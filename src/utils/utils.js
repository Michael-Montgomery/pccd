const utilities = {
    getZipCodeFromLatLng: async function (lat, lng) {
      const apiKey = process.env.BIG_DATA_API_KEY;
  
      const apiUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en&key=${apiKey}`;
  
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
  
        if (data?.postcode) {
          return data.postcode;
        } else {
          console.warn(`No postal code found for coordinates: (${lat}, ${lng})`);
          return null;
        }
      } catch (error) {
        console.error(
          `Error fetching postal code for coordinates: (${lat}, ${lng})`,
          error
        );
        return null;
      }
    },
  };

module.exports = utilities;