/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /(^|[/\\])(\.git|\.next|node_modules|\.npm-cache)([/\\]|$)/
      };
    }

    return config;
  }
};

module.exports = nextConfig;
