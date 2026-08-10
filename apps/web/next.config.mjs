// Next 14 looks for optional SWC packages beside its nested workspace install.
// npm hoists those packages to the root lockfile, where they are already present.
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
