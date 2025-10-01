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

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // console.log(`Making ${config.method || "GET"} request to:`, url);

    try {
      const response = await fetch(url, config);
      console.log("Response status:", response.status);

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
          // console.error("Failed to parse error response:", parseError);
          errorData = { message: `HTTP error! status: ${response.status}` };
        }

        // console.error("API Error Response:", errorData);
        throw new Error(
          errorData.error || errorData.message || "Request failed"
        );
      }

      // Handle empty responses
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
      // console.log("Success response:", data);
      return data;
    } catch (error) {
      // console.error("API request failed:", {
      //   url,
      //   method: config.method || "GET",
      //   error: error.message,
      // });
      throw error;
    }
  }

  // ========== AUTH METHODS ==========

  async login(credentials) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      credentials: "include",
    });
  }

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
      credentials: "include",
    });
  }

  async getProfile(token) {
    return this.request("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
  }

  async refreshToken(token) {
    return this.request("/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
  }

  async logout(token) {
    return this.request("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
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
    // console.log("ApiService.createOrder called with:", orderData);

    let customer_id = Number(orderData.customer_id);
    let plant_id = Number(orderData.plant_id);

    // Auto-fetch first available customer if not provided
    if (!customer_id || isNaN(customer_id)) {
      try {
        const customers = await this.getCustomers();
        if (customers && customers.length > 0) {
          customer_id = customers[0].id;
          // console.log(`Auto-selected customer_id: ${customer_id}`);
        } else {
          throw new Error("No customers found in database. Please create a customer first.");
        }
      } catch (error) {
        // console.error("Failed to fetch customers:", error);
        throw new Error("Failed to get customer. Please ensure at least one customer exists.");
      }
    }

    // Auto-fetch first available plant if not provided
    if (!plant_id || isNaN(plant_id)) {
      try {
        const plants = await this.getPlants();
        if (plants && plants.length > 0) {
          plant_id = plants[0].id;
          // console.log(`Auto-selected plant_id: ${plant_id}`);
        } else {
          throw new Error("No plants found in database. Please create a plant first.");
        }
      } catch (error) {
        // console.error("Failed to fetch plants:", error);
        throw new Error("Failed to get plant. Please ensure at least one plant exists.");
      }
    }

    const payload = {
      order_number: orderData.order_number || `ORD-${Date.now()}`,
      customer_id,
      plant_id,
      estimated_delivery_at:
        orderData.estimated_delivery_at || new Date().toISOString(),
      total_amount: Number(orderData.total_amount) || 0,
      payment_status: orderData.payment_status || "None",
      meta: orderData.meta || {},
    };

    // console.log("Final payload being sent to server:", payload);

    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    });
  }

  async saveDraft(orderData) {
    const draftData = {
      ...orderData,
      meta: {
        ...orderData.meta,
        draft: true,
      },
      customer_id: orderData.customer_id ?? 2,
      plant_id: orderData.plant_id ?? 2,
    };

    return this.createOrder(draftData);
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
    // Convert data URL to blob
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
  // Fetch attachments list for an order
  async getAttachments(orderId) {
    if (!orderId) throw new Error("orderId required");
    return this.request(`/orders/${orderId}/attachments`, {
      credentials: "include",
    });
  }

  // Fetch signature by order (controller route: /api/signatures/order/:orderId)
  async getSignatureByOrder(orderId) {
    if (!orderId) throw new Error("orderId required");
    return this.request(`/signatures/order/${orderId}`, {
      credentials: "include",
    });
  }

}

export default new ApiService();