const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'meals.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY,
    date TEXT UNIQUE,
    day_type TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY,
    day_id INTEGER,
    meal_number INTEGER,
    food_name TEXT,
    protein REAL,
    carbs REAL,
    fat REAL,
    fiber REAL,
    serving_note TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY,
    name TEXT,
    serving_label TEXT,
    protein REAL,
    carbs REAL,
    fat REAL,
    fiber REAL,
    is_custom INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY,
    day_id INTEGER UNIQUE,
    protein_total REAL,
    carbs_total REAL,
    fat_total REAL,
    fiber_total REAL,
    protein_hit INTEGER,
    verdict TEXT
  );

  CREATE TABLE IF NOT EXISTS exercise (
    id INTEGER PRIMARY KEY,
    day_id INTEGER,
    modality TEXT,
    pace INTEGER,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    created_at TEXT
  );
`);

const ALL_PRESETS = [
  // ── Proteins ──────────────────────────────────────────────
  ['Chicken breast (boiled)',       '100g',        22,  0,  2, 0],
  ['Chicken thigh (boiled)',        '100g',        19,  0,  8, 0],
  ['Pork (boiled)',                 '100g',        20,  0, 10, 0],
  ['Pork belly (thịt ba chỉ)',      '100g',        14,  0, 30, 0],
  ['Beef (stir fry)',               '100g',        22,  0,  8, 0],
  ['Beef (boiled/phở)',             '100g',        22,  0,  5, 0],
  ['Chả lụa (Vietnamese ham)',      '100g',        14,  3,  6, 0],
  ['Chả giò (fried spring roll)',   '1 piece',      3,  8,  5, 0],
  ['Boiled egg',                    '1 egg',        6,  0,  5, 0],
  ['Egg white',                     '1 egg white',  4,  0,  0, 0],
  ['Fish fillet (white)',           '100g',        20,  0,  4, 0],
  ['Salmon fillet',                 '100g',        20,  0, 13, 0],
  ['Shrimp (tôm, boiled)',          '100g',        20,  1,  1, 0],
  ['Tuna (canned in water)',        '100g',        25,  0,  1, 0],
  ['Sardines (canned)',             '100g',        21,  0, 11, 0],
  ['Squid (mực, stir fry)',         '100g',        16,  3,  1, 0],
  ['Tofu (firm)',                   '100g',         8,  2,  4, 0],
  ['Whey protein (1 scoop)',        '30g',         24,  3,  1, 0],

  // ── Carbs ─────────────────────────────────────────────────
  ['White rice',                    '1 cup cooked',  4, 45,  0, 0],
  ['Brown rice',                    '1 cup cooked',  5, 45,  2, 4],
  ['Oatmeal (dry)',                 '50g',            6, 30,  3, 4],
  ['Bread (bun/roll)',              '1 piece',        4, 20,  2, 1],
  ['Bánh mì (baguette)',            '½ loaf',         6, 30,  2, 1],
  ['Phở noodles (dry)',             '100g',           8, 75,  1, 1],
  ['Bún (rice vermicelli, dry)',    '100g',           6, 78,  0, 0],
  ['Sweet potato',                  '100g',           2, 20,  0, 3],
  ['Corn (bắp)',                    '1 cob',          3, 25,  1, 2],
  ['Banana',                        '1 medium',       1, 27,  0, 3],
  ['Mango',                         '1 fruit',        1, 25,  0, 3],
  ['Watermelon',                    '2 cups',         1, 23,  0, 1],
  ['Orange',                        '1 medium',       1, 15,  0, 3],

  // ── Vegetables / Fiber ────────────────────────────────────
  ['Mixed greens (luộc)',           '1 cup',  2,  4,  0, 3],
  ['Water spinach (rau muống)',     '1 cup',  3,  3,  0, 2],
  ['Bok choy (cải xanh)',           '1 cup',  1,  2,  0, 1],
  ['Bean sprouts (giá đỗ)',         '1 cup',  3,  6,  0, 2],
  ['Bitter melon (khổ qua)',        '1 cup',  1,  4,  0, 2],
  ['Cabbage (bắp cải)',             '1 cup',  1,  5,  0, 2],
  ['Broccoli',                      '1 cup',  3,  6,  0, 2],
  ['Tomato',                        '1 medium', 1, 4, 0, 1],
  ['Eggplant (cà tím)',             '1 cup',  1,  8,  0, 2],
  ['Mushroom',                      '1 cup',  3,  4,  0, 2],
  ['Cucumber',                      '1 cup',  1,  3,  0, 1],
  ['Canh chua (sour soup)',         '1 bowl', 5,  6,  1, 3],
  ['Canh khoai mỡ (yam soup)',      '1 bowl', 4,  8,  1, 4],
  ['Canh rau (vegetable soup)',     '1 bowl', 2,  4,  0, 2],

  // ── Good Fats ─────────────────────────────────────────────
  ['Macadamia nuts',                '4 nuts',   1,  1, 10, 1],
  ['Walnuts',                       '4 nuts',   2,  1,  9, 1],
  ['Almonds',                       '4 nuts',   2,  1,  7, 1],
  ['Cashews',                       '10 nuts',  3,  5,  6, 0],
  ['Avocado',                       '½ fruit',  1,  4, 11, 5],
  ['Peanut butter',                 '1 tbsp',   4,  3,  8, 1],
  ['Olive oil',                     '1 tbsp',   0,  0, 14, 0],
  ['Coconut milk',                  '100ml',    2,  3, 20, 0],

  // ── Vietnamese complete dishes ────────────────────────────
  ['Phở bò (beef pho)',             '1 bowl',  25, 45,  5, 2],
  ['Bún bò Huế',                    '1 bowl',  22, 40,  8, 2],
  ['Cơm tấm (broken rice plate)',   '1 plate', 30, 65, 15, 2],
  ['Bún thịt nướng',                '1 bowl',  22, 50,  8, 2],
  ['Cháo gà (chicken congee)',      '1 bowl',  15, 30,  3, 1],
  ['Hủ tiếu',                       '1 bowl',  18, 42,  5, 1],

  // ── Dairy ─────────────────────────────────────────────────
  ['Milk (unsweetened)',            '200ml',  7, 10,  4, 0],
  ['Milk (full fat)',               '200ml',  7, 10,  8, 0],
  ['Greek yogurt (plain)',          '150g',  12,  6,  3, 0],
  ['Cottage cheese',                '100g',  11,  3,  4, 0],
  ['3-in-1 coffee (Nestlé)',        '1 sachet', 1, 16, 3, 0],
  ['Black coffee',                  '1 cup',   0,  0,  0, 0],

  // ── Sauces & condiments ───────────────────────────────────
  ['Fish sauce (nước mắm)',         '1 tbsp',  1,  1,  0, 0],
  ['Soy sauce',                     '1 tbsp',  1,  1,  0, 0],
  ['Oyster sauce',                  '1 tbsp',  0,  4,  0, 0],
];

const insert = db.prepare(`
  INSERT INTO foods (name, serving_label, protein, carbs, fat, fiber, is_custom)
  VALUES (?, ?, ?, ?, ?, ?, 0)
`);

const existingNames = new Set(
  db.prepare('SELECT name FROM foods WHERE is_custom = 0').all().map(r => r.name)
);

const addMissing = db.transaction(() => {
  for (const [name, serving_label, protein, carbs, fat, fiber] of ALL_PRESETS) {
    if (!existingNames.has(name)) {
      insert.run(name, serving_label, protein, carbs, fat, fiber);
    }
  }
});

addMissing();

module.exports = db;
