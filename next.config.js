/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'mammoth', 'pdf-parse', 'officeparser'],
}

module.exports = nextConfig
