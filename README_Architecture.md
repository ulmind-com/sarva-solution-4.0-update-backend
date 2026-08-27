# SSVPL Backend (Enterprise Edition)

Scalable, modular backend architecture for the SarvaSolution MLM Platform.

## 📂 Project Structure

```
src/
├── config/             # Configuration (DB, Env, 3rd Party)
├── controllers/        # Request Handlers
│   ├── admin/          # Admin-specific logic
│   ├── auth/           # Authentication logic
│   ├── franchise/      # Franchise logic
│   ├── user/           # User/Member logic
│   └── product/        # Product logic
├── middlewares/        # Express Middlewares
│   ├── auth/           # Authentication & Authorization
│   ├── error/          # Error Handling
│   ├── upload/         # File Uploads
│   └── validation/     # Request Validation
├── models/             # Mongoose Data Models
├── routes/             # API Routes
│   └── v1/             # Version 1 API
├── services/           # Business Logic Layer
│   ├── business/       # Core Logic (Sales, MLC, Stock)
│   └── integration/    # External Services (Email, PDF, Cloudinary)
├── templates/          # Email/PDF Templates
├── utils/              # Helper Functions
└── app.js              # Express App Setup
└── server.js           # Entry Point
```

## 🚀 Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create `.env` file with MongoDB URI, Cloudinary credentials, etc.

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 🛠️ Key Design Patterns

-   **Layered Architecture**: Controller -> Service -> Model.
-   **Service Separation**: Business logic isolated from Integrations.
-   **Centralized Routing**: `routes/v1/index.js` manages all endpoints.
-   **Middleware Extraction**: Auth and Validation are modular.

## 📝 API Documentation

Swagger UI is available at `/api-docs`.
