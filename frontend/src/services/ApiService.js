// // src/services/ApiService.js

// const API_BASE_URL = "http://localhost:5000/api";

// class ApiService {
//   // Helper method for making requests
//   async request(endpoint, options = {}) {
//     const url = `${API_BASE_URL}${endpoint}`;
//     const config = {
//       headers: {
//         "Content-Type": "application/json",
//         ...options.headers,
//       },
//       ...options,
//     };

//     // Remove Content-Type for FormData
//     if (options.body instanceof FormData) {
//       delete config.headers["Content-Type"];
//     }

//     console.log(`Making ${config.method || "GET"} request to:`, url);

//     try {
//       const response = await fetch(url, config);

//       console.log("Response status:", response.status);

//       if (!response.ok) {
//         let errorData;
//         const contentType = response.headers.get("content-type");

//         try {
//           if (contentType && contentType.includes("application/json")) {
//             errorData = await response.json();
//           } else {
//             const textError = await response.text();
//             errorData = {
//               message: textError || `HTTP error! status: ${response.status}`,
//             };
//           }
//         } catch (parseError) {
//           console.error("Failed to parse error response:", parseError);
//           errorData = { message: `HTTP error! status: ${response.status}` };
//         }

//         console.error("API Error Response:", errorData);
//         throw new Error(
//           errorData.error || errorData.message || "Request failed"
//         );
//       }

//       // If response has no body (204), return null
//       const contentType = response.headers.get("content-type") || "";
//       if (!contentType.includes("application/json")) {
//         const text = await response.text();
//         try {
//           return text ? JSON.parse(text) : null;
//         } catch {
//           return text || null;
//         }
//       }

//       const responseData = await response.json();
//       console.log("Success response:", responseData);
//       return responseData;
//     } catch (error) {
//       console.error("API request failed:", {
//         url,
//         method: config.method || "GET",
//         error: error.message,
//       });
//       throw error;
//     }
//   }

//   // --------- AUTH METHODS (added) ---------

//   /**
//    * Login user.
//    * Expects backend POST /api/auth/login with body { email, password }
//    * Returns whatever backend returns (commonly { token, refreshToken, user })
//    */
//   async login({ email, password }) {
//     if (!email || !password) {
//       throw new Error("Email and password are required for login");
//     }

//     return this.request("/auth/login", {
//       method: "POST",
//       body: JSON.stringify({ email, password }),
//       credentials: "include", // include cookies if server uses them
//     });
//   }

//   /**
//    * Get authenticated user profile (if backend supports /auth/me)
//    */
//   async me(token) {
//     return this.request("/auth/me", {
//       method: "GET",
//       headers: token ? { Authorization: `Bearer ${token}` } : {},
//       credentials: "include",
//     });
//   }

//   /**
//    * Logout (optional)
//    */
//   async logout() {
//     return this.request("/auth/logout", {
//       method: "POST",
//       credentials: "include",
//     });
//   }

//   // Helper method to safely create ISO date string
//   createEstimatedDeliveryDate(orderData) {
//     try {
//       // Use the already processed estimated_delivery_at if it exists
//       if (orderData.estimated_delivery_at) {
//         const date = new Date(orderData.estimated_delivery_at);
//         if (!isNaN(date.getTime())) {
//           return date.toISOString();
//         }
//       }

//       // Try to construct from dateEstimated and timeEstimated
//       if (orderData.dateEstimated) {
//         let dateTimeString = orderData.dateEstimated;

//         // Add time if provided
//         if (orderData.timeEstimated) {
//           dateTimeString += `T${orderData.timeEstimated}`;
//         }

//         const date = new Date(dateTimeString);
//         if (!isNaN(date.getTime())) {
//           return date.toISOString();
//         }
//       }

//       // Fallback to current date if all else fails
//       return new Date().toISOString();
//     } catch (error) {
//       console.error("Error creating delivery date:", error);
//       return new Date().toISOString();
//     }
//   }

//   // Get customers list
//   async getCustomers() {
//     return this.request("/customers");
//   }

//   // Get plants list
//   async getPlants() {
//     return this.request("/plants");
//   }

//   // Create new order with fallback customer/plant lookup
//   async createOrder(orderData) {
//     console.log("ApiService.createOrder called with:", orderData);

//     let customer_id = Number(orderData.customer_id) || 1;
//     let plant_id = Number(orderData.plant_id) || 1;

//     // If using default IDs, try to get the first available customer/plant
//     if (customer_id === 1 && !orderData.customer_id) {
//       try {
//         const customers = await this.getCustomers();
//         if (customers && customers.length > 0) {
//           customer_id = customers[0].id;
//           console.log(`Using first available customer: ${customer_id}`);
//         }
//       } catch (error) {
//         console.warn("Could not fetch customers, using default ID 1");
//       }
//     }

//     if (plant_id === 1 && !orderData.plant_id) {
//       try {
//         const plants = await this.getPlants();
//         if (plants && plants.length > 0) {
//           plant_id = plants[0].id;
//           console.log(`Using first available plant: ${plant_id}`);
//         }
//       } catch (error) {
//         console.warn("Could not fetch plants, using default ID 1");
//       }
//     }

//     // The payload should already be properly formatted from the frontend
//     const payload = {
//       order_number: orderData.order_number || `ORD-${Date.now()}`,
//       customer_id,
//       plant_id,
//       estimated_delivery_at:
//         orderData.estimated_delivery_at || new Date().toISOString(),
//       total_amount: Number(orderData.total_amount) || 0,
//       payment_status: orderData.payment_status || "None",
//       meta: orderData.meta || {},
//     };

//     console.log("Final payload being sent to server:", payload);

//     return this.request("/orders", {
//       method: "POST",
//       body: JSON.stringify(payload),
//       credentials: "include",
//     });
//   }

//   // Save order as draft
//   async saveDraft(orderData) {
//     const draftData = {
//       ...orderData,
//       meta: {
//         ...orderData.meta,
//         draft: true,
//       },
//       customer_id: orderData.customer_id ?? 2,
//       plant_id: orderData.plant_id ?? 2,
//     };

//     return this.createOrder(draftData);
//   }

//   // Upload attachment
//   async uploadAttachment(orderId, file) {
//     const formData = new FormData();
//     formData.append("file", file);

//     return this.request(`/orders/${orderId}/attachments`, {
//       method: "POST",
//       body: formData,
//       credentials: "include",
//     });
//   }

//   // Upload signature
//   async uploadSignature(orderId, signatureDataUrl) {
//     // Convert data URL to blob
//     const response = await fetch(signatureDataUrl);
//     const blob = await response.blob();

//     const formData = new FormData();
//     formData.append("file", blob, "signature.png");
//     formData.append("kind", "Signature");

//     return this.request(`/orders/${orderId}/sign`, {
//       method: "POST",
//       body: formData,
//       credentials: "include",
//     });
//   }

//   // Get order details
//   async getOrder(orderId) {
//     return this.request(`/orders/${orderId}`);
//   }

//   // Update order
//   async updateOrder(orderId, orderData) {
//     return this.request(`/orders/${orderId}`, {
//       method: "PUT",
//       body: JSON.stringify(orderData),
//       credentials: "include",
//     });
//   }

//   // Delete attachment
//   async deleteAttachment(orderId, attachmentId) {
//     return this.request(`/orders/${orderId}/attachments/${attachmentId}`, {
//       method: "DELETE",
//       credentials: "include",
//     });
//   }

//   // Change order status
//   async changeOrderStatus(orderId, status, reason = null) {
//     return this.request(`/orders/${orderId}/status`, {
//       method: "PATCH",
//       body: JSON.stringify({
//         to_status: status,
//         reason: reason,
//       }),
//       credentials: "include",
//     });
//   }

//   // Get order list with filters
//   async getOrders(filters = {}) {
//     const queryParams = new URLSearchParams();

//     Object.entries(filters).forEach(([key, value]) => {
//       if (value !== null && value !== undefined && value !== "") {
//         queryParams.append(key, value);
//       }
//     });

//     const queryString = queryParams.toString();
//     const endpoint = queryString ? `/orders?${queryString}` : "/orders";

//     return this.request(endpoint);
//   }
// }

// export default new ApiService();

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

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(token) {
    return this.request("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async refreshToken(token) {
    return this.request("/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async logout(token) {
    return this.request("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export default new ApiService();
