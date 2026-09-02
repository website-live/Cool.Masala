import { useEffect, useMemo, useState } from "react";
import { Link, useLoaderData } from "react-router";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import CircleUserRound from "lucide-react/dist/esm/icons/circle-user-round.js";
import Filter from "lucide-react/dist/esm/icons/filter.js";
import Flame from "lucide-react/dist/esm/icons/flame.js";
import Heart from "lucide-react/dist/esm/icons/heart.js";
import Menu from "lucide-react/dist/esm/icons/menu.js";
import Minus from "lucide-react/dist/esm/icons/minus.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Star from "lucide-react/dist/esm/icons/star.js";
import Gift from "lucide-react/dist/esm/icons/gift.js";
import X from "lucide-react/dist/esm/icons/x.js";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/home";

type Category = "All Products" | "Masalas" | "Blended Masala" | "Whole Spices" | "Chilli Powders" | "Turmeric" | "Gift Packs" | "Printed T-Shirts";

type Product = {
  id: number;
  name: string;
  description: string;
  category: Exclude<Category, "All Products" | "Masalas">;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string | null;
  stock?: number;
  active?: number;
  updatedAt?: string;
};

type CartLine = { product: Product; quantity: number };

type StoredCartLine = {
  productId?: unknown;
  quantity?: unknown;
  product?: Partial<Product>;
  id?: unknown;
  name?: unknown;
  category?: unknown;
  description?: unknown;
  price?: unknown;
  mrp?: unknown;
  rating?: unknown;
  reviews?: unknown;
  image?: unknown;
  badge?: unknown;
};

function normalizeStoredCart(raw: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as StoredCartLine;
    const nestedProduct = value.product && typeof value.product === "object" ? value.product : value;
    const productId = Number(value.productId ?? nestedProduct.id);
    const quantity = Number(value.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) return [];
    const product = products.find((candidate) => candidate.id === productId);
    return product ? [{ product, quantity: Math.min(product.stock ?? Number.MAX_SAFE_INTEGER, quantity) }] : [];
  }).filter((line) => line.quantity > 0);
}

const categories: { name: Category; icon: string }[] = [
  { name: "All Products", icon: "✦" },
  { name: "Masalas", icon: "♨" },
  { name: "Printed T-Shirts", icon: "✺" },
  { name: "Blended Masala", icon: "◈" },
  { name: "Whole Spices", icon: "❋" },
  { name: "Chilli Powders", icon: "☼" },
  { name: "Gift Packs", icon: "▣" },
];

const seedProducts: Product[] = [
  {
    id: 1,
    name: "Royal Garam Masala",
    description: "Aromatic house blend · 100 g",
    category: "Blended Masala",
    price: 149,
    mrp: 179,
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85",
    badge: "Bestseller",
  },
  {
    id: 2,
    name: "Kashmiri Lal Mirch",
    description: "Vibrant colour, gentle heat · 100 g",
    category: "Chilli Powders",
    price: 129,
    mrp: 159,
    rating: 4.8,
    reviews: 94,
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=900&q=85",
    badge: "New arrival",
  },
  {
    id: 3,
    name: "Green Cardamom",
    description: "Handpicked whole pods · 50 g",
    category: "Whole Spices",
    price: 249,
    mrp: 299,
    rating: 5,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Haldi Sunshine",
    description: "Single-origin turmeric · 100 g",
    category: "Turmeric",
    price: 99,
    mrp: 125,
    rating: 4.9,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=85",
    badge: "Daily essential",
  },
  {
    id: 5,
    name: "The Tadka Gift Pack",
    description: "Six pantry masalas · 6 × 50 g",
    category: "Gift Packs",
    price: 599,
    mrp: 699,
    rating: 4.9,
    reviews: 42,
    image: "https://images.unsplash.com/photo-1599909533730-f9d3802a7f30?auto=format&fit=crop&w=900&q=85",
    badge: "Gift favourite",
  },
  {
    id: 6,
    name: "Black Peppercorns",
    description: "Bold Malabar pepper · 100 g",
    category: "Whole Spices",
    price: 179,
    mrp: 219,
    rating: 4.8,
    reviews: 73,
    image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    name: "Chaat Masala Zing",
    description: "Tangy street-style blend · 100 g",
    category: "Blended Masala",
    price: 119,
    mrp: 145,
    rating: 4.7,
    reviews: 86,
    image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85",
    badge: "Popular",
  },
  {
    id: 8,
    name: "Cumin Seeds",
    description: "Earthy whole jeera · 100 g",
    category: "Whole Spices",
    price: 109,
    mrp: 135,
    rating: 4.8,
    reviews: 61,
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=85",
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const namespace = context.cloudflare.env.ITEMS;
  const store = namespace.get(namespace.idFromName("default"));
  const [products, settings] = await Promise.all([store.listProducts(), store.getSettings()]);
  return { products, settings };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cool Masala — Masalas, Printed T-Shirts & Free Gifts" },
    { name: "description", content: "Shop premium Indian masalas and fun printed t-shirts at Cool Masala. Every eligible t-shirt order comes with a free mini masala gift." },
  ];
}

function formatPrice(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function discountPercent(product: Product) {
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

export default function Home() {
  const { products, settings } = useLoaderData<typeof loader>();
  const [activeCategory, setActiveCategory] = useState<Category>("All Products");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Popular");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState<number[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cool-masala-cart") ?? "[]") as unknown;
      setCart(normalizeStoredCart(saved, products));
    } catch {
      setCart([]);
    }
    setCartHydrated(true);
  }, [products]);

  useEffect(() => {
    if (cartHydrated) {
      localStorage.setItem(
        "cool-masala-cart",
        JSON.stringify(cart.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          category: product.category,
          image: product.image,
          price: product.price,
          quantity,
        }))),
      );
    }
  }, [cart, cartHydrated]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const masalaCategories: Category[] = ["Blended Masala", "Whole Spices", "Chilli Powders", "Turmeric", "Gift Packs"];
      const matchesCategory = activeCategory === "All Products" || (activeCategory === "Masalas" ? masalaCategories.includes(product.category) : product.category === activeCategory);
      const matchesQuery = !normalizedQuery || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
    return [...filtered].sort((a, b) => sort === "Price: Low to High" ? a.price - b.price : sort === "Price: High to Low" ? b.price - a.price : b.rating - a.rating);
  }, [activeCategory, query, sort]);

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cart.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const cartShipping = cartTotal === 0 || cartTotal >= 499 ? 0 : 49;
  const cartGrandTotal = cartTotal + cartShipping;
  const includesTShirt = cart.some((line) => line.product.category === "Printed T-Shirts");

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        const maxStock = product.stock ?? Number.MAX_SAFE_INTEGER;
        return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(maxStock, line.quantity + 1) } : line);
      }
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function changeQuantity(productId: number, amount: number) {
    setCart((current) => current.map((line) => line.product.id === productId ? { ...line, quantity: Math.min(line.product.stock ?? Number.MAX_SAFE_INTEGER, Math.max(0, line.quantity + amount)) } : line).filter((line) => line.quantity > 0));
  }

  function toggleWishlist(productId: number) {
    setWishlisted((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  return (
    <div className="storefront min-h-svh bg-[#fbfbf5] text-black">
      <header className="storefront-header sticky top-0 z-[1000] bg-black text-white shadow-md">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <a href="#top" className="shrink-0 leading-none" aria-label={`${settings.storeName} home`}>
            <span className="font-display text-[22px] font-bold italic tracking-[-0.08em]">cool<span className="text-[#ffe500]">.</span>masala</span>
            <span className="hidden pl-1 text-[10px] font-medium text-white/80 sm:block">{settings.announcement || "Fresh flavour, delivered"}</span>
          </a>
          <label className="relative flex min-w-0 flex-1 max-w-[650px]" aria-label="Search masalas and t-shirts">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search masalas, t-shirts and more" className="h-10 w-full rounded-sm border-0 bg-white pl-4 pr-11 text-sm text-[#212121] shadow-sm placeholder:text-[#878787] focus-visible:ring-2 focus-visible:ring-[#ffe500]" />
            <Search className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#2874f0]" />
          </label>
          <Link to="/admin" className="hidden items-center gap-1 text-sm font-semibold hover:text-[#ffe500] lg:flex"><CircleUserRound className="size-5" /><span>Admin</span></Link>
          <a href="#products" className="hidden text-sm font-semibold xl:block">Shop <ChevronDown className="ml-1 inline size-3" /></a>
          <Button onClick={() => setCartOpen(true)} variant="ghost" className="relative size-10 shrink-0 rounded-sm p-0 text-white hover:bg-white/10" aria-label={`Open cart with ${cartCount} items`}><ShoppingCart className="size-5" />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ffe500] text-[10px] font-bold text-[#212121]">{cartCount}</span>}</Button>
          <Button onClick={() => setMobileNavOpen(!mobileNavOpen)} variant="ghost" className="size-10 shrink-0 rounded-sm p-0 text-white hover:bg-white/10 lg:hidden" aria-label="Toggle menu">{mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}</Button>
        </div>
        {mobileNavOpen && <div className="border-t border-white/20 px-5 py-4 lg:hidden"><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"><a href="#categories" onClick={() => setMobileNavOpen(false)}>Categories</a><a href="#products" onClick={() => setMobileNavOpen(false)}>Shop products</a><a href="#why" onClick={() => setMobileNavOpen(false)}>Why Cool Masala</a></div></div>}
        <nav id="categories" aria-label="Product categories" className="storefront-category-nav border-t border-white/15 bg-black">
          <div className="mx-auto flex max-w-[1280px] justify-start gap-1 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-6 md:justify-center">
            {categories.map((category) => <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors sm:px-4 ${activeCategory === category.name ? "bg-[#c1fbd4] text-black" : "text-white/85 hover:bg-white/10 hover:text-white"}`}><span aria-hidden="true" className={`grid size-6 place-items-center rounded-full text-sm leading-none ${activeCategory === category.name ? "bg-black/10" : "bg-white/10"}`}>{category.icon}</span><span>{category.name}</span></button>)}
          </div>
        </nav>
      </header>

      <main id="top">

        <section className="mx-auto max-w-[1280px] px-3 py-3 sm:px-6 sm:py-5">
          <div className="relative flex min-h-[250px] items-center overflow-hidden rounded-lg bg-black px-6 py-10 text-white shadow-sm sm:min-h-[300px] sm:px-12 lg:min-h-[340px] lg:px-20">
            <div className="absolute right-[-5%] top-[-35%] size-[480px] rounded-full bg-[#3f3f46] opacity-70" /><div className="absolute right-[20%] bottom-[-60%] size-[400px] rounded-full border-[70px] border-[#c1fbd4]/20" />
            <div className="relative z-10 max-w-xl"><Badge className="mb-4 rounded-full border-0 bg-[#c1fbd4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black hover:bg-[#c1fbd4]"><Flame className="mr-1 size-3" /> Masala + streetwear deals</Badge><h1 className="font-display text-4xl font-bold leading-[0.98] tracking-[-0.06em] sm:text-6xl">Turn up the <span className="text-[#c1fbd4]">flavour.</span></h1><p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base">Premium Indian masalas and bold printed t-shirts at everyday-low prices. Every eligible t-shirt order comes with a free mini masala gift.</p><Button onClick={() => { setActiveCategory("All Products"); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-6 h-11 rounded-full bg-[#c1fbd4] px-6 font-bold text-black hover:bg-[#d4f9e0]">Shop the collection <ArrowRight className="ml-2 size-4" /></Button></div>
            <div className="absolute right-[4%] hidden w-[42%] max-w-[500px] rotate-[-3deg] md:block"><div className="relative overflow-hidden rounded-[52%_48%_48%_52%/48%_48%_52%_52%] border-8 border-white/10 shadow-2xl"><img className="aspect-[1.2] w-full object-cover" src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=90" alt="Colourful Indian spices" /></div><div className="absolute -bottom-3 -left-6 rounded-full bg-[#c1fbd4] px-4 py-2 text-sm font-bold text-black shadow-lg">Up to 30% off</div></div>
          </div>
        </section>

        <section id="products" className="mx-auto flex max-w-[1280px] scroll-mt-20 gap-3 px-3 pb-10 sm:px-6">
          <aside className="hidden w-[230px] shrink-0 bg-white shadow-sm md:block"><div className="border-b border-[#e0e0e0] px-5 py-4"><div className="flex items-center gap-2 text-lg font-semibold"><Filter className="size-4 text-[#2874f0]" /> Filters</div></div><div className="border-b border-[#e0e0e0] px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Shop category</p><div className="space-y-3">{categories.slice(1).map((category) => <button key={category.name} type="button" onClick={() => setActiveCategory(activeCategory === category.name ? "All Products" : category.name)} className={`flex w-full items-center gap-2 text-left text-sm ${activeCategory === category.name ? "font-semibold text-[#2874f0]" : "text-[#555]"}`}><span className={`grid size-4 place-items-center rounded-[2px] border text-[10px] ${activeCategory === category.name ? "border-[#2874f0] bg-[#2874f0] text-white" : "border-[#c2c2c2]"}`}>{activeCategory === category.name ? "✓" : ""}</span>{category.name}</button>)}</div></div><div className="border-b border-[#e0e0e0] px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Price range</p><div className="h-1 rounded-full bg-[#d7e3fc]"><div className="h-1 w-[72%] rounded-full bg-[#2874f0]" /></div><div className="mt-3 flex justify-between text-xs text-[#555]"><span>₹99</span><span>₹699</span></div></div><div className="px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Offers</p><p className="text-sm text-[#555]">Discounted products</p><p className="mt-2 text-sm text-[#555]">Free gift with t-shirts</p></div></aside>

          <div className="min-w-0 flex-1 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-[#e0e0e0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold">{activeCategory}</h2><span className="text-sm text-[#878787]">({filteredProducts.length} items)</span></div><p className="mt-1 text-xs text-[#878787]">Masalas, streetwear and flavour-filled gifts</p></div><div className="flex items-center gap-2"><span className="hidden text-sm text-[#878787] sm:inline">Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-sm border border-[#e0e0e0] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2874f0]"><option>Popular</option><option>Price: Low to High</option><option>Price: High to Low</option></select></div></div>
            {filteredProducts.length === 0 ? <div className="px-6 py-20 text-center"><p className="text-xl font-semibold">No products found</p><p className="mt-2 text-sm text-[#878787]">Try another search or clear your filters.</p><Button onClick={() => { setQuery(""); setActiveCategory("All Products"); }} className="mt-5 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]">View all products</Button></div> : <div className="storefront-product-grid grid grid-cols-2 gap-3 p-3 sm:grid-cols-2 sm:gap-0 sm:p-0 lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map((product) => <article key={product.id} className="group relative flex h-full flex-col rounded-lg border border-[#e4e4e7] bg-white p-3 transition duration-200 hover:z-10 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,.10)] sm:rounded-none sm:border-b sm:border-l-0 sm:border-r sm:border-t-0 sm:p-5"><button type="button" onClick={() => toggleWishlist(product.id)} className={`absolute right-5 top-5 z-10 grid size-8 place-items-center rounded-full bg-white shadow-sm ${wishlisted.includes(product.id) ? "text-[#e53935]" : "text-[#878787]"}`} aria-label={`${wishlisted.includes(product.id) ? "Remove" : "Add"} ${product.name} ${wishlisted.includes(product.id) ? "from" : "to"} wishlist`}><Heart className={`size-4 ${wishlisted.includes(product.id) ? "fill-current" : ""}`} /></button><div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f9f9f9] p-6"><img className="h-full w-full object-cover mix-blend-multiply transition duration-300 group-hover:scale-105" src={product.image} alt={product.name} loading="lazy" />{(product.stock === 0 || product.badge) && <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold ${product.stock === 0 ? "bg-[#d4d4d8] text-black" : "bg-[#c1fbd4] text-black"}`}>{product.stock === 0 ? "Out of stock" : product.badge}</span>}</div><div className="pt-4"><h3 className="truncate text-base font-medium text-[#212121]" title={product.name}>{product.name}</h3><p className="mt-1 truncate text-xs text-[#878787]">{product.description}</p><div className="mt-2 flex items-center gap-1"><span className="inline-flex items-center gap-0.5 rounded-sm bg-[#388e3c] px-1.5 py-0.5 text-xs font-bold text-white">{product.rating} <Star className="size-3 fill-current" /></span><span className="text-xs text-[#878787]">{product.reviews.toLocaleString("en-IN")} ratings</span></div><div className="mt-3 flex items-baseline gap-2"><span className="text-lg font-semibold">{formatPrice(product.price)}</span><span className="text-xs text-[#878787] line-through">{formatPrice(product.mrp)}</span><span className="text-xs font-semibold text-[#388e3c]">{discountPercent(product)}% off</span></div><Button onClick={() => addToCart(product)} disabled={product.stock === 0} className={`mt-auto min-h-11 h-11 w-full rounded-full text-sm font-semibold text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 ${product.stock === 0 ? "bg-[#a1a1aa] hover:bg-[#a1a1aa]" : "bg-black hover:bg-[#3f3f46]"}`}><ShoppingCart className="mr-2 size-4" /> {product.stock === 0 ? "Out of stock" : "Add to cart"}</Button></div></article>)}</div>}
          </div>
        </section>

        <section id="why" className="border-t border-[#e0e0e0] bg-white"><div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#2874f0]">Why shop Cool Masala?</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Flavour for your pantry. Style for your wardrobe.</h2></div><p className="max-w-md text-sm leading-6 text-[#878787]">Shop carefully sourced spices and fun printed apparel in one place, with a little extra flavour packed into every eligible tee order.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">✦</span><h3 className="mt-4 font-semibold">Small-batch freshness</h3><p className="mt-2 text-sm leading-6 text-[#878787]">Our blends are packed close to your order so the aroma reaches you intact.</p></div><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">♨</span><h3 className="mt-4 font-semibold">Honest ingredients</h3><p className="mt-2 text-sm leading-6 text-[#878787]">No fillers, artificial colours, or mystery powders. Just the good stuff.</p></div><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">☼</span><h3 className="mt-4 font-semibold">Made for Indian food</h3><p className="mt-2 text-sm leading-6 text-[#878787]">From tadka to biryani, each masala is blended for real home cooking.</p></div></div></div></section>
      </main>

      <footer className="bg-black px-5 py-8 text-sm text-white/75 sm:px-8"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-display text-xl font-bold italic text-white">cool<span className="text-[#ffe500]">.</span>masala</p><p className="mt-1 text-xs">Masalas, tees and all the flavour.</p></div><p className="text-xs">© 2024 Cool Masala · Flavour and streetwear across India</p><div className="flex gap-5 text-xs"><a href="#top" className="hover:text-white">Back to top</a><a href="#why" className="hover:text-white">About us</a></div></div></footer>

      {cartOpen && <div className="fixed inset-0 z-50"><button type="button" aria-label="Close cart" className="absolute inset-0 cursor-default bg-black/40" onClick={() => setCartOpen(false)} /><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#e0e0e0] bg-[#2874f0] px-5 py-4 text-white"><div><p className="text-xs font-semibold uppercase tracking-wider text-white/75">Cool Masala cart</p><h2 className="text-xl font-semibold">Your basket</h2></div><Button onClick={() => setCartOpen(false)} variant="ghost" className="size-9 rounded-sm p-0 text-white hover:bg-white/10" aria-label="Close cart"><X className="size-5" /></Button></div>{cart.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><ShoppingCart className="size-12 text-[#c2c2c2]" /><h3 className="mt-4 text-xl font-semibold">Your cart is empty</h3><p className="mt-2 text-sm leading-6 text-[#878787]">Add masalas or a printed tee to start your order.</p><Button onClick={() => setCartOpen(false)} className="mt-5 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]">Browse products</Button></div> : <><div className="flex-1 space-y-4 overflow-y-auto bg-[#f1f3f6] p-4">{cart.map((line) => <div key={line.product.id} className="flex gap-3 bg-white p-3 shadow-sm"><img className="size-20 object-cover" src={line.product.image} alt="" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-semibold">{line.product.name}</p><p className="shrink-0 text-sm font-semibold">{formatPrice(line.product.price * line.quantity)}</p></div><p className="mt-1 text-xs text-[#878787]">{formatPrice(line.product.price)} each</p><div className="mt-3 inline-flex items-center border border-[#e0e0e0]"><button type="button" onClick={() => changeQuantity(line.product.id, -1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Remove one ${line.product.name}`}><Minus className="size-3" /></button><span className="w-7 text-center text-xs font-bold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.product.id, 1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Add one ${line.product.name}`}><Plus className="size-3" /></button></div></div></div>)}{includesTShirt && <div className="flex items-start gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-xs font-semibold text-[#2e7d32]"><Gift className="mt-0.5 size-4 shrink-0" /> Free mini masala gift will be included with your printed t-shirt order.</div>}</div><div className="border-t border-[#e4e4e7] px-5 py-5"><div className="mb-4 flex items-center gap-2 rounded-lg border border-[#bfe8cb] bg-[#c1fbd4] px-3 py-2 text-xs font-semibold text-black"><ShieldCheck className="size-4" /> Cash on Delivery available</div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#71717a]">Subtotal</span><span>{formatPrice(cartTotal)}</span></div><div className="flex justify-between"><span className="text-[#71717a]">Delivery</span><span className={cartShipping === 0 ? "font-semibold text-black" : ""}>{cartShipping === 0 ? "FREE" : formatPrice(cartShipping)}</span></div><div className="flex justify-between border-t border-[#e4e4e7] pt-3 text-lg font-bold"><span>Total payable</span><span>{formatPrice(cartGrandTotal)}</span></div></div><Button asChild className="mt-4 h-11 w-full rounded-full bg-black font-semibold text-white hover:bg-[#3f3f46]"><Link to="/checkout">Proceed to checkout <ChevronRight className="ml-1 size-4" /></Link></Button><p className="mt-3 text-center text-[11px] text-[#71717a]">Secure checkout · Free delivery over ₹499</p></div></>}</aside></div>}
    </div>
  );
}
