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
 * Search the web using Brave Search API
 * Falls back gracefully if API key is not configured
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  
  if (!apiKey) {
    console.log("[WebSearch] No BRAVE_SEARCH_API_KEY configured - web search disabled");
    return {
      success: false,
      results: [],
      error: "Web search not configured (missing BRAVE_SEARCH_API_KEY)",
    };
  }

  try {
    console.log(`[WebSearch] Searching: "${query}"`);
    
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const results: SearchResult[] = (data.web?.results || []).map((result: any) => ({
      title: result.title || "",
      url: result.url || "",
      description: result.description || "",
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
