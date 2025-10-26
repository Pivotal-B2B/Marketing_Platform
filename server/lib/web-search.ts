/**
 * Web Search Service for Company Enrichment
 * Provides fallback web search when AI training data doesn't have the information
 */

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface WebSearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

/**
 * Search the web using Google Programmable Search Engine (Custom Search JSON API)
 * Falls back gracefully if API key or Search Engine ID is not configured
 * 
 * Setup instructions:
 * 1. Create a Programmable Search Engine at https://programmablesearchengine.google.com/
 * 2. Get your Search Engine ID (CX) from the control panel
 * 3. Get an API key from Google Cloud Console (https://console.cloud.google.com/apis/credentials)
 * 4. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to your environment
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    const missing = !apiKey ? "GOOGLE_SEARCH_API_KEY" : "GOOGLE_SEARCH_ENGINE_ID";
    console.log(`[WebSearch] ${missing} not configured - web search disabled`);
    return {
      success: false,
      results: [],
      error: `Web search not configured (missing ${missing})`,
    };
  }

  try {
    console.log(`[WebSearch] Searching: "${query}"`);
    
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '5'); // Return 5 results
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`Google Custom Search API error: ${errorMessage}`);
    }

    const data = await response.json();
    
    // Google Custom Search returns results in the 'items' array
    const results: SearchResult[] = (data.items || []).map((item: any) => ({
      title: item.title || "",
      url: item.link || "",
      description: item.snippet || "",
    }));

    console.log(`[WebSearch] Found ${results.length} results`);
    
    return {
      success: true,
      results,
    };
  } catch (error: any) {
    console.error("[WebSearch] Error:", error.message);
    return {
      success: false,
      results: [],
      error: error.message,
    };
  }
}

/**
 * Extract text snippets from search results for AI analysis
 */
export function formatSearchResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No web search results found.";
  }

  return results
    .map((result, index) => {
      return `Source ${index + 1}: ${result.title}
URL: ${result.url}
${result.description}`;
    })
    .join("\n\n");
}
