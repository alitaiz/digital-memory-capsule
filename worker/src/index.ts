
// To address TypeScript errors when @cloudflare/workers-types is not available,
// we'll provide minimal type definitions for the Cloudflare environment.
// In a real-world project, you should `npm install -D @cloudflare/workers-types`
// and configure it in `tsconfig.json`.
interface KVNamespace {
  get(key: string, options?: { type: 'json' }): Promise<string | null | any>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface R2Bucket {
  // R2 binding object does not directly expose bucketName to the code
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  // Bindings
  MEMORIES_KV: KVNamespace;
  MEMORIES_BUCKET: R2Bucket;

  // Secrets
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  
  // Environment Variables (from wrangler.toml `[vars]`)
  R2_BUCKET_NAME: string;
}

interface Memory {
  slug: string;
  title: string;
  shortMessage: string;
  memoryContent: string;
  images: string[]; // Now an array of public image URLs
  createdAt: string;
  editKey: string; // The secret key
  avatarUrl?: string;
  coverImageUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edit-Key",
};

const getR2Client = (env: Env) => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
};

// --- Secret Code Generation ---
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const generateCode = (): string => {
  // Each digit from 0-9 appears twice.
  const digits = ['0','0','1','1','2','2','3','3','4','4','5','5','6','6','7','7','8','8','9','9'];
  const shuffledDigits = shuffle(digits);
  // Take the first 8 digits. This ensures each digit appears at most twice.
  return shuffledDigits.slice(0, 8).join('');
};

const generateAndCheckCode = async (kv: KVNamespace): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 20; // Safeguard against an infinite loop
    while (attempts < maxAttempts) {
        const code = generateCode();
        const existing = await kv.get(code);
        if (existing === null) {
            return code;
        }
        attempts++;
    }
    throw new Error('Could not generate a unique secret code after multiple attempts.');
};


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      // Respond to CORS preflight requests.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Simple Router ---
    
    // The AI rewrite endpoint is handled by the dedicated proxy server.

    // POST /api/upload-url: Generates a secure URL for the frontend to upload a file directly to R2.
    if (request.method === "POST" && path === "/api/upload-url") {
      try {
        if (!env.R2_BUCKET_NAME) {
          throw new Error("Configuration error: R2_BUCKET_NAME is not set in wrangler.toml under [vars].");
        }
        
        const { filename, contentType } = await request.json() as { filename: string; contentType: string; };
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Filename and contentType are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
        }
        
        const s3 = getR2Client(env);
        const fileExtension = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const uniqueKey = `${crypto.randomUUID()}.${fileExtension}`;

        const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: uniqueKey, ContentType: contentType }), { expiresIn: 360 });
        const publicBaseUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL.slice(0, -1) : env.R2_PUBLIC_URL;
        const publicUrl = `${publicBaseUrl}/${uniqueKey}`;

        return new Response(JSON.stringify({ uploadUrl: signedUrl, publicUrl: publicUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch(e) {
        console.error("Error generating upload URL:", e);
        const errorDetails = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Worker Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // POST /api/memories/list: Get summary data for multiple memories.
    if (request.method === "POST" && path === "/api/memories/list") {
        try {
            const { slugs } = await request.json() as { slugs: string[] };
            if (!Array.isArray(slugs)) {
                return new Response(JSON.stringify({ error: 'Request body must be an object with a "slugs" array.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            
            const kvPromises = slugs.map(slug => env.MEMORIES_KV.get(slug));
            const results = await Promise.all(kvPromises);
            
            const summaries = results
                .filter(json => json !== null)
                .map(json => {
                    const memory: Memory = JSON.parse(json!);
                    return {
                        slug: memory.slug,
                        title: memory.title,
                        createdAt: memory.createdAt
                    };
                });

            return new Response(JSON.stringify(summaries), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error("Error in /api/memories/list:", e);
            const errorDetails = e instanceof Error ? e.message : "An unknown error occurred during request processing.";
            return new Response(JSON.stringify({ error: `Bad Request or Internal Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // POST /api/memory: Creates a new memory record in KV.
    if (request.method === "POST" && path === "/api/memory") {
      try {
        const newMemoryData: Omit<Memory, 'slug'> = await request.json(); // slug is not expected from client
        if (!newMemoryData.title || !newMemoryData.editKey) {
            return new Response(JSON.stringify({ error: 'Title and Edit Key are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        
        const uniqueCode = await generateAndCheckCode(env.MEMORIES_KV);
        
        const memoryToStore: Memory = {
            ...newMemoryData,
            slug: uniqueCode
        };

        // Store the complete object including the editKey
        await env.MEMORIES_KV.put(memoryToStore.slug, JSON.stringify(memoryToStore));
        // Return the generated slug to the client
        return new Response(JSON.stringify({ success: true, slug: memoryToStore.slug }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("Error creating memory:", e);
        const errorDetails = e instanceof Error ? e.message : "An unknown error occurred during request processing.";
        return new Response(JSON.stringify({ error: `Bad Request or Internal Error: ${errorDetails}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Routes for /api/memory/:slug
    if (path.startsWith("/api/memory/")) {
      const slug = path.substring("/api/memory/".length);
      if (!slug) return new Response("Not Found", { status: 404 });

      // GET /api/memory/:slug: Retrieves a memory.
      if (request.method === "GET") {
        try {
            const memoryJson = await env.MEMORIES_KV.get(slug);
            if (memoryJson === null) {
              return new Response(JSON.stringify({ error: "Memory not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            // SECURITY: Omit editKey before sending to client
            const memory: Partial<Memory> = JSON.parse(memoryJson);
            delete memory.editKey;
            return new Response(JSON.stringify(memory), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch(e) {
            console.error(`Error getting memory ${slug}:`, e);
            const errorDetails = e instanceof Error ? e.message : String(e);
            return new Response(JSON.stringify({ error: `Internal Server Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      
      // PUT /api/memory/:slug: Updates an existing memory.
      if (request.method === "PUT") {
          const editKey = request.headers.get('X-Edit-Key');
          if (!editKey) {
              return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          try {
              if (!env.R2_BUCKET_NAME) {
                  throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
              }
              const memoryJson = await env.MEMORIES_KV.get(slug);
              if (!memoryJson) {
                  return new Response(JSON.stringify({ error: 'Memory not found.' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }

              const storedMemory: Memory = JSON.parse(memoryJson);
              if (storedMemory.editKey !== editKey) {
                  return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              
              const updateData: Partial<Memory> = await request.json();

              // --- Robust Image Deletion Logic ---
              // The old list of images from KV
              const originalImageUrls = storedMemory.images || [];
              const imagesToDelete = originalImageUrls.filter(url => !(updateData.images || []).includes(url));
              
              const imageUrlsToDelete = [...imagesToDelete];
              // Also check if avatar/cover are being replaced or removed
              if (storedMemory.avatarUrl && storedMemory.avatarUrl !== updateData.avatarUrl) {
                  imageUrlsToDelete.push(storedMemory.avatarUrl);
              }
              if (storedMemory.coverImageUrl && storedMemory.coverImageUrl !== updateData.coverImageUrl) {
                  imageUrlsToDelete.push(storedMemory.coverImageUrl);
              }

              if (imageUrlsToDelete.length > 0) {
                  const s3 = getR2Client(env);
                  const objectKeys = imageUrlsToDelete.map(imageUrl => {
                      try {
                          const key = new URL(imageUrl).pathname.substring(1);
                          if (key) return { Key: key };
                          return null;
                      } catch (e) {
                          console.error(`[Update] Invalid URL encountered during diff for slug ${slug}: ${imageUrl}`, e);
                          return null;
                      }
                  }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');

                  if (objectKeys.length > 0) {
                      const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                          Bucket: env.R2_BUCKET_NAME,
                          Delete: { Objects: objectKeys },
                      }));
                      if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                          console.error(`[Update] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
                      }
                  }
              }

              // Update the memory in KV with the new data. Spreading updateData handles all fields,
              // including setting a field to null to remove it.
              const updatedMemory: Memory = {
                  ...storedMemory,
                  ...updateData
              };

              await env.MEMORIES_KV.put(slug, JSON.stringify(updatedMemory));

              const publicMemoryData = { ...updatedMemory };
              delete (publicMemoryData as Partial<Memory>).editKey;

              return new Response(JSON.stringify(publicMemoryData), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

          } catch (e) {
              const errorDetails = e instanceof Error ? e.message : String(e);
              console.error(`[Update] Critical failure during update of slug ${slug}:`, errorDetails);
              return new Response(JSON.stringify({ error: `Failed to update memory. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
      }

      // DELETE /api/memory/:slug: Permanently deletes a memory and its images.
      if (request.method === "DELETE") {
        const editKey = request.headers.get('X-Edit-Key');
        if (!editKey) {
          return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
          if (!env.R2_BUCKET_NAME) {
              throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
          }
          const memoryJson = await env.MEMORIES_KV.get(slug);

          if (!memoryJson) {
            // Memory already gone, consider it a success.
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          const memory: Memory = JSON.parse(memoryJson);
          
          if (memory.editKey !== editKey) {
            return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          // Collect all image URLs to delete
          const allImageUrls = [...(memory.images || [])];
          if (memory.avatarUrl) allImageUrls.push(memory.avatarUrl);
          if (memory.coverImageUrl) allImageUrls.push(memory.coverImageUrl);
          
          if (allImageUrls.length > 0) {
            const s3 = getR2Client(env);
            const objectKeys = allImageUrls.map(imageUrl => {
                try {
                  return { Key: new URL(imageUrl).pathname.substring(1) };
                } catch { return null; }
            }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');
            
            if (objectKeys.length > 0) {
               const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: objectKeys },
              }));
              if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                  console.error(`[Delete] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
                  const errorMessages = deleteResult.Errors.map(e => `${e.Key}: ${e.Message}`).join(', ');
                  throw new Error(`Failed to delete images from storage: ${errorMessages}`);
              }
            }
          }
          
          await env.MEMORIES_KV.delete(slug);
          return new Response(null, { status: 204, headers: corsHeaders });

        } catch (e) {
          const errorDetails = e instanceof Error ? e.message : String(e);
          console.error(`[Delete] Critical failure during deletion of slug ${slug}:`, errorDetails);
          return new Response(JSON.stringify({ error: `Failed to delete memory from storage. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
