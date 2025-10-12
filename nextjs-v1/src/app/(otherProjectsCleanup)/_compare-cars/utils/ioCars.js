export const parseImportedCars = (clipboardText) => {
  if (!clipboardText || typeof clipboardText !== "string") {
    return [];
  }

  try {
    let parsedData;

    try {
      parsedData = JSON.parse(clipboardText.trim());
    } catch (jsonError) {
      // Try to extract car data from plain text
      const cars = [];
      const jsonMatches = clipboardText.match(
        /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
      );

      if (jsonMatches) {
        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed && typeof parsed === "object") {
              cars.push({
                ...parsed,
                id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                importedAt: new Date().toISOString(),
              });
            }
          } catch (e) {
            continue;
          }
        }
      }
      return cars;
    }

    if (Array.isArray(parsedData)) {
      return parsedData
        .map((item) => {
          if (typeof item === "string") {
            // Handle format: "carId: {carData}" - improved to handle multiline JSON
            const colonIndex = item.indexOf(": ");
            if (colonIndex !== -1) {
              const jsonPart = item.substring(colonIndex + 2).trim();
              try {
                const carData = JSON.parse(jsonPart);
                return {
                  ...carData,
                  id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  importedAt: new Date().toISOString(),
                };
              } catch (e) {
                console.error("Failed to parse car data:", e);
                return null;
              }
            }
          } else if (typeof item === "object" && item !== null) {
            return {
              ...item,
              id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              importedAt: new Date().toISOString(),
            };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof parsedData === "object") {
      return [
        {
          ...parsedData,
          id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          importedAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  } catch (error) {
    console.error("Error parsing imported cars:", error);
    return [];
  }
};

export const exportAllCars = async (cars) => {
  if (cars.length === 0) {
    throw new Error("No cars to export");
  }

  try {
    const allCarsData = cars.map((car) => formatCarForClipboard(car));
    await navigator.clipboard.writeText(
      JSON.stringify(allCarsData, null, 2),
    );
  } catch (error) {
    console.error("Failed to copy all cars to clipboard:", error);
  }
};

export const formatCarForClipboard = (car) => {
  // Deep clone the car object to avoid mutating the original
  const carDetails = JSON.parse(JSON.stringify(car));

  // Process researchMetadata if it exists
  if (carDetails.researchMetadata?.listingsFound) {
    // Limit to first 50 listings
    carDetails.researchMetadata.listingsFound =
      carDetails.researchMetadata.listingsFound
        .slice(0, 50)
        .map((listing) => {
          // Remove images array from extraData if it exists
          if (listing.extraData?.images) {
            const { images, ...extraDataWithoutImages } =
              listing.extraData;
            return {
              ...listing,
              extraData: extraDataWithoutImages,
            };
          }
          return listing;
        });
  }

  // Remove undefined/null values
  const cleanDetails = Object.fromEntries(
    Object.entries(carDetails).filter(
      ([key, value]) => value !== undefined && value !== null,
    ),
  );

  return `${car.id}: ${JSON.stringify(cleanDetails, null, 2)}`;
};
