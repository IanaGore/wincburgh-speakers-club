import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
  async redirects() {
    return [
      { source: '/admin/messages', destination: '/admin/enquiries?tab=messages', permanent: false },
      { source: '/admin/signups', destination: '/admin/enquiries?tab=rsvps', permanent: false },
      { source: '/contact', destination: '/get-started?intent=ask', permanent: false },
      { source: '/signup', destination: '/get-started?intent=attend', permanent: false },
    ]
  },
};

export default nextConfig;
