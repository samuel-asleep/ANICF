


import {
  AnimeParser,
  ISearch,
  IAnimeInfo,
  MediaStatus,
  IAnimeResult,
  ISource,
  IAnimeEpisode,
  IEpisodeServer,
  MediaFormat,
  IVideo,
} from '../models';
import { USER_AGENT } from '../utils';

class AnimePahe extends AnimeParser {
  override readonly name = 'AnimePahe';
  protected override baseUrl = 'https://animepahe.ru';
  protected override logo = 'https://animepahe.com/pikacon.ico';
  protected override classPath = 'ANIME.AnimePahe';

  /**
   * @param query Search query
   */
  override search = async (query: string): Promise<ISearch<IAnimeResult>> => {
    try {
      const res = await fetch(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
        headers: this.Headers(false),
      });
      const data = await res.json();

      const searchResult = {
        results: data.data.map((item: any) => ({
          id: item.session,
          title: item.title,
          image: item.poster,
          rating: item.score,
          releaseDate: item.year,
          type: item.type,
        })),
      };

      return searchResult;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param id id format id/session
   * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
   */
  override fetchAnimeInfo = async (id: string, episodePage: number = -1): Promise<IAnimeInfo> => {
    const animeInfo: IAnimeInfo = {
      id: id,
      title: '',
    };

    try {
      const res = await fetch(`${this.baseUrl}/anime/${id}`, { headers: this.Headers(id) });
      const text = await res.text();
      
      animeInfo.title = text.match(/<div class="title-wrapper"><h1><span>([^<]+)<\/span>/)?.[1] ?? '';
      animeInfo.image = text.match(/<div class="anime-poster"><a href="([^"]+)">/)?.[1] ?? '';
      animeInfo.cover = `https:${text.match(/<div class="anime-cover" data-src="([^"]+)">/)?.[1] ?? ''}`;
      animeInfo.description = text.match(/<div class="anime-summary">([^<]+)<\/div>/)?.[1]?.trim() ?? '';
      
      const genresMatch = text.match(/<div class="anime-genre"><ul>(.*?)<\/ul><\/div>/s);
      if(genresMatch) {
          const genresLi = genresMatch[1].match(/<li><a href="[^"]+" title="([^"]+)">/g);
          if (genresLi) {
              animeInfo.genres = genresLi.map(g => g.match(/title="([^"]+)"/)?.[1] ?? '');
          }
      }
      
      animeInfo.hasSub = true;
      
      const statusMatch = text.match(/<p><strong>Status:<\/strong> <a[^>]+>([^<]+)<\/a><\/p>/);
      if (statusMatch) {
        switch (statusMatch[1].trim()) {
            case 'Currently Airing':
              animeInfo.status = MediaStatus.ONGOING;
              break;
            case 'Finished Airing':
              animeInfo.status = MediaStatus.COMPLETED;
              break;
            default:
              animeInfo.status = MediaStatus.UNKNOWN;
          }
      }

      animeInfo.type = text.match(/<p><strong>Type:<\/strong> <a[^>]+>([^<]+)<\/a><\/p>/)?.[1]?.trim().toUpperCase() as MediaFormat;
      animeInfo.releaseDate = text.match(/<p><strong>Aired:<\/strong>([^<]+) to/)?.[1]?.trim();
      
      const studiosMatch = text.match(/<p><strong>Studio:<\/strong>(.*?)<\/p>/s);
      if(studiosMatch) {
          const studiosA = studiosMatch[1].match(/<a[^>]+>([^<]+)<\/a>/g);
          if(studiosA) {
            animeInfo.studios = studiosA.map(s => s.match(/>([^<]+)</)?.[1] ?? '');
          }
      }


      const episodesMatch = text.match(/<p><strong>Episodes:<\/strong> ([^<]+)<\/p>/);
      if(episodesMatch) animeInfo.totalEpisodes = parseInt(episodesMatch[1]);
      
      animeInfo.episodes = [];
      if (episodePage < 0) {
        const episodesRes = await fetch(`${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
          headers: this.Headers(id),
        });

        const { last_page, data } = await episodesRes.json();

        animeInfo.episodePages = last_page;

        animeInfo.episodes.push(
          ...data.map(
            (item: any) =>
              ({
                id: `${id}/${item.session}`,
                number: item.episode,
                title: item.title,
                image: item.snapshot,
                duration: item.duration,
                url: `${this.baseUrl}/play/${id}/${item.session}`,
              } as IAnimeEpisode)
          )
        );

        for (let i = 1; i < last_page; i++) {
          animeInfo.episodes.push(...(await this.fetchEpisodes(id, i + 1)));
        }
      } else {
        animeInfo.episodes.push(...(await this.fetchEpisodes(id, episodePage)));
      }

      return animeInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId episode id
   */
  override fetchEpisodeSources = async (episodeId: string): Promise<ISource> => {
    try {
      const animeId = episodeId.split('/')[0];
      const epId = episodeId.split('/')[1];

      const res = await fetch(`${this.baseUrl}/play/${animeId}/${epId}`, {
        headers: this.Headers(animeId),
      });

      const text = await res.text();

      let m;
      const regex = /href="(?<link>https?:\/\/pahe[.]win\/[^"]+)"[^>]+>(?<name>[^<]+)/g;
      
      const paheWinLinksPromises: Promise<{ kwik: string; name: string }>[] = [];
      
      while ((m = regex.exec(text.replace(/\n/g, ''))) !== null) {
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }
        
        const groups = m.groups as { link: string; name: string };
        paheWinLinksPromises.push(
          this.Kwix(groups.link).then(kwikLink => ({
            kwik: kwikLink,
            name: groups.name.replace(/&middot;./g, ''),
          }))
        );
      }
      const paheLinks = await Promise.all(paheWinLinksPromises);


      const sources: IVideo[] = [];
      
      const directDownloadsPromises = paheLinks.map(async (paheLink) => {
        try {
          const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.O0FKaqhJjEZgCAVfZoLz6Pjd7Gs9Kv6qi0P8RyATjaE';
          const response = await fetch(`https://access-kwik.apex-cloud.workers.dev/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              "service": "kwik",
              "action": "fetch",
              "content": { kwik: paheLink.kwik },
              "auth": authToken,
            })
          });

          const responseData = await response.json();

          if (responseData.status) {
            sources.push({ url: responseData.content.url, quality: `Direct - ${paheLink.name}` });
          }
          sources.push({ url: paheLink.kwik, quality: `Kwik Page - ${paheLink.name}` });
        } catch (error) {
           // If direct download fails, we can add the kwik page as a fallback.
           sources.push({ url: paheLink.kwik, quality: `Kwik Page - ${paheLink.name}` });
        }
      });
      
      await Promise.all(directDownloadsPromises);

      return {
        sources: sources,
        download: paheLinks.map((link) => ({
          url: link.kwik,
          quality: `Kwik Page - ${link.name}`,
        })),
      };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  private Kwix = async (pahe: string): Promise<string> => {
    const res = await fetch(pahe);
    const text = await res.text();
    const kwikExec = /(?<kwik>https?:\/\/kwik.[a-z]+\/f\/.[^"]+)/.exec(text) as RegExpExecArray
    return (kwikExec.groups as Record<string, string>)['kwik']
  }

  private fetchEpisodes = async (session: string, page: number): Promise<IAnimeEpisode[]> => {
    const res = await fetch(
      `${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`,
      { headers: this.Headers(session) }
    );

    const data = await res.json();
    const epData = data.data;

    return [
      ...epData.map(
        (item: any): IAnimeEpisode => ({
          id: `${session}/${item.session}`,
          number: item.episode,
          title: item.title,
          image: item.snapshot,
          duration: item.duration,
          url: `${this.baseUrl}/play/${session}/${item.session}`,
        })
      ),
    ] as IAnimeEpisode[];
  };

  /**
   * @deprecated
   * @attention AnimePahe doesn't support this method
   */
  override fetchEpisodeServers = (episodeLink: string): Promise<IEpisodeServer[]> => {
    throw new Error('Method not implemented.');
  };

  private Headers(sessionId: string | false): HeadersInit {
    return {
      'authority': 'animepahe.ru',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'cookie': '__ddg2_=;',
      'dnt': '1',
      'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'upgrade-insecure-requests': '1',
      'x-requested-with': 'XMLHttpRequest',
      'referer': `https://animepahe.ru/`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    };
  }
}

export default AnimePahe;
