/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "xlsx", "nodemailer"],
  },
};

export default nextConfig;
