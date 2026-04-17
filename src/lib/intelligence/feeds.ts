// ── Intelligence Feed Registry ────────────────────────────────
// Add a new source = add one entry here. Zero other code changes.
// fetchType: "rss"    = standard RSS/Atom parser
//            "scrape" = lightweight HTML title-extractor for sites without RSS

export type FetchType = "rss" | "scrape";
export type FeedCategory = "automotive" | "sdv" | "mbse" | "ai_llm" | "standards" | "market";

export interface FeedSource {
  id: string;
  name: string;
  domain: string;
  url: string;
  fetchType: FetchType;
  category: FeedCategory;
  relevanceBoost: number; // 0–20, added to base Haiku score
}

export const FEEDS: FeedSource[] = [

  // ── Domain 1: MBSE · Systems Engineering · PLM · Digital Thread ──
  {
    id: "prostep-news",
    name: "prostep ivip — News",
    domain: "prostep.org",
    url: "https://www.prostep.org/en/news",
    fetchType: "scrape",
    category: "mbse",
    relevanceBoost: 20,
  },
  {
    id: "prostep-events",
    name: "prostep ivip — Events",
    domain: "prostep.org",
    url: "https://www.prostep.org/en/events/events",
    fetchType: "scrape",
    category: "mbse",
    relevanceBoost: 18,
  },
  {
    id: "sae-technical",
    name: "SAE International — Technical Papers",
    domain: "sae.org",
    url: "https://www.sae.org/feeds/technical-papers.rss",
    fetchType: "rss",
    category: "mbse",
    relevanceBoost: 15,
  },
  {
    id: "sae-auto-eng",
    name: "SAE — Automotive Engineering",
    domain: "sae.org",
    url: "https://www.sae.org/feeds/automotive-engineering.rss",
    fetchType: "rss",
    category: "automotive",
    relevanceBoost: 12,
  },
  {
    id: "ieee-spectrum",
    name: "IEEE Spectrum",
    domain: "spectrum.ieee.org",
    url: "https://spectrum.ieee.org/feeds/feed.rss",
    fetchType: "rss",
    category: "mbse",
    relevanceBoost: 10,
  },
  {
    id: "incose-news",
    name: "INCOSE — News",
    domain: "incose.org",
    url: "https://www.incose.org/news-articles",
    fetchType: "scrape",
    category: "mbse",
    relevanceBoost: 18,
  },
  {
    id: "digital-engineering-247",
    name: "Digital Engineering 247",
    domain: "digitalengineering247.com",
    url: "https://www.digitalengineering247.com/feed/",
    fetchType: "rss",
    category: "mbse",
    relevanceBoost: 12,
  },
  {
    id: "sdv-guide",
    name: "SDV Guide Community",
    domain: "sdv.guide",
    url: "https://www.sdv.guide/blog",
    fetchType: "scrape",
    category: "sdv",
    relevanceBoost: 14,
  },

  // ── Domain 2: Automotive · SDV · E/E Architecture ──
  {
    id: "automotive-iq",
    name: "Automotive IQ",
    domain: "automotive-iq.com",
    url: "https://www.automotive-iq.com/rss-feeds",
    fetchType: "rss",
    category: "automotive",
    relevanceBoost: 12,
  },
  {
    id: "automotive-news-eu",
    name: "Automotive News Europe",
    domain: "europe.autonews.com",
    url: "https://europe.autonews.com/rss.xml",
    fetchType: "rss",
    category: "automotive",
    relevanceBoost: 8,
  },
  {
    id: "autosar-news",
    name: "AUTOSAR — News & Events",
    domain: "autosar.org",
    url: "https://www.autosar.org/news-events",
    fetchType: "scrape",
    category: "sdv",
    relevanceBoost: 16,
  },
  {
    id: "eclipse-newsroom",
    name: "Eclipse Foundation Newsroom",
    domain: "newsroom.eclipse.org",
    url: "https://newsroom.eclipse.org/rss.xml",
    fetchType: "rss",
    category: "sdv",
    relevanceBoost: 10,
  },
  {
    id: "covesa-news",
    name: "COVESA — News",
    domain: "covesa.global",
    url: "https://covesa.global/news/",
    fetchType: "scrape",
    category: "sdv",
    relevanceBoost: 14,
  },
  {
    id: "elektrobit-blog",
    name: "Elektrobit — SDV Blog",
    domain: "elektrobit.com",
    url: "https://www.elektrobit.com/blog/",
    fetchType: "scrape",
    category: "sdv",
    relevanceBoost: 12,
  },
  {
    id: "automotive-world",
    name: "Automotive World",
    domain: "automotiveworld.com",
    url: "https://www.automotiveworld.com/news/feed/",
    fetchType: "rss",
    category: "automotive",
    relevanceBoost: 8,
  },

  // ── Domain 3: AI · LLM · Engineering Intelligence Tools ──
  {
    id: "anthropic-blog",
    name: "Anthropic Blog",
    domain: "anthropic.com",
    url: "https://www.anthropic.com/rss.xml",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 20,
  },
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    domain: "technologyreview.com",
    url: "https://www.technologyreview.com/feed/",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 12,
  },
  {
    id: "mckinsey-tech",
    name: "McKinsey Technology & Digital",
    domain: "mckinsey.com",
    url: "https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/rss",
    fetchType: "rss",
    category: "market",
    relevanceBoost: 14,
  },
  {
    id: "the-gradient",
    name: "The Gradient (AI research)",
    domain: "thegradient.pub",
    url: "https://thegradient.pub/rss/",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 10,
  },
  {
    id: "import-ai",
    name: "Import AI (Jack Clark)",
    domain: "importai.substack.com",
    url: "https://importai.substack.com/feed",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 12,
  },
  {
    id: "hugging-face-blog",
    name: "Hugging Face Blog",
    domain: "huggingface.co",
    url: "https://huggingface.co/blog/feed.xml",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 10,
  },
  {
    id: "simon-willison",
    name: "Simon Willison (LLMs)",
    domain: "simonwillison.net",
    url: "https://simonwillison.net/atom/everything/",
    fetchType: "rss",
    category: "ai_llm",
    relevanceBoost: 12,
  },

  // ── Domain 4: Functional Safety · ISO 26262 · SOTIF ──
  {
    id: "exida-blog",
    name: "exida Blog",
    domain: "exida.com",
    url: "https://www.exida.com/blog",
    fetchType: "scrape",
    category: "standards",
    relevanceBoost: 15,
  },
  {
    id: "tuvsud-newsroom",
    name: "TÜV SÜD Newsroom",
    domain: "tuvsud.com",
    url: "https://www.tuvsud.com/en/newsroom",
    fetchType: "scrape",
    category: "standards",
    relevanceBoost: 12,
  },

  // ── Domain 5: Automotive Cybersecurity · ISO/SAE 21434 · R155 ──
  {
    id: "upstream-blog",
    name: "Upstream Security Blog",
    domain: "upstream.auto",
    url: "https://upstream.auto/blog/feed/",
    fetchType: "rss",
    category: "standards",
    relevanceBoost: 16,
  },
  {
    id: "enisa-news",
    name: "ENISA — Cybersecurity News",
    domain: "enisa.europa.eu",
    url: "https://www.enisa.europa.eu/news/enisa-news/RSS",
    fetchType: "rss",
    category: "standards",
    relevanceBoost: 14,
  },
  {
    id: "argus-blog",
    name: "Argus Cyber Security Blog",
    domain: "argus-sec.com",
    url: "https://argus-sec.com/blog/",
    fetchType: "scrape",
    category: "standards",
    relevanceBoost: 14,
  },
  {
    id: "autocrypt-blog",
    name: "AUTOCRYPT Blog",
    domain: "autocrypt.io",
    url: "https://autocrypt.io/blog/",
    fetchType: "scrape",
    category: "standards",
    relevanceBoost: 12,
  },

  // ── Domain 6: Standards · Regulation · EU Policy ──
  {
    id: "eu-ai-act",
    name: "EU AI Act Tracker",
    domain: "artificialintelligenceact.eu",
    url: "https://artificialintelligenceact.eu/feed/",
    fetchType: "rss",
    category: "standards",
    relevanceBoost: 16,
  },

  // ── Domain 7: Belgian / DACH Startup & Innovation Ecosystem ──
  {
    id: "agoria-news",
    name: "Agoria — Technology Sector",
    domain: "agoria.be",
    url: "https://www.agoria.be/en/news",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 18,
  },
  {
    id: "startups-be",
    name: "Startups.be — News",
    domain: "startups.be",
    url: "https://startups.be/news",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 10,
  },
  {
    id: "mecacar-be",
    name: "Mecacar Belgium",
    domain: "mecacar.be",
    url: "https://www.mecacar.be/en/news",
    fetchType: "scrape",
    category: "automotive",
    relevanceBoost: 16,
  },
  {
    id: "hub-brussels",
    name: "hub.brussels — Innovation",
    domain: "hub.brussels",
    url: "https://hub.brussels/en/news",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 8,
  },

  // ── Domain 8: EU Institutions / Research ──
  {
    id: "ertrac",
    name: "ERTRAC — European Road Transport Research",
    domain: "ertrac.org",
    url: "https://www.ertrac.org/news/",
    fetchType: "scrape",
    category: "automotive",
    relevanceBoost: 14,
  },
  {
    id: "ecsel-ju",
    name: "KDT JU (Electronic Components & Systems)",
    domain: "kdt.europa.eu",
    url: "https://www.kdt.europa.eu/news",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 12,
  },
  {
    id: "eureka-cluster",
    name: "PENTA / EURIPIDES² — Embedded Systems",
    domain: "eurekanetwork.org",
    url: "https://www.eurekanetwork.org/news",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 10,
  },

  // ── Domain 9: Consulting & Strategy ──
  {
    id: "deloitte-insights",
    name: "Deloitte Insights — Mobility",
    domain: "deloitte.com",
    url: "https://www2.deloitte.com/us/en/insights/rss.xml",
    fetchType: "rss",
    category: "market",
    relevanceBoost: 10,
  },
  {
    id: "oliver-wyman",
    name: "Oliver Wyman — Automotive",
    domain: "oliverwyman.com",
    url: "https://www.oliverwyman.com/our-expertise/industries/automotive.html",
    fetchType: "scrape",
    category: "market",
    relevanceBoost: 10,
  },
];
