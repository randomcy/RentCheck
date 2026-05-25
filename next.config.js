/** @type {import('next').NextConfig} */
// GitHub Pages 部署在子路径（/RentCheck/），需要 basePath。
// 本地开发时 NEXT_PUBLIC_BASE_PATH 为空，不影响 dev。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

module.exports = nextConfig;
