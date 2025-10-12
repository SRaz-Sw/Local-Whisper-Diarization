import {
  Yad2Manufacturer,
  Yad2Model,
  Yad2SearchParams,
  JsonMappings,
  Yad2Listing,
  yad2CarListingSimplified,
} from "./yad2.types";
import yad2MappingsRaw from "@/../public/data/yad2-mappings.json";

export function transformManufacturerData(
  jsonData: JsonMappings,
): Yad2Manufacturer[] {
  return jsonData.manufacturers.map(
    (manufacturer): Yad2Manufacturer => ({
      ...manufacturer,
      // name: manufacturer.name,
      aliases: getManufacturerAliases(
        manufacturer.name,
        manufacturer.nameHebrew,
      ),
      models: manufacturer.models.map(
        // NOTE! the english name doesn't exist many times - TODO: Adjust accordingly
        (model): Yad2Model => ({
          ...model,
          aliases: getModelAliases(
            model.name,
            model.nameHebrew,
            manufacturer.name,
          ),
        }),
      ),
    }),
  );
}

function getManufacturerAliases(
  name: string,
  nameHebrew: string,
): string[] {
  const baseAliases = [name.toLowerCase(), nameHebrew];

  const manufacturerAliases: Record<string, string[]> = {
    Audi: ["audi", "אאודי", "אודי"],
    BMW: ["bmw", "ב מ וו", "ב.מ.וו", "בי.אמ.דבליו", "ביאמוו", "בימו"],
    "Mercedes-Benz": [
      "mercedes",
      "benz",
      "מרצדס",
      "בנץ",
      "מרס",
      "מרצדס בנץ",
    ],
    Volkswagen: ["vw", "volkswagon", "פולקס", "וו", "פולקסווגן"],
    Toyota: ["toyota", "טויוטה", "טיוטה"],
    Honda: ["honda", "הונדה", "הונדא"],
    Nissan: ["nissan", "ניסאן", "ניסן"],
    Hyundai: ["hyundai", "יונדאי", "הונדאי", "יונדיי"],
    Kia: ["kia", "קיה", "קיא"],
    Ford: ["ford", "פורד"],
    Chevrolet: ["chevy", "chevrolet", "שברולט", "שברו", "שווי"],
    Opel: ["opel", "אופל"],
    Renault: ["renault", "רנו", "רנאו"],
    Peugeot: ["peugeot", "פיג'ו", "פיג׳ו", "פז'ו"],
    Citroen: ["citroen", "סיטרואן", "סיטרואן"],
    Fiat: ["fiat", "פיאט"],
    "Alfa Romeo": ["alfa", "alfa romeo", "אלפא", "אלפא רומיאו", "אלפה"],
    Lancia: ["lancia", "לנצ'יה", "לנציה"],
    Skoda: ["skoda", "סקודה", "שקודה"],
    Seat: ["seat", "סיאט", "סיט"],
    Mazda: ["mazda", "מאזדה", "מזדה"],
    Mitsubishi: ["mitsubishi", "מיצובישי", "מיצו"],
    Subaru: ["subaru", "סובארו", "סוברו"],
    Suzuki: ["suzuki", "סוזוקי", "סוזי"],
    Isuzu: ["isuzu", "איסוזו", "איזוזו"],
    Daihatsu: ["daihatsu", "דייהטסו", "דייהצו"],
    Lexus: ["lexus", "לקסוס", "לכסוס"],
    Infiniti: ["infiniti", "אינפיניטי", "אינפיניטה"],
    Acura: ["acura", "אקורה", "אקורא"],
    Genesis: ["genesis", "ג'נסיס", "ג׳נסיס", "ג'נסיס"],
    Volvo: ["volvo", "וולוו", "וולבו"],
    Saab: ["saab", "סאאב", "סאב"],
    "Land Rover": [
      "landrover",
      "land rover",
      "לנד רובר",
      "לנדרובר",
      "רנג רובר",
    ],
    Jaguar: ["jaguar", "יגואר", "יאגואר", "ג'אגואר"],
    Bentley: ["bentley", "בנטלי", "בנטלה"],
    "Rolls-Royce": [
      "rolls royce",
      "rolls-royce",
      "רולס רויס",
      "רולס-רויס",
    ],
    "Aston Martin": ["aston martin", "aston", "אסטון מרטין", "אסטון"],
    Lamborghini: ["lamborghini", "lambo", "למבורגיני", "למבו"],
    Ferrari: ["ferrari", "פרארי", "פררי"],
    Maserati: ["maserati", "מזראטי", "מאזראטי"],
    Porsche: ["porsche", "פורשה", "פורש"],
    Lotus: ["lotus", "לוטוס", "לוטס"],
    McLaren: ["mclaren", "מקלארן", "מקלרן"],
    Tesla: ["tesla", "טסלה", "טסלא"],
    Mini: ["mini", "מיני"],
    Smart: ["smart", "סמארט"],
    Jeep: ["jeep", "ג'יפ", "גיפ", "ג׳יפ"],
    Dodge: ["dodge", "דודג'", "דודג׳"],
    Chrysler: ["chrysler", "קרייזלר", "קרייסלר"],
    Cadillac: ["cadillac", "קאדילק", "קדילק"],
    Buick: ["buick", "ביואיק", "ביויק"],
    GMC: ["gmc", "ג'י.אם.סי", "ג.מ.ס"],
    Lincoln: ["lincoln", "לינקולן", "לינקון"],
    Pontiac: ["pontiac", "פונטיאק", "פונטיק"],
    Hummer: ["hummer", "האמר", "המר"],
    SsangYong: ["ssangyong", "סאנגיונג", "סאנג יונג", "סנגיונג"],
    Daewoo: ["daewoo", "דייהו", "דיהו"],
    "Great Wall": ["great wall", "greatwall", "גרייט וול", "גרייטוול"],
    Chery: ["chery", "צ'רי", "צרי"],
    BYD: ["byd", "ביוד", "בי.וו.די", "בי.ווי.די"],
    Geely: ["geely", "ג'ילי", "גילי"],
    MG: ["mg", "אם ג'י", "אמ גי", "אם גי"],
    Tata: ["tata", "טאטא", "טטה"],
    Mahindra: ["mahindra", "מהינדרה", "מהינדרא"],
    Lada: ["lada", "לאדה", "לדה"],
    Dacia: ["dacia", "דאצ'יה", "דאציה"],
    DS: ["ds", "די.אס", "די אס"],
    Cupra: ["cupra", "קופרה", "קופרא"],
    Alpine: ["alpine", "אלפין", "אלפיין"],
    Polestar: ["polestar", "פולסטאר", "פולסטר"],
    "Lynk & Co": ["lynk", "lynk co", "לינק", "לינק קו"],
    WEY: ["wey", "ויי", "ווי"],
    Voyah: ["voyah", "וויה", "ווויה"],
    Zeekr: ["zeekr", "זיקר", "זיכר"],
    XPeng: ["xpeng", "אקספנג", "קספנג"],
    NIO: ["nio", "ניאו", "ניו"],
    "Li Auto": ["li auto", "li", "לי אוטו"],
    Lucid: ["lucid", "לוסיד"],
    Rivian: ["rivian", "ריוויאן"],
    Fisker: ["fisker", "פיסקר"],
    Byton: ["byton", "ביטון"],
    Aiways: ["aiways", "איוויס"],
    ORA: ["ora", "אורה"],
    Hongqi: ["hongqi", "הונגצ'י", "הונגצי"],
    JAC: ["jac", "ג'יי.איי.סי", "ג.א.ס"],
    DongFeng: ["dongfeng", "dong feng", "דונגפנג"],
    BAIC: ["baic", "באייק"],
    Foton: ["foton", "פוטון"],
    Maxus: ["maxus", "מקסוס"],
    Iveco: ["iveco", "איווקו"],
    MAN: ["man", "מאן"],
    Scania: ["scania", "סקניה"],
    "Volvo Trucks": ["volvo trucks", "וולוו משאיות"],
    "Mercedes Trucks": ["mercedes trucks", "מרצדס משאיות"],
    DAF: ["daf", "דאף"],
    "Isuzu Trucks": ["isuzu trucks", "איסוזו משאיות"],
  };

  return [...baseAliases, ...(manufacturerAliases[name] || [])].filter(
    (alias, index, arr) => arr.indexOf(alias) === index,
  ); // Remove duplicates
}

function getModelAliases(
  modelName: string,
  modelNameHebrew: string,
  manufacturerName: string,
): string[] {
  const baseAliases = [modelName.toLowerCase(), modelNameHebrew];

  // Common model aliases based on manufacturer and model patterns
  const modelAliases: Record<string, Record<string, string[]>> = {
    BMW: {
      "סדרה 1": ["1 series", "series 1", "1er", "סדרה1"],
      "סדרה 3": ["3 series", "series 3", "3er", "סדרה3"],
      "סדרה 5": ["5 series", "series 5", "5er", "סדרה5"],
      X1: ["x1", "אקס1", "אקס 1"],
      X3: ["x3", "אקס3", "אקס 3"],
      X5: ["x5", "אקס5", "אקס 5"],
      i3: ["i3", "בי.אמ.וו i3", "bmw i3"],
      i8: ["i8", "בי.אמ.וו i8", "bmw i8"],
    },
    "Mercedes-Benz": {
      "A-class": ["a class", "a-class", "a200", "a250", "מחלקה a"],
      "C-class": ["c class", "c-class", "c200", "c300", "מחלקה c"],
      "E-class": ["e class", "e-class", "e200", "e300", "מחלקה e"],
      "S-class": ["s class", "s-class", "s500", "מחלקה s"],
      "G-class": [
        "g class",
        "g-class",
        "g wagon",
        "g-wagon",
        "גלנדווגן",
        "ג קלאס",
      ],
      GLC: ["glc", "ג.ל.ס", "glc300"],
      GLE: ["gle", "ג.ל.א", "gle350"],
    },
    Audi: {
      A3: ["a3", "a 3", "אאודי a3"],
      A4: ["a4", "a 4", "אאודי a4"],
      A6: ["a6", "a 6", "אאודי a6"],
      Q3: ["q3", "q 3", "אאודי q3"],
      Q5: ["q5", "q 5", "אאודי q5"],
      Q7: ["q7", "q 7", "אאודי q7"],
    },
    Volkswagen: {
      גולף: ["golf", "גולף", "vw golf"],
      פאסאט: ["passat", "פסאט", "vw passat"],
      פולו: ["polo", "vw polo"],
      טיגואן: ["tiguan", "vw tiguan"],
      טוארג: ["touareg", "vw touareg"],
    },
    Toyota: {
      קאמרי: ["camry", "kamry"],
      קורולה: ["corolla", "korolla"],
      פריוס: ["prius"],
      RAV4: ["rav4", "rav 4", "רב4"],
      "לנד קרוזר": ["land cruiser", "landcruiser", "לנדקרוזר"],
      היילקס: ["hilux", "הילקס"],
    },
    Honda: {
      סיוויק: ["civic", "סיביק"],
      אקורד: ["accord", "אקורד"],
      "CR-V": ["crv", "cr-v", "סי.אר.וי"],
    },
    Hyundai: {
      אלנטרה: ["elantra", "אלנטרה"],
      סונטה: ["sonata", "סונאטה"],
      טוסון: ["tucson", "טאקסון"],
      "סנטה פה": ["santa fe", "santafe", "סנטהפה"],
    },
    Kia: {
      סיד: ["ceed", "cee'd"],
      "ספורטז'": ["sportage", "ספורטג'"],
      סורנטו: ["sorento"],
      פיקנטו: ["picanto"],
      ריו: ["rio"],
    },
    Ford: {
      פוקוס: ["focus"],
      פיאסטה: ["fiesta"],
      מונדאו: ["mondeo"],
      "F-150": ["f150", "f 150", "אף150"],
      מוסטנג: ["mustang"],
    },
    Tesla: {
      "מודל 3": ["model 3", "model3", "מודל3"],
      "מודל S": ["model s", "models", "מודלs"],
      "מודל X": ["model x", "modelx", "מודלx"],
      "מודל Y": ["model y", "modely", "מודלy"],
    },
  };

  const manufacturerModels = modelAliases[manufacturerName];
  const specificAliases =
    manufacturerModels?.[modelName] ||
    manufacturerModels?.[modelNameHebrew] ||
    [];

  return [...baseAliases, ...specificAliases].filter(
    (alias, index, arr) => arr.indexOf(alias) === index,
  ); // Remove duplicates
}

export function convertYad2ListingToSimplified(
  listing: Yad2Listing,
  isMinified: boolean = false,
): yad2CarListingSimplified {
  const baseFields = {
    title:
      listing.model.text + " " + listing.vehicleDates?.yearOfProduction,
    price: listing.price,
    year: listing.vehicleDates?.yearOfProduction || 2025,
    mileage: undefined, // not fetched in our query
    link: listing.token, // ( www.yad2.co.il/vehicles/item/{token} )
    hand: listing.hand?.text || undefined,
  };

  if (isMinified) {
    return baseFields;
  }

  return {
    ...baseFields,
    location: listing.address?.area?.text || undefined,
    seller_type: listing.customer?.agencyName ? "dealer" : "private",
    highlights:
      listing.tags?.map((tag) => tag.name).join(", ") || undefined,
    condition_notes: listing.commitment?.join(", ") || undefined,
    age_category: undefined,
    extraData: {
      coverImage: listing.metaData?.coverImage || undefined,
      images: listing.metaData?.images || undefined,
    },
  };
}
