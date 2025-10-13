import { NextRequest, NextResponse } from 'next/server';

// Required for static export in Next.js
export const dynamic = "force-static";
export const revalidate = false;

// Rate limiting: Simple in-memory store (use Redis in production for multi-instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per IP per minute

// Cache for successful image responses
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_DURATION = 3600 * 1000; // 1 hour

function getRateLimitKey(request: NextRequest): string {
  // Use forwarded IP for production, fallback to connection IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0] || realIP || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow Yad2 image domain
    if (parsedUrl.hostname !== 'img.yad2.co.il') {
      return false;
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Check for valid image file extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = validExtensions.some(ext => 
      parsedUrl.pathname.toLowerCase().includes(ext)
    );

    return hasValidExtension;
  } catch {
    return false;
  }
}

function getCachedImage(url: string) {
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached;
  }
  return null;
}

function setCachedImage(url: string, buffer: ArrayBuffer, contentType: string) {
  // Limit cache size to prevent memory issues
  if (imageCache.size > 1000) {
    // Remove oldest entries
    const entries = Array.from(imageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100; i++) {
      imageCache.delete(entries[i][0]);
    }
  }
  
  imageCache.set(url, { buffer, contentType, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const clientIP = getRateLimitKey(request);

  // Rate limiting
  if (isRateLimited(clientIP)) {
    console.warn(`[Image Proxy] Rate limit exceeded for IP: ${clientIP}`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }

  // Validate URL parameter
  if (!imageUrl) {
    console.warn(`[Image Proxy] Missing URL parameter from IP: ${clientIP}`);
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate image URL
  if (!isValidImageUrl(imageUrl)) {
    console.warn(`[Image Proxy] Invalid URL attempted: ${imageUrl} from IP: ${clientIP}`);
    return NextResponse.json({ error: 'Invalid or unauthorized image URL' }, { status: 400 });
  }

  // Check cache first
  const cached = getCachedImage(imageUrl);
  if (cached) {
    console.log(`[Image Proxy] Cache hit for: ${imageUrl}`);
    return new NextResponse(cached.buffer, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    console.log(`[Image Proxy] Fetching image: ${imageUrl}`);
    
    // Fetch with timeout and proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Referer': 'https://www.yad2.co.il/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Image Proxy] HTTP ${response.status} for: ${imageUrl}`);
      
      // Return appropriate error based on status
      if (response.status === 404) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      } else if (response.status === 403) {
        return NextResponse.json({ error: 'Access forbidden' }, { status: 403 });
      } else {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
      }
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.error(`[Image Proxy] Invalid content type: ${contentType} for: ${imageUrl}`);
      return NextResponse.json({ error: 'Invalid image content' }, { status: 400 });
    }

    // Check content length to prevent huge downloads
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      console.error(`[Image Proxy] Image too large: ${contentLength} bytes for: ${imageUrl}`);
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Cache successful response
    setCachedImage(imageUrl, imageBuffer, contentType);

    const duration = Date.now() - startTime;
    console.log(`[Image Proxy] Successfully proxied image in ${duration}ms: ${imageUrl}`);

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
        'X-Response-Time': `${duration}ms`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[Image Proxy] Timeout after ${duration}ms for: ${imageUrl}`);
        return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
      }
      
      console.error(`[Image Proxy] Error after ${duration}ms for: ${imageUrl}`, error.message);
    } else {
      console.error(`[Image Proxy] Unknown error after ${duration}ms for: ${imageUrl}`, error);
    }

    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${duration}ms`,
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
