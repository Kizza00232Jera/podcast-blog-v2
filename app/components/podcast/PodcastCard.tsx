import Link from 'next/link'
import type { PodcastPost } from '@/app/types/podcast'

export default function PodcastCard({ podcast }: { podcast: PodcastPost }) {
  const previewText =
    podcast.summary?.overview ||
    (podcast.key_takeaways?.length > 0 ? podcast.key_takeaways[0] : 'No summary available')

  return (
    <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">

      {/* Thumbnail with gradient fallback */}
      <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
        {podcast.thumbnail_url && (
          <img
            src={podcast.thumbnail_url}
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug">
          {podcast.title}
        </h3>

        <div className="space-y-1 mb-3">
          <p className="text-sm text-gray-600">Podcast: {podcast.podcast_name}</p>
          <p className="text-sm text-gray-600">Creator: {podcast.creator}</p>
          {podcast.duration_minutes && (
            <p className="text-sm text-gray-600">⏱️ {podcast.duration_minutes} min</p>
          )}
        </div>

        {podcast.rating && (
          <div className="text-yellow-400 mb-3 text-sm">
            {'⭐'.repeat(podcast.rating)}
          </div>
        )}

        <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-3">
          {previewText}
        </p>

        <div className="flex gap-2.5">
          <Link
            href={`/podcast/${podcast.slug}`}
            className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors text-center"
          >
            Read Full Article →
          </Link>
          {podcast.source_link && (
            <a
              href={podcast.source_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-red-500 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-red-600 transition-colors text-center"
            >
              ▶️ YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  )
}