// Kenya-first Artbook marketplace data

export type TrustScore = number; // 0-5 rating

export type Seller = {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  trustScore: TrustScore;
  location: string;
};

export type MarketplaceListing = {
  id: string;
  image: string;
  title: string;
  price: string;
  seller: Seller;
  category: string;
  rating?: number;
};

export type Post = {
  id: string;
  author: Seller & { isBusiness: boolean };
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  type: "business" | "creator";
};

export type Booking = {
  id: string;
  service: string;
  provider: Seller;
  date: string;
  time: string;
  location: string;
  status: "booked" | "confirmed" | "in_progress" | "proof_submitted" | "approved" | "complete";
  amount: string;
};

export type Message = {
  id: string;
  participant: Seller;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: "orders" | "bookings" | "support" | "business";
  badge: string;
};

export const sellers: Seller[] = [
  {
    id: "amani-studio",
    name: "Amani Studio",
    verified: true,
    trustScore: 4.9,
    location: "Kilimani, Nairobi"
  },
  {
    id: "david-kariuki",
    name: "David Kariuki",
    verified: true,
    trustScore: 4.7,
    location: "Kilimani, Nairobi"
  },
  {
    id: "fresh-harvest",
    name: "Fresh Harvest Kilimani",
    verified: true,
    trustScore: 4.8,
    location: "Westlands, Nairobi"
  },
  {
    id: "sarah-mwangi",
    name: "Sarah Mwangi",
    verified: false,
    trustScore: 4.6,
    location: "Nairobi CBD"
  }
];

export const marketplaceListings: MarketplaceListing[] = [
  {
    id: "art-prints",
    image: "/images/art-print.jpg",
    title: "African Art Print Collection",
    price: "KES 4,500",
    seller: sellers[0],
    category: "Products",
    rating: 4.9
  },
  {
    id: "produce-box",
    image: "/images/produce.jpg",
    title: "Fresh Organic Produce Box",
    price: "KES 1,200/week",
    seller: sellers[2],
    category: "Products",
    rating: 4.8
  },
  {
    id: "photography",
    image: "/images/photography.jpg",
    title: "Professional Photography Session",
    price: "KES 8,000",
    seller: sellers[1],
    category: "Services",
    rating: 4.9
  },
  {
    id: "tailoring",
    image: "/images/tailoring.jpg",
    title: "Custom Tailoring & Alterations",
    price: "KES 2,500+",
    seller: sellers[3],
    category: "Services",
    rating: 4.7
  }
];

export const posts: Post[] = [
  {
    id: "post-1",
    author: { ...sellers[0], isBusiness: true },
    timestamp: "2h ago",
    content: "New collection dropping this weekend! Handcrafted ceramic pieces inspired by coastal Kenya. Limited edition of 20 pieces.",
    image: "/images/ceramics.jpg",
    likes: 124,
    comments: 18,
    type: "business"
  },
  {
    id: "post-2",
    author: { ...sellers[1], isBusiness: false },
    timestamp: "4h ago",
    content: "Just finished a portrait session at Karura Forest. The golden hour light was perfect. Booking slots for next week!",
    image: "/images/portrait.jpg",
    likes: 89,
    comments: 12,
    type: "creator"
  }
];

export const messages: Message[] = [
  {
    id: "msg-1",
    participant: sellers[0],
    lastMessage: "Perfect! See you on Saturday at 10am.",
    timestamp: "2h ago",
    unread: 2,
    type: "bookings",
    badge: "Booking Confirmed"
  },
  {
    id: "msg-2",
    participant: sellers[1],
    lastMessage: "Can I get the large size in this print?",
    timestamp: "4h ago",
    unread: 0,
    type: "orders",
    badge: "Order Inquiry"
  }
];

export const stats = {
  todaysBookings: 3,
  pendingReviews: 2,
  walletBalance: "KES 45,280",
  todaysSales: "KES 12,400",
  activeBookings: 5,
  pendingOrders: 3
};
