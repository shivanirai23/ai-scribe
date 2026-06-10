export const HIKIGAI_AGENT_TIMEOUT_MS = 300000;

export class HikigaiClient {
	private apiKey: string;
	private projectId: string;
	private baseUrl: string;
	private authToken: string | null;
	private readonly defaultTimeoutMs: number;

	constructor(apiKey?: string, projectId?: string, baseUrl?: string) {
		this.apiKey = apiKey || process.env.HIKIGAI_API_KEY || "";
		this.projectId = projectId || process.env.HIKIGAI_PROJECT_ID || "";
		this.baseUrl =
			baseUrl ||
			process.env.HIKIGAI_PLATFORM_URL || "";
		this.authToken = null;
		this.defaultTimeoutMs = HIKIGAI_AGENT_TIMEOUT_MS;
	}

	private getTimeoutMs(timeoutMs?: number): number {
		if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
			return timeoutMs;
		}

		return this.defaultTimeoutMs;
	}

	private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
		const resolvedTimeoutMs = this.getTimeoutMs(timeoutMs);
		const controller = new AbortController();
		const parentSignal = init.signal;

		const onAbort = () => controller.abort();
		if (parentSignal) {
			if (parentSignal.aborted) {
				controller.abort();
			} else {
				parentSignal.addEventListener("abort", onAbort, { once: true });
			}
		}

		const timeoutId = setTimeout(() => controller.abort(), resolvedTimeoutMs);

		try {
			return await fetch(url, {
				...init,
				signal: controller.signal,
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				throw new Error(`Hikigai request timed out after ${resolvedTimeoutMs}ms`);
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
			if (parentSignal) {
				parentSignal.removeEventListener("abort", onAbort);
			}
		}
	}

	private async getAuthToken(forceRefresh = false, timeoutMs?: number): Promise<string> {
		if (this.authToken && !forceRefresh) {
			return this.authToken;
		}

		if (!this.apiKey) {
			throw new Error("Missing HIKIGAI_API_KEY");
		}

		const url = `${this.baseUrl}/api/v1/auth/exchange`;
		const response = await this.fetchWithTimeout(
			url,
			{
			method: "POST",
			headers: {
				"X-API-Key": this.apiKey,
			},
			},
			timeoutMs
		);

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

	async ensureAuthToken(forceRefresh = false, timeoutMs?: number) {
		const token = await this.getAuthToken(forceRefresh, timeoutMs);
		return {
			token,
		};
	}

	async invokeAgent(agentSlug: string, input: unknown, timeoutMs?: number) {
		if (!this.projectId) {
			throw new Error("Missing HIKIGAI_PROJECT_ID");
		}

		const url = `${this.baseUrl}/api/v1/agents/${agentSlug}/invoke`;
		let token = await this.getAuthToken(false, timeoutMs);

		let response = await this.fetchWithTimeout(
			url,
			{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				"X-Project-ID": this.projectId,
			},
			body: JSON.stringify({
				input,
				project_id: this.projectId,
			}),
			},
			timeoutMs
		);

		// If the token expired, refresh once and retry.
		if (response.status === 401) {
			token = await this.getAuthToken(true, timeoutMs);
			response = await this.fetchWithTimeout(
				url,
				{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
					"X-Project-ID": this.projectId,
				},
				body: JSON.stringify({
					input,
					project_id: this.projectId,
				}),
				},
				timeoutMs
			);
		}

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Hikigai Agent Invocation Failed: ${error}`);
		}

		return await response.json();
	}
}

export const hikigai = new HikigaiClient();
