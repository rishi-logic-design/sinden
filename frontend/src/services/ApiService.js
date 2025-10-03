class ApiService {
  constructor() {
    this.baseURL = "http://localhost:5001/api";
    this.csrfHeaderName = "X-CSRF-Token";
    this.csrfToken = null;
    this.refreshInFlight = null; // Promise used to dedupe concurrent refreshes
    this.retryOnceFlag = Symbol("retryOnce");
    this.defaultTimeoutMs = 20000;
  }

  // ====== Utility: AbortController timeout wrapper ======
  withTimeout(ms = this.defaultTimeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(new Error("Request timed out")), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
  }

  // ====== Security: Basic sanitizers ======
  static sanitizeString(input, maxLen = 256) {
    if (typeof input !== "string") return "";
    let s = input.replace(/\s+/g, " ").trim();
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  }

  static isValidEmail(email) {
    if (typeof email !== "string") return false;
    if (email.length > 254) return false;
    // Very strict RFC5322-ish pattern (still not perfect, but decent for client-side)
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
    return re.test(email.trim());
  }

  static isStrongPassword(pwd) {
    // At least 8 chars, one lowercase, one uppercase, one number, one symbol, no spaces
    if (typeof pwd !== "string") return false;
    if (pwd.length < 8 || pwd.length > 128) return false;
    if (/\s/.test(pwd)) return false;
    const lower = /[a-z]/.test(pwd);
    const upper = /[A-Z]/.test(pwd);
    const digit = /[0-9]/.test(pwd);
    const symbol = /[^A-Za-z0-9]/.test(pwd);
    return lower && upper && digit && symbol;
  }

  static assert(condition, message) {
    if (!condition) {
      const err = new Error(message || "Validation failed");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
  }

  // ====== Low-level request helpers ======
  async requestRaw(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Merge headers safely
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const { signal, clear } = this.withTimeout(options.timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal,
      });

      const contentType = res.headers.get("content-type") || "";
      let payload = null;
      if (contentType.includes("application/json")) {
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      } else {
        const text = await res.text();
        try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
      }

      if (!res.ok) {
        const e = new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
        e.status = res.status;
        e.details = payload;
        throw e;
      }
      return payload;
    } finally {
      clear();
    }
  }

  // Wrapper that auto-includes credentials and retries once on 401 using refresh token
  async request(endpoint, options = {}) {
    const opts = {
      credentials: "include",
      ...options,
    };

    try {
      return await this.requestRaw(endpoint, opts);
    } catch (err) {
      // If unauthorized, try a single refresh + retry (unless this was already a retry)
      if (err && err.status === 401 && !opts[this.retryOnceFlag]) {
        await this.tryRefresh();
        return this.request(endpoint, { ...opts, [this.retryOnceFlag]: true });
      }
      throw err;
    }
  }

  // ====== Token refresh de-duped ======
  async tryRefresh() {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        try {
          // CSRF is often required for refresh as well (depends on backend config)
          await this.ensureCsrf().catch(() => { });
          await this.requestRaw("/auth/refresh", {
            method: "POST",
            credentials: "include",
            headers: this.csrfToken ? { [this.csrfHeaderName]: this.csrfToken } : undefined,
          });
        } finally {
          // small delay to avoid stampedes
          await new Promise(r => setTimeout(r, 50));
          this.refreshInFlight = null;
        }
      })();
    }
    return this.refreshInFlight;
  }

  // ====== AUTH API (Login / Register / Logout etc.) ======

  async register({ name, email, password }) {
    const safeName = ApiService.sanitizeString(name, 120);
    const safeEmail = ApiService.sanitizeString(email, 254);
    const safePwd = String(password || "");

    ApiService.assert(safeName.length >= 2, "Full name is required.");
    ApiService.assert(ApiService.isValidEmail(safeEmail), "Please enter a valid email.");
    ApiService.assert(ApiService.isStrongPassword(safePwd),
      "Password must be 8-128 chars with upper, lower, number, and symbol, and no spaces."
    );

    const body = { name: safeName, email: safeEmail, password: safePwd };

    const res = await this.request("/auth/register", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify(body),
    });

    return {
      user: res?.user ?? null,
      token: res?.token ?? null,
      message: res?.message ?? "Registered successfully",
    };
  }

  async login({ email, password, otp = null }) {
    const safeEmail = ApiService.sanitizeString(email, 254);
    const safePwd = String(password || "");

    ApiService.assert(ApiService.isValidEmail(safeEmail), "Please enter a valid email.");
    ApiService.assert(safePwd.length > 0, "Password is required.");

    const body = { email: safeEmail, password: safePwd };
    if (otp) body.otp = String(otp).trim();

    const res = await this.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Expect cookies to be set (httpOnly) for session/refresh.
    return {
      user: res?.user ?? null,
      token: res?.token ?? null,
      message: res?.message ?? "Login successful",
    };
  }

  
  async logout() {
    const res = await this.request("/auth/logout", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
    });
    // Clear local CSRF cache to force re-fetch next time
    this.csrfToken = null;
    return { success: true, message: res?.message ?? "Logged out" };
  }

  async getCurrentUser() {
    return this.request("/auth/me", { method: "GET" });
  }

  async resendVerification() {
    return this.request("/auth/verify/resend", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
    });
  }

  async verifyEmail(token) {
    ApiService.assert(typeof token === "string" && token.trim().length > 10, "Invalid verification token.");
    return this.request("/auth/verify", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify({ token: token.trim() }),
    });
  }

  async forgotPassword(email) {
    const safeEmail = ApiService.sanitizeString(email, 254);
    ApiService.assert(ApiService.isValidEmail(safeEmail), "Please enter a valid email.");
    return this.request("/auth/forgot-password", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify({ email: safeEmail }),
    });
  }

  /**
   * Reset password
   * Expected backend: POST /auth/reset-password  { token, password }
   */
  async resetPassword(token, newPassword) {
    ApiService.assert(typeof token === "string" && token.trim().length > 10, "Invalid reset token.");
    ApiService.assert(ApiService.isStrongPassword(newPassword),
      "Password must be 8-128 chars with upper, lower, number, and symbol, and no spaces."
    );
    return this.request("/auth/reset-password", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify({ token: token.trim(), password: newPassword }),
    });
  }

  async changePassword(currentPassword, newPassword) {
    ApiService.assert(typeof currentPassword === "string" && currentPassword.length > 0, "Current password required.");
    ApiService.assert(ApiService.isStrongPassword(newPassword),
      "Password must be 8-128 chars with upper, lower, number, and symbol, and no spaces."
    );
    return this.request("/auth/change-password", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // ====== Optional 2FA endpoints (if your backend supports) ======

  /**
   * Begin TOTP setup
   * Expected backend: POST /auth/2fa/setup -> { otpauth_url, qrcode_data_url }
   */
  async beginTwoFactorSetup() {
    return this.request("/auth/2fa/setup", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
    });
  }

  /**
   * Verify TOTP and enable 2FA
   * Expected backend: POST /auth/2fa/verify  { code }
   */
  async verifyTwoFactor(code) {
    ApiService.assert(/^\d{6}$/.test(String(code || "").trim()), "Enter a valid 6‑digit code.");
    return this.request("/auth/2fa/verify", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify({ code: String(code).trim() }),
    });
  }

  /**
   * Disable 2FA
   * Expected backend: POST /auth/2fa/disable  { code }
   */
  async disableTwoFactor(code) {
    return this.request("/auth/2fa/disable", {
      method: "POST",
      headers: { [this.csrfHeaderName]: csrf },
      body: JSON.stringify(code ? { code: String(code).trim() } : {}),
    });
  }

  // ====== Existing DRAFT / ORDER methods remain below (unchanged) ======

  /**
   * Auto-save draft (called every 12 seconds)
   */
  async autoSaveDraft(draftId, draftData) {
    return this.request(`/drafts/auto-save`, {
      method: 'POST',
      body: JSON.stringify({ id: draftId, data: draftData }),
      credentials: 'include',
    });
  }

  /**
   * Manual save draft (when user clicks "Save as Draft")
   */
  async saveDraft(draftData) {
    return this.request(`/drafts/manual-save`, {
      method: 'POST',
      body: JSON.stringify({ id: `draft_manual_${Date.now()}`, data: draftData }),
      credentials: 'include',
    });
  }


  /**
   * Get latest auto-saved draft for recovery
   */
  async getLatestAutoSave() {
    try {
      const result = await this.request(`/drafts/latest-auto`, {
        method: 'GET',
        credentials: 'include',
      });

      // backend returns either { success: true, draft: {...} } OR older code might send { drafts: [...] }
      const draft = result?.draft ?? (Array.isArray(result?.drafts) ? result.drafts[0] : null);

      return { success: true, draft: draft ?? null };
    } catch (err) {
      console.error('Failed to fetch latest draft', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get all drafts (with optional status filter)
   */
  async getDrafts(status = null) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/drafts${q}`, {
      method: 'GET',
      credentials: 'include',
    });
  }



  /**
   * Get single draft by ID
   */
  async getDraft(draftId) {
    return this.request(`/drafts/${encodeURIComponent(draftId)}`, {
      method: 'GET',
      credentials: 'include',
    });
  }



  /**
   * Delete draft
   */
  async deleteDraft(draftId) {
    return this.request(`/drafts/${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }


  /**
   * Update draft
   */
  async updateDraft(draftId, draftData) {
    return this.request(`/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PUT',
      body: JSON.stringify(draftData),
      credentials: 'include',
    });
  }


  /**
   * Get draft count
   */
  async getDraftCount() {
    try {
      return await this.request('/drafts/count', {
        method: 'GET',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to fetch draft count:', error);
      return { total: 0, autoSaved: 0, manual: 0 };
    }
  }

  /**
   * Search drafts
   */
  async searchDrafts(searchTerm) {
    return this.request(`/drafts/search?q=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  /**
   * Convert draft to order (load draft data for order creation)
   */
  async convertDraftToOrder(draftId) {
    return this.request(`/drafts/${encodeURIComponent(draftId)}/convert`, {
      method: 'POST',
      credentials: 'include',
    });
  }


  // delete all autosaves
  async deleteAllAutoSaves() {
    try {
      const result = await this.request(`/drafts?auto_saved=true`, {
        method: 'GET',
        credentials: 'include',
      });

      if (result.success && result.drafts?.length > 0) {
        const ids = result.drafts.map(d => d.id);
        return this.request(`/drafts/auto-saved/all`, {
          method: 'DELETE',
          body: JSON.stringify({ draftIds: ids }),
          credentials: 'include',
        });
      }

      return { success: true, deleted: 0 };
    } catch (err) {
      console.error('Failed to delete auto-saves', err);
      return { success: false, error: err.message };
    }
  }


  /**
   * Cleanup old auto-saved drafts
   */
  async cleanupOldDrafts(days = 7) {
    try {
      return await this.request(`/drafts/cleanup/auto?days=${encodeURIComponent(days)}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to cleanup drafts:', error);
      return { success: false };
    }
  }
  // ========== ORDER METHODS ==========

  async getCustomers() {
    return this.request("/customers", {
      credentials: "include",
    });
  }

  async getPlants() {
    return this.request("/plants", {
      credentials: "include",
    });
  }

  async createOrder(orderData) {
    let customer_id = Number(orderData.customer_id);
    let plant_id = Number(orderData.plant_id);

    if (!customer_id || isNaN(customer_id)) {
      try {
        const customers = await this.getCustomers();
        if (customers && customers.length > 0) {
          customer_id = customers[0].id;
        } else {
          throw new Error("No customers found in database.");
        }
      } catch (error) {
        throw new Error("Failed to get customer.");
      }
    }

    if (!plant_id || isNaN(plant_id)) {
      try {
        const plants = await this.getPlants();
        if (plants && plants.length > 0) {
          plant_id = plants[0].id;
        } else {
          throw new Error("No plants found in database.");
        }
      } catch (error) {
        throw new Error("Failed to get plant.");
      }
    }

    const payload = {
      order_number: orderData.order_number || `ORD-${Date.now()}`,
      customer_id,
      plant_id,
      estimated_delivery_at:
        orderData.estimated_delivery_at || new Date().toISOString(),
      total_amount: Number(orderData.total_amount) || 0,
      status: orderData.status || "Pending",
      payment_status: orderData.payment_status || "None",
      meta: orderData.meta || {},
    };

    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    });
  }

  async uploadAttachment(orderId, file) {
    const formData = new FormData();
    formData.append("file", file);

    return this.request(`/orders/${orderId}/attachments`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  }

  async uploadSignature(orderId, signatureDataUrl) {
    const response = await fetch(signatureDataUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("file", blob, "signature.png");
    formData.append("kind", "Signature");

    return this.request(`/orders/${orderId}/sign`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  }

  async getOrder(orderId) {
    return this.request(`/orders/${orderId}`, {
      credentials: "include",
    });
  }

  async getOrders(filters = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/orders?${queryString}` : "/orders";

    return this.request(endpoint, {
      credentials: "include",
    });
  }

  async updateOrder(orderId, orderData) {
    return this.request(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
      credentials: "include",
    });
  }

  async deleteAttachment(orderId, attachmentId) {
    return this.request(`/orders/${orderId}/attachments/${attachmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  async changeOrderStatus(orderId, status, reason = null) {
    return this.request(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        to_status: status,
        reason: reason,
      }),
      credentials: "include",
    });
  }

  async getAttachments(orderId) {
    if (!orderId) throw new Error("orderId required");
    return this.request(`/orders/${orderId}/attachments`, {
      credentials: "include",
    });
  }

  async getSignatureByOrder(orderId) {
    if (!orderId) throw new Error("orderId required");
    return this.request(`/signatures/order/${orderId}`, {
      credentials: "include",
    });
  }
}

export default new ApiService();