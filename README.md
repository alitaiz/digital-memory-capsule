
# Digital Memory Capsule

A vibrant and modern platform to create, share, and cherish beautiful digital memories with friends and family. This application provides a joyful and easy-to-use interface to build a lasting "digital gift" or "time capsule" of shared moments, without needing an account. It is built as a single-page application using React and Tailwind CSS, with a robust backend powered by Cloudflare Workers.

## Features

- **No Account Needed:** Create and share memories instantly without registration.
- **Joyful & Modern UI:** A vibrant design with a cheerful color palette and clean typography.
- **Create & Customize:** Add a title for your memory, a heartfelt message, a long-form story, and up to 5 photos.
- **AI-Assisted Writing:** Refine your stories with an AI assistant to make them even more touching and eloquent.
- **Image Lightbox:** Click on any photo to view it in a beautiful, full-screen overlay.
- **Customizable Links:** Create your own easy-to-remember code for sharing.
- **Secure Cloud Storage:** Data and images are stored securely using Cloudflare's global network (KV and R2).
- **Easy Recovery:** Access any memory directly using its unique code.
- **Fully Responsive:** Works beautifully on desktops, tablets, and mobile devices.

## Tech Stack

- **Frontend:** React, React Router
- **Styling:** Tailwind CSS
- **Backend API:** Cloudflare Workers
- **Data Storage:** Cloudflare KV (metadata), Cloudflare R2 (images)
- **AI Integration:** OpenAI API (via a secure proxy)
- **Build Tool:** Vite
- **Deployment:** Node.js, PM2 (for proxy/frontend server)

---

## Getting Started (Local Development)

To run this project on your local machine, you'll need to set up both the backend (Cloudflare) and the frontend (local server). Please refer to the `DEPLOYMENT.md` file for detailed, step-by-step instructions on setting up the required Cloudflare services and environment variables.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- An [OpenAI API Key](https://platform.openai.com/api-keys)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd digital-memory-capsule
    ```

2.  **Follow `DEPLOYMENT.md`:** Complete the steps in `DEPLOYMENT.md` to set up your Cloudflare Worker, KV, R2, and obtain your OpenAI API key. This is required for the application to function.

3.  **Install root dependencies:**
    ```bash
    npm install
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`. The application will automatically reload when you make changes to the source files. Note that for AI features to work, you will also need to run the proxy server.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production to the `dist` folder.
-   `npm run preview`: Serves the production build locally to preview it before deployment.
