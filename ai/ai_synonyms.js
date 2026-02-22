export const DEFAULT_SYNONYMS = {
  inventaire: ['stock', 'inventory', 'inv'],
  reception: ['réception', 'receiving', 'rec', 'arrivage'],
  deplacement: ['mouvement', 'move', 'relocation'],
  regle: ['règle', 'policy', 'consigne'],
  export: ['telecharger', 'download', 'extraire'],
  item: ['sku', 'article', 'produit', 'piece'],
};

export function expandWithSynonyms(text, synonyms = DEFAULT_SYNONYMS) {
  const input = String(text || '').toLowerCase();
  const bag = new Set(input.split(/[^\p{L}\p{N}_-]+/u).filter(Boolean));
  Object.entries(synonyms).forEach(([canonical, values]) => {
    if (bag.has(canonical) || values.some((v) => bag.has(v.toLowerCase()))) {
      bag.add(canonical);
      values.forEach((v) => bag.add(v.toLowerCase()));
    }
  });
  return [...bag];
}
