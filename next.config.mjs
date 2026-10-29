/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "xlsx", "nodemailer"],
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

export default nextConfig;
