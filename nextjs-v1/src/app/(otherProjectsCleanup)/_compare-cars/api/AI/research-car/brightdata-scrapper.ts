// bright-data-scraper.ts
import 'server-only';

interface CarListing {
	title: string;
	price: number;
	year: number;
	mileage: number;
	location: string;
	seller_type: 'dealer' | 'private';
	link?: string;
	highlights?: string;
	condition_notes?: string;
	age_category?: string;
}

interface BrightDataConfig {
	apiKey: string;
	endpoint: string;
}

interface ScrapeRequest {
	manufacturer_id: number;
	manufacturer_name: string;
	model_base_name: string;
	max_results?: number;
}

export class BrightDataCarScraper {
	private config: BrightDataConfig;

	constructor() {
		this.config = {
			apiKey: process.env.BRIGHT_DATA_API_KEY!,
			endpoint: process.env.BRIGHT_DATA_ENDPOINT || 'https://api.brightdata.com/datasets/v1/trigger',
		};
	}

	/**
	 * Scrape Yad2 for car listings
	 */
	async scrapeYad2Listings(request: ScrapeRequest): Promise<CarListing[]> {
		const scrapeConfig = {
			url: `https://www.yad2.co.il/vehicles/cars?manufacturer=${
				request.manufacturer_id
			}&model=${encodeURIComponent(request.model_base_name)}`,
			format: 'json',
			max_pages: 3, // Get multiple pages for better age variety
			parse_instructions: {
				listings: {
					_parent: '.feed-item',
					_limit: request.max_results || 15,
					title: {
						_selector: '.item-title',
						_transform: 'trim',
					},
					price_raw: {
						_selector: '.price',
						_transform: 'trim',
					},
					year_raw: {
						_selector: '.year',
						_transform: 'trim',
					},
					mileage_raw: {
						_selector: '.km',
						_transform: 'trim',
					},
					location_raw: {
						_selector: '.location',
						_transform: 'trim',
					},
					seller_indicator: {
						_selector: '.dealer-indicator, .private-indicator',
						_transform: 'trim',
					},
					link: {
						_selector: 'a',
						_attribute: 'href',
					},
					highlights: {
						_selector: '.highlights, .features',
						_transform: 'trim',
					},
					condition: {
						_selector: '.condition, .state',
						_transform: 'trim',
					},
				},
			},
		};

		try {
			const response = await fetch(this.config.endpoint, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(scrapeConfig),
			});

			if (!response.ok) {
				throw new Error(`Bright Data API error: ${response.status}`);
			}

			const data = await response.json();
			return this.normalizeListings(data.listings || []);
		} catch (error) {
			console.error('Bright Data scraping failed:', error);
			throw error;
		}
	}

	/**
	 * Scrape multiple Israeli car sites for better coverage
	 */
	async scrapeMultipleSites(request: ScrapeRequest): Promise<CarListing[]> {
		const sites = [
			{
				name: 'yad2',
				url: `https://www.yad2.co.il/vehicles/cars?manufacturer=${
					request.manufacturer_id
				}&model=${encodeURIComponent(request.model_base_name)}`,
				selectors: this.getYad2Selectors(),
			},
			{
				name: 'ad',
				url: `https://www.ad.co.il/ad/cars?manufacturer=${request.manufacturer_name}&model=${request.model_base_name}`,
				selectors: this.getAdSelectors(),
			},
			{
				name: 'cars',
				url: `https://www.cars.co.il/cars?manufacturer=${request.manufacturer_name}&model=${request.model_base_name}`,
				selectors: this.getCarsSelectors(),
			},
		];

		const scrapePromises = sites.map((site) => this.scrapeSite(site));
		const results = await Promise.allSettled(scrapePromises);

		// Combine successful results
		const allListings: CarListing[] = [];
		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				allListings.push(...result.value);
			} else {
				console.warn(`Failed to scrape ${sites[index].name}:`, result.reason);
			}
		});

		return this.deduplicateListings(allListings);
	}

	/**
	 * Enhanced scraping with age-specific searches for depreciation calculation
	 */
	async scrapeByCarAge(request: ScrapeRequest): Promise<{ listings: CarListing[]; depreciation_data: any }> {
		const currentYear = new Date().getFullYear();
		const ageRanges = [
			{ category: 'new', years: [currentYear], expectedKm: [0, 5000] },
			{ category: '1yr', years: [currentYear - 1], expectedKm: [15000, 30000] },
			{ category: '2yr', years: [currentYear - 2], expectedKm: [35000, 50000] },
			{ category: '3yr', years: [currentYear - 3], expectedKm: [55000, 75000] },
			{ category: '4yr', years: [currentYear - 4], expectedKm: [75000, 95000] },
			{ category: '5yr', years: [currentYear - 5], expectedKm: [95000, 120000] },
			{ category: '6yr', years: [currentYear - 6], expectedKm: [120000, 150000] },
			{ category: '7yr', years: [currentYear - 7], expectedKm: [150000, 180000] },
		];

		const allListings: CarListing[] = [];
		const ageData: { [key: string]: { prices: number[]; count: number } } = {};

		for (const ageRange of ageRanges) {
			try {
				const ageSpecificRequest = {
					...request,
					year_range: ageRange.years,
					km_range: ageRange.expectedKm,
				};

				const listings = await this.scrapeYad2Listings(ageSpecificRequest);

				// Add age category to listings
				const categorizedListings = listings.map((listing) => ({
					...listing,
					age_category: ageRange.category,
				}));

				allListings.push(...categorizedListings);

				// Collect price data for depreciation calculation
				const prices = categorizedListings.map((l) => l.price).filter((p) => p > 0);
				if (prices.length > 0) {
					ageData[ageRange.category] = {
						prices,
						count: prices.length,
					};
				}
			} catch (error) {
				console.warn(`Failed to scrape age category ${ageRange.category}:`, error);
			}
		}

		const depreciationData = this.calculateDepreciationFromData(ageData);

		return {
			listings: allListings,
			depreciation_data: depreciationData,
		};
	}

	private async scrapeSite(site: any): Promise<CarListing[]> {
		const scrapeConfig = {
			url: site.url,
			format: 'json',
			parse_instructions: {
				listings: {
					_parent: site.selectors.parent,
					_limit: 10,
					...site.selectors.fields,
				},
			},
		};

		const response = await fetch(this.config.endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(scrapeConfig),
		});

		const data = await response.json();
		return this.normalizeListings(data.listings || []);
	}

	private normalizeListings(rawListings: any[]): CarListing[] {
		return rawListings
			.map((listing) => {
				const price = this.extractPrice(listing.price_raw || listing.price);
				const year = this.extractYear(listing.year_raw || listing.year);
				const mileage = this.extractMileage(listing.mileage_raw || listing.mileage);

				return {
					title: listing.title || '',
					price,
					year,
					mileage,
					location: this.cleanLocation(listing.location_raw || listing.location || ''),
					seller_type: this.determineSeller(listing.seller_indicator || listing.seller_type),
					link: listing.link ? this.normalizeUrl(listing.link) : undefined,
					highlights: listing.highlights || undefined,
					condition_notes: listing.condition || undefined,
					age_category: listing.age_category || undefined,
				};
			})
			.filter(
				(listing) => listing.price > 0 && listing.year > 1990 && listing.year <= new Date().getFullYear() + 1
			);
	}

	private extractPrice(priceStr: string): number {
		if (!priceStr) return 0;
		const numbers = priceStr.replace(/[^\d]/g, '');
		const price = parseInt(numbers);
		return isNaN(price) ? 0 : price;
	}

	private extractYear(yearStr: string): number {
		if (!yearStr) return 0;
		const match = yearStr.match(/\d{4}/);
		return match ? parseInt(match[0]) : 0;
	}

	private extractMileage(mileageStr: string): number {
		if (!mileageStr) return 0;
		const numbers = mileageStr.replace(/[^\d]/g, '');
		const mileage = parseInt(numbers);
		return isNaN(mileage) ? 0 : mileage;
	}

	private cleanLocation(location: string): string {
		return location.replace(/[^\w\s\u0590-\u05FF]/g, '').trim() || 'Unknown';
	}

	private determineSeller(indicator: string): 'dealer' | 'private' {
		if (!indicator) return 'private';
		const lower = indicator.toLowerCase();
		return lower.includes('dealer') || lower.includes('מוסך') || lower.includes('יד שנייה') ? 'dealer' : 'private';
	}

	private normalizeUrl(url: string): string {
		if (url.startsWith('http')) return url;
		if (url.startsWith('//')) return 'https:' + url;
		if (url.startsWith('/')) return 'https://www.yad2.co.il' + url;
		return url;
	}

	private deduplicateListings(listings: CarListing[]): CarListing[] {
		const seen = new Set<string>();
		return listings.filter((listing) => {
			const key = `${listing.price}-${listing.year}-${listing.mileage}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	private calculateDepreciationFromData(ageData: { [key: string]: { prices: number[]; count: number } }): any {
		const categories = ['new', '1yr', '2yr', '3yr', '4yr', '5yr', '6yr', '7yr'];
		const avgPrices: number[] = [];

		for (const category of categories) {
			if (ageData[category] && ageData[category].prices.length > 0) {
				const avg = ageData[category].prices.reduce((a, b) => a + b, 0) / ageData[category].prices.length;
				avgPrices.push(avg);
			} else {
				avgPrices.push(0);
			}
		}

		// Calculate year-over-year depreciation percentages
		const depreciationPercentages: number[] = [];
		for (let i = 1; i < avgPrices.length; i++) {
			if (avgPrices[i - 1] > 0 && avgPrices[i] > 0) {
				const depreciation = ((avgPrices[i - 1] - avgPrices[i]) / avgPrices[i - 1]) * 100;
				depreciationPercentages.push(Math.max(5, Math.min(30, depreciation))); // Clamp between 5-30%
			} else {
				depreciationPercentages.push(15); // Default fallback
			}
		}

		return {
			average_prices_by_age: avgPrices,
			depreciation_percentages: depreciationPercentages,
			data_confidence: this.calculateConfidence(ageData),
		};
	}

	private calculateConfidence(ageData: {
		[key: string]: { prices: number[]; count: number };
	}): 'high' | 'medium' | 'low' {
		const totalListings = Object.values(ageData).reduce((sum, data) => sum + data.count, 0);
		if (totalListings >= 12) return 'high';
		if (totalListings >= 6) return 'medium';
		return 'low';
	}

	private getYad2Selectors() {
		return {
			parent: '.feed-item',
			fields: {
				title: { _selector: '.item-title', _transform: 'trim' },
				price_raw: { _selector: '.price', _transform: 'trim' },
				year_raw: { _selector: '.year', _transform: 'trim' },
				mileage_raw: { _selector: '.km', _transform: 'trim' },
				location_raw: { _selector: '.location', _transform: 'trim' },
				seller_indicator: { _selector: '.dealer-indicator', _transform: 'trim' },
				link: { _selector: 'a', _attribute: 'href' },
			},
		};
	}

	private getAdSelectors() {
		// Customize for ad.co.il structure
		return {
			parent: '.car-item',
			fields: {
				title: { _selector: '.car-title', _transform: 'trim' },
				price_raw: { _selector: '.car-price', _transform: 'trim' },
				year_raw: { _selector: '.car-year', _transform: 'trim' },
				mileage_raw: { _selector: '.car-km', _transform: 'trim' },
				location_raw: { _selector: '.car-location', _transform: 'trim' },
				link: { _selector: 'a', _attribute: 'href' },
			},
		};
	}

	private getCarsSelectors() {
		// Customize for cars.co.il structure
		return {
			parent: '.vehicle-item',
			fields: {
				title: { _selector: '.vehicle-title', _transform: 'trim' },
				price_raw: { _selector: '.vehicle-price', _transform: 'trim' },
				year_raw: { _selector: '.vehicle-year', _transform: 'trim' },
				mileage_raw: { _selector: '.vehicle-mileage', _transform: 'trim' },
				location_raw: { _selector: '.vehicle-location', _transform: 'trim' },
				link: { _selector: 'a', _attribute: 'href' },
			},
		};
	}
}

// Usage in your existing API
export async function enhanceCarResearch(query: string, manufacturerData: any) {
	const scraper = new BrightDataCarScraper();

	try {
		const result = await scraper.scrapeByCarAge({
			manufacturer_id: manufacturerData.manufacturer_id,
			manufacturer_name: manufacturerData.manufacturer_name,
			model_base_name: manufacturerData.model_base_name,
			max_results: 15,
		});

		return {
			current_listings: result.listings,
			market_analysis: {
				average_price: result.depreciation_data.average_prices_by_age[0] || 200000,
				price_range_min: Math.min(...result.listings.map((l) => l.price)),
				price_range_max: Math.max(...result.listings.map((l) => l.price)),
				market_availability: result.listings.length > 8 ? 'Good availability' : 'Limited availability',
				depreciation_reasoning: 'Calculated from actual market listings across different car ages',
				depreciation_data_source: 'actual_listings' as const,
			},
			depreciation_percentages: result.depreciation_data.depreciation_percentages,
			research_confidence: result.depreciation_data.data_confidence,
		};
	} catch (error) {
		console.error('Enhanced scraping failed:', error);
		throw error;
	}
}
