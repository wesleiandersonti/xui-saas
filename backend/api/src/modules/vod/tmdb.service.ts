import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type {
  TmdbSearchResponse,
  TmdbMovieDetails,
  TmdbTvShowDetails,
} from './vod.types';

@Injectable()
export class TmdbService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p';

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('TMDB_API_KEY not configured');
    }
  }

  async searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
    const response = await axios.get<TmdbSearchResponse>(
      `${this.baseUrl}/search/movie`,
      {
        params: {
          api_key: this.apiKey,
          query,
          page,
          language: 'pt-BR',
        },
      },
    );
    return response.data;
  }

  async searchTvShows(query: string, page = 1): Promise<TmdbSearchResponse> {
    const response = await axios.get<TmdbSearchResponse>(
      `${this.baseUrl}/search/tv`,
      {
        params: {
          api_key: this.apiKey,
          query,
          page,
          language: 'pt-BR',
        },
      },
    );
    return response.data;
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    const response = await axios.get<TmdbMovieDetails>(
      `${this.baseUrl}/movie/${tmdbId}`,
      {
        params: {
          api_key: this.apiKey,
          language: 'pt-BR',
          append_to_response: 'credits',
        },
      },
    );
    return response.data;
  }

  async getTvShowDetails(tmdbId: number): Promise<TmdbTvShowDetails> {
    const response = await axios.get<TmdbTvShowDetails>(
      `${this.baseUrl}/tv/${tmdbId}`,
      {
        params: {
          api_key: this.apiKey,
          language: 'pt-BR',
          append_to_response: 'credits',
        },
      },
    );
    return response.data;
  }

  getImageUrl(
    path: string | null,
    size:
      | 'w92'
      | 'w154'
      | 'w185'
      | 'w342'
      | 'w500'
      | 'w780'
      | 'original' = 'w500',
  ): string | null {
    if (!path) {
      return null;
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }
}
