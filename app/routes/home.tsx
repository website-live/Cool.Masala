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
      const saved = JSON.parse(localStorage.getItem("cool-masala-cart") ?? "[]") as CartLine[];
      if (Array.isArray(saved)) setCart(saved.filter((line) => line.quantity > 0));
    } catch {
      setCart([]);
    }
    setCartHydrated(true);
  }, []);

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
    <div className="min-h-svh bg-[#f1f3f6] text-[#212121]">
      <header className="sticky top-0 z-30 bg-[#2874f0] text-white shadow-md">
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
      </header>

      <main id="top">
        <section id="categories" className="border-b border-[#e0e0e0] bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1280px] justify-between gap-3 overflow-x-auto px-4 py-4 sm:px-6 md:justify-center md:gap-8 lg:gap-12">
            {categories.map((category) => <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={`group flex min-w-[78px] flex-col items-center gap-2 text-center text-xs font-semibold transition-colors ${activeCategory === category.name ? "text-[#2874f0]" : "text-[#212121] hover:text-[#2874f0]"}`}><span className={`grid size-12 place-items-center rounded-full border text-2xl transition-all ${activeCategory === category.name ? "border-[#2874f0] bg-[#e8f0fe]" : "border-[#e0e0e0] bg-[#fafafa] group-hover:border-[#2874f0]"}`}>{category.icon}</span><span className="whitespace-nowrap">{category.name}</span></button>)}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-3 py-3 sm:px-6 sm:py-5">
          <div className="relative flex min-h-[250px] items-center overflow-hidden rounded-sm bg-[#172b6b] px-6 py-10 text-white shadow-sm sm:min-h-[300px] sm:px-12 lg:min-h-[340px] lg:px-20">
            <div className="absolute right-[-5%] top-[-35%] size-[480px] rounded-full bg-[#2874f0] opacity-70" /><div className="absolute right-[20%] bottom-[-60%] size-[400px] rounded-full border-[70px] border-[#ffe500]/20" />
            <div className="relative z-10 max-w-xl"><Badge className="mb-4 rounded-sm border-0 bg-[#ffe500] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#212121] hover:bg-[#ffe500]"><Flame className="mr-1 size-3" /> Masala + streetwear deals</Badge><h1 className="font-display text-4xl font-bold leading-[0.98] tracking-[-0.06em] sm:text-6xl">Turn up the <span className="text-[#ffe500]">flavour.</span></h1><p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base">Premium Indian masalas and bold printed t-shirts at everyday-low prices. Every eligible t-shirt order comes with a free mini masala gift.</p><Button onClick={() => { setActiveCategory("All Products"); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-6 h-11 rounded-sm bg-[#ffe500] px-6 font-bold text-[#212121] hover:bg-[#ffed4d]">Shop the collection <ArrowRight className="ml-2 size-4" /></Button></div>
            <div className="absolute right-[4%] hidden w-[42%] max-w-[500px] rotate-[-3deg] md:block"><div className="relative overflow-hidden rounded-[52%_48%_48%_52%/48%_48%_52%_52%] border-8 border-white/10 shadow-2xl"><img className="aspect-[1.2] w-full object-cover" src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=90" alt="Colourful Indian spices" /></div><div className="absolute -bottom-3 -left-6 rounded-sm bg-[#ffe500] px-4 py-2 text-sm font-bold text-[#212121] shadow-lg">Up to 30% off</div></div>
          </div>
        </section>

        <section id="products" className="mx-auto flex max-w-[1280px] scroll-mt-20 gap-3 px-3 pb-10 sm:px-6">
          <aside className="hidden w-[230px] shrink-0 bg-white shadow-sm md:block"><div className="border-b border-[#e0e0e0] px-5 py-4"><div className="flex items-center gap-2 text-lg font-semibold"><Filter className="size-4 text-[#2874f0]" /> Filters</div></div><div className="border-b border-[#e0e0e0] px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Shop category</p><div className="space-y-3">{categories.slice(1).map((category) => <button key={category.name} type="button" onClick={() => setActiveCategory(activeCategory === category.name ? "All Products" : category.name)} className={`flex w-full items-center gap-2 text-left text-sm ${activeCategory === category.name ? "font-semibold text-[#2874f0]" : "text-[#555]"}`}><span className={`grid size-4 place-items-center rounded-[2px] border text-[10px] ${activeCategory === category.name ? "border-[#2874f0] bg-[#2874f0] text-white" : "border-[#c2c2c2]"}`}>{activeCategory === category.name ? "✓" : ""}</span>{category.name}</button>)}</div></div><div className="border-b border-[#e0e0e0] px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Price range</p><div className="h-1 rounded-full bg-[#d7e3fc]"><div className="h-1 w-[72%] rounded-full bg-[#2874f0]" /></div><div className="mt-3 flex justify-between text-xs text-[#555]"><span>₹99</span><span>₹699</span></div></div><div className="px-5 py-5"><p className="mb-3 text-xs font-bold uppercase text-[#878787]">Offers</p><p className="text-sm text-[#555]">Discounted products</p><p className="mt-2 text-sm text-[#555]">Free gift with t-shirts</p></div></aside>

          <div className="min-w-0 flex-1 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-[#e0e0e0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold">{activeCategory}</h2><span className="text-sm text-[#878787]">({filteredProducts.length} items)</span></div><p className="mt-1 text-xs text-[#878787]">Masalas, streetwear and flavour-filled gifts</p></div><div className="flex items-center gap-2"><span className="hidden text-sm text-[#878787] sm:inline">Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-sm border border-[#e0e0e0] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2874f0]"><option>Popular</option><option>Price: Low to High</option><option>Price: High to Low</option></select></div></div>
            {filteredProducts.length === 0 ? <div className="px-6 py-20 text-center"><p className="text-xl font-semibold">No products found</p><p className="mt-2 text-sm text-[#878787]">Try another search or clear your filters.</p><Button onClick={() => { setQuery(""); setActiveCategory("All Products"); }} className="mt-5 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]">View all products</Button></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => <article key={product.id} className="group relative border-b border-r border-[#f0f0f0] p-4 transition-shadow hover:z-10 hover:shadow-[0_3px_12px_rgba(0,0,0,.12)] sm:p-5"><button type="button" onClick={() => toggleWishlist(product.id)} className={`absolute right-5 top-5 z-10 grid size-8 place-items-center rounded-full bg-white shadow-sm ${wishlisted.includes(product.id) ? "text-[#e53935]" : "text-[#878787]"}`} aria-label={`${wishlisted.includes(product.id) ? "Remove" : "Add"} ${product.name} ${wishlisted.includes(product.id) ? "from" : "to"} wishlist`}><Heart className={`size-4 ${wishlisted.includes(product.id) ? "fill-current" : ""}`} /></button><div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#f9f9f9] p-6"><img className="h-full w-full object-cover mix-blend-multiply transition duration-300 group-hover:scale-105" src={product.image} alt={product.name} loading="lazy" />{(product.stock === 0 || product.badge) && <span className={`absolute left-2 top-2 px-2 py-1 text-[10px] font-semibold text-white ${product.stock === 0 ? "bg-[#d32f2f]" : "bg-[#388e3c]"}`}>{product.stock === 0 ? "Out of stock" : product.badge}</span>}</div><div className="pt-4"><h3 className="truncate text-base font-medium text-[#212121]" title={product.name}>{product.name}</h3><p className="mt-1 truncate text-xs text-[#878787]">{product.description}</p><div className="mt-2 flex items-center gap-1"><span className="inline-flex items-center gap-0.5 rounded-sm bg-[#388e3c] px-1.5 py-0.5 text-xs font-bold text-white">{product.rating} <Star className="size-3 fill-current" /></span><span className="text-xs text-[#878787]">{product.reviews.toLocaleString("en-IN")} ratings</span></div><div className="mt-3 flex items-baseline gap-2"><span className="text-lg font-semibold">{formatPrice(product.price)}</span><span className="text-xs text-[#878787] line-through">{formatPrice(product.mrp)}</span><span className="text-xs font-semibold text-[#388e3c]">{discountPercent(product)}% off</span></div><Button onClick={() => addToCart(product)} disabled={product.stock === 0} className={`mt-4 h-9 w-full rounded-sm text-sm font-semibold text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 ${product.stock === 0 ? "bg-[#bdbdbd] hover:bg-[#bdbdbd]" : "bg-[#ff9f00] hover:bg-[#f39200]"}`}><ShoppingCart className="mr-2 size-4" /> {product.stock === 0 ? "Out of stock" : "Add to cart"}</Button></div></article>)}</div>}
          </div>
        </section>

        <section id="why" className="border-t border-[#e0e0e0] bg-white"><div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#2874f0]">Why shop Cool Masala?</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Flavour for your pantry. Style for your wardrobe.</h2></div><p className="max-w-md text-sm leading-6 text-[#878787]">Shop carefully sourced spices and fun printed apparel in one place, with a little extra flavour packed into every eligible tee order.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">✦</span><h3 className="mt-4 font-semibold">Small-batch freshness</h3><p className="mt-2 text-sm leading-6 text-[#878787]">Our blends are packed close to your order so the aroma reaches you intact.</p></div><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">♨</span><h3 className="mt-4 font-semibold">Honest ingredients</h3><p className="mt-2 text-sm leading-6 text-[#878787]">No fillers, artificial colours, or mystery powders. Just the good stuff.</p></div><div className="border border-[#e0e0e0] p-5"><span className="text-3xl">☼</span><h3 className="mt-4 font-semibold">Made for Indian food</h3><p className="mt-2 text-sm leading-6 text-[#878787]">From tadka to biryani, each masala is blended for real home cooking.</p></div></div></div></section>
      </main>

      <footer className="bg-[#172b6b] px-5 py-8 text-sm text-white/75 sm:px-8"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-display text-xl font-bold italic text-white">cool<span className="text-[#ffe500]">.</span>masala</p><p className="mt-1 text-xs">Masalas, tees and all the flavour.</p></div><p className="text-xs">© 2024 Cool Masala · Flavour and streetwear across India</p><div className="flex gap-5 text-xs"><a href="#top" className="hover:text-white">Back to top</a><a href="#why" className="hover:text-white">About us</a></div></div></footer>

      {cartOpen && <div className="fixed inset-0 z-50"><button type="button" aria-label="Close cart" className="absolute inset-0 cursor-default bg-black/40" onClick={() => setCartOpen(false)} /><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#e0e0e0] bg-[#2874f0] px-5 py-4 text-white"><div><p className="text-xs font-semibold uppercase tracking-wider text-white/75">Cool Masala cart</p><h2 className="text-xl font-semibold">Your basket</h2></div><Button onClick={() => setCartOpen(false)} variant="ghost" className="size-9 rounded-sm p-0 text-white hover:bg-white/10" aria-label="Close cart"><X className="size-5" /></Button></div>{cart.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><ShoppingCart className="size-12 text-[#c2c2c2]" /><h3 className="mt-4 text-xl font-semibold">Your cart is empty</h3><p className="mt-2 text-sm leading-6 text-[#878787]">Add masalas or a printed tee to start your order.</p><Button onClick={() => setCartOpen(false)} className="mt-5 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]">Browse products</Button></div> : <><div className="flex-1 space-y-4 overflow-y-auto bg-[#f1f3f6] p-4">{cart.map((line) => <div key={line.product.id} className="flex gap-3 bg-white p-3 shadow-sm"><img className="size-20 object-cover" src={line.product.image} alt="" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-semibold">{line.product.name}</p><p className="shrink-0 text-sm font-semibold">{formatPrice(line.product.price * line.quantity)}</p></div><p className="mt-1 text-xs text-[#878787]">{formatPrice(line.product.price)} each</p><div className="mt-3 inline-flex items-center border border-[#e0e0e0]"><button type="button" onClick={() => changeQuantity(line.product.id, -1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Remove one ${line.product.name}`}><Minus className="size-3" /></button><span className="w-7 text-center text-xs font-bold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.product.id, 1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Add one ${line.product.name}`}><Plus className="size-3" /></button></div></div></div>)}{includesTShirt && <div className="flex items-start gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-xs font-semibold text-[#2e7d32]"><Gift className="mt-0.5 size-4 shrink-0" /> Free mini masala gift will be included with your printed t-shirt order.</div>}</div><div className="border-t border-[#e0e0e0] px-5 py-5"><div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatPrice(cartTotal)}</span></div><Button asChild className="mt-4 h-11 w-full rounded-sm bg-[#fb641b] font-semibold text-white hover:bg-[#e85a16]"><Link to="/checkout">Proceed to checkout <ChevronRight className="ml-1 size-4" /></Link></Button><p className="mt-3 text-center text-[11px] text-[#878787]">Secure checkout · Delivery calculated at checkout</p></div></>}</aside></div>}
    </div>
  );
}
