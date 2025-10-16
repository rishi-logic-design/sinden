// utils/validation.js

// Sanitize input by trimming whitespace and removing potentially harmful characters
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format (basic)
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
};

// Validate date is in future
export const isFutureDate = (dateString) => {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

// Validate order form data
export const validateOrderForm = (formData) => {
  const errors = {};

  // Required fields validation
  if (!formData.clientName || formData.clientName.trim().length === 0) {
    errors.clientName = "Client name is required";
  } else if (formData.clientName.trim().length < 2) {
    errors.clientName = "Client name must be at least 2 characters";
  } else if (formData.clientName.trim().length > 100) {
    errors.clientName = "Client name must be less than 100 characters";
  }

  // Contact validation (optional but if provided should be valid)
  if (formData.contact && formData.contact.trim().length > 0) {
    const contact = formData.contact.trim();

    // Check if it looks like an email or phone
    if (contact.includes("@")) {
      if (!isValidEmail(contact)) {
        errors.contact = "Please enter a valid email address";
      }
    } else {
      // Assume it's a phone number
      if (!isValidPhone(contact)) {
        errors.contact = "Please enter a valid phone number";
      }
    }

    if (contact.length > 50) {
      errors.contact = "Contact information must be less than 50 characters";
    }
  }

  // Service type validation
  if (!formData.serviceType) {
    errors.serviceType = "Service type is required";
  }

  // Date validation
  if (!formData.dateEstimated) {
    errors.dateEstimated = "Estimated delivery date is required";
  } else if (!isFutureDate(formData.dateEstimated)) {
    errors.dateEstimated = "Delivery date cannot be in the past";
  }

  // Time validation (required if date is provided)
  if (formData.dateEstimated && !formData.timeEstimated) {
    errors.timeEstimated = "Estimated delivery time is required";
  }

  // Service detail validation (optional but has limits)
  if (formData.serviceDetail && formData.serviceDetail.trim().length > 500) {
    errors.serviceDetail = "Service details must be less than 500 characters";
  }

  // Observations validation (optional but has limits)
  if (formData.observations && formData.observations.trim().length > 1000) {
    errors.observations = "Observations must be less than 1000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validate file upload
export const validateFileUpload = (file) => {
  const errors = [];

  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (!file) {
    errors.push("No file provided");
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push(
      `File size (${Math.round(
        file.size / 1024 / 1024
      )}MB) exceeds maximum allowed size (10MB)`
    );
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `File type ${file.type} is not allowed. Only JPEG, PNG, and PDF files are supported`
    );
  }

  if (file.name.length > 255) {
    errors.push("Filename is too long (maximum 255 characters)");
  }

  // Check for potentially malicious filenames
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    errors.push("Filename contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate multiple files
export const validateFiles = (files) => {
  const errors = [];
  const maxFiles = 10;

  if (!Array.isArray(files)) {
    return { isValid: false, errors: ["Invalid files array"] };
  }

  if (files.length === 0) {
    errors.push("At least one file is required");
  }

  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum allowed: ${maxFiles}`);
  }

  // Validate individual files
  files.forEach((file, index) => {
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      errors.push(
        `File ${index + 1} (${file.name}): ${validation.errors.join(", ")}`
      );
    }
  });

  // Check for duplicate filenames
  const filenames = files.map((f) => f.name.toLowerCase());
  const duplicates = filenames.filter(
    (name, index) => filenames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    errors.push(
      `Duplicate filenames found: ${[...new Set(duplicates)].join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate signature data
export const validateSignature = (signatureDataUrl) => {
  const errors = [];

  if (!signatureDataUrl) {
    errors.push("Signature is required");
    return { isValid: false, errors };
  }

  if (typeof signatureDataUrl !== "string") {
    errors.push("Invalid signature format");
    return { isValid: false, errors };
  }

  if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
    errors.push("Signature must be in PNG format");
  }

  // Check if signature is not just a blank canvas
  if (signatureDataUrl.length < 100) {
    errors.push("Signature appears to be empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Complete order validation (for final submission)
export const validateCompleteOrder = (orderData) => {
  const errors = [];

  // Validate form data
  const formValidation = validateOrderForm(orderData.formData);
  if (!formValidation.isValid) {
    errors.push(...Object.values(formValidation.errors));
  }

  // Validate files
  if (orderData.files) {
    const filesValidation = validateFiles(orderData.files);
    if (!filesValidation.isValid) {
      errors.push(...filesValidation.errors);
    }
  } else {
    errors.push("At least one attachment is required");
  }

  // Validate signature
  if (orderData.signature) {
    const signatureValidation = validateSignature(orderData.signature);
    if (!signatureValidation.isValid) {
      errors.push(...signatureValidation.errors);
    }
  } else {
    errors.push("Client signature is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
