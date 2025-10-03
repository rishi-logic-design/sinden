// services/ApiService.js
class ApiService {
  constructor() {
    this.baseURL = "http://localhost:5001/api";
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    if (options.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            const textError = await response.text();
            errorData = {
              message: textError || `HTTP error! status: ${response.status}`,
            };
          }
        } catch (parseError) {
          errorData = { message: `HTTP error! status: ${response.status}` };
        }

        throw new Error(
          errorData.error || errorData.message || "Request failed"
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return text || null;
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  // ========== DRAFT METHODS ==========

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
      const result = await this.request(`/drafts/recent?limit=1`, {
        method: 'GET',
        credentials: 'include',
      });
      return { success: true, draft: result.drafts?.[0] ?? null };
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
        return this.request(`/drafts/delete-multiple`, {
          method: 'POST',
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