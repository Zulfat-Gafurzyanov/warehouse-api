import type { Category } from "../api/types";
import "./CategorySidebar.css";

interface CategorySidebarProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: CategorySidebarProps) {
  return (
    <aside className="sidebar">
      <ul className="sidebar__list">
        <li>
          <button
            className={`sidebar__item ${selectedId === null ? "sidebar__item--active" : ""}`}
            onClick={() => onSelect(null)}
          >
            Все категории
          </button>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <button
              className={`sidebar__item ${selectedId === c.id ? "sidebar__item--active" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
