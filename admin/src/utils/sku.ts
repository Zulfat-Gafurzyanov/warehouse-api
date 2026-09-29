// Буквы, которые есть на российских гос. номерах (визуально совпадают с латиницей) —
// для них берём именно это написание. Остальные кириллические буквы — обычная транслитерация.
const TRANSLIT_MAP: Record<string, string> = {
  а: "A", б: "B", в: "B", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z",
  и: "I", й: "Y", к: "K", л: "L", м: "M", н: "H", о: "O", п: "P", р: "P",
  с: "C", т: "T", у: "Y", ф: "F", х: "X", ц: "TS", ч: "CH", ш: "SH", щ: "SCH",
  ъ: "", ы: "Y", ь: "", э: "E", ю: "YU", я: "YA",
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => (ch in TRANSLIT_MAP ? TRANSLIT_MAP[ch] : ch))
    .join("")
    .toUpperCase();
}

/** Артикул из названия товара: инициалы слов (или первые буквы одного слова) + случайные цифры. */
export function generateSkuFromName(name: string): string {
  const cleaned = name.replace(/[«»"'()]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter((w) => /[a-zA-Zа-яА-ЯёЁ0-9]/.test(w));

  let letters: string;
  if (words.length >= 2) {
    letters = words.slice(0, 4).map((w) => w[0]).join("");
  } else if (words.length === 1) {
    letters = words[0].slice(0, 4);
  } else {
    letters = "";
  }

  const prefix = transliterate(letters).replace(/[^A-Z0-9]/g, "");
  const suffix = String(Math.floor(100 + Math.random() * 900));

  return prefix ? `${prefix}-${suffix}` : `SKU-${suffix}`;
}
