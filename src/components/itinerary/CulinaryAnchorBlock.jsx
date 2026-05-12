import { useState } from 'react';

// Regional ingredient substitution hints keyed by cuisine type
const REGIONAL_HINTS = {
  italian:     { region: 'Mediterranean', swaps: ['Use local olive oil', 'Fresh herbs from market stalls', 'Local hard cheese instead of Parmesan'] },
  mexican:     { region: 'Latin American', swaps: ['Fresh chiles from mercado', 'Local corn tortillas', 'Regional avocado varieties'] },
  japanese:    { region: 'East Asian', swaps: ['Local soy sauce equivalent', 'Regional short-grain rice', 'Fresh ginger from wet market'] },
  thai:        { region: 'Southeast Asian', swaps: ['Fresh lemongrass from street market', 'Local fish sauce', 'Regional chili paste'] },
  indian:      { region: 'South Asian', swaps: ['Whole spices from spice market', 'Local ghee or coconut oil', 'Regional lentil varieties'] },
  french:      { region: 'European', swaps: ['Local farmhouse butter', 'Regional wine for deglazing', 'Fresh herbs from morning market'] },
  chinese:     { region: 'East Asian', swaps: ['Local soy sauce', 'Fresh tofu from market', 'Regional leafy greens'] },
  greek:       { region: 'Mediterranean', swaps: ['Local olive oil', 'Regional feta-style cheese', 'Fresh oregano and thyme'] },
  american:    { region: 'Local', swaps: ['Source proteins from local butcher', 'Seasonal produce from market', 'Local condiments'] },
  default:     { region: 'Local', swaps: ['Source proteins locally', 'Seasonal produce preferred', 'Ask locals for regional alternatives'] },
};

function getRegionalHints(cuisineType) {
  if (!cuisineType) return REGIONAL_HINTS.default;
  const key = cuisineType.toLowerCase().replace(/[^a-z]/g, '');
  return REGIONAL_HINTS[key] ?? REGIONAL_HINTS.default;
}

function parseIngredients(recipe) {
  // Try structured ingredients first, then fall back to description parsing
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) return recipe.ingredients;
  if (recipe.ingredients && typeof recipe.ingredients === 'string') {
    return recipe.ingredients.split('\n').filter(Boolean);
  }
  // Generate plausible shopping list from recipe metadata
  const items = [];
  if (recipe.cuisine_type) items.push(`${recipe.cuisine_type} staples`);
  if (recipe.dietary_tags?.includes('vegan')) items.push('Plant-based proteins', 'Fresh vegetables');
  else if (recipe.dietary_tags?.includes('vegetarian')) items.push('Fresh vegetables', 'Eggs / dairy');
  else items.push('Proteins (meat / fish)', 'Fresh vegetables');
  items.push('Aromatics (garlic, onion, herbs)', 'Cooking oil', 'Pantry staples (salt, pepper, spices)');
  return items;
}

export default function CulinaryAnchorBlock({ recipe, destination, onDismiss }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  const hints = getRegionalHints(recipe.cuisine_type);
  const ingredients = parseIngredients(recipe);
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div
      className="rounded border overflow-hidden"
      style={{
        background: 'rgba(230,126,34,0.06)',
        borderColor: 'rgba(230,126,34,0.35)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(230,126,34,0.2)' }}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(230,126,34,0.15)', color: '#E67E22' }}
              >
                Culinary Anchor
              </span>
              {recipe.cuisine_type && (
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                  {recipe.cuisine_type}
                </span>
              )}
            </div>
            <h4 className="text-white font-mono font-bold text-sm mt-0.5 leading-tight">
              {recipe.title}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-mono text-xs"
          >
            {collapsed ? '▼ expand' : '▲ collapse'}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-red-400 transition-colors text-xs font-mono"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-xs font-mono text-[var(--text-secondary)]">
            {totalTime > 0 && (
              <span>{totalTime} MIN</span>
            )}
            {recipe.calories && (
              <span>{recipe.calories} KCAL</span>
            )}
            {destination && (
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{destination}</span>
            )}
            <span style={{ color: '#E67E22' }}>
              {hints.region} region
            </span>
          </div>

          {recipe.description && (
            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
              {recipe.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shopping list */}
            <div className="space-y-2">
              <div
                className="text-[10px] font-mono tracking-[0.15em] uppercase"
                style={{ color: '#E67E22' }}
              >
                Shopping List
                {ingredients.length > 0 && (
                  <span className="ml-2 text-[var(--text-muted)] normal-case tracking-normal">
                    {checkedCount}/{ingredients.length} sourced
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {ingredients.map((item) => {
                  const checked = !!checkedItems[item];
                  return (
                    <label key={item} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => toggleItem(item)}
                        className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: checked ? '#E67E22' : 'transparent',
                          borderColor: checked ? '#E67E22' : 'rgba(230,126,34,0.35)',
                        }}
                      >
                        {checked && <span className="text-black text-[8px] font-bold">✓</span>}
                      </div>
                      <span
                        className="text-xs font-mono transition-colors"
                        style={{ color: checked ? '#4B5563' : '#CBD5E1', textDecoration: checked ? 'line-through' : 'none' }}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Regional adaptations */}
            <div className="space-y-2">
              <div
                className="text-[10px] font-mono tracking-[0.15em] uppercase"
                style={{ color: '#E67E22' }}
              >
                Local Sourcing Tips
              </div>
              <ul className="space-y-1.5">
                {hints.swaps.map((swap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-[var(--text-secondary)]">
                    <span style={{ color: '#E67E22' }} className="mt-0.5 shrink-0">▸</span>
                    {swap}
                  </li>
                ))}
              </ul>
              {recipe.dietary_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipe.dietary_tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'rgba(230,126,34,0.1)', color: '#E67E22' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source link */}
          {recipe.source_url && (
            <div className="pt-2 border-t" style={{ borderColor: 'rgba(230,126,34,0.15)' }}>
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono hover:underline"
                style={{ color: 'rgba(230,126,34,0.7)' }}
              >
                ↗ Full recipe: {recipe.source_name ?? recipe.source_url}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
