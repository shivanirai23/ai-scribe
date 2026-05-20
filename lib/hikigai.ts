export class HikigaiClient {
	private apiKey: string;
	private projectId: string;
	private baseUrl: string;
	private authToken: string | null;

	constructor(apiKey?: string, projectId?: string, baseUrl?: string) {
		this.apiKey = apiKey || process.env.HIKIGAI_API_KEY || "";
		this.projectId = projectId || process.env.HIKIGAI_PROJECT_ID || "";
		this.baseUrl =
			baseUrl ||
			process.env.HIKIGAI_BASE_URL ||
			"http://hikigai-alb-1665592634.us-east-2.elb.amazonaws.com";
		this.authToken = null;
	}

	private async getAuthToken(forceRefresh = false): Promise<string> {
		if (this.authToken && !forceRefresh) {
			return this.authToken;
		}

		if (!this.apiKey) {
			throw new Error("Missing HIKIGAI_API_KEY");
		}

		const url = `${this.baseUrl}/api/v1/auth/exchange`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"X-API-Key": this.apiKey,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Hikigai Auth Token Exchange Failed: ${error}`);
		}

		const data = await response.json();
		const token =
			data?.auth_token ||
			data?.access_token ||
			data?.token ||
			data?.data?.access_token;

		if (!token || typeof token !== "string") {
			throw new Error("Hikigai Auth Token Exchange Failed: Token not found in response");
		}

		this.authToken = token;
		return token;
	}

	async ensureAuthToken(forceRefresh = false) {
		const token = await this.getAuthToken(forceRefresh);
		return {
			token,
		};
	}

	async invokeAgent(agentSlug: string, input: unknown) {
		const url = `${this.baseUrl}/api/v1/agents/${agentSlug}/invoke`;
		let token = await this.getAuthToken();

		let response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				input,
				project_id: this.projectId,
			}),
		});

		// If the token expired, refresh once and retry.
		if (response.status === 401) {
			token = await this.getAuthToken(true);
			response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					input,
					project_id: this.projectId,
				}),
			});
		}

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Hikigai Agent Invocation Failed: ${error}`);
		}

		return await response.json();
	}
}

export const hikigai = new HikigaiClient();
