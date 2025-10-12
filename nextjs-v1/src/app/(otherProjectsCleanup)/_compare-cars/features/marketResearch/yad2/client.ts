import { Yad2SearchParams, Yad2Response, Yad2Listing } from "./yad2.types";

interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number;
  preferBrightData?: boolean; // NEW: Start with BrightData if true
  skipDirectIfBlocked?: boolean; // NEW: Skip direct attempts after consistent blocks
}

interface FetchAttempt {
  requestId: string; // NEW: Track individual requests in parallel scenarios
  method: "direct" | "brightdata";
  attempt: number;
  url: string;
  error?: Error;
  response?: Response;
  timestamp: number;
}

interface BlockingStats {
  directBlockCount: number;
  lastDirectSuccess: number | null;
  brightDataSuccessRate: number;
  totalRequests: number;
}

class Yad2Client {
  private buildId: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheTimeout: number = 3600000; // 1 hour
  private readonly brightDataEnabled: boolean;
  private blockingStats: BlockingStats; // NEW: Track blocking patterns
  private requestCounter: number = 0; // NEW: For request IDs

  constructor() {
    this.buildId = process.env.YAD2_BUILD_ID || "XZtxUuCfNGmC7Q_lRtO6g";
    this.cache = new Map();

    // Initialize blocking stats
    this.blockingStats = {
      directBlockCount: 0,
      lastDirectSuccess: null,
      brightDataSuccessRate: 1.0,
      totalRequests: 0,
    };

    // Check BrightData availability
    this.brightDataEnabled = !!(
      process.env.BRIGHTDATA_TOKEN && process.env.BRIGHTDATA_ZONE
    );

    if (this.brightDataEnabled) {
      console.log(
        "✅ BrightData credentials found - proxy fallback enabled",
      );
    } else {
      console.warn(
        "⚠️ BrightData credentials not found - using direct requests only",
      );
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Fetch listings from Yad2 with smart fallback strategy
   */
  async fetchListings(
    params: Yad2SearchParams,
    options: FetchOptions = {},
  ): Promise<Yad2Listing[]> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      preferBrightData = this.shouldPreferBrightData(), // Smart default
      skipDirectIfBlocked = true,
    } = options;

    // Generate request ID for tracking
    const requestId = `req-${++this.requestCounter}-${Date.now()}`;

    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cached = this.checkCache(cacheKey);
    if (cached) return cached;

    console.log(`\n🚀 [${requestId}] Starting Yad2 fetch`);
    console.log(
      `Year range: ${params.yearFrom}-${params.yearTo || params.yearFrom}`,
    );
    console.log(
      `Strategy: ${preferBrightData ? "BrightData-first" : "Direct-first"}`,
    );

    const url = this.buildUrl(params);
    const attempts: FetchAttempt[] = [];
    this.blockingStats.totalRequests++;

    // Determine strategy based on recent blocking patterns
    const useDirectFirst =
      !preferBrightData &&
      (!skipDirectIfBlocked || this.blockingStats.directBlockCount < 3);

    try {
      // Strategy 1: Try direct first (if not consistently blocked)
      if (useDirectFirst) {
        const result = await this.tryDirectWithRetries(
          url,
          requestId,
          maxRetries,
          retryDelay,
        );
        attempts.push(...result.attempts);

        if (result.listings) {
          this.updateBlockingStats("direct", true);
          this.setCache(cacheKey, result.listings);
          console.log(
            `✅ [${requestId}] Success: ${result.listings.length} listings via direct`,
          );
          return result.listings;
        }

        this.updateBlockingStats("direct", false);
      }

      // Strategy 2: Use BrightData
      if (this.brightDataEnabled) {
        if (!useDirectFirst) {
          console.log(
            `⚡ [${requestId}] Starting with BrightData (direct is consistently blocked)`,
          );
        } else {
          console.log(
            `🔄 [${requestId}] Switching to BrightData after direct failure`,
          );
        }

        const result = await this.tryBrightDataWithRetries(
          url,
          requestId,
          maxRetries,
          retryDelay,
        );
        attempts.push(...result.attempts);

        if (result.listings) {
          this.updateBlockingStats("brightdata", true);
          this.setCache(cacheKey, result.listings);
          console.log(
            `✅ [${requestId}] Success: ${result.listings.length} listings via BrightData`,
          );
          return result.listings;
        }

        this.updateBlockingStats("brightdata", false);
      }

      // All attempts failed
      this.logFailureSummary(requestId, attempts);
      throw new Error(
        `[${requestId}] Failed to fetch Yad2 listings after all attempts`,
      );
    } catch (error) {
      console.error(`❌ [${requestId}] Fatal error:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple year ranges in parallel with better logging
   */
  async fetchMultipleYearRanges(
    baseParams: Omit<
      Yad2SearchParams,
      "yearFrom" | "yearTo" | "kmFrom" | "kmTo"
    >,
    yearRanges: Array<{
      yearFrom: number;
      yearTo: number;
      kmFrom: number;
      kmTo: number;
    }>,
  ): Promise<Yad2Listing[]> {
    console.log("\n📊 Starting parallel fetch for multiple year ranges");
    console.log(
      `Year ranges: ${yearRanges.map((r) => `${r.yearFrom}-${r.yearTo}`).join(", ")}`,
    );

    const promises = yearRanges.map((range) =>
      this.fetchListings(
        {
          ...baseParams,
          ...range,
        },
        {
          preferBrightData: this.shouldPreferBrightData(),
          skipDirectIfBlocked: true,
        },
      ),
    );

    const results = await Promise.all(promises);
    const allListings = results.flat();

    console.log(
      `\n📊 Parallel fetch complete: ${allListings.length} total listings`,
    );
    return allListings;
  }

  /**
   * Get current blocking statistics
   */
  getBlockingStats(): BlockingStats {
    return { ...this.blockingStats };
  }

  /**
   * Reset blocking statistics (useful after network changes)
   */
  resetBlockingStats(): void {
    this.blockingStats = {
      directBlockCount: 0,
      lastDirectSuccess: null,
      brightDataSuccessRate: 1.0,
      totalRequests: 0,
    };
    console.log("🔄 Blocking statistics reset");
  }

  // ============================================================================
  // PRIVATE - STRATEGY METHODS
  // ============================================================================

  private shouldPreferBrightData(): boolean {
    // Prefer BrightData if:
    // 1. Direct requests have been blocked 3+ times consecutively
    // 2. No successful direct request in the last hour
    // 3. BrightData has high success rate

    if (this.blockingStats.directBlockCount >= 3) {
      return true;
    }

    if (this.blockingStats.lastDirectSuccess) {
      const hourAgo = Date.now() - 3600000;
      if (this.blockingStats.lastDirectSuccess < hourAgo) {
        return true;
      }
    }

    return false;
  }

  private updateBlockingStats(
    method: "direct" | "brightdata",
    success: boolean,
  ): void {
    if (method === "direct") {
      if (success) {
        this.blockingStats.directBlockCount = 0;
        this.blockingStats.lastDirectSuccess = Date.now();
      } else {
        this.blockingStats.directBlockCount++;
      }
    } else {
      // Update BrightData success rate (simple moving average)
      const alpha = 0.1; // Smoothing factor
      const currentSuccess = success ? 1 : 0;
      this.blockingStats.brightDataSuccessRate =
        alpha * currentSuccess +
        (1 - alpha) * this.blockingStats.brightDataSuccessRate;
    }
  }

  // ============================================================================
  // PRIVATE - FETCH METHODS WITH RETRIES
  // ============================================================================

  private async tryDirectWithRetries(
    url: string,
    requestId: string,
    maxRetries: number,
    retryDelay: number,
  ): Promise<{
    listings: Yad2Listing[] | null;
    attempts: FetchAttempt[];
  }> {
    const attempts: FetchAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const fetchAttempt = await this.attemptFetch(
        url,
        "direct",
        attempt,
        requestId,
      );
      attempts.push(fetchAttempt);

      if (fetchAttempt.response?.ok) {
        try {
          const listings = await this.processResponse(
            fetchAttempt.response,
            url,
          );
          return { listings, attempts };
        } catch (error) {
          fetchAttempt.error = error as Error;
          console.error(
            `❌ [${requestId}] Processing failed:`,
            fetchAttempt.error.message,
          );
        }
      }

      // Check if it's ShieldSquare block
      if (fetchAttempt.error?.message.includes("ShieldSquare")) {
        console.log(
          `🚫 [${requestId}] ShieldSquare detected, skipping remaining direct attempts`,
        );
        break; // No point retrying if we're blocked
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * attempt;
        console.log(
          `⏳ [${requestId}] Waiting ${delay}ms before retry...`,
        );
        await this.sleep(delay);
      }
    }

    return { listings: null, attempts };
  }

  private async tryBrightDataWithRetries(
    url: string,
    requestId: string,
    maxRetries: number,
    retryDelay: number,
  ): Promise<{
    listings: Yad2Listing[] | null;
    attempts: FetchAttempt[];
  }> {
    const attempts: FetchAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const fetchAttempt = await this.attemptFetch(
        url,
        "brightdata",
        attempt,
        requestId,
      );
      attempts.push(fetchAttempt);

      if (fetchAttempt.response?.ok) {
        try {
          const listings = await this.processResponse(
            fetchAttempt.response,
            url,
          );
          return { listings, attempts };
        } catch (error) {
          fetchAttempt.error = error as Error;
          console.error(
            `❌ [${requestId}] Processing failed:`,
            fetchAttempt.error.message,
          );
        }
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * attempt * 2; // Longer delay for proxy
        console.log(
          `⏳ [${requestId}] Waiting ${delay}ms before proxy retry...`,
        );
        await this.sleep(delay);
      }
    }

    return { listings: null, attempts };
  }

  private async attemptFetch(
    url: string,
    method: "direct" | "brightdata",
    attempt: number,
    requestId: string,
  ): Promise<FetchAttempt> {
    console.log(
      `\n🔄 [${requestId}] Attempt ${attempt} using ${method.toUpperCase()}`,
    );

    const result: FetchAttempt = {
      requestId,
      method,
      attempt,
      url,
      timestamp: Date.now(),
    };

    try {
      if (method === "direct") {
        result.response = await this.fetchDirect(url, requestId);
      } else {
        result.response = await this.fetchViaBrightData(url, requestId);
      }

      if (!result.response.ok) {
        result.error = new Error(
          `HTTP ${result.response.status}: ${result.response.statusText}`,
        );

        // Handle 404 - build ID update
        if (result.response.status === 404) {
          console.log(
            `🔄 [${requestId}] 404 detected - updating build ID`,
          );
          await this.updateBuildId();
          const newUrl = url.replace(
            /\/[^\/]+\/cars\.json/,
            `/${this.buildId}/cars.json`,
          );
          result.url = newUrl;

          // Retry with new build ID
          if (method === "direct") {
            result.response = await this.fetchDirect(newUrl, requestId);
          } else {
            result.response = await this.fetchViaBrightData(
              newUrl,
              requestId,
            );
          }
        }
      }
    } catch (error) {
      result.error = error as Error;
      console.error(
        `❌ [${requestId}] ${method} failed:`,
        result.error.message,
      );
    }

    return result;
  }

  private async fetchDirect(
    url: string,
    requestId: string,
  ): Promise<Response> {
    const headers = this.getHeaders();

    console.log(`📤 [${requestId}] Direct request`);

    const response = await fetch(url, {
      headers,
      mode: "cors",
      credentials: "omit",
    });

    console.log(`📥 [${requestId}] Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.clone().text();
      const blockingType = this.detectBlockingIndicators(text);
      if (blockingType) {
        throw new Error(blockingType);
      }
    }

    return response;
  }

  private async fetchViaBrightData(
    url: string,
    requestId: string,
  ): Promise<Response> {
    const token = process.env.BRIGHTDATA_TOKEN!;
    const zone = process.env.BRIGHTDATA_ZONE!;

    console.log(`🌐 [${requestId}] BrightData request`);

    const requestBody = {
      zone: zone,
      url: url,
      format: "raw",
      country: "IL",
      headers: this.getHeaders(),
    };

    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 [${requestId}] BrightData status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BrightData API failed: ${response.status} - ${errorText}`,
      );
    }

    const content = await response.text();

    // Check for blocking
    const blockingType = this.detectBlockingIndicators(content);
    if (blockingType) {
      console.warn(
        `⚠️ [${requestId}] ${blockingType} even through BrightData`,
      );
    }

    const contentType = content.trim().startsWith("{")
      ? "application/json"
      : "text/html";

    return new Response(content, {
      status: 200,
      statusText: "OK",
      headers: { "content-type": contentType },
    });
  }

  // ============================================================================
  // PRIVATE - HELPER METHODS
  // ============================================================================

  private buildUrl(params: Yad2SearchParams): string {
    const queryParams = new URLSearchParams({
      manufacturer: params.manufacturer.toString(),
      model: params.model.toString(),
      year: `${params.yearFrom}-${params.yearTo || params.yearFrom}`,
      km: `${params.kmFrom}-${params.kmTo}`,
      hand: params.hand || "0-1",
      price: "4000--1",
    });

    return `https://www.yad2.co.il/vehicles/_next/data/${this.buildId}/cars.json?${queryParams}`;
  }

  private getHeaders(): Record<string, string> {
    return {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,he;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      referer: "https://www.yad2.co.il/vehicles/cars",
      "sec-ch-ua":
        '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-nextjs-data": "1",
      priority: "u=1, i",
    };
  }

  private async processResponse(
    response: Response,
    url: string,
  ): Promise<Yad2Listing[]> {
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      const blockingType = this.detectBlockingIndicators(text);
      if (blockingType) {
        throw new Error(blockingType);
      }
      throw new Error(
        `Expected JSON but got ${contentType}. Content preview: ${text.substring(0, 200)}`,
      );
    }

    const data: Yad2Response = await response.json();
    const listings = this.extractListings(data);

    if (listings.length === 0) {
      console.warn("⚠️ No listings found in response");
    }

    return listings;
  }

  private extractListings(data: Yad2Response): Yad2Listing[] {
    try {
      const query = data.pageProps?.dehydratedState?.queries?.[0];
      if (!query?.state?.data) {
        console.warn("Unexpected response structure");
        return [];
      }

      const { commercial = [], private: privateListings = [] } =
        query.state.data;
      return [...commercial, ...privateListings];
    } catch (error) {
      console.error("Failed to extract listings:", error);
      return [];
    }
  }

  private async updateBuildId(): Promise<void> {
    try {
      console.log("🔄 Updating build ID...");
      const response = await this.fetchDirect(
        "https://www.yad2.co.il/vehicles/cars",
        "build-update",
      );
      const html = await response.text();

      const patterns = [
        /"buildId":"([^"]+)"/,
        /buildId.*?["']([^"']+)["']/,
        /_next\/data\/([^\/]+)\//,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
          const newBuildId = match[1];
          if (newBuildId !== this.buildId) {
            console.log(
              `✅ Updated build ID: ${this.buildId} → ${newBuildId}`,
            );
            this.buildId = newBuildId;
          }
          return;
        }
      }

      console.warn("⚠️ Could not find build ID in HTML");
    } catch (error) {
      console.error("❌ Failed to update build ID:", error);
    }
  }

  private detectBlockingIndicators(content: string): string | null {
    const indicators = [
      {
        pattern: /ShieldSquare/i,
        message: "ShieldSquare Captcha blocking",
      },
      { pattern: /cloudflare/i, message: "Cloudflare protection" },
      { pattern: /captcha/i, message: "CAPTCHA challenge" },
      { pattern: /bot detection/i, message: "Bot detection" },
      { pattern: /rate limit/i, message: "Rate limiting" },
      { pattern: /access denied/i, message: "Access denied" },
    ];

    for (const { pattern, message } of indicators) {
      if (pattern.test(content)) {
        return message;
      }
    }

    return null;
  }

  private logFailureSummary(
    requestId: string,
    attempts: FetchAttempt[],
  ): void {
    console.log(`\n💥 [${requestId}] ALL ATTEMPTS FAILED - Summary:`);
    attempts.forEach(({ method, attempt, error }) => {
      console.log(
        `  ${method} attempt ${attempt}: ${error?.message || "Unknown error"}`,
      );
    });
  }

  // ============================================================================
  // PRIVATE - UTILITY METHODS
  // ============================================================================

  private getCacheKey(params: Yad2SearchParams): string {
    return JSON.stringify(params);
  }

  private checkCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log("📦 Cache hit");
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const yad2Client = new Yad2Client();
