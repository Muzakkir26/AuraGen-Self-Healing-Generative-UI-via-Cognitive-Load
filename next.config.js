/**
 * Next.js configuration.
 * Setting `cleanDistDir: false` prevents Next.js from trying to clean the
 * `.next` folder on Windows where OneDrive can create stale symlinks that
 * cause `EINVAL` readlink errors during `next dev`.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid automatic deletion of .next files that may be locked on Windows.
  cleanDistDir: false,
};

module.exports = nextConfig;
