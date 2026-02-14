import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  
  const cityName = slug.split('-')[0];
  const capitalizedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  
  const manifest = {
    name: `${capitalizedCity} Travel Pack`,
    short_name: capitalizedCity,
    start_url: `/guide/${slug}`,
    scope: `/guide/${slug}`,
    id: `/guide/${slug}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(manifest);
}
