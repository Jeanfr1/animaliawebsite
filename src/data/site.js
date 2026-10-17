// Single source for the shop's facts. vite.config.js writes them into the
// built HTML ({{path.to.value}} tokens), so they are readable without JS.
// Source: the owner's screenshots in the kit (07-integracao/dados.json,
// 04-fotos-originais/instagram.png and servicos-equipe.png), 17/10/2026.
// TODO(animalia): confirm phone, WhatsApp link and service list with the shop;
// no opening hours or prices were supplied, so none are shown.

const street = 'Calle Floranes 40'
const postcode = '39010'
const city = 'Santander'
const region = 'Cantabria'

export const site = {
  name: 'Animalia Santander',
  tagline: 'Para gustos, patitas.',
  url: 'https://animalia-santander.vercel.app/', // TODO(animalia): final domain → canonical + og:url, then drop noindex
  address: {
    street,
    postcode,
    city,
    region,
    line: `${street}, ${city}, ${region} ${postcode}`,
  },
  phone: {
    display: '686 16 37 99',
    href: 'tel:+34686163799',
  },
  whatsapp: 'https://wa.link/j75mpv',
  instagram: {
    handle: '@animalia_santander',
    url: 'https://www.instagram.com/animalia_santander/',
  },
  // TODO(animalia): no Google place id/cid was found for the shop; the query
  // carries name + full address so Maps resolves the listing when it exists.
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Animalia, ${street}, ${postcode} ${city}`)}`,
  services: [
    'Baño y corte',
    'Deslanado y renovación de manto',
    'Stripping',
    'Baño y corte para gatos',
    'Corte de uñas para aves, roedores y reptiles',
  ],
  year: 2026,
}
