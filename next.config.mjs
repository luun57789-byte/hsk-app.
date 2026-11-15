/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || "";
export default {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
