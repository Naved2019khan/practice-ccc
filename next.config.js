/** @type {import('next').NextConfig} */
const os = require('os');

const cpuCount = os.cpus().length;
// Never allocate all CPU cores to the build process so host OS and server remain responsive
const buildCpus = Math.max(1, cpuCount > 1 ? Math.min(2, cpuCount - 1) : 1);

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  productionBrowserSourceMaps: false,
  // Limit CPU and worker thrashing to prevent choking the server
  experimental: {
    cpus: buildCpus,
    workerThreads: false,
  },
  webpack: (config) => {
    config.performance = false;
    return config;
  },
};

module.exports = nextConfig;
