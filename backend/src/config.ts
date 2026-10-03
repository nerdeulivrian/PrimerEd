const env = process.env

function required(name: string): string {
  const value = env[name]
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`)
    process.exit(1)
  }
  return value
}

const port = Number(env.PORT ?? 8787)

export const config = {
  port,
  toolsPort: Number(env.TOOLS_PORT ?? port + 1),
  publicUrl: env.PUBLIC_URL?.replace(/\/+$/, ''),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: new TextEncoder().encode(required('JWT_SECRET')),
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    liveModel: env.LIVE_MODEL ?? 'gemini-3.8-live',
    textModel: env.TEXT_MODEL ?? 'gemini-3.5-flash-lite',
    imageModel: env.IMAGE_MODEL ?? 'gemini-3.1-flash-lite-image',
    voice: env.LIVE_VOICE ?? 'Aoede',
    imageConcurrency: Number(env.IMAGE_CONCURRENCY ?? 8),
  },
  agora: {
    appId: required('AGORA_APP_ID'),
    appCertificate: required('AGORA_APP_CERTIFICATE'),
    customerId: env.AGORA_CUSTOMER_ID,
    customerSecret: env.AGORA_CUSTOMER_SECRET,
  },
  landingUrl: env.LANDING_URL ?? 'http://localhost:5191',
  lessonUrl: env.LESSON_URL ?? 'http://localhost:5173',
}
