/**
 * Template high-protein diet plans built from the MŌVE food database.
 *
 * Each template is a complete daily meal plan with exact products,
 * gram amounts, and macros. Coaches can assign these as starting points.
 *
 * All plans target: ≥2g protein/kg for a range of body weights.
 */

interface TemplateFoodEntry {
  name: string
  brand?: string
  grams: number
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

interface TemplateMeal {
  id: string
  name: string
  time: string
  foods: TemplateFoodEntry[]
}

export interface TemplateDiet {
  id: string
  title: string
  description: string
  calories_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
  meals: TemplateMeal[]
}

// ──────────────────────────────────────────────────────────────
// Helper to calculate totals
// ──────────────────────────────────────────────────────────────

function mealCalories(foods: TemplateFoodEntry[]) {
  return foods.reduce((s, f) => s + Math.round((f.per100g.calories * f.grams) / 100), 0)
}
function mealProtein(foods: TemplateFoodEntry[]) {
  return foods.reduce((s, f) => s + Math.round((f.per100g.protein * f.grams) / 100), 0)
}

// ──────────────────────────────────────────────────────────────
// 1. CUT — 1800 kcal / 170g protein
//    Voor: vrouwen vetverlies of lichtere mannen cut
// ──────────────────────────────────────────────────────────────

const cut1800: TemplateDiet = {
  id: 'tpl-cut-1800',
  title: 'High Protein Cut — 1800 kcal',
  description: 'Vetverlies met maximaal spierbehoud. ~170g eiwit, laag in vet.',
  calories_target: 1800,
  protein_g: 170,
  carbs_g: 160,
  fat_g: 50,
  tags: ['cut', 'vetverlies', 'vrouwen', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Havermout', grams: 50, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Skyr Naturel', brand: 'Arla', grams: 200, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Blauwe Bessen', grams: 80, per100g: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3 } },
        { name: 'Designer Whey Vanilla', grams: 30, per100g: { calories: 375, protein: 78, carbs: 5, fat: 5 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:30',
      foods: [
        { name: 'Volkoren Brood', grams: 80, per100g: { calories: 247, protein: 9, carbs: 41, fat: 3.5 } },
        { name: 'Kipfilet', grams: 120, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Avocado', grams: 50, per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
        { name: 'Tomaat', grams: 100, per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
      ],
    },
    {
      id: 'meal-2-snack',
      name: 'Snack',
      time: '15:30',
      foods: [
        { name: 'Hüttenkäse Naturel', grams: 200, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
        { name: 'Rijstwafel', grams: 20, per100g: { calories: 387, protein: 7, carbs: 81, fat: 3 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Zalm Filet', grams: 150, per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
        { name: 'Zoete Aardappel', grams: 200, per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
        { name: 'Broccoli', grams: 150, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 2. CUT — 2200 kcal / 200g protein
//    Voor: mannen vetverlies
// ──────────────────────────────────────────────────────────────

const cut2200: TemplateDiet = {
  id: 'tpl-cut-2200',
  title: 'High Protein Cut — 2200 kcal',
  description: 'Vetverlies voor mannen. ~200g eiwit, genoeg koolhydraten voor training.',
  calories_target: 2200,
  protein_g: 200,
  carbs_g: 200,
  fat_g: 60,
  tags: ['cut', 'vetverlies', 'mannen', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Havermout', grams: 70, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Skyr Naturel', brand: 'Arla', grams: 250, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Banaan', grams: 120, per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
        { name: 'Designer Whey Chocolate', grams: 35, per100g: { calories: 378, protein: 77, carbs: 6, fat: 5.5 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:30',
      foods: [
        { name: 'Witte Rijst', grams: 70, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Kipfilet', grams: 180, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Gemengde Sla', grams: 80, per100g: { calories: 17, protein: 1.3, carbs: 3.3, fat: 0.2 } },
        { name: 'Komkommer', grams: 100, per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
        { name: 'Olijfolie', grams: 10, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
      ],
    },
    {
      id: 'meal-2-snack',
      name: 'Snack',
      time: '15:30',
      foods: [
        { name: 'Hüttenkäse Naturel', grams: 250, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
        { name: 'Appel', grams: 150, per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
        { name: 'Amandelen', grams: 15, per100g: { calories: 579, protein: 21, carbs: 22, fat: 50 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Rundergehakt Mager', grams: 180, per100g: { calories: 176, protein: 26, carbs: 0, fat: 8 } },
        { name: 'Volkoren Pasta', grams: 80, per100g: { calories: 348, protein: 13, carbs: 62, fat: 2.5 } },
        { name: 'Passata', grams: 100, per100g: { calories: 24, protein: 1.2, carbs: 4.2, fat: 0.1 } },
        { name: 'Courgette', grams: 120, per100g: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 3. ONDERHOUD — 2500 kcal / 200g protein
//    Voor: recomp of onderhoud mannen ~80kg
// ──────────────────────────────────────────────────────────────

const maintain2500: TemplateDiet = {
  id: 'tpl-maintain-2500',
  title: 'High Protein Onderhoud — 2500 kcal',
  description: 'Onderhoud of body recomp. ~200g eiwit, gebalanceerde macro\'s.',
  calories_target: 2500,
  protein_g: 200,
  carbs_g: 260,
  fat_g: 70,
  tags: ['onderhoud', 'recomp', 'mannen', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Havermout', grams: 80, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Volle Melk', grams: 200, per100g: { calories: 64, protein: 3.3, carbs: 4.7, fat: 3.6 } },
        { name: 'Banaan', grams: 120, per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
        { name: 'Pindakaas Naturel', grams: 20, per100g: { calories: 597, protein: 25, carbs: 14, fat: 51 } },
        { name: 'Designer Whey Vanilla', grams: 35, per100g: { calories: 375, protein: 78, carbs: 5, fat: 5 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:30',
      foods: [
        { name: 'Volkoren Brood', grams: 120, per100g: { calories: 247, protein: 9, carbs: 41, fat: 3.5 } },
        { name: 'Kipfilet', grams: 150, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Ei Gekookt', grams: 120, per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
        { name: 'Avocado', grams: 60, per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
        { name: 'Tomaat', grams: 80, per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
      ],
    },
    {
      id: 'meal-2-snack',
      name: 'Snack',
      time: '15:30',
      foods: [
        { name: 'Griekse Yoghurt 10%', grams: 200, per100g: { calories: 115, protein: 5, carbs: 4, fat: 10 } },
        { name: 'Walnoten', grams: 20, per100g: { calories: 654, protein: 15, carbs: 14, fat: 65 } },
        { name: 'Honing', grams: 15, per100g: { calories: 304, protein: 0.3, carbs: 82, fat: 0 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Zalm Filet', grams: 180, per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
        { name: 'Witte Rijst', grams: 90, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Broccoli', grams: 150, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
        { name: 'Sperziebonen', grams: 120, per100g: { calories: 31, protein: 1.8, carbs: 7, fat: 0.1 } },
      ],
    },
    {
      id: 'meal-4-avondsnack',
      name: 'Avondsnack',
      time: '21:00',
      foods: [
        { name: 'Hüttenkäse Naturel', grams: 200, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
        { name: 'Rijstwafel', grams: 15, per100g: { calories: 387, protein: 7, carbs: 81, fat: 3 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 4. BULK — 2800 kcal / 210g protein
//    Voor: spiermassa opbouwen, lean bulk
// ──────────────────────────────────────────────────────────────

const bulk2800: TemplateDiet = {
  id: 'tpl-bulk-2800',
  title: 'High Protein Lean Bulk — 2800 kcal',
  description: 'Lean bulk met maximale spiergroei. ~210g eiwit, hoog koolhydraat.',
  calories_target: 2800,
  protein_g: 210,
  carbs_g: 320,
  fat_g: 75,
  tags: ['bulk', 'spiermassa', 'mannen', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Havermout', grams: 100, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Volle Melk', grams: 250, per100g: { calories: 64, protein: 3.3, carbs: 4.7, fat: 3.6 } },
        { name: 'Banaan', grams: 130, per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
        { name: 'Pindakaas Naturel', grams: 25, per100g: { calories: 597, protein: 25, carbs: 14, fat: 51 } },
        { name: 'Designer Whey Chocolate', grams: 40, per100g: { calories: 378, protein: 77, carbs: 6, fat: 5.5 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:00',
      foods: [
        { name: 'Witte Rijst', grams: 100, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Kipfilet', grams: 200, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Zoete Aardappel', grams: 150, per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
        { name: 'Olijfolie', grams: 10, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
        { name: 'Gemengde Sla', grams: 60, per100g: { calories: 17, protein: 1.3, carbs: 3.3, fat: 0.2 } },
      ],
    },
    {
      id: 'meal-2-snack1',
      name: 'Snack 1',
      time: '15:00',
      foods: [
        { name: 'Volkoren Brood', grams: 80, per100g: { calories: 247, protein: 9, carbs: 41, fat: 3.5 } },
        { name: 'Ei Gekookt', grams: 120, per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
        { name: 'Kipfilet', grams: 80, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Rundergehakt Mager', grams: 200, per100g: { calories: 176, protein: 26, carbs: 0, fat: 8 } },
        { name: 'Volkoren Pasta', grams: 100, per100g: { calories: 348, protein: 13, carbs: 62, fat: 2.5 } },
        { name: 'Passata', grams: 120, per100g: { calories: 24, protein: 1.2, carbs: 4.2, fat: 0.1 } },
        { name: 'Courgette', grams: 100, per100g: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
        { name: 'Parmezaan', grams: 15, per100g: { calories: 392, protein: 33, carbs: 0, fat: 29 } },
      ],
    },
    {
      id: 'meal-4-avondsnack',
      name: 'Avondsnack',
      time: '21:00',
      foods: [
        { name: 'Skyr Naturel', brand: 'Arla', grams: 250, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Amandelen', grams: 20, per100g: { calories: 579, protein: 21, carbs: 22, fat: 50 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 5. BULK — 3200 kcal / 220g protein
//    Voor: zware mannen of hard gainers
// ──────────────────────────────────────────────────────────────

const bulk3200: TemplateDiet = {
  id: 'tpl-bulk-3200',
  title: 'High Protein Mass Gain — 3200 kcal',
  description: 'Massa opbouw voor hard gainers. ~220g eiwit, 5 maaltijden.',
  calories_target: 3200,
  protein_g: 220,
  carbs_g: 380,
  fat_g: 85,
  tags: ['bulk', 'spiermassa', 'hard-gainer', 'mannen', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:00',
      foods: [
        { name: 'Havermout', grams: 100, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Volle Melk', grams: 300, per100g: { calories: 64, protein: 3.3, carbs: 4.7, fat: 3.6 } },
        { name: 'Banaan', grams: 150, per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
        { name: 'Pindakaas Naturel', grams: 30, per100g: { calories: 597, protein: 25, carbs: 14, fat: 51 } },
        { name: 'Designer Whey Vanilla', grams: 40, per100g: { calories: 375, protein: 78, carbs: 5, fat: 5 } },
        { name: 'Ei Gekookt', grams: 60, per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:00',
      foods: [
        { name: 'Witte Rijst', grams: 120, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Kipfilet', grams: 220, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Avocado', grams: 70, per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
        { name: 'Olijfolie', grams: 10, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
      ],
    },
    {
      id: 'meal-2-snack1',
      name: 'Snack 1',
      time: '15:00',
      foods: [
        { name: 'Volkoren Brood', grams: 120, per100g: { calories: 247, protein: 9, carbs: 41, fat: 3.5 } },
        { name: 'Kipfilet', grams: 100, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Hüttenkäse Naturel', grams: 150, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Zalm Filet', grams: 200, per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
        { name: 'Witte Rijst', grams: 120, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Broccoli', grams: 150, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
        { name: 'Sperziebonen', grams: 100, per100g: { calories: 31, protein: 1.8, carbs: 7, fat: 0.1 } },
      ],
    },
    {
      id: 'meal-4-avondsnack',
      name: 'Avondsnack',
      time: '21:00',
      foods: [
        { name: 'Skyr Naturel', brand: 'Arla', grams: 300, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Walnoten', grams: 25, per100g: { calories: 654, protein: 15, carbs: 14, fat: 65 } },
        { name: 'Rijstwafel', grams: 20, per100g: { calories: 387, protein: 7, carbs: 81, fat: 3 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 6. VEGGIE CUT — 1800 kcal / 150g protein
//    Voor: vegetarische cliënten in cut
// ──────────────────────────────────────────────────────────────

const veggieCut1800: TemplateDiet = {
  id: 'tpl-veggie-cut-1800',
  title: 'Veggie High Protein Cut — 1800 kcal',
  description: 'Vegetarisch vetverlies. ~150g eiwit uit zuivel, eieren & plantaardig.',
  calories_target: 1800,
  protein_g: 150,
  carbs_g: 175,
  fat_g: 55,
  tags: ['cut', 'vetverlies', 'vegetarisch', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Havermout', grams: 50, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Skyr Naturel', brand: 'Arla', grams: 250, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Blauwe Bessen', grams: 80, per100g: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3 } },
        { name: 'Designer Whey Vanilla', grams: 30, per100g: { calories: 375, protein: 78, carbs: 5, fat: 5 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch',
      time: '12:30',
      foods: [
        { name: 'Volkoren Brood', grams: 80, per100g: { calories: 247, protein: 9, carbs: 41, fat: 3.5 } },
        { name: 'Ei Gekookt', grams: 120, per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
        { name: 'Hüttenkäse Naturel', grams: 150, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
        { name: 'Tomaat', grams: 100, per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
        { name: 'Komkommer', grams: 80, per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
      ],
    },
    {
      id: 'meal-2-snack',
      name: 'Snack',
      time: '15:30',
      foods: [
        { name: 'Tofu Naturel', grams: 150, per100g: { calories: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
        { name: 'Edamame', grams: 80, per100g: { calories: 122, protein: 11, carbs: 10, fat: 5 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten',
      time: '18:30',
      foods: [
        { name: 'Tempeh', grams: 150, per100g: { calories: 193, protein: 19, carbs: 9, fat: 11 } },
        { name: 'Witte Rijst', grams: 70, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Broccoli', grams: 150, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
        { name: 'Sperziebonen', grams: 100, per100g: { calories: 31, protein: 1.8, carbs: 7, fat: 0.1 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// 7. MEALPREP — 2200 kcal / 200g protein
//    Voor: drukke mensen, max 20 min koken
// ──────────────────────────────────────────────────────────────

const mealprep2200: TemplateDiet = {
  id: 'tpl-mealprep-2200',
  title: 'Mealprep High Protein — 2200 kcal',
  description: 'Simpele mealprep, alles in max 20 min. ~200g eiwit.',
  calories_target: 2200,
  protein_g: 200,
  carbs_g: 200,
  fat_g: 65,
  tags: ['mealprep', 'snel', 'simpel', 'high-protein'],
  meals: [
    {
      id: 'meal-0-ontbijt',
      name: 'Ontbijt',
      time: '07:30',
      foods: [
        { name: 'Overnight Oats', grams: 60, per100g: { calories: 372, protein: 13, carbs: 60, fat: 7 } },
        { name: 'Skyr Naturel', brand: 'Arla', grams: 250, per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2 } },
        { name: 'Designer Whey Chocolate', grams: 30, per100g: { calories: 378, protein: 77, carbs: 6, fat: 5.5 } },
        { name: 'Banaan', grams: 100, per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
      ],
    },
    {
      id: 'meal-1-lunch',
      name: 'Lunch (mealprep)',
      time: '12:30',
      foods: [
        { name: 'Witte Rijst', grams: 80, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: 'Kipfilet', grams: 200, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
        { name: 'Broccoli', grams: 120, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
        { name: 'Olijfolie', grams: 8, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
      ],
    },
    {
      id: 'meal-2-snack',
      name: 'Snack',
      time: '15:30',
      foods: [
        { name: 'Hüttenkäse Naturel', grams: 200, per100g: { calories: 92, protein: 12, carbs: 3, fat: 4 } },
        { name: 'Appel', grams: 150, per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
      ],
    },
    {
      id: 'meal-3-diner',
      name: 'Avondeten (mealprep)',
      time: '18:30',
      foods: [
        { name: 'Rundergehakt Mager', grams: 180, per100g: { calories: 176, protein: 26, carbs: 0, fat: 8 } },
        { name: 'Zoete Aardappel', grams: 200, per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
        { name: 'Sperziebonen', grams: 150, per100g: { calories: 31, protein: 1.8, carbs: 7, fat: 0.1 } },
      ],
    },
  ],
}

// ──────────────────────────────────────────────────────────────
// Export all templates
// ──────────────────────────────────────────────────────────────

export const TEMPLATE_DIETS: TemplateDiet[] = [
  cut1800,
  cut2200,
  maintain2500,
  bulk2800,
  bulk3200,
  veggieCut1800,
  mealprep2200,
]

export function getTemplateDiet(id: string): TemplateDiet | undefined {
  return TEMPLATE_DIETS.find((t) => t.id === id)
}

export function getTemplateDietsByTag(tag: string): TemplateDiet[] {
  return TEMPLATE_DIETS.filter((t) => t.tags.includes(tag))
}
