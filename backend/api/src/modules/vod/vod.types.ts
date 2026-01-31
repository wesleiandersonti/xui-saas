export type ContentType = 'movie' | 'tv_show' | 'series';

export interface VodContent {
  id: number;
  tenantId: number;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  description: string | null;
  contentType: ContentType;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date | null;
  durationMinutes: number | null;
  rating: string | null;
  genre: string | null;
  cast: string | null;
  director: string | null;
  streamUrl: string | null;
  isActive: boolean;
  adultContent: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories?: VodCategory[];
}

export interface VodCategory {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VodContentCategory {
  contentId: number;
  categoryId: number;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  media_type?: 'movie' | 'tv';
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  adult: boolean;
  homepage: string | null;
  imdb_id: string | null;
  budget: number;
  revenue: number;
  tagline: string | null;
  status: string;
}

export interface TmdbTvShowDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  adult: boolean;
  homepage: string | null;
  number_of_episodes: number;
  number_of_seasons: number;
  status: string;
  tagline: string | null;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface ContentFilters {
  contentType?: ContentType;
  categoryId?: number;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
