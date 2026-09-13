// Generates api/seeddata/vehicles.json from the auto-parts-db npm package
// (MIT). One vehicle row per (make, model) with merged generation years.
const db = require("auto-parts-db");
const fs = require("fs");
const path = require("path");

const makes = db.getBrands ? db.getBrands() : db.brands;
const vehicles = [];

for (const make of makes) {
  const models = db.getModelsByBrand ? db.getModelsByBrand(make) : [];
  for (const model of models) {
    const gens = model.generations || [];
    let yearFrom = null;
    let yearTo = null;
    for (const g of gens) {
      if (g.yearFrom) {
        if (yearFrom === null || g.yearFrom < yearFrom) yearFrom = g.yearFrom;
      }
      if (g.yearTo) {
        if (yearTo === null || g.yearTo > yearTo) yearTo = g.yearTo;
      }
    }
    vehicles.push({
      make: make.trim(),
      model: (model.name || "").trim(),
      yearFrom: yearFrom,
      yearTo: yearTo,
    });
  }
}

vehicles.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));

const outDir = path.resolve(__dirname, "../../api/seed");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "vehicles.json"), JSON.stringify(vehicles, null, 0));
console.log(`wrote ${vehicles.length} vehicles to ${outDir}/vehicles.json`);