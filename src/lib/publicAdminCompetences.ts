/**
 * Référentiel des compétences clés dans l'administration publique (RDC / SIGC-CSN).
 * Organisé par grandes familles. L'agent peut s'auto-évaluer de 1 (notion) à 5 (expert).
 */
export interface CompetenceCatalogItem {
  category: string;
  items: string[];
}

export const PUBLIC_ADMIN_COMPETENCES: CompetenceCatalogItem[] = [
  {
    category: "Gouvernance & Cadre Légal",
    items: [
      "Connaissance du cadre constitutionnel",
      "Procédures administratives publiques",
      "Éthique et déontologie du fonctionnaire",
      "Lutte contre la corruption",
      "Gestion des archives publiques",
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
      "Délégation et coordination",
    ],
  },
  {
    category: "Gestion Administrative",
    items: [
      "Rédaction administrative",
      "Gestion budgétaire",
      "Marchés publics",
      "Gestion des ressources humaines",
      "Suivi-évaluation de projets",
      "Reporting institutionnel",
    ],
  },
  {
    category: "Communication",
    items: [
      "Communication institutionnelle",
      "Communication interpersonnelle",
      "Présentation orale",
      "Gestion des relations publiques",
      "Médiation",
    ],
  },
  {
    category: "Numérique & Bureautique",
    items: [
      "Microsoft Word / traitement de texte",
      "Microsoft Excel / tableurs",
      "Microsoft PowerPoint / présentations",
      "Outils collaboratifs (Teams, Drive)",
      "Cybersécurité de base",
      "Gestion documentaire numérique",
    ],
  },
  {
    category: "Analyse & Stratégie",
    items: [
      "Analyse de politiques publiques",
      "Veille stratégique",
      "Planification stratégique",
      "Analyse statistique de données",
      "Élaboration d'indicateurs de performance",
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

export const NIVEAU_LABELS: Record<number, string> = {
  1: "Notion",
  2: "Application",
  3: "Maîtrise",
  4: "Avancé",
  5: "Expert",
};
