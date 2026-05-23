/**
 * Catalogue exhaustif des compétences pour un grand organe du Gouvernement (SIGC-CSN).
 * Couvre les corps de métiers : santé, logistique, médias, administration,
 * finances/droit, recherche, technique/numérique, management, langues.
 * L'agent ne peut PAS saisir de texte libre : il choisit une catégorie puis coche
 * les compétences associées et indique un niveau (Junior / Intermédiaire / Expert).
 */
export interface CompetenceCatalogItem {
  category: string;
  items: string[];
}

export const PUBLIC_ADMIN_COMPETENCES: CompetenceCatalogItem[] = [
  {
    category: "Santé & Médical",
    items: [
      "Soins infirmiers d'urgence",
      "Gestion de pharmacie / dispensaire",
      "Premiers secours",
      "Suivi médical du travail",
      "Hygiène et sécurité sanitaire",
    ],
  },
  {
    category: "Logistique & Transport",
    items: [
      "Conduite sécurisée (véhicules légers)",
      "Conduite VIP / protocole",
      "Mécanique automobile (maintenance)",
      "Mécanique automobile (diagnostic)",
      "Gestion de flotte",
      "Logistique d'événements officiels",
      "Gestion d'entrepôt / magasin",
    ],
  },
  {
    category: "Médias, Édition & Communication",
    items: [
      "Journalisme d'investigation",
      "Rédaction d'articles",
      "Correcteur / écrivain public",
      "Relations presse",
      "Photographie",
      "Caméraman / prise de vue",
      "Montage vidéo",
      "Community management institutionnel",
      "Communication institutionnelle",
    ],
  },
  {
    category: "Administration & Secrétariat",
    items: [
      "Secrétariat de direction",
      "Accueil et protocole d'État",
      "Rédaction administrative",
      "Archivage institutionnel",
      "Gestion des dossiers agents",
      "Organisation de réunions officielles",
    ],
  },
  {
    category: "Économie, Finances & Droit",
    items: [
      "Comptabilité publique",
      "Gestion budgétaire",
      "Analyse financière",
      "Marchés publics",
      "Droit public",
      "Contentieux administratif",
      "Audit interne",
    ],
  },
  {
    category: "Recherche & Science",
    items: [
      "Méthodologie de recherche",
      "Rédaction scientifique",
      "Analyse statistique",
      "Gestion de projets scientifiques",
      "Veille documentaire",
    ],
  },
  {
    category: "Technique & Numérique",
    items: [
      "Maintenance informatique",
      "Gestion des réseaux",
      "Support technique utilisateurs",
      "Développement d'applications",
      "Cybersécurité",
      "Gestion documentaire numérique",
      "Bureautique avancée (Word/Excel/PowerPoint)",
    ],
  },
  {
    category: "Management & Leadership",
    items: [
      "Leadership institutionnel",
      "Gestion d'équipe",
      "Conduite de réunions",
      "Prise de décision",
      "Résolution de conflits",
    ],
  },
  {
    category: "Langues",
    items: [
      "Français (rédaction)",
      "Anglais (technique)",
      "Lingala",
      "Swahili",
      "Kikongo",
      "Tshiluba",
    ],
  },
];

/**
 * Niveaux simplifiés exposés à l'agent. Stockés en `niveau` integer (compat existant).
 * Junior = 2, Intermédiaire = 3, Expert = 5.
 */
export const NIVEAU_OPTIONS = [
  { value: 2, label: "Junior" },
  { value: 3, label: "Intermédiaire" },
  { value: 5, label: "Expert" },
] as const;

export const NIVEAU_LABELS: Record<number, string> = {
  1: "Notion",
  2: "Junior",
  3: "Intermédiaire",
  4: "Avancé",
  5: "Expert",
};

export function niveauLabel(n: number | null | undefined): string {
  if (!n) return "Non évalué";
  return NIVEAU_LABELS[n] ?? `Niveau ${n}`;
}

/** Renvoie la catégorie qui contient une compétence donnée (ou null). */
export function findCategoryFor(competence: string): string | null {
  for (const c of PUBLIC_ADMIN_COMPETENCES) {
    if (c.items.includes(competence)) return c.category;
  }
  return null;
}
