/* BLACKBOX seed script - populates tech-niche products, offers, AI scores, settings */
import { db } from "../src/lib/db";

const IMG = {
  shaver: ["https://sfile.chatglm.cn/images-ppt/7df744a197bf.jpg", "https://sfile.chatglm.cn/images-ppt/c0733319fd4b.jpg"],
  earbuds: ["https://sfile.chatglm.cn/images-ppt/8359935c91d7.jpg", "https://sfile.chatglm.cn/images-ppt/6486b60af4a8.jpg"],
  smartwatch: ["https://sfile.chatglm.cn/images-ppt/4f38916bba31.jpg", "https://sfile.chatglm.cn/images-ppt/7d4a07d1251f.jpg"],
  keyboard: ["https://sfile.chatglm.cn/images-ppt/2595fee760db.jpg", "https://sfile.chatglm.cn/images-ppt/d19ffc1ac67a.jpg"],
  mouse: ["https://sfile.chatglm.cn/images-ppt/d6a6202c22b9.jpg", "https://sfile.chatglm.cn/images-ppt/625bd8be98ee.jpg"],
  charger: ["https://sfile.chatglm.cn/images-ppt/2b2f68ef449a.jpg", "https://sfile.chatglm.cn/images-ppt/1beaeb0822de.jpg"],
  tablet: ["https://sfile.chatglm.cn/images-ppt/df6fb1d2b7b7.jpg", "https://sfile.chatglm.cn/images-ppt/0bca98738f76.jpg"],
  fan: ["https://sfile.chatglm.cn/images-ppt/4841d5759143.jpg", "https://sfile.chatglm.cn/images-ppt/fab1f9a73fab.jpg"],
  powerbank: ["https://sfile.chatglm.cn/images-ppt/78f1313a7e49.jpg", "https://sfile.chatglm.cn/images-ppt/33168d6bf8b0.jpg"],
  headphones: ["https://sfile.chatglm.cn/images-ppt/323508e97731.webp", "https://sfile.chatglm.cn/images-ppt/78457d929f42.jpg"],
};

type OfferSeed = {
  store: string;
  price: number;
  originalPrice?: number;
  shippingTime: string;
  shippingCost: number;
  availability: string;
  rating?: number;
  reviewCount?: number;
};

type ProductSeed = {
  name: string;
  description: string;
  category: string;
  brand: string;
  images: string[];
  features: string[];
  specs: Record<string, string>;
  isViral: boolean;
  offers: OfferSeed[];
  ai: {
    score: number;
    classification: string;
    reasoning: string;
    recommendation: string;
    bestStore: string;
    summary: string;
  };
};

const products: ProductSeed[] = [
  // ===== AFEITADORAS ELÉCTRICAS =====
  {
    name: "Afeitadora Eléctrica Recargable 3 Cuchillas",
    description:
      "Afeitadora eléctrica con sistema de 3 cuchillas flotantes que se adaptan al contorno del rostro. Recargable por USB, recorte preciso y limpieza fácil bajo el grifo.",
    category: "Tecnología",
    brand: "GenericTech",
    images: IMG.shaver,
    features: ["3 cuchillas flotantes", "Recarga USB-C", "Resistente al agua IPX6", "90 min de autonomía", "Pantalla LED de batería"],
    specs: { Batería: "90 min", Carga: "USB-C", Resistencia: "IPX6", Cuchillas: "3" },
    isViral: false,
    offers: [
      { store: "amazon", price: 119.9, originalPrice: 169.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.4, reviewCount: 1280 },
      { store: "temu", price: 69.9, originalPrice: 129.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 540 },
      { store: "falabella", price: 149.9, originalPrice: 199.9, shippingTime: "2-4 días", shippingCost: 0, availability: "low_stock", rating: 4.3, reviewCount: 210 },
    ],
    ai: {
      score: 86,
      classification: "excellent",
      reasoning: "Excelente relación calidad/precio. La opción de Temu es 42% más barata aunque el envío es lento. Amazon ofrece el mejor equilibrio entre precio y rapidez de envío.",
      recommendation: "Compra en Amazon si quieres rapidez y garantía. Si no tienes prisa, Temu te ahorra S/50.",
      bestStore: "amazon",
      summary: "Afeitadora recargable confiable con buena autonomía y resistencia al agua. Buena compra para uso diario.",
    },
  },
  {
    name: "Afeitadora Eléctrica Recargable 5 Cabezales",
    description:
      "Afeitadora de 5 cabezales giratorios que cubre más área en cada pasada. Ideal para cuello y mandíbula. Incluye kit de recorte y estuche de viaje.",
    category: "Tecnología",
    brand: "GenericTech",
    images: [IMG.shaver[1], IMG.shaver[0]],
    features: ["5 cabezales giratorios", "Kit de recorte incluido", "Recarga USB", "120 min autonomía", "Estuche de viaje"],
    specs: { Batería: "120 min", Carga: "USB", Cabezales: "5" },
    isViral: false,
    offers: [
      { store: "amazon", price: 159.9, originalPrice: 229.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 640 },
      { store: "temu", price: 99.9, originalPrice: 179.9, shippingTime: "10-18 días", shippingCost: 0, availability: "in_stock", rating: 3.9, reviewCount: 310 },
      { store: "falabella", price: 189.9, shippingTime: "3-5 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 95 },
    ],
    ai: {
      score: 78,
      classification: "good",
      reasoning: "Buena opción por los 5 cabezales, pero el precio en Falabella es alto. Temu ofrece el mejor precio si esperas el envío.",
      recommendation: "Recomendado en Temu para ahorrar, o Amazon si necesitas envío rápido.",
      bestStore: "temu",
      summary: "Afeitadora versátil de 5 cabezales con accesorios completos. Buena para afeitado espeso.",
    },
  },
  // ===== AUDÍFONOS BLUETOOTH =====
  {
    name: "Audífonos Inalámbricos Bluetooth 5.3 con ANC",
    description:
      "Audífonos inalámbricos tipo earbuds con cancelación activa de ruido, modo ambiental y estuche de carga con pantalla LED. Sonido profundo con graves potentes.",
    category: "Audio",
    brand: "SoundPro",
    images: IMG.earbuds,
    features: ["Bluetooth 5.3", "Cancelación de ruido ANC", "Estuche con pantalla LED", "30h de batería total", "Resistente al sudor IPX5"],
    specs: { Bluetooth: "5.3", Batería: "30h", Cancelación: "ANC", Resistencia: "IPX5" },
    isViral: true,
    offers: [
      { store: "amazon", price: 89.9, originalPrice: 149.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.5, reviewCount: 3200 },
      { store: "temu", price: 45.9, originalPrice: 99.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 1800 },
      { store: "falabella", price: 119.9, originalPrice: 169.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.3, reviewCount: 410 },
    ],
    ai: {
      score: 91,
      classification: "excellent",
      reasoning: "Oferta destacada. El precio en Temu (S/45.9) es excepcional para audífonos con ANC. Amazon ofrece envío rápido y mejor garantía. La diferencia de precio justifica elegir según urgencia.",
      recommendation: "Si no tienes prisa: Temu es ganga. Si necesitas ya: Amazon sigue siendo buena compra.",
      bestStore: "temu",
      summary: "Earbuds con ANC y estuche LED. Excelente compra, especialmente en Temu.",
    },
  },
  {
    name: "Auriculares Over-Ear Inalámbricos con ANC",
    description:
      "Auriculares de diadema con cancelación activa de ruido, 40h de batería y sonido Hi-Fi. Almohadillas de proteína para comodidad prolongada.",
    category: "Audio",
    brand: "SoundPro",
    images: IMG.headphones,
    features: ["Cancelación de ruido ANC", "40h de batería", "Sonido Hi-Fi", "Almohadillas de proteína", "Micrófono con IA"],
    specs: { Batería: "40h", Cancelación: "ANC", Tipo: "Over-Ear" },
    isViral: false,
    offers: [
      { store: "amazon", price: 179.9, originalPrice: 259.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.6, reviewCount: 2100 },
      { store: "temu", price: 109.9, originalPrice: 199.9, shippingTime: "10-18 días", shippingCost: 0, availability: "in_stock", rating: 4.0, reviewCount: 720 },
      { store: "falabella", price: 219.9, shippingTime: "2-4 días", shippingCost: 0, availability: "low_stock", rating: 4.4, reviewCount: 150 },
    ],
    ai: {
      score: 83,
      classification: "good",
      reasoning: "Buenos auriculares con ANC real. Amazon tiene el mejor rating y envío rápido. Temu es más barato pero con envío lento y reviews mixtas.",
      recommendation: "Amazon es la mejor opción por garantía y reviews. Temu solo si priorizas precio.",
      bestStore: "amazon",
      summary: "Over-ear con ANC y 40h de batería. Cómodos para uso prolongado.",
    },
  },
  // ===== SMARTWATCHES =====
  {
    name: "Smartwatch Deportivo con Llamadas Bluetooth",
    description:
      "Smartwatch con pantalla AMOLED 1.43\", monitor de ritmo cardíaco, SpO2, sueño y más de 100 modos deportivos. Permite hacer y recibir llamadas por Bluetooth.",
    category: "Tecnología",
    brand: "FitWatch",
    images: IMG.smartwatch,
    features: ["Pantalla AMOLED 1.43\"", "Llamadas Bluetooth", "Ritmo cardíaco y SpO2", "100+ modos deportivos", "Resistente al agua IP68"],
    specs: { Pantalla: "1.43\" AMOLED", Batería: "7 días", Resistencia: "IP68", Llamadas: "Sí" },
    isViral: true,
    offers: [
      { store: "amazon", price: 129.9, originalPrice: 199.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.3, reviewCount: 4500 },
      { store: "temu", price: 59.9, originalPrice: 129.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.0, reviewCount: 2900 },
      { store: "falabella", price: 159.9, originalPrice: 219.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 320 },
    ],
    ai: {
      score: 88,
      classification: "excellent",
      reasoning: "Smartwatch completo con llamadas y AMOLED a buen precio. Temu ofrece el mejor precio (S/59.9) pero Amazon tiene mejor rating y envío rápido.",
      recommendation: "Mejor relación: Amazon por confiabilidad. Mejor precio: Temu si esperas envío.",
      bestStore: "amazon",
      summary: "Smartwatch AMOLED con llamadas y sensores de salud. De los mejores en su rango de precio.",
    },
  },
  {
    name: "Smartwatch Económico con Monitor de Salud",
    description:
      "Reloj inteligente económico con pantalla a color, monitor de ritmo cardíaco, contador de pasos y notificaciones. Ideal para empezar en el mundo smartwatch.",
    category: "Tecnología",
    brand: "FitWatch",
    images: [IMG.smartwatch[1], IMG.smartwatch[0]],
    features: ["Pantalla a color", "Ritmo cardíaco", "Notificaciones", "5 días de batería", "Múltiples esferas"],
    specs: { Pantalla: "Color", Batería: "5 días", Resistencia: "IP67" },
    isViral: false,
    offers: [
      { store: "amazon", price: 49.9, originalPrice: 79.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.0, reviewCount: 1800 },
      { store: "temu", price: 24.9, originalPrice: 49.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 3.7, reviewCount: 3400 },
      { store: "falabella", price: 69.9, shippingTime: "3-5 días", shippingCost: 0, availability: "in_stock", rating: 3.9, reviewCount: 80 },
    ],
    ai: {
      score: 72,
      classification: "good",
      reasoning: "Opción económica decente. Temu es muy barato (S/24.9) pero reviews indican durabilidad limitada. Amazon es más seguro.",
      recommendation: "Si buscas lo más barato: Temu. Si quieres durabilidad: Amazon.",
      bestStore: "amazon",
      summary: "Smartwatch básico funcional. Cumple para uso ligero y principiantes.",
    },
  },
  // ===== TECLADOS Y MOUSE GAMER =====
  {
    name: "Teclado Mecánico Gaming RGB 60%",
    description:
      "Teclado mecánico compacto 60% con switches red, iluminación RGB y keycaps PBT. Hot-swappable para personalizar los switches sin soldar.",
    category: "Gaming",
    brand: "GameGear",
    images: IMG.keyboard,
    features: ["Switches mecánicos Red", "RGB personalizable", "Keycaps PBT", "Hot-swappable", "Formato 60% compacto"],
    specs: { Switches: "Red", Formato: "60%", Keycaps: "PBT", RGB: "Sí" },
    isViral: false,
    offers: [
      { store: "amazon", price: 139.9, originalPrice: 199.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.6, reviewCount: 1500 },
      { store: "temu", price: 79.9, originalPrice: 149.9, shippingTime: "10-18 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 920 },
      { store: "falabella", price: 179.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.4, reviewCount: 130 },
    ],
    ai: {
      score: 84,
      classification: "good",
      reasoning: "Teclado mecánico sólido con hot-swap. Amazon tiene el mejor rating y precio razonable. Temu ahorra S/60 pero con envío lento.",
      recommendation: "Amazon por calidad y rapidez. Temu si quieres ahorrar y no tienes prisa.",
      bestStore: "amazon",
      summary: "Teclado mecánico 60% con RGB y switches red. Excelente para gaming compacto.",
    },
  },
  {
    name: "Mouse Gamer RGB 7200 DPI 6 Botones",
    description:
      "Mouse gaming con sensor óptico de 7200 DPI, 6 botones programables, iluminación RGB y diseño ergonómico. Cable trenzado de 1.6m.",
    category: "Gaming",
    brand: "GameGear",
    images: IMG.mouse,
    features: ["7200 DPI", "6 botones programables", "RGB", "Diseño ergonómico", "Cable trenzado 1.6m"],
    specs: { DPI: "7200", Botones: "6", Cable: "1.6m trenzado" },
    isViral: false,
    offers: [
      { store: "amazon", price: 49.9, originalPrice: 79.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.4, reviewCount: 2600 },
      { store: "temu", price: 22.9, originalPrice: 49.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.0, reviewCount: 4100 },
      { store: "falabella", price: 69.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 90 },
    ],
    ai: {
      score: 80,
      classification: "good",
      reasoning: "Mouse gamer competente a buen precio. Temu es muy barato (S/22.9) y Amazon ofrece mejor garantía.",
      recommendation: "Mejor precio: Temu. Mejor garantía y envío: Amazon.",
      bestStore: "temu",
      summary: "Mouse gaming ergonómico con DPI ajustable. Buena relación precio-función.",
    },
  },
  // ===== CARGADORES Y ACCESORIOS USB-C =====
  {
    name: "Cargador USB-C GaN 65W Dual Port",
    description:
      "Cargador GaN de 65W con dos puertos USB-C. Carga laptops, tablets y teléfonos a velocidad máxima. Compacto y con protección contra sobrecalentamiento.",
    category: "Accesorios móviles",
    brand: "PowerUp",
    images: IMG.charger,
    features: ["65W GaN", "2 puertos USB-C", "Carga rápida PD", "Compacto", "Protección térmica"],
    specs: { Potencia: "65W", Puertos: "2x USB-C", Tecnología: "GaN" },
    isViral: false,
    offers: [
      { store: "amazon", price: 79.9, originalPrice: 119.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.7, reviewCount: 3400 },
      { store: "temu", price: 39.9, originalPrice: 79.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 1200 },
      { store: "falabella", price: 99.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.5, reviewCount: 60 },
    ],
    ai: {
      score: 89,
      classification: "excellent",
      reasoning: "Cargador GaN confiable con excelente rating en Amazon. Precio competitivo en Temu pero con envío lento. Amazon es la opción más segura para electrónica de carga.",
      recommendation: "Amazon por seguridad y rating. No arriesgues con cargadores sin certificación.",
      bestStore: "amazon",
      summary: "Cargador GaN 65W rápido y seguro. Uno de los mejores en su categoría.",
    },
  },
  {
    name: "Power Bank 20000mAh USB-C PD 22.5W",
    description:
      "Batería externa de 20000mAh con carga rápida 22.5W, dos puertos USB y un USB-C. Pantalla digital de batería. Carga 3 dispositivos a la vez.",
    category: "Accesorios móviles",
    brand: "PowerUp",
    images: IMG.powerbank,
    features: ["20000mAh", "Carga rápida 22.5W", "3 puertos", "Pantalla digital", "Carga simultánea 3 dispositivos"],
    specs: { Capacidad: "20000mAh", "Carga rápida": "22.5W", Puertos: "3" },
    isViral: true,
    offers: [
      { store: "amazon", price: 89.9, originalPrice: 139.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.5, reviewCount: 5200 },
      { store: "temu", price: 49.9, originalPrice: 99.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.0, reviewCount: 2800 },
      { store: "falabella", price: 109.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.3, reviewCount: 140 },
    ],
    ai: {
      score: 87,
      classification: "excellent",
      reasoning: "Power bank de alta capacidad con buena marca. Amazon tiene el mejor rating y envío rápido. Temu es más barato pero revisa certificación.",
      recommendation: "Amazon por confiabilidad. Temu si buscas ahorrar y no te urge.",
      bestStore: "amazon",
      summary: "Batería externa potente de 20000mAh. Ideal para viajes y uso intenso.",
    },
  },
  // ===== TABLETS ECONÓMICAS =====
  {
    name: 'Tablet Android 10" 4GB RAM 64GB',
    description:
      'Tablet de 10 pulgadas con Android 13, 4GB RAM y 64GB ampliables. Pantalla HD, batería de 6000mAh y cámara dual. Ideal para estudio y entretenimiento.',
    category: "Tecnología",
    brand: "TabLite",
    images: IMG.tablet,
    features: ["Pantalla 10\" HD", "4GB RAM", "64GB ampliable", "Android 13", "Batería 6000mAh"],
    specs: { Pantalla: "10\" HD", RAM: "4GB", Almacenamiento: "64GB", Batería: "6000mAh" },
    isViral: false,
    offers: [
      { store: "amazon", price: 329.9, originalPrice: 449.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 980 },
      { store: "temu", price: 259.9, originalPrice: 359.9, shippingTime: "12-20 días", shippingCost: 0, availability: "in_stock", rating: 3.8, reviewCount: 410 },
      { store: "falabella", price: 379.9, originalPrice: 499.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 70 },
    ],
    ai: {
      score: 74,
      classification: "good",
      reasoning: "Tablet básica para estudio y entretenimiento. Amazon ofrece buen balance. Falabella es caro. Temu es más barato pero envío muy lento para tablet.",
      recommendation: "Amazon por garantía y envío. Evita Falabella por precio alto.",
      bestStore: "amazon",
      summary: "Tablet económica decente para uso ligero. Cumple para streaming y estudio básico.",
    },
  },
  // ===== GADGETS VIRALES DE TEMU =====
  {
    name: "Ventilador Mini Portátil Recargable 3 Velocidades",
    description:
      "Mini ventilador portátil recargable por USB con 3 velocidades. Silencioso, ligero y con clip para escritorio. Ideal para calor de verano en cualquier lugar.",
    category: "Gadgets virales",
    brand: "ViralGear",
    images: IMG.fan,
    features: ["3 velocidades", "Recargable USB", "Silencioso", "Clip para escritorio", "Portátil"],
    specs: { Velocidades: "3", Carga: "USB", Tipo: "Portátil" },
    isViral: true,
    offers: [
      { store: "amazon", price: 29.9, originalPrice: 49.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.1, reviewCount: 620 },
      { store: "temu", price: 12.9, originalPrice: 29.9, shippingTime: "8-15 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 8900 },
      { store: "falabella", price: 39.9, shippingTime: "3-5 días", shippingCost: 0, availability: "out_of_stock", rating: 3.9, reviewCount: 25 },
    ],
    ai: {
      score: 76,
      classification: "good",
      reasoning: "Gadget viral barato y útil. Temu tiene el mejor precio (S/12.9) y buenas reviews. Amazon es opción si necesitas envío rápido.",
      recommendation: "Temu es la mejor opción por precio y reviews. Amazon si tienes prisa.",
      bestStore: "temu",
      summary: "Mini ventilador viral práctico y económico. Perfecto para el verano.",
    },
  },
  {
    name: "Audífonos Gaming con Micrófono RGB",
    description:
      "Audífonos gaming over-ear con micrófono con cancelación de ruido, sonido surround 7.1 y luces RGB. Almohadillas cómodas para largas sesiones.",
    category: "Gaming",
    brand: "GameGear",
    images: [IMG.headphones[1], IMG.earbuds[0]],
    features: ["Sonido surround 7.1", "Micrófono con cancelación", "RGB", "Almohadillas cómodas", "Compatible PC/PS4/PS5"],
    specs: { Sonido: "7.1 Surround", Micrófono: "Sí", RGB: "Sí" },
    isViral: true,
    offers: [
      { store: "amazon", price: 99.9, originalPrice: 149.9, shippingTime: "1-2 días", shippingCost: 0, availability: "in_stock", rating: 4.3, reviewCount: 2400 },
      { store: "temu", price: 49.9, originalPrice: 99.9, shippingTime: "10-18 días", shippingCost: 0, availability: "in_stock", rating: 3.9, reviewCount: 1600 },
      { store: "falabella", price: 129.9, shippingTime: "2-4 días", shippingCost: 0, availability: "in_stock", rating: 4.2, reviewCount: 110 },
    ],
    ai: {
      score: 81,
      classification: "good",
      reasoning: "Audífonos gaming completos con surround y micrófono. Amazon ofrece mejor calidad percibida. Temu ahorra pero reviews indican sonido plano.",
      recommendation: "Amazon para gaming serio. Temu para uso casual.",
      bestStore: "amazon",
      summary: "Audífonos gaming con RGB y surround 7.1. Buenos para su precio.",
    },
  },
];

async function main() {
  console.log("Limpiando base de datos...");
  await db.click.deleteMany();
  await db.aiScore.deleteMany();
  await db.offer.deleteMany();
  await db.product.deleteMany();
  await db.homeSection.deleteMany();
  await db.affiliateLink.deleteMany();
  await db.aiSetting.deleteMany();

  console.log("Insertando productos...");
  for (const p of products) {
    const product = await db.product.create({
      data: {
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand,
        images: JSON.stringify(p.images),
        features: JSON.stringify(p.features),
        specs: JSON.stringify(p.specs),
        isViral: p.isViral,
        isActive: true,
      },
    });

    for (const o of p.offers) {
      await db.offer.create({
        data: {
          productId: product.id,
          store: o.store,
          price: o.price,
          originalPrice: o.originalPrice ?? null,
          affiliateLink: `https://${o.store}.com/s?k=${encodeURIComponent(p.name)}`,
          shippingTime: o.shippingTime,
          shippingCost: o.shippingCost,
          availability: o.availability,
          rating: o.rating ?? null,
          reviewCount: o.reviewCount ?? 0,
          updatedAt: new Date(),
        },
      });
    }

    await db.aiScore.create({
      data: {
        productId: product.id,
        score: p.ai.score,
        classification: p.ai.classification,
        reasoning: p.ai.reasoning,
        recommendation: p.ai.recommendation,
        bestStore: p.ai.bestStore,
        summary: p.ai.summary,
      },
    });

    console.log(`  + ${p.name}`);
  }

  console.log("Insertando secciones de home...");
  const sections = [
    { type: "hero", title: "Encuentra la mejor oferta antes de comprar", subtitle: "Comparamos precios y te decimos qué conviene", order: 0, config: JSON.stringify({}) },
    { type: "offers", title: "Ofertas destacadas", subtitle: "Las mejores ofertas del momento, analizadas por IA", order: 1, config: JSON.stringify({ limit: 8 }) },
    { type: "categories", title: "Categorías", subtitle: "Explora por categoría", order: 2, config: JSON.stringify({}) },
    { type: "ai_recommendations", title: "Recomendados por IA", subtitle: "Productos rankeados automáticamente por score", order: 3, config: JSON.stringify({ limit: 6 }) },
    { type: "comparator", title: "Comparador", subtitle: "Compara productos lado a lado", order: 4, config: JSON.stringify({}) },
  ];
  for (const s of sections) {
    await db.homeSection.create({
      data: { type: s.type, title: s.title, subtitle: s.subtitle, order: s.order, isActive: true, config: s.config },
    });
  }

  console.log("Insertando afiliados...");
  const affiliates = [
    { store: "amazon", baseUrl: "https://www.amazon.com/s", tagParam: "tag", tagValue: "blackbox-21" },
    { store: "temu", baseUrl: "https://www.temu.com/search", tagParam: "ref", tagValue: "blackbox" },
    { store: "falabella", baseUrl: "https://www.falabella.com.pe/falabella-pe/search", tagParam: "ref", tagValue: "blackbox" },
  ];
  for (const a of affiliates) {
    await db.affiliateLink.create({ data: { store: a.store, baseUrl: a.baseUrl, tagParam: a.tagParam, tagValue: a.tagValue, isActive: true } });
  }

  console.log("Insertando configuracion de IA...");
  const settings = [
    { key: "ai_tone", value: "simple" },
    { key: "ai_enabled", value: "true" },
    { key: "ai_model", value: "z-ai" },
    { key: "scrape_freshness_hours", value: "24" },
  ];
  for (const s of settings) {
    await db.aiSetting.create({ data: { key: s.key, value: s.value } });
  }

  console.log("Seed completo!");
  console.log(`  Productos: ${products.length}`);
  console.log(`  Ofertas: ${products.length * 3}`);
  console.log(`  AI scores: ${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
