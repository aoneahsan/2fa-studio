/**
 * Google Drive REST API Service for browser environments
 * @module services/google-drive-api
 */

export class GoogleDriveAPI {
	private static accessToken: string = '';
	private static readonly BASE_URL = 'https://www.googleapis.com/drive/v3';

	/**
	 * Set the access token for API requests
	 */
	static setAccessToken(token: string): void {
		this.accessToken = token;
	}

	/**
	 * Make authenticated request to Google Drive API
	 */
	private static async request(
		endpoint: string,
		options: RequestInit = {}
	): Promise<any> {
		if (!this.accessToken) {
			throw new Error('No access token available');
		}

		const response = await fetch(`${this.BASE_URL}${endpoint}`, {
			...options,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Google Drive API request failed');
		}

		return response.json();
	}

	/**
	 * List files in Google Drive
	 */
	static async listFiles(query?: string): Promise<any> {
		const params = new URLSearchParams();
		if (query) params.append('q', query);
		params.append('fields', 'files(id,name,createdTime,size,description,appProperties)');
		params.append('orderBy', 'createdTime desc');

		return this.request(`/files?${params.toString()}`);
	}

	/**
	 * Create a file in Google Drive
	 */
	static async createFile(metadata: any, content: string): Promise<any> {
		const boundary = '-------314159265358979323846';
		const delimiter = `\r\n--${boundary}\r\n`;
		const closeDelimiter = `\r\n--${boundary}--`;

		const multipartRequestBody =
			delimiter +
			'Content-Type: application/json\r\n\r\n' +
			JSON.stringify(metadata) +
			delimiter +
			'Content-Type: application/json\r\n\r\n' +
			content +
			closeDelimiter;

		const response = await fetch(`${this.BASE_URL}/files?uploadType=multipart`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': `multipart/related; boundary="${boundary}"`,
			},
			body: multipartRequestBody,
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Failed to create file');
		}

		return response.json();
	}

	/**
	 * Get file content
	 */
	static async getFile(fileId: string, metadata = false): Promise<any> {
		const endpoint = metadata ? `/files/${fileId}` : `/files/${fileId}?alt=media`;
		
		const response = await fetch(`${this.BASE_URL}${endpoint}`, {
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Failed to get file');
		}

		return metadata ? response.json() : response.text();
	}

	/**
	 * Delete a file
	 */
	static async deleteFile(fileId: string): Promise<void> {
		await this.request(`/files/${fileId}`, { method: 'DELETE' });
	}

	/**
	 * Get user info and storage quota
	 */
	static async getAbout(): Promise<any> {
		return this.request('/about?fields=user,storageQuota');
	}
}