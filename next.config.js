/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const allowedOrigins = isDev
      ? 'http://localhost:3000 https://auth.privy.io'
      : `https://auth.privy.io ${vercelUrl}`;

    const frameAncestors = `frame-ancestors 'self' ${allowedOrigins}`.trim();
    const frameSrc = "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org";
    const connectSrc = isDev
      ? "connect-src 'self' https://auth.privy.io https://api.privy.io https://rpc.ankr.com https://mainnet.infura.io https://polygon-rpc.com https://api.coingecko.com https://api.defillama.com https://explorer-api.walletconnect.com https://clientstream.launchdarkly.com wss://ws.blockchain.info"
      : "connect-src 'self' https://auth.privy.io https://api.privy.io https://rpc.ankr.com https://mainnet.infura.io https://polygon-rpc.com https://api.coingecko.com https://api.defillama.com https://explorer-api.walletconnect.com https://clientstream.launchdarkly.com";


    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: isDev ? '*' : vercelUrl || 'https://yourdomain.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' https://auth.privy.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; worker-src 'self' blob:; ${connectSrc}; ${frameSrc}; ${frameAncestors}`
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
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
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
