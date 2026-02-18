export interface PodcastPost {
    id: string;
    slug: string;
    title: string;
    podcast_name: string;
    creator: string;
    source_link: string;
    thumbnail_url: string;
    duration_minutes: number;
    rating: number;
    tags: string[];
    summary: PodcastSummary;
    key_takeaways: string[];
    actionable_advice: string[];
    resources: string[];
    user_id: string;
    created_at: string;
}

export interface PodcastSummary {
    overview: string;
    sections: Section[];
    quotes: string[];
}

export interface Section {
    heading: string;
    content: string;
}

