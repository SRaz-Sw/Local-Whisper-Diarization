import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer and then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = buffer.toString('base64');

    // Validate API key
    if (!process.env.MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'OCR service configuration error' },
        { status: 500 }
      );
    }

    // Call Mistral OCR API using the correct endpoint and format
    const mistralResponse = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'User-Agent': 'Express-OCR-Server/1.0'
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${base64File}`
        },
        include_image_base64: true
      }),
    });

    if (!mistralResponse.ok) {
      const errorData = await mistralResponse.json().catch(() => ({}));
      console.error('Mistral API error:', {
        status: mistralResponse.status,
        statusText: mistralResponse.statusText,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          error: 'OCR processing failed',
          details: errorData.error?.message || errorData.detail || `HTTP ${mistralResponse.status}: ${mistralResponse.statusText}`
        },
        { status: 500 }
      );
    }

    const mistralData = await mistralResponse.json();
    
    // The OCR API returns pages array with markdown content
    console.log('Full Mistral response:', mistralData);
    
    let extractedText = '';
    let extractedMarkdown = '';
    
    if (mistralData.pages && Array.isArray(mistralData.pages)) {
      // Combine all pages' markdown content
      extractedMarkdown = mistralData.pages
        .map((page: any) => page.markdown || '')
        .join('\n\n---\n\n'); // Separate pages with horizontal rules
      
      // Also create a plain text version (strip markdown formatting)
      extractedText = mistralData.pages
        .map((page: any) => (page.markdown || '').replace(/!\[.*?\]\(.*?\)/g, '')) // Remove image refs
        .join('\n\n')
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .trim();
    }

    if (!extractedText && !extractedMarkdown) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      text: extractedText,
      markdown: extractedMarkdown,
      pages: mistralData.pages,
      success: true,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        processedAt: new Date().toISOString(),
        totalPages: mistralData.pages?.length || 0
      }
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}



// import express, { Request, Response } from 'express';
// import multer from 'multer';
// import { z } from 'zod';

// // Define types for Mistral OCR API response
// interface MistralOcrImage {
// 	id: string;
// 	top_left_x: number;
// 	top_left_y: number;
// 	bottom_right_x: number;
// 	bottom_right_y: number;
// 	image_base64?: string;
// }

// interface MistralOcrDimensions {
// 	dpi: number;
// 	height: number;
// 	width: number;
// }

// interface MistralOcrPage {
// 	index: number;
// 	markdown?: string;
// 	images: MistralOcrImage[];
// 	dimensions: MistralOcrDimensions;
// }

// interface MistralOcrUsageInfo {
// 	pages_processed: number;
// 	doc_size_bytes: number | null;
// }

// interface MistralOcrResponse {
// 	pages: MistralOcrPage[];
// 	model: string;
// 	usage_info: MistralOcrUsageInfo;
// }

// interface MistralErrorResponse {
// 	error?: {
// 		message?: string;
// 	};
// 	detail?: string;
// }

// // Entry point http://localhost:3010/ocr
// const router = express.Router();

// // Configure multer for file uploads
// const upload = multer({
// 	storage: multer.memoryStorage(),
// 	limits: {
// 		fileSize: 10 * 1024 * 1024, // 10MB limit
// 	},
// 	fileFilter: (req, file, cb) => {
// 		if (file.mimetype === 'application/pdf') {
// 			cb(null, true);
// 		} else {
// 			cb(new Error('Only PDF files are allowed'));
// 		}
// 	},
// });

// // Validation schema for OCR request
// const ocrRequestSchema = z.object({
// 	includeMarkdown: z.boolean().optional().default(true),
// 	enhanceText: z.boolean().optional().default(true),
// });

// /** GET /ocr/debug
//   Description: Debug endpoint to check API key and environment
//   Response: { apiKeyStatus: string, envVars: object }
//  */
// router.get('/debug', (req: Request, res: Response) => {
// 	const apiKey = process.env.MISTRAL_API_KEY;

// 	return res.json({
// 		apiKeyConfigured: !!apiKey,
// 		apiKeyLength: apiKey ? apiKey.length : 0,
// 		apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
// 		nodeEnv: process.env.NODE_ENV,
// 		allEnvKeys: Object.keys(process.env).filter((key) => key.includes('MISTRAL')),
// 		timestamp: new Date().toISOString(),
// 	});
// });

// /** POST /ocr/process
//   Description: Processes a PDF file using Mistral's OCR API to extract text content.
//   Request: Multipart form data with 'pdf' file field
//   Query Parameters: { includeMarkdown?: boolean, enhanceText?: boolean }
//   Response: { text: string, markdown?: string, pages?: any[], metadata: object }
//   File Size Limit: 10MB
//  */
// router.post('/process', upload.single('pdf'), async (req: Request, res: Response) => {
// 	try {
// 		// Validate that a file was uploaded
// 		if (!req.file) {
// 			return res.status(400).json({
// 				error: 'No PDF file uploaded',
// 				details: 'Please select a PDF file to process',
// 			});
// 		}

// 		// Validate query parameters
// 		const queryValidation = ocrRequestSchema.safeParse(req.query);
// 		if (!queryValidation.success) {
// 			return res.status(400).json({
// 				error: 'Invalid query parameters',
// 				details: queryValidation.error.errors,
// 			});
// 		}

// 		const { includeMarkdown, enhanceText } = queryValidation.data;

// 		// Validate file type (double-check after multer filter)
// 		if (req.file.mimetype !== 'application/pdf') {
// 			return res.status(400).json({
// 				error: 'Invalid file type',
// 				details: 'Only PDF files are supported',
// 			});
// 		}

// 		// Enhanced API key validation with debugging
// 		const apiKey = process.env.MISTRAL_API_KEY;
// 		if (!apiKey) {
// 			console.error('❌ MISTRAL_API_KEY environment variable is not set');
// 			console.error(
// 				'Available env vars:',
// 				Object.keys(process.env).filter((key) => key.includes('MISTRAL'))
// 			);
// 			return res.status(500).json({
// 				error: 'OCR service configuration error',
// 				details: 'API key not configured on server',
// 			});
// 		}

// 		// Log API key info for debugging (without exposing the full key)
// 		console.log(`✅ API Key configured: ${apiKey.substring(0, 8)}... (length: ${apiKey.length})`);

// 		// Convert file buffer to base64
// 		const base64File = req.file.buffer.toString('base64');

// 		console.log(`🔄 Processing PDF: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

// 		// Prepare the request payload
// 		const requestPayload = {
// 			model: 'mistral-ocr-latest',
// 			document: {
// 				type: 'document_url',
// 				document_url: `data:application/pdf;base64,${base64File}`,
// 			},
// 			include_image_base64: true,
// 		};

// 		console.log(`📤 Sending request to Mistral API...`);
// 		console.log(`📋 Payload size: ${JSON.stringify(requestPayload).length} characters`);

// 		// Call Mistral OCR API with enhanced error handling
// 		const mistralResponse = await fetch('https://api.mistral.ai/v1/ocr', {
// 			method: 'POST',
// 			headers: {
// 				'Content-Type': 'application/json',
// 				Authorization: `Bearer ${apiKey}`,
// 				'User-Agent': 'Express-OCR-Server/1.0',
// 			},
// 			body: JSON.stringify(requestPayload),
// 		});

// 		console.log(`📥 Mistral API response status: ${mistralResponse.status} ${mistralResponse.statusText}`);

// 		if (!mistralResponse.ok) {
// 			let errorMessage = `HTTP ${mistralResponse.status}: ${mistralResponse.statusText}`;
// 			let errorDetails = null;

// 			try {
// 				// Safely parse and type the error response
// 				const rawErrorData = await mistralResponse.json();
// 				const errorData = rawErrorData as MistralErrorResponse;

// 				console.error('❌ Mistral API error details:', {
// 					status: mistralResponse.status,
// 					statusText: mistralResponse.statusText,
// 					error: errorData,
// 					headers: Object.fromEntries(mistralResponse.headers.entries()),
// 				});

// 				if (errorData?.error?.message) {
// 					errorMessage = errorData.error.message;
// 				} else if (errorData?.detail) {
// 					errorMessage = errorData.detail;
// 				}

// 				errorDetails = errorData;
// 			} catch (parseError) {
// 				console.error('❌ Failed to parse error response as JSON:', parseError);
// 				// Try to get response as text
// 				try {
// 					const errorText = await mistralResponse.text();
// 					console.error('❌ Error response as text:', errorText);
// 					errorDetails = { rawError: errorText };
// 				} catch (textError) {
// 					console.error('❌ Failed to get error response as text:', textError);
// 				}
// 			}

// 			// Specific handling for 401 Unauthorized
// 			if (mistralResponse.status === 401) {
// 				console.error('🔑 API Key issue detected:');
// 				console.error(`   - Key length: ${apiKey.length}`);
// 				console.error(`   - Key prefix: ${apiKey.substring(0, 12)}...`);
// 				console.error('   - Check if your API key is valid and has OCR permissions');

// 				return res.status(401).json({
// 					error: 'Authentication failed',
// 					details: 'Invalid or expired API key. Please check your Mistral API key.',
// 					debugInfo: {
// 						apiKeyConfigured: true,
// 						apiKeyLength: apiKey.length,
// 						timestamp: new Date().toISOString(),
// 					},
// 				});
// 			}

// 			return res.status(mistralResponse.status).json({
// 				error: 'OCR processing failed',
// 				details: errorMessage,
// 				debugInfo: errorDetails,
// 			});
// 		}

// 		// Safely parse and type the successful response
// 		const rawData = await mistralResponse.json();
// 		const mistralData = rawData as MistralOcrResponse;
// 		console.log(`✅ Mistral OCR completed successfully. Pages processed: ${mistralData.pages?.length || 0}`);

// 		// Process the response data according to Mistral's OCR format
// 		let extractedText = '';
// 		let extractedMarkdown = '';
// 		let embeddedImages: any[] = [];

// 		if (mistralData.pages && Array.isArray(mistralData.pages)) {
// 			// Extract all embedded images from all pages
// 			embeddedImages = mistralData.pages.flatMap((page) => page.images || []);

// 			// Combine all pages' markdown content with proper page separation
// 			extractedMarkdown = mistralData.pages
// 				.map((page: MistralOcrPage, index: number) => {
// 					const pageContent = page.markdown || '';
// 					// Add page header if includeMarkdown is true and there are multiple pages
// 					if (includeMarkdown && mistralData.pages.length > 1) {
// 						return `<!-- Page ${index + 1} of ${mistralData.pages.length} -->\n\n${pageContent}`;
// 					}
// 					return pageContent;
// 				})
// 				.join('\n\n---\n\n'); // Separate pages with horizontal rules

// 			// Create a clean plain text version (strip markdown but preserve structure)
// 			extractedText = mistralData.pages
// 				.map((page: MistralOcrPage, index: number) => {
// 					const content = page.markdown || '';

// 					// Clean up markdown while preserving document structure
// 					let cleanText = content
// 						// Remove image references but keep their alt text
// 						.replace(/!\[([^\]]*)\]\([^)]*\)/g, '[Image: $1]')
// 						// Convert headers to plain text with spacing
// 						.replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n' + '='.repeat(20))
// 						// Remove bold/italic formatting but keep the text
// 						.replace(/\*\*([^*]+)\*\*/g, '$1')
// 						.replace(/\*([^*]+)\*/g, '$1')
// 						// Clean up table formatting - convert to readable format
// 						.replace(/\|([^|]+)\|/g, (match, content) => content.trim())
// 						.replace(/^\s*\|?-+\|?\s*$/gm, '') // Remove table separator lines
// 						// Remove excessive whitespace but preserve paragraph breaks
// 						.replace(/\n{3,}/g, '\n\n')
// 						.trim();

// 					// Add page separator for multi-page documents
// 					if (mistralData.pages.length > 1) {
// 						cleanText = `\n--- Page ${index + 1} ---\n\n${cleanText}`;
// 					}

// 					return cleanText;
// 				})
// 				.join('\n\n')
// 				.trim();
// 		}

// 		// Enhanced validation with better error messages
// 		if (!extractedText && !extractedMarkdown) {
// 			console.log('No content extracted. Full response:', JSON.stringify(mistralData, null, 2));
// 			return res.status(422).json({
// 				error: 'No text could be extracted from the PDF',
// 				details: 'The PDF may contain only images, be corrupted, or have content that cannot be processed',
// 				debugInfo: {
// 					pagesFound: mistralData.pages?.length || 0,
// 					responseStructure: Object.keys(mistralData || {}),
// 				},
// 			});
// 		}

// 		// Prepare enhanced response data
// 		const responseData = {
// 			success: true,
// 			text: extractedText,
// 			...(includeMarkdown && {
// 				markdown: extractedMarkdown,
// 				pages: mistralData.pages,
// 				embeddedImages: embeddedImages.length > 0 ? embeddedImages : undefined,
// 			}),
// 			metadata: {
// 				fileName: req.file.originalname,
// 				fileSize: req.file.size,
// 				fileSizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
// 				processedAt: new Date().toISOString(),
// 				totalPages: mistralData.pages?.length || 0,
// 				totalImages: embeddedImages.length,
// 				model: mistralData.model || 'mistral-ocr-latest',
// 				processingTime: mistralData.usage_info || null,
// 				documentType: 'PDF',
// 				hasStructuredContent:
// 					extractedMarkdown.includes('|') ||
// 					extractedMarkdown.includes('#') ||
// 					extractedMarkdown.includes('```'),
// 			},
// 		};

// 		console.log(`🎉 OCR processing completed successfully for ${req.file.originalname}`);
// 		return res.json(responseData);
// 	} catch (error: any) {
// 		console.error('💥 Unexpected error processing PDF:', error);

// 		// Handle specific error types
// 		if (error.code === 'LIMIT_FILE_SIZE') {
// 			return res.status(413).json({
// 				error: 'File too large',
// 				details: 'Please use a PDF smaller than 10MB',
// 			});
// 		}

// 		if (error.message?.includes('Only PDF files are allowed')) {
// 			return res.status(400).json({
// 				error: 'Invalid file type',
// 				details: 'Only PDF files are supported',
// 			});
// 		}

// 		if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
// 			return res.status(408).json({
// 				error: 'Request timeout',
// 				details: 'Processing took too long. Please try with a smaller PDF.',
// 			});
// 		}

// 		return res.status(500).json({
// 			error: 'Internal server error',
// 			details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
// 			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
// 		});
// 	}
// });

// /** GET /ocr/health
//   Description: Health check endpoint for the OCR service
//   Response: { status: string, timestamp: string, apiKeyConfigured: boolean }
//  */
// router.get('/health', (req: Request, res: Response) => {
// 	try {
// 		const isApiKeyConfigured = !!process.env.MISTRAL_API_KEY;

// 		return res.json({
// 			status: 'healthy',
// 			service: 'OCR API',
// 			timestamp: new Date().toISOString(),
// 			apiKeyConfigured: isApiKeyConfigured,
// 			maxFileSize: '10MB',
// 			supportedFormats: ['application/pdf'],
// 		});
// 	} catch (error: any) {
// 		return res.status(500).json({
// 			status: 'unhealthy',
// 			error: error.message,
// 			timestamp: new Date().toISOString(),
// 		});
// 	}
// });

// /** GET /ocr/limits
//   Description: Returns current service limits and configuration
//   Response: { maxFileSize: string, supportedFormats: string[], features: object }
//  */
// router.get('/limits', (req: Request, res: Response) => {
// 	return res.json({
// 		maxFileSize: '10MB',
// 		maxFileSizeBytes: 10 * 1024 * 1024,
// 		supportedFormats: ['application/pdf'],
// 		features: {
// 			textExtraction: true,
// 			markdownFormatting: true,
// 			pageByPageProcessing: true,
// 			imageReferences: true,
// 			tableExtraction: true,
// 		},
// 		endpoints: {
// 			process: 'POST /ocr/process',
// 			health: 'GET /ocr/health',
// 			limits: 'GET /ocr/limits',
// 			debug: 'GET /ocr/debug',
// 		},
// 	});
// });

// export default router;
