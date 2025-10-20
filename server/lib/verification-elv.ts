import axios from "axios";

type ELVResult = {
  result: string;
  [key: string]: any;
};

export async function runELV(
  email: string,
  apiKey: string
): Promise<{ status: 'ok' | 'invalid' | 'risky'; raw: ELVResult }> {
  try {
    const { data } = await axios.get<ELVResult>(
      "https://apps.emaillistverify.com/api/verifyEmail",
      {
        params: { secret: apiKey, email },
        timeout: 10000,
      }
    );
    
    const result = (data.result || "").toLowerCase();
    
    if (result === "valid" || result === "accept_all") {
      return { status: "ok", raw: data };
    }
    
    if (result === "unknown" || result === "catch_all") {
      return { status: "risky", raw: data };
    }
    
    return { status: "invalid", raw: data };
  } catch (error) {
    console.error("ELV API error:", error);
    return {
      status: "risky",
      raw: { result: "error", error: String(error) },
    };
  }
}
