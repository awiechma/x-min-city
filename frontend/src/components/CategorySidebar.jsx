import { CATEGORIES, getLabel, getDotClass } from "./tagConfig";

function CategorySidebar({ value, onChange }) {
  const toggle = (cat) =>
    onChange(
      value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]
    );

  const toggleAll = () =>
    onChange(value.length === CATEGORIES.length ? [] : CATEGORIES);

  return (
    <div className="sidebar">
      <h5>Kategorien</h5>
      <div className="sidebar-group category-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-btn ${value.includes(cat) ? "is-active" : ""}`}
            onClick={() => toggle(cat)}
          >
            <span className={`poi-dot ${getDotClass(cat)}`} />
            {getLabel(cat)}
          </button>
        ))}
      </div>

      <div className="sidebar-actions mt-4">
        <button className="btn" onClick={toggleAll}>
          {value.length === CATEGORIES.length
            ? "Alle abwählen"
            : "Alle auswählen"}
        </button>
      </div>
    </div>
  );
}

export default CategorySidebar;
