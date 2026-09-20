import type { SortOption } from "../api/types";
import "./SortDropdown.css";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "По умолчанию" },
  { value: "new", label: "Сначала новинки" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <label className="sort-dropdown">
      Сортировка:
      <select value={value} onChange={(e) => onChange(e.target.value as SortOption)}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
