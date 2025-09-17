/**
 * Kwik Link Extractor - Direct implementation for extracting download links
 * Ported from the Kwik-extractor to TypeScript for use in Next.js
 */

interface KwikExtractionResult {
  success: boolean;
  directLink?: string;
  kwikLink?: string;
  message?: string;
  error?: string;
}

export class KwikExtractor {
  private baseAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";

  /**
   * Decode base conversion
   */
  private decodeBase(encodedStr: string, fromBase: number, toBase: number): number {
    const fromAlphabet = this.baseAlphabet.substring(0, fromBase);
    const toAlphabet = this.baseAlphabet.substring(0, toBase);

    // Convert from source base to decimal
    let decimal = 0;
    for (let i = 0; i < encodedStr.length; i++) {
      const char = encodedStr[encodedStr.length - 1 - i];
      const pos = fromAlphabet.indexOf(char);
      if (pos !== -1) {
        decimal += pos * Math.pow(fromBase, i);
      }
    }

    // Convert decimal to target base
    if (decimal === 0) return parseInt(toAlphabet[0]);

    let result = '';
    while (decimal > 0) {
      result = toAlphabet[decimal % toBase] + result;
      decimal = Math.floor(decimal / toBase);
    }

    return parseInt(result);
  }

  /**
   * Decode JS-style obfuscated string
   */
  private decodeJSStyle(
    encodedStr: string,
    alphabetKey: string,
    offset: number,
    base: number
  ): string {
    let result = '';
    
    for (let i = 0; i < encodedStr.length; i++) {
      let segment = '';
      
      // Extract segment until we hit the separator character
      while (i < encodedStr.length && encodedStr[i] !== alphabetKey[base]) {
        segment += encodedStr[i];
        i++;
      }

      // Replace alphabet characters with their indices
      for (let j = 0; j < alphabetKey.length; j++) {
        const regex = new RegExp(alphabetKey[j], 'g');
        segment = segment.replace(regex, j.toString());
      }

      // Decode the segment
      const code = this.decodeBase(segment, base, 10) - offset;
      result += String.fromCharCode(code);
    }

    return result;
  }

  /**
   * Fetch content with proper headers
   */
  private async fetchWithHeaders(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Extract cookie value from Set-Cookie headers
   */
  private extractCookieValue(cookies: string[] | string | undefined, name: string): string | null {
    if (!cookies) return null;
    
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    
    for (const cookie of cookieArray) {
      const match = cookie.match(new RegExp(`${name}=([^;]+)`));
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Validate if URL is a valid Kwik URL
   */
  isValidKwikUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return /kwik\.(si|cx|sx|li)/i.test(urlObj.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Extract Kwik link from pahe.win page
   */
  async extractKwikFromPahePage(paheUrl: string): Promise<string> {
    const response = await this.fetchWithHeaders(paheUrl);
    const text = await response.text();
    const kwikExec = /(?<kwik>https?:\/\/kwik.[a-z]+\/f\/.[^"]+)/.exec(text);
    
    if (!kwikExec?.groups?.kwik) {
      throw new Error('Could not extract Kwik URL from pahe page');
    }
    
    return kwikExec.groups.kwik;
  }

  /**
   * Main extraction method - extracts direct download link from Kwik URL
   */
  async extract(kwikUrl: string): Promise<KwikExtractionResult> {
    try {
      if (!this.isValidKwikUrl(kwikUrl)) {
        return {
          success: false,
          error: 'Invalid Kwik URL format'
        };
      }

      // Step 1: Fetch Kwik page
      const kwikResponse = await this.fetchWithHeaders(kwikUrl);
      const kwikText = await kwikResponse.text();
      const cleanText = kwikText.replace(/(\r\n|\r|\n)/g, '');

      // Try multiple regex patterns for obfuscated content
      let encodeMatch: RegExpMatchArray | null = null;
      
      // Pattern 1: Standard pattern
      encodeMatch = cleanText.match(/\(\s*"([^",]*)"\s*,\s*\d+\s*,\s*"([^",]*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+[a-zA-Z]?\s*\)/);
      
      // Pattern 2: Alternative format without spaces
      if (!encodeMatch) {
        encodeMatch = cleanText.match(/\("([^",]*)",\d+,"([^",]*)",(\d+),(\d+),\d+[a-zA-Z]?\)/);
      }
      
      // Pattern 3: Alternative format with different delimiters
      if (!encodeMatch) {
        encodeMatch = cleanText.match(/\(['"]([^'",]*)['"]\s*,\s*\d+\s*,\s*['"]([^'",]*)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+[a-zA-Z]?\s*\)/);
      }

      if (!encodeMatch) {
        return {
          success: true,
          directLink: kwikUrl,
          kwikLink: kwikUrl,
          message: 'Kwik link extracted (direct link pattern not found)'
        };
      }

      const [, encodedString, alphabetKey, offsetStr, baseStr] = encodeMatch;
      const offset = parseInt(offsetStr);
      const base = parseInt(baseStr);

      const decodedString = this.decodeJSStyle(encodedString, alphabetKey, offset, base);

      // Extract POST URL and token from decoded string
      const postUrlMatch = decodedString.match(/"(https?:\/\/kwik\.[^\/\s"]+\/[^\/\s"]+\/[^"\s]*)"/);
      const tokenMatch = decodedString.match(/name="_token"[^"]*"([^"]*)"/);

      if (!postUrlMatch || !tokenMatch) {
        return {
          success: true,
          directLink: kwikUrl,
          kwikLink: kwikUrl,
          message: 'Kwik link extracted (POST parameters not found)'
        };
      }

      const postUrl = postUrlMatch[1];
      const token = tokenMatch[1];

      // Extract session cookie from response headers
      const setCookieHeader = kwikResponse.headers.get('set-cookie');
      const kwikSession = this.extractCookieValue(setCookieHeader || undefined, 'kwik_session');

      // Step 2: Make POST request to get direct link
      const postHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': kwikUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      if (kwikSession) {
        postHeaders['Cookie'] = `kwik_session=${kwikSession}`;
      }

      const postData = `_token=${encodeURIComponent(token)}`;
      
      const postResponse = await this.fetchWithHeaders(postUrl, {
        method: 'POST',
        headers: postHeaders,
        body: postData,
        redirect: 'manual' // Handle redirects manually to capture the location
      });

      // Check for redirect response
      if (postResponse.status >= 300 && postResponse.status < 400) {
        const location = postResponse.headers.get('location');
        if (location) {
          return {
            success: true,
            directLink: location,
            kwikLink: kwikUrl,
            message: 'Direct download link extracted successfully!'
          };
        }
      }

      // If no redirect, check response body for direct link
      const postResponseText = await postResponse.text();
      const directLinkMatch = postResponseText.match(/"(https?:\/\/[^"]*\.(mp4|mkv|avi|mov|webm)[^"]*)"/);
      
      if (directLinkMatch) {
        return {
          success: true,
          directLink: directLinkMatch[1],
          kwikLink: kwikUrl,
          message: 'Direct download link extracted successfully!'
        };
      }

      return {
        success: true,
        directLink: kwikUrl,
        kwikLink: kwikUrl,
        message: 'Kwik link extracted (direct link extraction not available)'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }
}