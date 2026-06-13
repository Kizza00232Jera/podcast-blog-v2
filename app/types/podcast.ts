export interface PodcastPost {
    id: string;
    slug: string;
    title: string;
    podcast_name: string;
    creator: string;
    source_link: string;
    thumbnail_url: string;
    duration_minutes: number;
    rating: number | null;
    tags: string[];
    summary: PodcastSummary;
    key_takeaways: string[];
    actionable_advice: string[];
    resources: string[];
    user_id: string;
    is_public: boolean;
    status: 'generating' | 'ready' | 'error';
    error_message: string | null;
    created_at: string;
}

// Superset shape covering BOTH summary variants:
//  - the legacy Perplexity rows: { overview, sections[{heading,content}], quotes: string[] }
//  - the new Opus rows: dynamic sections that may carry a per-topic quote,
//    plus key_takeaways folded into the summary object.
// Every new field is optional so old rows validate unchanged.
export interface PodcastSummary {
    overview: string;
    sections: Section[];
    quotes?: string[];
    key_takeaways?: string[];
    resources?: string[];
}

export interface Section {
    heading: string;
    content: string;
    // New Opus shape: one woven verbatim quote per major topic.
    quote?: string;
}
