/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const allowedOrigins = isDev
      ? 'http://localhost:3000 https://auth.privy.io'
      : `https://auth.privy.io ${vercelUrl} https://cupi.vercel.app https://cupi.shikhar.xyz https://*.shikhar.xyz`.trim();

    const frameAncestors = `frame-ancestors 'self' ${allowedOrigins}`.trim();
    const frameSrc = "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com";

    const connectOrigins = [
      "'self'",
      "https://auth.privy.io",
      "https://api.privy.io",
      "wss://*.privy.io",
      "https://*.privy.io",
      "https://sepolia.base.org",
      "https://mainnet.base.org",
      "https://base-sepolia.g.alchemy.com",
      "https://base-mainnet.g.alchemy.com",
      "https://*.alchemy.com",
      "https://base.llamarpc.com",
      "https://rpc.ankr.com",
      "https://mainnet.infura.io",
      "https://polygon-rpc.com",
      "https://api.coingecko.com",
      "https://api.defillama.com",
      "https://explorer-api.walletconnect.com",
      "https://*.walletconnect.com",
      "https://*.walletconnect.org",
      "wss://*.walletconnect.com",
      "wss://*.walletconnect.org",
      "https://clientstream.launchdarkly.com",
      "wss://ws.blockchain.info",
      "https://api.mainnet-beta.solana.com",
      "https://api.devnet.solana.com",
      "https://cupi.shikhar.xyz",
      "https://*.shikhar.xyz",
      "https://cupi.vercel.app",
      vercelUrl,
    ].filter(Boolean).join(' ');

    const connectSrc = `connect-src ${connectOrigins}`;

    return [
      // Cross-origin access is only granted to public/dialect endpoints.
      // Solana Actions (Blinks) REQUIRE "*" per the Dialect spec. Authenticated
      // routes (merchant API, payments, users, admin) get no ACAO header —
      // browsers block cross-origin reads; server-to-server calls are unaffected.
      ...[
        '/api/resolve',
        '/api/ping',
        '/api/health',
        '/api/solana/:path*',
        '/api/payment-links/:path*',
        '/api/payment-requests/:path*',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, OPTIONS, PATCH'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, X-Idempotency-Key, X-Merchant-Key, X-Signature, X-Timestamp, X-Accept-Action-Version, X-Accept-Blockchain-Ids'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ]
      })),
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' https://auth.privy.io https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:; ${connectSrc}; ${frameSrc}; ${frameAncestors}`
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: isDev ? '' : 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(self), geolocation=(), payment=*'
          }
        ].filter(header => header.value !== '')
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files properly
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Add fallbacks for Node.js globals (if not on server)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
