"use client";

import React from "react";
import type { Config, Data, Slot } from "@puckeditor/core";
import {
  ArrowRight,
  Star,
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  Tag,
  Quote,
  ChevronRight,
  Clock,
  Truck,
  Shield,
  RefreshCw,
  Search,
  User,
  LogIn,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/api/media-url";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { CountdownTimer } from "@/components/storefront/countdown-timer";
import type {
  StorePublic,
  ProductPublic,
  CategoryPublic,
  CollectionPublic,
} from "@/lib/types/storefront";
import type { StorefrontPageListItem } from "@/lib/api/storefront-client";
import { StorefrontAuthButton } from "@/components/storefront/auth-button";

/* ────────────────────────── dynamic data ──────────────────────────────── */

export interface StorefrontData {
  store: StorePublic;
  products: ProductPublic[];
  categories: CategoryPublic[];
  collections: CollectionPublic[];
  pages?: StorefrontPageListItem[];
}

/** Global context that every Puck component can consume. Injected via <Puck root>. */
let _sfData: StorefrontData | null = null;
let _puckLang: PuckEditorLang = "en";

export function setStorefrontData(data: StorefrontData) {
  _sfData = data;
}
export function getStorefrontData(): StorefrontData | null {
  return _sfData;
}

export function setPuckEditorLang(lang: PuckEditorLang) {
  _puckLang = lang;
}

/* ─────────────────── helper: price formatter ─────────────────────────── */

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    price
  );
}

function isHexColor(value?: string | null) {
  return !!value && /^#([0-9a-fA-F]{6})$/.test(value);
}

function withAlpha(color: string, alpha: string) {
  return isHexColor(color) ? `${color}${alpha}` : color;
}

function resolveStoreHref(slug: string, href: string) {
  if (!href) return `/store/${slug}`;
  if (!href.startsWith("/")) return href;
  if (href === "/collections") return `/store/${slug}/collections`;
  if (href === "/categories") return `/store/${slug}/categories`;
  return `/store/${slug}${href}`;
}

function normalizeOptionalColor(value: string | undefined, fallback: string): string {
  return isHexColor(value) ? value! : fallback;
}

function resolveSectionPadding(size: "sm" | "md" | "lg") {
  if (size === "sm") return "py-10";
  if (size === "lg") return "py-24";
  return "py-16";
}

type FontSizeScale = "xs" | "sm" | "md" | "lg" | "xl";
type FontWeightScale = "regular" | "medium" | "semibold" | "bold";
type RadiusScale = "none" | "sm" | "md" | "lg" | "xl" | "full";
type ShadowScale = "none" | "sm" | "md" | "lg";
type ButtonSizeScale = "sm" | "md" | "lg";

function resolveFontSizeStyle(size: FontSizeScale, kind: "title" | "body" = "title") {
  const titleMap: Record<FontSizeScale, { fontSize: string; lineHeight: string }> = {
    xs: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    sm: { fontSize: "1rem", lineHeight: "1.5rem" },
    md: { fontSize: "1.5rem", lineHeight: "2rem" },
    lg: { fontSize: "2rem", lineHeight: "2.5rem" },
    xl: { fontSize: "2.75rem", lineHeight: "1.05" },
  };
  const bodyMap: Record<FontSizeScale, { fontSize: string; lineHeight: string }> = {
    xs: { fontSize: "0.8125rem", lineHeight: "1.25rem" },
    sm: { fontSize: "0.9375rem", lineHeight: "1.5rem" },
    md: { fontSize: "1rem", lineHeight: "1.75rem" },
    lg: { fontSize: "1.125rem", lineHeight: "1.875rem" },
    xl: { fontSize: "1.25rem", lineHeight: "2rem" },
  };

  return kind === "title" ? titleMap[size] : bodyMap[size];
}

function resolveFontWeight(weight: FontWeightScale) {
  if (weight === "regular") return 400;
  if (weight === "medium") return 500;
  if (weight === "semibold") return 600;
  return 700;
}

function resolveRadius(radius: RadiusScale) {
  if (radius === "none") return "0px";
  if (radius === "sm") return "0.5rem";
  if (radius === "md") return "1rem";
  if (radius === "lg") return "1.5rem";
  if (radius === "xl") return "2rem";
  return "9999px";
}

function resolveShadow(shadow: ShadowScale) {
  if (shadow === "none") return "none";
  if (shadow === "sm") return "0 8px 24px rgba(15, 23, 42, 0.08)";
  if (shadow === "md") return "0 16px 40px rgba(15, 23, 42, 0.14)";
  return "0 22px 60px rgba(15, 23, 42, 0.18)";
}

function resolveButtonSizeClasses(size: ButtonSizeScale) {
  if (size === "sm") return "px-4 py-2 text-xs";
  if (size === "lg") return "px-8 py-4 text-base";
  return "px-6 py-3 text-sm";
}

function titleStyle(size: FontSizeScale, weight: FontWeightScale) {
  return {
    ...resolveFontSizeStyle(size, "title"),
    fontWeight: resolveFontWeight(weight),
  };
}

function bodyStyle(size: FontSizeScale, weight: FontWeightScale = "regular") {
  return {
    ...resolveFontSizeStyle(size, "body"),
    fontWeight: resolveFontWeight(weight),
  };
}

function translatePuckText(text: string) {
  return translateEditorText(_puckLang, text) || text;
}

function localizeDefaultValue<T>(value: T, lang: PuckEditorLang): T {
  if (typeof value === "string") {
    return translateEditorText(lang, value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => localizeDefaultValue(entry, lang)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, localizeDefaultValue(entry, lang)]),
    ) as T;
  }
  return value;
}

function EmptyBlockState({ title, description }: { title: string; description: string }) {
  const theme = getThemeTokens(getStorefrontData()?.store);

  return (
    <div className="rounded-2xl border border-dashed px-6 py-10 text-center" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
      <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{title}</p>
      <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>{description}</p>
    </div>
  );
}

function getThemeTokens(store?: Partial<StorePublic> | null) {
  const primary = store?.theme_primary_color || "#2563eb";
  const secondary = store?.theme_secondary_color || "#0f172a";
  const isDark = store?.theme_mode === "dark";

  return {
    isDark,
    primary,
    secondary,
    pageBg: isDark ? "#020617" : "#ffffff",
    surface: isDark ? "#0f172a" : "#ffffff",
    surfaceAlt: isDark ? "#111827" : "#f8fafc",
    surfaceMuted: isDark ? withAlpha(primary, "14") : withAlpha(primary, "08"),
    border: isDark ? "rgba(148, 163, 184, 0.18)" : "#e5e7eb",
    textPrimary: isDark ? "#f8fafc" : "#111827",
    textSecondary: isDark ? "#cbd5e1" : "#6b7280",
    textMuted: isDark ? "#94a3b8" : "#9ca3af",
    heroGradient: `linear-gradient(135deg, ${withAlpha(primary, isDark ? "26" : "15")} 0%, ${withAlpha(secondary, isDark ? "30" : "10")} 100%)`,
    buttonTextOnPrimary: "#ffffff",
  };
}

export interface CatalogFieldOptions {
  productOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  collectionOptions: { label: string; value: string }[];
}

export type PuckEditorLang = "en" | "fr" | "ar";

const EMPTY_CATALOG_OPTIONS: CatalogFieldOptions = {
  productOptions: [],
  categoryOptions: [],
  collectionOptions: [],
};

const EDITOR_TRANSLATIONS: Record<Exclude<PuckEditorLang, "en">, Record<string, string>> = {
  fr: {
    "Store Shell": "Structure de la boutique",
    "Hero & Banners": "Hero et bannières",
    "Products & Collections": "Produits et collections",
    "Content": "Contenu",
    "Marketing": "Marketing",
    "Layout": "Mise en page",
    "Advanced": "Avancé",
    "Store Header": "En-tête de la boutique",
    "Store Navigation": "Navigation de la boutique",
    "Store Footer": "Pied de page de la boutique",
    "Hero Banner": "Bannière hero",
    "Announcement Bar": "Bandeau d'annonce",
    "Featured Products": "Produits mis en avant",
    "Categories Grid": "Grille des catégories",
    "Collections Showcase": "Vitrine des collections",
    "Promo Grid": "Grille promotionnelle",
    "Product Spotlight": "Produit vedette",
    "Newsletter": "Newsletter",
    "Rich Text": "Texte riche",
    "Image Banner": "Bannière image",
    "Spacer": "Espacement",
    "Divider": "Séparateur",
    "Testimonials": "Témoignages",
    "Feature Columns": "Colonnes d'avantages",
    "Trust Badges": "Badges de confiance",
    "Video Embed": "Vidéo intégrée",
    "FAQ": "FAQ",
    "Call to Action": "Appel à l'action",
    "Store Info": "Informations boutique",
    "Custom HTML": "HTML personnalisé",
    "Countdown Banner": "Bannière compte à rebours",
    "Social Follow": "Réseaux sociaux",
    "Brand Logos": "Logos de marques",
    "Scrolling Text": "Texte défilant",
    "Section title": "Titre de section",
    "Subtitle": "Sous-titre",
    "Title": "Titre",
    "Description": "Description",
    "Button label": "Libellé du bouton",
    "Button link": "Lien du bouton",
    "Background color": "Couleur de fond",
    "Text color": "Couleur du texte",
    "Section background color": "Couleur de fond de la section",
    "Card background color": "Couleur de fond de la carte",
    "Question card background": "Fond des questions",
    "Vertical spacing": "Espacement vertical",
    "Compact": "Compact",
    "Comfortable": "Confortable",
    "Spacious": "Aéré",
    "Columns": "Colonnes",
    "Style": "Style",
    "Alignment": "Alignement",
    "Left": "Gauche",
    "Center": "Centre",
    "Right": "Droite",
    "Yes": "Oui",
    "No": "Non",
    "Max products": "Produits max",
    "Max categories": "Catégories max",
    "Max collections": "Collections max",
    "Category": "Catégorie",
    "Collection": "Collection",
    "Source": "Source",
    "All products": "Tous les produits",
    "Products from one category": "Produits d'une catégorie",
    "Products from one collection": "Produits d'une collection",
    "Sort order": "Tri",
    "Default": "Par défaut",
    "Newest first": "Plus récents d'abord",
    "Price: low to high": "Prix croissant",
    "Price: high to low": "Prix décroissant",
    "Show 'View All' link": "Afficher le lien 'Voir tout'",
    "Display style": "Style d'affichage",
    "Social links": "Liens sociaux",
    "Profile URL": "URL du profil",
    "Platform": "Plateforme",
    "Title (optional)": "Titre (optionnel)",
    "Logos": "Logos",
    "Image URL": "URL de l'image",
    "Link (optional)": "Lien (optionnel)",
    "Height": "Hauteur",
    "Use default": "Utiliser la valeur par défaut",
    "Pick color": "Choisir une couleur",
    "Color value": "Valeur couleur",
    "Select a page": "Sélectionner une page",
    "Custom URL": "URL personnalisée",
    "Upload image": "Télécharger une image",
    "Uploading…": "Envoi en cours…",
    "Remove": "Supprimer",
    "Eyebrow": "Accroche",
    "Title size": "Taille du titre",
    "Small": "Petite",
    "Medium": "Moyenne",
    "Large": "Grande",
    "Show logo if available": "Afficher le logo s'il existe",
    "Home label": "Libellé accueil",
    "Products label": "Libellé produits",
    "Show categories links": "Afficher les liens catégories",
    "Show collections links": "Afficher les liens collections",
    "Featured category": "Catégorie mise en avant",
    "No featured category": "Aucune catégorie mise en avant",
    "Featured collection": "Collection mise en avant",
    "No featured collection": "Aucune collection mise en avant",
    "CTA label": "Libellé CTA",
    "CTA link": "Lien CTA",
    "Sticky navigation": "Navigation fixe",
    "Show categories": "Afficher les catégories",
    "Show collections": "Afficher les collections",
    "Show contact info": "Afficher les coordonnées",
    "Copyright suffix": "Texte copyright",
    "Button text": "Texte du bouton",
    "Second button text (optional)": "Texte du second bouton (optionnel)",
    "Second button link": "Lien du second bouton",
    "Dark overlay": "Superposition sombre",
    "Min height (CSS)": "Hauteur min (CSS)",
    "Message": "Message",
    "Card style": "Style de carte",
    "Minimal (no border)": "Minimal (sans bordure)",
    "Shadow": "Ombre",
    "Show brand name": "Afficher la marque",
    "Show sale badge": "Afficher le badge promo",
    "Cards": "Cartes",
    "Circles": "Cercles",
    "Tile minimum height": "Hauteur min des tuiles",
    "Promo tiles": "Tuiles promo",
    "Fallback to first product if slug is missing": "Utiliser le premier produit si le slug manque",
    "Background style": "Style d'arrière-plan",
    "Muted": "Atténué",
    "Card": "Carte",
    "Outline": "Contour",
    "Collect first name": "Collecter le prénom",
    "Email placeholder": "Placeholder email",
    "Success message (optional)": "Message de succès (optionnel)",
    "Content (HTML supported)": "Contenu (HTML accepté)",
    "Alt text": "Texte alternatif",
    "Border radius": "Rayon de bordure",
    "Height (CSS value)": "Hauteur (valeur CSS)",
    "Quote": "Citation",
    "Author": "Auteur",
    "Role / Location": "Rôle / lieu",
    "Rating": "Note",
    "5 stars": "5 étoiles",
    "4 stars": "4 étoiles",
    "3 stars": "3 étoiles",
    "Icon": "Icône",
    "Truck (shipping)": "Camion (livraison)",
    "Shield (security)": "Bouclier (sécurité)",
    "Refresh (returns)": "Retour (retours)",
    "Clock (24/7)": "Horloge (24/7)",
    "Tag (deals)": "Étiquette (promos)",
    "Badges": "Badges",
    "Question": "Question",
    "Questions": "Questions",
    "Answer": "Réponse",
    "Primary (filled)": "Principal (plein)",
    "Secondary (subtle)": "Secondaire (subtil)",
    "Show email": "Afficher l'email",
    "Show phone": "Afficher le téléphone",
    "Show address": "Afficher l'adresse",
    "HTML code": "Code HTML",
    "Target date (YYYY-MM-DD HH:mm)": "Date cible (YYYY-MM-DD HH:mm)",
    "Banner (full-width)": "Bannière (pleine largeur)",
    "Card (centered)": "Carte (centrée)",
    "Icons only": "Icônes seulement",
    "Buttons with labels": "Boutons avec libellés",
    "Minimal text links": "Liens texte minimaux",
    "Brand name": "Nom de marque",
    "Grayscale logos": "Logos en niveaux de gris",
    "Logos per row": "Logos par ligne",
    "Speed": "Vitesse",
    "Slow": "Lente",
    "Fast": "Rapide",
    "Pause on hover": "Pause au survol",
    "Use the first available product": "Utiliser le premier produit disponible",
    "Image left": "Image à gauche",
    "Image right": "Image à droite",
    "Title weight": "Graisse du titre",
    "Body size": "Taille du texte",
    "Font weight": "Graisse du texte",
    "Card radius": "Rayon des cartes",
    "Button size": "Taille du bouton",
    "Button radius": "Rayon du bouton",
    "Shadow level": "Niveau d'ombre",
    "None": "Aucun",
    "Regular": "Normal",
    "Semi-bold": "Semi-gras",
    "Extra large": "Très grande",
    "Container": "Conteneur",
    "Row": "Ligne",
    "Column": "Colonne",
    "Container content": "Contenu du conteneur",
    "Column one": "Colonne un",
    "Column two": "Colonne deux",
    "Column three": "Colonne trois",
    "Column count": "Nombre de colonnes",
    "Content width": "Largeur du contenu",
    "Gap": "Espacement",
    "Padding": "Padding",
    "Vertical alignment": "Alignement vertical",
    "Top": "Haut",
    "Middle": "Milieu",
    "Bottom": "Bas",
    "Default container": "Conteneur par défaut",
    "No products to display yet.": "Aucun produit à afficher pour le moment.",
    "No categories yet": "Aucune catégorie pour le moment",
    "Create categories in the dashboard to use this block.": "Créez des catégories dans le dashboard pour utiliser ce bloc.",
    "No collections yet": "Aucune collection pour le moment",
    "Create collections in the dashboard to use this block.": "Créez des collections dans le dashboard pour utiliser ce bloc.",
    "Category:": "Catégorie :",
    "Collection:": "Collection :",
    "View all": "Voir tout",
    "Browse collection": "Voir la collection",
    "Add a product slug to the spotlight block, or keep fallback enabled so it uses the first live product.": "Ajoutez un slug produit au bloc vedette, ou laissez le mode automatique actif pour utiliser le premier produit disponible.",
    "Sale": "Promo",
    "Out of stock": "Rupture de stock",
    "Browse catalog": "Voir le catalogue",
    "No image set": "Aucune image définie",
    "Enter a video embed URL": "Saisissez une URL de vidéo intégrée",
    "Add your social links in the editor.": "Ajoutez vos liens sociaux dans l'éditeur.",
    "Add brand logos in the editor.": "Ajoutez des logos de marques dans l'éditeur.",
    "Built for your brand": "Pensé pour votre marque",
    "Use this top block for identity, trust, and a strong first interaction.": "Utilisez ce bloc d'ouverture pour affirmer votre identité et rassurer vos clients.",
    "Tell customers what your store stands for and where they can reach you.": "Expliquez la promesse de votre boutique et comment vos clients peuvent vous contacter.",
    "All rights reserved.": "Tous droits réservés.",
    "Welcome to Our Store": "Bienvenue dans notre boutique",
    "Discover our latest products and exclusive offers": "Découvrez nos nouveautés et offres exclusives",
    "Shop Now": "Acheter maintenant",
    "Shop now": "Acheter maintenant",
    "🎉 Free shipping on orders over €50!": "🎉 Livraison offerte dès 50 € d'achat !",
    "Our Products": "Nos produits",
    "Shop by Category": "Acheter par catégorie",
    "Our Collections": "Nos collections",
    "Shop the moment": "Campagnes à mettre en avant",
    "Guide customers into your most important campaigns.": "Dirigez vos visiteurs vers les campagnes les plus importantes.",
    "New": "Nouveau",
    "Fresh arrivals": "Nouveautés",
    "Put the newest products in front of returning shoppers.": "Mettez vos dernières références en avant pour les visiteurs réguliers.",
    "See what is new": "Voir les nouveautés",
    "Collections": "Collections",
    "Gift-ready picks": "Sélection prête à offrir",
    "Send customers straight to your best curated collection.": "Envoyez vos clients vers votre meilleure sélection éditoriale.",
    "Browse collections": "Voir les collections",
    "Limited": "Limité",
    "This week only": "Cette semaine seulement",
    "Use a clear merchandising tile for a limited-time push.": "Utilisez une tuile claire pour une mise en avant limitée dans le temps.",
    "View offer": "Voir l'offre",
    "Spotlight product": "Produit vedette",
    "Feature one product with more context than a normal grid card.": "Mettez un produit en avant avec plus de contexte qu'une simple carte produit.",
    "View product": "Voir le produit",
    "Stay Updated": "Restez informé",
    "Subscribe for exclusive offers and updates.": "Inscrivez-vous pour recevoir des offres exclusives et des nouveautés.",
    "Subscribe": "S'inscrire",
    "<p>Add your content here...</p>": "<p>Ajoutez votre contenu ici...</p>",
    "Banner image": "Image de bannière",
    "Amazing products and fast delivery!": "Des produits superbes et une livraison rapide !",
    "Customer": "Client",
    "What Our Customers Say": "Ce que disent nos clients",
    "Sarah L.": "Sarah L.",
    "Verified Buyer": "Client vérifié",
    "Great quality, will order again.": "Très belle qualité, je recommanderai.",
    "Marc D.": "Marc D.",
    "Feature": "Avantage",
    "Description of this feature.": "Décrivez cet avantage ici.",
    "Free Shipping": "Livraison offerte",
    "On all orders over €50": "Dès 50 € de commande",
    "Secure Payment": "Paiement sécurisé",
    "100% secure checkout": "Paiement 100 % sécurisé",
    "Easy Returns": "Retours faciles",
    "30-day return policy": "Retour sous 30 jours",
    "24/7 Support": "Support 24/7",
    "We're here to help": "Nous sommes là pour vous aider",
    "Trustworthy": "Fiable",
    "256-bit SSL": "SSL 256 bits",
    "Free Delivery": "Livraison offerte",
    "Over €50": "Dès 50 €",
    "Free Returns": "Retours gratuits",
    "30 days": "30 jours",
    "Your question?": "Votre question ?",
    "Your answer.": "Votre réponse.",
    "Frequently Asked Questions": "Questions fréquentes",
    "What payment methods do you accept?": "Quels moyens de paiement acceptez-vous ?",
    "We accept Visa, Mastercard, and PayPal.": "Nous acceptons Visa, Mastercard et PayPal.",
    "How long does shipping take?": "Combien de temps prend la livraison ?",
    "Standard shipping takes 3-5 business days.": "La livraison standard prend 3 à 5 jours ouvrés.",
    "Ready to get started?": "Prêt à commencer ?",
    "Browse our full catalog and find what you need.": "Parcourez notre catalogue complet et trouvez ce qu'il vous faut.",
    "Contact Us": "Contactez-nous",
    "Sale Ends Soon!": "L'offre se termine bientôt !",
    "Don't miss our exclusive offers": "Ne manquez pas nos offres exclusives",
    "Follow Us": "Suivez-nous",
    "🔥 Free shipping on all orders today! 🔥": "🔥 Livraison offerte sur toutes les commandes aujourd'hui ! 🔥",
    "Use the builder to control the first impression of your storefront.": "Utilisez le builder pour maîtriser la première impression de votre vitrine.",
    "Drive visitors into the campaigns that matter most.": "Dirigez vos visiteurs vers les campagnes qui comptent le plus.",
    "Show what just landed in your catalog.": "Mettez en avant ce qui vient d'arriver dans votre catalogue.",
    "Explore new products": "Voir les nouveautés",
    "Gift": "Cadeaux",
    "Curated picks": "Sélection éditoriale",
    "Promote a collection or seasonal edit.": "Mettez en avant une collection ou une sélection de saison.",
    "See collections": "Voir les collections",
    "Weekly spotlight": "Sélection de la semaine",
    "Use one tile for your strongest short-term offer.": "Utilisez une tuile pour votre meilleure offre de courte durée.",
    "Explain your brand promise, support channels, and what customers should expect from your store.": "Expliquez votre promesse de marque, vos canaux de support et ce que vos clients peuvent attendre de votre boutique.",
  },
  ar: {
    "Store Shell": "هيكل المتجر",
    "Hero & Banners": "الهيرو واللافتات",
    "Products & Collections": "المنتجات والمجموعات",
    "Content": "المحتوى",
    "Marketing": "التسويق",
    "Layout": "التخطيط",
    "Advanced": "متقدم",
    "Store Header": "رأس المتجر",
    "Store Navigation": "تنقل المتجر",
    "Store Footer": "تذييل المتجر",
    "Hero Banner": "بانر رئيسي",
    "Announcement Bar": "شريط إعلان",
    "Featured Products": "منتجات مميزة",
    "Categories Grid": "شبكة الفئات",
    "Collections Showcase": "عرض المجموعات",
    "Promo Grid": "شبكة ترويجية",
    "Product Spotlight": "منتج مميز",
    "Newsletter": "النشرة البريدية",
    "Rich Text": "نص غني",
    "Image Banner": "بانر صورة",
    "Spacer": "مسافة",
    "Divider": "فاصل",
    "Testimonials": "آراء العملاء",
    "Feature Columns": "أعمدة المزايا",
    "Trust Badges": "شارات الثقة",
    "Video Embed": "فيديو مضمّن",
    "FAQ": "الأسئلة الشائعة",
    "Call to Action": "دعوة لاتخاذ إجراء",
    "Store Info": "معلومات المتجر",
    "Custom HTML": "HTML مخصص",
    "Countdown Banner": "بانر عد تنازلي",
    "Social Follow": "متابعة اجتماعية",
    "Brand Logos": "شعارات العلامات",
    "Scrolling Text": "نص متحرك",
    "Section title": "عنوان القسم",
    "Subtitle": "عنوان فرعي",
    "Title": "العنوان",
    "Description": "الوصف",
    "Button label": "نص الزر",
    "Button link": "رابط الزر",
    "Background color": "لون الخلفية",
    "Text color": "لون النص",
    "Section background color": "لون خلفية القسم",
    "Card background color": "لون خلفية البطاقة",
    "Question card background": "خلفية بطاقة السؤال",
    "Vertical spacing": "المسافة العمودية",
    "Compact": "مضغوط",
    "Comfortable": "مريح",
    "Spacious": "واسع",
    "Columns": "الأعمدة",
    "Style": "النمط",
    "Alignment": "المحاذاة",
    "Left": "يسار",
    "Center": "وسط",
    "Right": "يمين",
    "Yes": "نعم",
    "No": "لا",
    "Max products": "الحد الأقصى للمنتجات",
    "Max categories": "الحد الأقصى للفئات",
    "Max collections": "الحد الأقصى للمجموعات",
    "Category": "الفئة",
    "Collection": "المجموعة",
    "Source": "المصدر",
    "All products": "كل المنتجات",
    "Products from one category": "منتجات من فئة واحدة",
    "Products from one collection": "منتجات من مجموعة واحدة",
    "Sort order": "الترتيب",
    "Default": "افتراضي",
    "Newest first": "الأحدث أولاً",
    "Price: low to high": "السعر من الأقل إلى الأعلى",
    "Price: high to low": "السعر من الأعلى إلى الأقل",
    "Show 'View All' link": "إظهار رابط عرض الكل",
    "Display style": "طريقة العرض",
    "Social links": "الروابط الاجتماعية",
    "Profile URL": "رابط الملف الشخصي",
    "Platform": "المنصة",
    "Title (optional)": "العنوان (اختياري)",
    "Logos": "الشعارات",
    "Image URL": "رابط الصورة",
    "Link (optional)": "رابط (اختياري)",
    "Height": "الارتفاع",
    "Use default": "استخدم القيمة الافتراضية",
    "Pick color": "اختر لوناً",
    "Color value": "قيمة اللون",
    "Select a page": "اختر صفحة",
    "Custom URL": "رابط مخصص",
    "Upload image": "رفع صورة",
    "Uploading…": "جاري الرفع…",
    "Remove": "إزالة",
    "Eyebrow": "النص العلوي",
    "Title size": "حجم العنوان",
    "Small": "صغير",
    "Medium": "متوسط",
    "Large": "كبير",
    "Show logo if available": "إظهار الشعار إن وجد",
    "Home label": "اسم الرئيسية",
    "Products label": "اسم المنتجات",
    "Show categories links": "إظهار روابط الفئات",
    "Show collections links": "إظهار روابط المجموعات",
    "Featured category": "فئة مميزة",
    "No featured category": "لا توجد فئة مميزة",
    "Featured collection": "مجموعة مميزة",
    "No featured collection": "لا توجد مجموعة مميزة",
    "CTA label": "نص الدعوة",
    "CTA link": "رابط الدعوة",
    "Sticky navigation": "تنقل ثابت",
    "Show categories": "إظهار الفئات",
    "Show collections": "إظهار المجموعات",
    "Show contact info": "إظهار معلومات التواصل",
    "Copyright suffix": "نص حقوق النشر",
    "Button text": "نص الزر",
    "Second button text (optional)": "نص الزر الثاني (اختياري)",
    "Second button link": "رابط الزر الثاني",
    "Dark overlay": "طبقة داكنة",
    "Min height (CSS)": "أقل ارتفاع (CSS)",
    "Message": "الرسالة",
    "Card style": "نمط البطاقة",
    "Minimal (no border)": "بسيط (بدون حد)",
    "Shadow": "ظل",
    "Show brand name": "إظهار العلامة التجارية",
    "Show sale badge": "إظهار شارة التخفيض",
    "Cards": "بطاقات",
    "Circles": "دوائر",
    "Tile minimum height": "الحد الأدنى لارتفاع البطاقة",
    "Promo tiles": "بطاقات ترويجية",
    "Fallback to first product if slug is missing": "استخدم أول منتج إذا كان الـ slug مفقوداً",
    "Background style": "نمط الخلفية",
    "Muted": "هادئ",
    "Card": "بطاقة",
    "Outline": "إطار",
    "Collect first name": "جمع الاسم الأول",
    "Email placeholder": "نص البريد الافتراضي",
    "Success message (optional)": "رسالة النجاح (اختياري)",
    "Content (HTML supported)": "المحتوى (يدعم HTML)",
    "Alt text": "النص البديل",
    "Border radius": "استدارة الحواف",
    "Height (CSS value)": "الارتفاع (قيمة CSS)",
    "Quote": "اقتباس",
    "Author": "الكاتب",
    "Role / Location": "الدور / المكان",
    "Rating": "التقييم",
    "5 stars": "5 نجوم",
    "4 stars": "4 نجوم",
    "3 stars": "3 نجوم",
    "Icon": "أيقونة",
    "Truck (shipping)": "شاحنة (شحن)",
    "Shield (security)": "درع (أمان)",
    "Refresh (returns)": "استرجاع (إرجاع)",
    "Clock (24/7)": "ساعة (24/7)",
    "Tag (deals)": "وسم (عروض)",
    "Badges": "شارات",
    "Question": "سؤال",
    "Questions": "الأسئلة",
    "Answer": "إجابة",
    "Primary (filled)": "أساسي (ممتلئ)",
    "Secondary (subtle)": "ثانوي (هادئ)",
    "Show email": "إظهار البريد الإلكتروني",
    "Show phone": "إظهار الهاتف",
    "Show address": "إظهار العنوان",
    "HTML code": "كود HTML",
    "Target date (YYYY-MM-DD HH:mm)": "التاريخ المستهدف (YYYY-MM-DD HH:mm)",
    "Banner (full-width)": "بانر (بعرض كامل)",
    "Card (centered)": "بطاقة (متمركزة)",
    "Icons only": "أيقونات فقط",
    "Buttons with labels": "أزرار مع تسميات",
    "Minimal text links": "روابط نصية بسيطة",
    "Brand name": "اسم العلامة",
    "Grayscale logos": "شعارات بتدرج رمادي",
    "Logos per row": "الشعارات في كل صف",
    "Speed": "السرعة",
    "Slow": "بطيء",
    "Fast": "سريع",
    "Pause on hover": "إيقاف عند المرور",
    "Use the first available product": "استخدم أول منتج متاح",
    "Image left": "الصورة يسار",
    "Image right": "الصورة يمين",
    "Title weight": "وزن العنوان",
    "Body size": "حجم النص",
    "Font weight": "وزن النص",
    "Card radius": "استدارة البطاقة",
    "Button size": "حجم الزر",
    "Button radius": "استدارة الزر",
    "Shadow level": "مستوى الظل",
    "None": "بدون",
    "Regular": "عادي",
    "Semi-bold": "شبه عريض",
    "Extra large": "كبير جداً",
    "Container": "حاوية",
    "Row": "صف",
    "Column": "عمود",
    "Container content": "محتوى الحاوية",
    "Column one": "العمود الأول",
    "Column two": "العمود الثاني",
    "Column three": "العمود الثالث",
    "Column count": "عدد الأعمدة",
    "Content width": "عرض المحتوى",
    "Gap": "المسافة",
    "Padding": "الحشو",
    "Vertical alignment": "المحاذاة العمودية",
    "Top": "أعلى",
    "Middle": "وسط",
    "Bottom": "أسفل",
    "Default container": "الحاوية الافتراضية",
    "No products to display yet.": "لا توجد منتجات لعرضها حالياً.",
    "No categories yet": "لا توجد فئات بعد",
    "Create categories in the dashboard to use this block.": "أنشئ فئات من لوحة التحكم لاستخدام هذا البلوك.",
    "No collections yet": "لا توجد مجموعات بعد",
    "Create collections in the dashboard to use this block.": "أنشئ مجموعات من لوحة التحكم لاستخدام هذا البلوك.",
    "Category:": "الفئة:",
    "Collection:": "المجموعة:",
    "View all": "عرض الكل",
    "Browse collection": "تصفح المجموعة",
    "Add a product slug to the spotlight block, or keep fallback enabled so it uses the first live product.": "أضف slug للمنتج إلى البلوك المميز أو اترك الوضع التلقائي ليستخدم أول منتج متاح.",
    "Sale": "تخفيض",
    "Out of stock": "نفد المخزون",
    "Browse catalog": "تصفح الكتالوج",
    "No image set": "لم يتم تعيين صورة",
    "Enter a video embed URL": "أدخل رابط فيديو مضمّن",
    "Add your social links in the editor.": "أضف روابطك الاجتماعية في المحرر.",
    "Add brand logos in the editor.": "أضف شعارات العلامات التجارية في المحرر.",
  },
};

function translateEditorText(lang: PuckEditorLang, text?: string) {
  if (!text || lang === "en") return text;
  return EDITOR_TRANSLATIONS[lang][text] || text;
}

function createColorField(label: string | undefined, lang: PuckEditorLang) {
  const translatedLabel = translateEditorText(lang, label);
  return {
    type: "custom" as const,
    label: translatedLabel,
    render: ({ id, value, onChange, readOnly }: { id: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) => {
      const safeColor = isHexColor(value) ? value : "#2563eb";
      const store = getStorefrontData()?.store;
      const primary = store?.theme_primary_color || "#2563eb";
      const secondary = store?.theme_secondary_color || "#0f172a";
      const swatches = [...new Set([
        primary,
        secondary,
        "#ffffff",
        "#000000",
        "#ef4444",
        "#f97316",
        "#eab308",
        "#22c55e",
        "#0ea5e9",
        "#8b5cf6",
      ])];
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id={`${id}-picker`}
              type="color"
              value={safeColor}
              disabled={readOnly}
              onChange={(event) => onChange(event.target.value)}
              className="h-10 w-12 rounded border border-slate-300 bg-white p-1"
              aria-label={translateEditorText(lang, "Pick color")}
            />
            <input
              id={id}
              type="text"
              value={value || ""}
              disabled={readOnly}
              onChange={(event) => onChange(event.target.value)}
              placeholder="#2563eb"
              aria-label={translateEditorText(lang, "Color value")}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {swatches.map((sw) => (
              <button
                key={sw}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(sw)}
                title={sw}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 ${value === sw ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300"}`}
                style={{ backgroundColor: sw }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange("")}
            className="text-xs font-medium text-slate-600 underline underline-offset-2 disabled:opacity-50"
          >
            {translateEditorText(lang, "Use default")}
          </button>
        </div>
      );
    },
  };
}

function createLinkField(label: string | undefined, lang: PuckEditorLang) {
  const translatedLabel = translateEditorText(lang, label);
  return {
    type: "custom" as const,
    label: translatedLabel,
    render: ({ id, value, onChange, readOnly }: { id: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) => {
      const data = getStorefrontData();
      const cats = data?.categories || [];
      const cols = data?.collections || [];

      const presets = [
        { label: translateEditorText(lang, "All products") || "All products", value: "/products" },
        { label: translateEditorText(lang, "All categories") || "All categories", value: "/categories" },
        { label: translateEditorText(lang, "All collections") || "All collections", value: "/collections" },
        ...cats.map((c) => ({ label: `${translateEditorText(lang, "Category") || "Category"}: ${c.name}`, value: `/categories/${c.slug}` })),
        ...cols.map((c) => ({ label: `${translateEditorText(lang, "Collection") || "Collection"}: ${c.name}`, value: `/collections/${c.slug}` })),
      ];

      const isCustom = !!value && !presets.some((p) => p.value === value);

      return (
        <div className="space-y-2">
          <select
            id={id}
            disabled={readOnly}
            value={isCustom ? "__custom__" : (value || "")}
            onChange={(e) => {
              if (e.target.value === "__custom__") onChange(value || "");
              else onChange(e.target.value);
            }}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">{translateEditorText(lang, "Select a page") || "Select a page"}</option>
            {presets.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            <option value="__custom__">{translateEditorText(lang, "Custom URL") || "Custom URL"}</option>
          </select>
          {isCustom && (
            <input
              type="text"
              value={value || ""}
              disabled={readOnly}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/custom-page"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          )}
        </div>
      );
    },
  };
}

function createImageField(label: string | undefined, lang: PuckEditorLang) {
  const translatedLabel = translateEditorText(lang, label);
  return {
    type: "custom" as const,
    label: translatedLabel,
    render: ({ id, value, onChange, readOnly }: { id: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) => {
      const store = getStorefrontData()?.store;
      const [uploading, setUploading] = React.useState(false);

      const handleFile = async (file: File) => {
        if (!store?.id) return;
        setUploading(true);
        try {
          const { apiClient } = await import("@/lib/api/client");
          const result = await apiClient.uploadStoreMedia(store.id, file);
          onChange(result.url);
        } catch {
          /* upload failed — user can retry */
        } finally {
          setUploading(false);
        }
      };

      return (
        <div className="space-y-2">
          {value && (
            <div className="relative w-full rounded-md border border-slate-200 bg-slate-50 p-1">
              <img src={value} alt="" className="h-20 w-full rounded object-cover" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${readOnly || uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                id={id}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={readOnly || uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {uploading
                ? (translateEditorText(lang, "Uploading…") || "Uploading…")
                : (translateEditorText(lang, "Upload image") || "Upload image")}
            </label>
            {value && (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onChange("")}
                className="text-xs font-medium text-red-600 underline underline-offset-2 disabled:opacity-50"
              >
                {translateEditorText(lang, "Remove") || "Remove"}
              </button>
            )}
          </div>
          <input
            type="text"
            value={value || ""}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-xs text-slate-500"
          />
        </div>
      );
    },
  };
}

type LocalizableOption = {
  label?: string;
  value?: unknown;
} & Record<string, unknown>;

type LocalizableField = {
  type?: string;
  label?: string;
  options?: LocalizableOption[];
  arrayFields?: Record<string, unknown>;
  objectFields?: Record<string, unknown>;
} & Record<string, unknown>;

function transformField(field: unknown, propName: string, lang: PuckEditorLang): unknown {
  if (!field || typeof field !== "object") return field;

  const next = { ...(field as LocalizableField) };
  const lowerProp = propName.toLowerCase();

  /* ── colour fields ───────────────────────────────────────────── */
  if (lowerProp.includes("color") && next.type === "text") {
    return createColorField(next.label, lang);
  }

  /* ── link / href fields (NOT urls like video/social) ─────────── */
  if ((lowerProp.includes("link") || lowerProp === "href") && next.type === "text") {
    return createLinkField(next.label, lang);
  }

  /* ── image / background-image fields ─────────────────────────── */
  if ((lowerProp.includes("image") || lowerProp.includes("img")) && next.type === "text") {
    return createImageField(next.label, lang);
  }

  if (typeof next.label === "string") {
    next.label = translateEditorText(lang, next.label);
  }

  if ((next.type === "select" || next.type === "radio") && Array.isArray(next.options)) {
    next.options = next.options.map((option) => ({
      ...option,
      label: typeof option.label === "string" ? translateEditorText(lang, option.label) : option.label,
    }));
  }

  if (next.type === "array" && next.arrayFields) {
    next.label = translateEditorText(lang, next.label);
    next.arrayFields = Object.fromEntries(
      Object.entries(next.arrayFields).map(([childKey, childField]) => [childKey, transformField(childField, childKey, lang)]),
    );
  }

  if (next.type === "object" && next.objectFields) {
    next.objectFields = Object.fromEntries(
      Object.entries(next.objectFields).map(([childKey, childField]) => [childKey, transformField(childField, childKey, lang)]),
    );
  }

  return next;
}

function localizePuckConfig(config: Config<PuckProps>, lang: PuckEditorLang) {
  return {
    ...config,
    categories: Object.fromEntries(
      Object.entries(config.categories || {}).map(([key, category]) => [
        key,
        {
          ...category,
          title: translateEditorText(lang, category.title),
        },
      ]),
    ),
    components: Object.fromEntries(
      Object.entries(config.components).map(([componentName, component]) => [
        componentName,
        {
          ...component,
          label: translateEditorText(lang, component.label),
          defaultProps: component.defaultProps
            ? localizeDefaultValue(component.defaultProps, lang)
            : component.defaultProps,
          fields: component.fields
            ? Object.fromEntries(
                Object.entries(component.fields).map(([fieldName, field]) => [fieldName, transformField(field, fieldName, lang)]),
              )
            : component.fields,
        },
      ]),
    ),
  } as Config<PuckProps>;
}

export function createCatalogFieldOptions(data?: Partial<StorefrontData> | null): CatalogFieldOptions {
  return {
    productOptions: (data?.products || []).map((product) => ({
      label: product.title,
      value: product.slug,
    })),
    categoryOptions: (data?.categories || []).map((category) => ({
      label: category.name,
      value: category.slug,
    })),
    collectionOptions: (data?.collections || []).map((collection) => ({
      label: collection.name,
      value: collection.slug,
    })),
  };
}

/* ─────────────────────────── Puck Config ─────────────────────────────── */

type PuckProps = {
  ContainerBlock: {
    content: Slot;
    maxWidth: string;
    padding: string;
    backgroundColor: string;
    radius: RadiusScale;
    shadow: ShadowScale;
  };
  RowBlock: {
    columnOne: Slot;
    columnTwo: Slot;
    columnThree: Slot;
    columns: 2 | 3;
    columnWidths: "equal" | "1-2" | "2-1" | "1-3" | "3-1" | "1-1-1" | "1-2-1" | "2-1-1" | "1-1-2";
    gap: string;
    verticalAlign: "top" | "middle" | "bottom";
    col1Align: "auto" | "top" | "middle" | "bottom";
    col2Align: "auto" | "top" | "middle" | "bottom";
    col3Align: "auto" | "top" | "middle" | "bottom";
    backgroundColor: string;
  };
  ColumnBlock: {
    content: Slot;
    backgroundColor: string;
    padding: string;
    radius: RadiusScale;
    shadow: ShadowScale;
  };
  StoreHeader: {
    homeLabel: string;
    productsLabel: string;
    showCategories: boolean;
    showCollections: boolean;
    showPages: boolean;
    showSearch: boolean;
    showAuth: boolean;
    showCart: boolean;
    cartLabel: string;
    showLogo: boolean;
  };
  StoreNavigation: {
    homeLabel: string;
    productsLabel: string;
    showCategories: boolean;
    showCollections: boolean;
    featuredCategorySlug: string;
    featuredCollectionSlug: string;
    ctaLabel: string;
    ctaLink: string;
    sticky: boolean;
  };
  StoreFooter: {
    description: string;
    showCategories: boolean;
    showCollections: boolean;
    showContact: boolean;
    copyrightText: string;
  };
  HeroBlock: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaLink: string;
    alignment: "left" | "center" | "right";
    showOverlay: boolean;
    backgroundImage: string;
    minHeight: string;
    titleSize: "small" | "medium" | "large";
    secondCtaLabel: string;
    secondCtaLink: string;
    textColor: string;
    backgroundColor: string;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    buttonSize: ButtonSizeScale;
    buttonRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  AnnouncementBar: {
    text: string;
    backgroundColor: string;
    textColor: string;
    link: string;
  };
  FeaturedProducts: {
    title: string;
    subtitle: string;
    columns: number;
    maxProducts: number;
    source: "all" | "category" | "collection";
    categorySlug: string;
    collectionSlug: string;
    showViewAll: boolean;
    cardStyle: "default" | "minimal" | "shadow";
    showBrand: boolean;
    showSaleBadge: boolean;
    sortBy: "default" | "newest" | "price-asc" | "price-desc";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  CategoriesGrid: {
    title: string;
    subtitle: string;
    columns: number;
    style: "cards" | "circles" | "minimal";
    maxItems: number;
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  CollectionsShowcase: {
    title: string;
    subtitle: string;
    columns: number;
    maxItems: number;
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  HandpickedProducts: {
    title: string;
    subtitle: string;
    productSlugs: string[];
    columns: 2 | 3 | 4;
    cardStyle: "default" | "minimal" | "shadow";
    showBrand: boolean;
    showSaleBadge: boolean;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    spacing: "sm" | "md" | "lg";
  };
  HandpickedCategories: {
    title: string;
    subtitle: string;
    categorySlugs: string[];
    columns: 3 | 4 | 6;
    style: "cards" | "circles" | "minimal";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  CategorySpotlight: {
    categorySlug: string;
    showProducts: boolean;
    maxProducts: number;
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  PromoGrid: {
    title: string;
    subtitle: string;
    columns: number;
    spacing: "sm" | "md" | "lg";
    minTileHeight: string;
    items: {
      eyebrow: string;
      heading: string;
      description: string;
      linkLabel: string;
      link: string;
      backgroundImage: string;
      accentColor: string;
    }[];
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    buttonSize: ButtonSizeScale;
  };
  ProductSpotlight: {
    title: string;
    subtitle: string;
    productSlug: string;
    ctaLabel: string;
    fallbackToFirstProduct: boolean;
    layout: "image-left" | "image-right";
    backgroundStyle: "muted" | "card" | "outline";
    showSaleBadge: boolean;
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    buttonSize: ButtonSizeScale;
  };
  Newsletter: {
    title: string;
    subtitle: string;
    buttonLabel: string;
    style: "banner" | "card" | "inline";
    collectName: boolean;
    emailPlaceholder: string;
    successMessage: string;
    backgroundColor: string;
    textColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    buttonSize: ButtonSizeScale;
    spacing: "sm" | "md" | "lg";
  };
  RichText: {
    content: string;
    alignment: "left" | "center" | "right";
    maxWidth: string;
    textColor: string;
    backgroundColor: string;
    fontSize: FontSizeScale;
    fontWeight: FontWeightScale;
    spacing: "sm" | "md" | "lg";
  };
  ImageBanner: {
    imageUrl: string;
    alt: string;
    link: string;
    height: string;
    overlay: boolean;
    overlayText: string;
    spacing: "sm" | "md" | "lg";
    borderRadius: string;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
  };
  Spacer: {
    height: string;
  };
  Divider: {
    style: "solid" | "dashed" | "dotted";
    color: string;
    width: string;
  };
  Testimonials: {
    title: string;
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    cardBackgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    items: {
      quote: string;
      author: string;
      role: string;
      rating: number;
    }[];
  };
  FeatureColumns: {
    title: string;
    spacing: "sm" | "md" | "lg";
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    columns: {
      icon: string;
      heading: string;
      description: string;
    }[];
  };
  TrustBadges: {
    items: {
      icon: string;
      label: string;
      description: string;
    }[];
    style: "horizontal" | "grid";
    backgroundColor: string;
    bodySize: FontSizeScale;
  };
  VideoEmbed: {
    url: string;
    title: string;
    aspectRatio: "16:9" | "4:3" | "1:1";
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
  };
  FAQ: {
    title: string;
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    cardBackgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    items: { question: string; answer: string }[];
  };
  CallToAction: {
    title: string;
    subtitle: string;
    buttonLabel: string;
    buttonLink: string;
    style: "primary" | "secondary" | "outline";
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    textColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    buttonSize: ButtonSizeScale;
    buttonRadius: RadiusScale;
  };
  StoreInfo: {
    showEmail: boolean;
    showPhone: boolean;
    showAddress: boolean;
    title: string;
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
  };
  CustomHTML: {
    code: string;
  };
  CountdownBanner: {
    title: string;
    subtitle: string;
    targetDate: string;
    style: "banner" | "card";
    backgroundColor: string;
    textColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    bodySize: FontSizeScale;
    cardRadius: RadiusScale;
    shadow: ShadowScale;
    spacing: "sm" | "md" | "lg";
  };
  SocialFollow: {
    title: string;
    style: "icons" | "buttons" | "minimal";
    links: { platform: string; url: string }[];
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
    buttonSize: ButtonSizeScale;
    buttonRadius: RadiusScale;
  };
  BrandLogos: {
    title: string;
    logos: { imageUrl: string; alt: string; link: string }[];
    grayscale: boolean;
    columns: number;
    spacing: "sm" | "md" | "lg";
    backgroundColor: string;
    titleSize: FontSizeScale;
    titleWeight: FontWeightScale;
  };
  Marquee: {
    text: string;
    speed: "slow" | "medium" | "fast";
    backgroundColor: string;
    textColor: string;
    pauseOnHover: boolean;
  };
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  shield: Shield,
  refresh: RefreshCw,
  clock: Clock,
  star: Star,
  tag: Tag,
  mail: Mail,
  phone: Phone,
  "shopping-bag": ShoppingBag,
};

export const puckConfig: Config<PuckProps> = {
  categories: {
    shell: { title: "Store Shell", components: ["StoreHeader", "StoreNavigation", "StoreFooter"] },
    hero: { title: "Hero & Banners", components: ["HeroBlock", "AnnouncementBar", "ImageBanner", "Marquee"] },
    products: { title: "Products & Collections", components: ["FeaturedProducts", "CategoriesGrid", "CollectionsShowcase", "PromoGrid", "ProductSpotlight", "HandpickedProducts", "HandpickedCategories", "CategorySpotlight"] },
    content: { title: "Content", components: ["RichText", "Testimonials", "FeatureColumns", "FAQ", "VideoEmbed", "BrandLogos"] },
    marketing: { title: "Marketing", components: ["Newsletter", "CallToAction", "TrustBadges", "CountdownBanner", "SocialFollow"] },
    layout: { title: "Layout", components: ["ContainerBlock", "RowBlock", "ColumnBlock", "Spacer", "Divider"] },
    advanced: { title: "Advanced", components: ["StoreInfo", "CustomHTML"] },
  },

  root: {
    render: ({ children }) => {
      const store = getStorefrontData()?.store;
      const theme = getThemeTokens(store);
      const fontFamily = store?.theme_font_family ? `'${store.theme_font_family}', system-ui, sans-serif` : "system-ui, sans-serif";

      return (
        <div
          className={theme.isDark ? "dark" : undefined}
          style={{
            backgroundColor: theme.pageBg,
            color: theme.textPrimary,
            fontFamily,
            minHeight: "100vh",
          }}
        >
          {children}
        </div>
      );
    },
  },

  components: {
    ContainerBlock: {
      label: "Container",
      fields: {
        content: { type: "slot", label: "Container content" },
        maxWidth: { type: "text", label: "Content width" },
        padding: { type: "text", label: "Padding" },
        backgroundColor: { type: "text", label: "Background color" },
        radius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      defaultProps: {
        maxWidth: "1200px",
        padding: "24px",
        backgroundColor: "",
        radius: "lg",
        shadow: "none",
      } as any,
      render: ({ content, maxWidth, padding, backgroundColor, radius, shadow }) => {
        const theme = getThemeTokens(getStorefrontData()?.store);
        const Content = content;
        return (
          <section className="px-4 py-4">
            <div
              className="mx-auto"
              style={{
                maxWidth,
                padding,
                backgroundColor: normalizeOptionalColor(backgroundColor, "transparent"),
                borderRadius: resolveRadius(radius),
                boxShadow: resolveShadow(shadow),
                border: backgroundColor ? `1px solid ${theme.border}` : undefined,
              }}
            >
              {Content ? <Content /> : null}
            </div>
          </section>
        );
      },
    },

    RowBlock: {
      label: "Row",
      fields: {
        columnOne: { type: "slot", label: "Column one" },
        columnTwo: { type: "slot", label: "Column two" },
        columnThree: { type: "slot", label: "Column three" },
        columns: {
          type: "select",
          label: "Column count",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
          ],
        },
        columnWidths: {
          type: "select",
          label: "Column widths",
          options: [
            { label: "Equal", value: "equal" },
            { label: "1/3 + 2/3", value: "1-2" },
            { label: "2/3 + 1/3", value: "2-1" },
            { label: "1/4 + 3/4", value: "1-3" },
            { label: "3/4 + 1/4", value: "3-1" },
            { label: "Equal (3 cols)", value: "1-1-1" },
            { label: "1/4 + 1/2 + 1/4", value: "1-2-1" },
            { label: "1/2 + 1/4 + 1/4", value: "2-1-1" },
            { label: "1/4 + 1/4 + 1/2", value: "1-1-2" },
          ],
        },
        gap: { type: "text", label: "Gap" },
        verticalAlign: {
          type: "select",
          label: "Vertical alignment (all)",
          options: [
            { label: "Top", value: "top" },
            { label: "Middle", value: "middle" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        col1Align: {
          type: "select",
          label: "Column 1 alignment override",
          options: [
            { label: "Auto (use row)", value: "auto" },
            { label: "Top", value: "top" },
            { label: "Middle", value: "middle" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        col2Align: {
          type: "select",
          label: "Column 2 alignment override",
          options: [
            { label: "Auto (use row)", value: "auto" },
            { label: "Top", value: "top" },
            { label: "Middle", value: "middle" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        col3Align: {
          type: "select",
          label: "Column 3 alignment override",
          options: [
            { label: "Auto (use row)", value: "auto" },
            { label: "Top", value: "top" },
            { label: "Middle", value: "middle" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
      },
      defaultProps: {
        columns: 2,
        columnWidths: "equal",
        gap: "24px",
        verticalAlign: "top",
        col1Align: "auto",
        col2Align: "auto",
        col3Align: "auto",
        backgroundColor: "",
      } as any,
      render: ({ columnOne, columnTwo, columnThree, columns, columnWidths, gap, verticalAlign, col1Align, col2Align, col3Align, backgroundColor }) => {
        const First = columnOne;
        const Second = columnTwo;
        const Third = columnThree;
        const resolveAlign = (v: string) => v === "middle" ? "center" : v === "bottom" ? "end" : "start";
        const rowAlign = resolveAlign(verticalAlign);
        const colAlign = (override: string) => override === "auto" ? undefined : resolveAlign(override);

        const widthMap: Record<string, string> = {
          "equal": columns === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
          "1-2": "1fr 2fr",
          "2-1": "2fr 1fr",
          "1-3": "1fr 3fr",
          "3-1": "3fr 1fr",
          "1-1-1": "1fr 1fr 1fr",
          "1-2-1": "1fr 2fr 1fr",
          "2-1-1": "2fr 1fr 1fr",
          "1-1-2": "1fr 1fr 2fr",
        };
        const gridCols = widthMap[columnWidths] || (columns === 3 ? "1fr 1fr 1fr" : "1fr 1fr");

        return (
          <div
            className="grid"
            style={{
              gridTemplateColumns: gridCols,
              gap,
              alignItems: rowAlign,
              backgroundColor: normalizeOptionalColor(backgroundColor, "transparent"),
            }}
          >
            <div className="min-w-0" style={{ alignSelf: colAlign(col1Align) }}>{First ? <First /> : null}</div>
            <div className="min-w-0" style={{ alignSelf: colAlign(col2Align) }}>{Second ? <Second /> : null}</div>
            {columns === 3 ? <div className="min-w-0" style={{ alignSelf: colAlign(col3Align) }}>{Third ? <Third /> : null}</div> : null}
          </div>
        );
      },
    },

    ColumnBlock: {
      label: "Column",
      fields: {
        content: { type: "slot", label: "Container content" },
        backgroundColor: { type: "text", label: "Background color" },
        padding: { type: "text", label: "Padding" },
        radius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      defaultProps: {
        backgroundColor: "",
        padding: "20px",
        radius: "lg",
        shadow: "none",
      } as any,
      render: ({ content, backgroundColor, padding, radius, shadow }) => {
        const theme = getThemeTokens(getStorefrontData()?.store);
        const Content = content;
        return (
          <div
            style={{
              padding,
              backgroundColor: normalizeOptionalColor(backgroundColor, theme.surface),
              borderRadius: resolveRadius(radius),
              boxShadow: resolveShadow(shadow),
              border: `1px solid ${theme.border}`,
            }}
          >
            {Content ? <Content /> : null}
          </div>
        );
      },
    },

    /* ─────────── Store Header ─────────── */
    StoreHeader: {
      label: "Store Header",
      fields: {
        homeLabel: { type: "text", label: "Home label" },
        productsLabel: { type: "text", label: "Products label" },
        showCategories: { type: "radio", label: "Show category links", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showCollections: { type: "radio", label: "Show collection links", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showPages: { type: "radio", label: "Show custom page links", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showSearch: { type: "radio", label: "Show search icon", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showAuth: { type: "radio", label: "Show login/account", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showCart: { type: "radio", label: "Show cart button", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        cartLabel: { type: "text", label: "Cart label" },
        showLogo: { type: "radio", label: "Show logo if available", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: {
        homeLabel: "Home",
        productsLabel: "Products",
        showCategories: true,
        showCollections: true,
        showPages: true,
        showSearch: true,
        showAuth: true,
        showCart: true,
        cartLabel: "Cart",
        showLogo: true,
      },
      render: (props) => {
        // Explicitly default booleans — saved layouts from before the rewrite won't have these keys
        const homeLabel = props.homeLabel ?? "Home";
        const productsLabel = props.productsLabel ?? "Products";
        const showCollections = props.showCollections ?? true;
        const showPages = props.showPages ?? true;
        const showSearch = props.showSearch ?? true;
        const showAuth = props.showAuth ?? true;
        const showCart = props.showCart ?? true;
        const cartLabel = props.cartLabel ?? "Cart";
        const showLogo = props.showLogo ?? true;

        const data = getStorefrontData();
        const store = data?.store;
        if (!store) return <></>;
        const theme = getThemeTokens(store);
        const collections = showCollections ? (data?.collections || []).slice(0, 3) : [];
        const pages = showPages ? (data?.pages || []).filter(p => p.slug !== "index") : [];
        const isDark = store.theme_mode === "dark";

        return (
          <header
            className="sticky top-0 z-50 border-b backdrop-blur-sm shadow-sm"
            style={{
              borderColor: theme.border,
              backgroundColor: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)",
            }}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between gap-4">
                {/* Logo / Store name */}
                <Link href={`/store/${store.slug}`} className="flex items-center gap-3 shrink-0">
                  {showLogo && store.logo ? (
                    <Image
                      src={resolveMediaUrl(store.logo)}
                      alt={store.name}
                      width={120}
                      height={36}
                      className="h-9 w-auto object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xl font-bold tracking-tight" style={{ color: theme.primary }}>
                      {store.name}
                    </span>
                  )}
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                  <Link
                    href={`/store/${store.slug}`}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: theme.textSecondary }}
                  >
                    {homeLabel}
                  </Link>
                  <Link
                    href={`/store/${store.slug}/products`}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: theme.textSecondary }}
                  >
                    {productsLabel}
                  </Link>
                  <Link
                    href={`/store/${store.slug}/categories`}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80 border border-blue-500 text-blue-600 ml-2"
                    style={{ borderColor: theme.primary, color: theme.primary }}
                  >
                    Toutes les catégories
                  </Link>
                  {collections.map((col) => (
                    <Link
                      key={col.id}
                      href={`/store/${store.slug}/collections/${col.slug}`}
                      className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: theme.textSecondary }}
                    >
                      {col.name}
                    </Link>
                  ))}
                  {pages.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/store/${store.slug}/p/${page.slug}`}
                      className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: theme.textSecondary }}
                    >
                      {page.title}
                    </Link>
                  ))}
                </nav>

                {/* Right actions: search, auth, cart */}
                <div className="flex items-center gap-1 shrink-0">
                  {showSearch && (
                    <Link
                      href={`/store/${store.slug}/products`}
                      className="p-2 rounded-md transition-colors hover:opacity-80"
                      style={{ color: theme.textMuted }}
                      aria-label="Search"
                    >
                      <Search className="w-5 h-5" />
                    </Link>
                  )}
                  {showAuth && (
                    <StorefrontAuthButton slug={store.slug} />
                  )}
                  {showCart && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span className="hidden sm:inline">{cartLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        );
      },
    },

    /* ─────────── Store Navigation ─────────── */
    StoreNavigation: {
      label: "Store Navigation",
      fields: {
        homeLabel: { type: "text", label: "Home label" },
        productsLabel: { type: "text", label: "Products label" },
        showCategories: { type: "radio", label: "Show categories links", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showCollections: { type: "radio", label: "Show collections links", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        featuredCategorySlug: {
          type: "select",
          label: "Featured category",
          options: [{ label: "No featured category", value: "__all__" }],
        },
        featuredCollectionSlug: {
          type: "select",
          label: "Featured collection",
          options: [{ label: "No featured collection", value: "__all__" }],
        },
        ctaLabel: { type: "text", label: "CTA label" },
        ctaLink: { type: "text", label: "CTA link" },
        sticky: { type: "radio", label: "Sticky navigation", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: {
        homeLabel: "Home",
        productsLabel: "Products",
        showCategories: true,
        showCollections: true,
        featuredCategorySlug: "__all__",
        featuredCollectionSlug: "__all__",
        ctaLabel: "Shop now",
        ctaLink: "/products",
        sticky: true,
      },
      render: () => {
        // Navigation is now handled by StoreHeader — this component is kept for layout compatibility
        return <></>;
      },
    },

    /* ─────────── Store Footer ─────────── */
    StoreFooter: {
      label: "Store Footer",
      fields: {
        description: { type: "textarea", label: "Description" },
        showCategories: { type: "radio", label: "Show categories", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showCollections: { type: "radio", label: "Show collections", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showContact: { type: "radio", label: "Show contact info", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        copyrightText: { type: "text", label: "Copyright suffix" },
      },
      defaultProps: {
        description: "Tell customers what your store stands for and where they can reach you.",
        showCategories: true,
        showCollections: true,
        showContact: true,
        copyrightText: "All rights reserved.",
      },
      render: ({ description, showCategories, showCollections, showContact, copyrightText }) => {
        const data = getStorefrontData();
        const store = data?.store;
        if (!store) return <></>;
        const theme = getThemeTokens(store);
        const categories = showCategories ? (data?.categories || []).slice(0, 5) : [];
        const collections = showCollections ? (data?.collections || []).slice(0, 5) : [];

        return (
          <footer className="mt-16 px-4 py-12" style={{ backgroundColor: theme.surfaceAlt, borderTop: `1px solid ${theme.border}` }}>
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
              <div>
                <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>{store.name}</h3>
                {description && <p className="mt-3 max-w-md text-sm leading-6" style={{ color: theme.textSecondary }}>{description}</p>}
                {showContact && (
                  <div className="mt-4 space-y-2 text-sm" style={{ color: theme.textSecondary }}>
                    {store.email && <p>{store.email}</p>}
                    {store.phone && <p>{store.phone}</p>}
                    {store.address && <p>{store.address}</p>}
                  </div>
                )}
              </div>
              {showCategories && categories.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textPrimary }}>Categories</h4>
                  <ul className="mt-4 space-y-2 text-sm">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link href={`/store/${store.slug}/categories/${category.slug}`} style={{ color: theme.textSecondary }}>
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showCollections && collections.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textPrimary }}>Collections</h4>
                  <ul className="mt-4 space-y-2 text-sm">
                    {collections.map((collection) => (
                      <li key={collection.id}>
                        <Link href={`/store/${store.slug}/collections/${collection.slug}`} style={{ color: theme.textSecondary }}>
                          {collection.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mx-auto mt-10 max-w-7xl border-t pt-5 text-xs" style={{ borderColor: theme.border, color: theme.textMuted }}>
              © {new Date().getFullYear()} {store.name}. {copyrightText}
            </div>
          </footer>
        );
      },
    },

    /* ─────────── Hero Block ─────────── */
    HeroBlock: {
      label: "Hero Banner",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" },
          ],
        },
        ctaLabel: { type: "text", label: "Button text" },
        ctaLink: { type: "text", label: "Button link" },
        secondCtaLabel: { type: "text", label: "Second button text (optional)" },
        secondCtaLink: { type: "text", label: "Second button link" },
        textColor: { type: "text", label: "Text color" },
        backgroundColor: { type: "text", label: "Background color" },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonRadius: {
          type: "select",
          label: "Button radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
            { label: "Full", value: "full" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        alignment: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        backgroundImage: { type: "text", label: "Background image URL" },
        showOverlay: { type: "radio", label: "Dark overlay", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        minHeight: { type: "text", label: "Min height (CSS)" },
      },
      defaultProps: {
        title: "Welcome to Our Store",
        subtitle: "Discover our latest products and exclusive offers",
        titleSize: "medium",
        ctaLabel: "Shop Now",
        ctaLink: "/products",
        secondCtaLabel: "",
        secondCtaLink: "",
        textColor: "",
        backgroundColor: "",
        titleWeight: "bold",
        bodySize: "lg",
        buttonSize: "md",
        buttonRadius: "full",
        shadow: "none",
        spacing: "md",
        alignment: "center",
        backgroundImage: "",
        showOverlay: false,
        minHeight: "420px",
      },
      render: ({ title, subtitle, ctaLabel, ctaLink, alignment, backgroundImage, showOverlay, minHeight, titleSize, titleWeight, bodySize, buttonSize, buttonRadius, shadow, secondCtaLabel, secondCtaLink, textColor, backgroundColor, spacing }) => {
        const data = getStorefrontData();
        const store = data?.store;
        const theme = getThemeTokens(store);
        const slug = store?.slug || "";
        const href = resolveStoreHref(slug, ctaLink);
        const alignClass = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
        const resolvedTextColor = normalizeOptionalColor(textColor, theme.textPrimary);
        const resolvedBackground = backgroundImage ? undefined : normalizeOptionalColor(backgroundColor, "transparent");

        return (
          <section
            className={`relative overflow-hidden px-4 ${resolveSectionPadding(spacing)}`}
            style={{
              minHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: resolveShadow(shadow),
              background: backgroundImage
                ? `url(${backgroundImage}) center/cover no-repeat`
                : resolvedBackground || theme.heroGradient,
            }}
          >
            {showOverlay && backgroundImage && (
              <div className="absolute inset-0 bg-black/40" />
            )}
            <div className={`relative mx-auto max-w-4xl py-20 ${alignClass}`}>
              <h1 className="mb-6 tracking-tight" style={{ ...titleStyle(titleSize === "small" ? "md" : titleSize === "large" ? "xl" : "lg", titleWeight), color: showOverlay && backgroundImage ? "#ffffff" : resolvedTextColor }}>
                {title}
              </h1>
              <p
                className={`mb-10 max-w-2xl ${alignment === "center" ? "mx-auto" : ""} ${
                  showOverlay && backgroundImage ? "text-white/90" : ""
                }`}
                style={{ ...bodyStyle(bodySize), color: showOverlay && backgroundImage ? "rgba(255,255,255,0.9)" : normalizeOptionalColor(textColor, theme.textSecondary) }}
              >
                {subtitle}
              </p>
              <div className={`flex flex-wrap gap-3 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
                {ctaLabel && (
                  <Link
                    href={href}
                    className={`inline-flex items-center gap-2 font-semibold text-white transition-all hover:opacity-90 hover:scale-105 ${resolveButtonSizeClasses(buttonSize)}`}
                    style={{ backgroundColor: theme.primary, borderRadius: resolveRadius(buttonRadius) }}
                  >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {secondCtaLabel && (
                  <Link
                    href={resolveStoreHref(slug, secondCtaLink)}
                    className={`inline-flex items-center gap-2 font-semibold transition-all hover:opacity-90 hover:scale-105 border-2 ${resolveButtonSizeClasses(buttonSize)}`}
                    style={{ borderColor: theme.primary, color: showOverlay && backgroundImage ? "#fff" : theme.primary, borderRadius: resolveRadius(buttonRadius) }}
                  >
                    {secondCtaLabel}
                  </Link>
                )}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Announcement Bar ─────────── */
    AnnouncementBar: {
      label: "Announcement Bar",
      fields: {
        text: { type: "text", label: "Message" },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        link: { type: "text", label: "Link (optional)" },
      },
      defaultProps: {
        text: "🎉 Free shipping on orders over €50!",
        backgroundColor: "#1e293b",
        textColor: "#ffffff",
        link: "",
      },
      render: ({ text, backgroundColor, textColor, link }) => {
        const inner = (
          <div
            className="py-2.5 px-4 text-center text-sm font-medium"
            style={{ backgroundColor, color: textColor }}
          >
            {text}
          </div>
        );
        if (link) {
          const data = getStorefrontData();
          const slug = data?.store?.slug || "";
          const href = link.startsWith("/") ? `/store/${slug}${link}` : link;
          return <Link href={href}>{inner}</Link>;
        }
        return inner;
      },
    },

    /* ─────────── Featured Products ─────────── */
    FeaturedProducts: {
      label: "Featured Products",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        maxProducts: {
          type: "select",
          label: "Max products",
          options: [
            { label: "4", value: 4 },
            { label: "6", value: 6 },
            { label: "8", value: 8 },
            { label: "12", value: 12 },
          ],
        },
        source: {
          type: "select",
          label: "Source",
          options: [
            { label: "All products", value: "all" },
            { label: "Products from one category", value: "category" },
            { label: "Products from one collection", value: "collection" },
          ],
        },
        categorySlug: {
          type: "select",
          label: "Category",
          options: [{ label: "All categories", value: "__all__" }],
        },
        collectionSlug: {
          type: "select",
          label: "Collection",
          options: [{ label: "All collections", value: "__all__" }],
        },
        cardStyle: {
          type: "select",
          label: "Card style",
          options: [
            { label: "Default", value: "default" },
            { label: "Minimal (no border)", value: "minimal" },
            { label: "Shadow", value: "shadow" },
          ],
        },
        showBrand: { type: "radio", label: "Show brand name", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showSaleBadge: { type: "radio", label: "Show sale badge", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        sortBy: {
          type: "select",
          label: "Sort order",
          options: [
            { label: "Default", value: "default" },
            { label: "Newest first", value: "newest" },
            { label: "Price: low to high", value: "price-asc" },
            { label: "Price: high to low", value: "price-desc" },
          ],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        showViewAll: { type: "radio", label: "Show 'View All' link", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: {
        title: "Our Products",
        subtitle: "",
        columns: 4,
        maxProducts: 8,
        source: "all",
        categorySlug: "__all__",
        collectionSlug: "__all__",
        showViewAll: true,
        cardStyle: "default",
        showBrand: true,
        showSaleBadge: true,
        sortBy: "default",
        backgroundColor: "",
        titleSize: "md",
        titleWeight: "bold",
        cardRadius: "lg",
        shadow: "none",
        spacing: "md",
      },
      render: ({ title, subtitle, columns, maxProducts, source, categorySlug, collectionSlug, showViewAll, cardStyle, showBrand, showSaleBadge, sortBy, backgroundColor, titleSize, titleWeight, cardRadius, shadow, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <div className="py-16 text-center text-gray-400">Loading products…</div>;

        const { store, products } = data;
        const theme = getThemeTokens(store);
        const sectionBackground = normalizeOptionalColor(backgroundColor, "transparent");
        let filtered = [...products];
        if (source === "category" && categorySlug !== "__all__") {
          filtered = filtered.filter((product) => product.category?.slug === categorySlug);
        }
        if (source === "collection" && collectionSlug !== "__all__") {
          filtered = filtered.filter((product) => product.collections?.some((collection) => collection.slug === collectionSlug));
        }
        const sorted = [...filtered];
        if (sortBy === "newest") sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        else if (sortBy === "price-asc") sorted.sort((a, b) => a.effective_price - b.effective_price);
        else if (sortBy === "price-desc") sorted.sort((a, b) => b.effective_price - a.effective_price);
        const shown = sorted.slice(0, maxProducts);
        const gridClass =
          columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
                  {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
                </div>
                {showViewAll && (
                  <Link
                    href={`/store/${store.slug}/products`}
                    className="text-sm font-medium flex items-center gap-1 hover:opacity-80"
                    style={{ color: theme.primary }}
                  >
                    {translatePuckText("View all")} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className={`grid ${gridClass} gap-4 sm:gap-6`}>
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} slug={store.slug} currency={store.currency} cardStyle={cardStyle} showBrand={showBrand} showSaleBadge={showSaleBadge} radius={cardRadius} shadow={shadow} />
                ))}
              </div>
              {shown.length === 0 && (
                <p className="py-12 text-center" style={{ color: theme.textMuted }}>{translatePuckText("No products to display yet.")}</p>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Categories Grid ─────────── */
    CategoriesGrid: {
      label: "Categories Grid",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "3", value: 3 },
            { label: "4", value: 4 },
            { label: "6", value: 6 },
          ],
        },
        style: {
          type: "select",
          label: "Card style",
          options: [
            { label: "Cards", value: "cards" },
            { label: "Circles", value: "circles" },
            { label: "Minimal", value: "minimal" },
          ],
        },
        maxItems: {
          type: "select",
          label: "Max categories",
          options: [
            { label: "3", value: 3 },
            { label: "4", value: 4 },
            { label: "6", value: 6 },
            { label: "8", value: 8 },
            { label: "12", value: 12 },
          ],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
      },
      defaultProps: { title: "Shop by Category", subtitle: "", columns: 6, style: "cards", maxItems: 6, backgroundColor: "", titleSize: "lg", titleWeight: "bold", cardRadius: "lg", shadow: "sm", spacing: "md" },
      render: ({ title, subtitle, columns, style, maxItems, backgroundColor, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, categories } = data;
        if (categories.length === 0) {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
              <div className="mx-auto max-w-7xl">
                <EmptyBlockState title={translatePuckText("No categories yet")} description={translatePuckText("Create categories in the dashboard to use this block.")} />
              </div>
            </section>
          );
        }
        const theme = getThemeTokens(store);
        const visibleCategories = categories.slice(0, maxItems);
        const sectionBackground = normalizeOptionalColor(backgroundColor, theme.surfaceMuted);
        const gridClass =
          columns === 3
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : columns === 4
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ background: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.textPrimary }}>{title}</h2>
                {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
              </div>
              <div className={`grid ${gridClass} gap-4`}>
                {visibleCategories.map((cat) => {
                  if (style === "circles") {
                    return (
                      <Link
                        key={cat.id}
                        href={`/store/${store.slug}/categories/${cat.slug}`}
                        className="flex flex-col items-center gap-3 p-4 hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                          style={{ backgroundColor: theme.primary }}
                        >
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{cat.name}</span>
                      </Link>
                    );
                  }
                  if (style === "minimal") {
                    return (
                      <Link
                        key={cat.id}
                        href={`/store/${store.slug}/categories/${cat.slug}`}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg transition-colors"
                        style={{ color: theme.textSecondary, backgroundColor: theme.surface }}
                      >
                        <ChevronRight className="w-4 h-4" style={{ color: theme.primary }} />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </Link>
                    );
                  }
                  // cards (default)
                  return (
                    <Link
                      key={cat.id}
                      href={`/store/${store.slug}/categories/${cat.slug}`}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl transition-all text-center"
                      style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: theme.primary }}
                      >
                        {cat.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Collections Showcase ─────────── */
    CollectionsShowcase: {
      label: "Collections Showcase",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        maxItems: {
          type: "select",
          label: "Max collections",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
            { label: "6", value: 6 },
          ],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
      },
      defaultProps: { title: "Our Collections", subtitle: "", columns: 3, maxItems: 3, backgroundColor: "", titleSize: "lg", titleWeight: "bold", cardRadius: "xl", shadow: "sm", spacing: "md" },
      render: ({ title, subtitle, columns, maxItems, backgroundColor, titleSize, titleWeight, cardRadius, shadow, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, collections } = data;
        if (collections.length === 0) {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
              <div className="mx-auto max-w-7xl">
                <EmptyBlockState title={translatePuckText("No collections yet")} description={translatePuckText("Create collections in the dashboard to use this block.")} />
              </div>
            </section>
          );
        }
        const theme = getThemeTokens(store);
        const visibleCollections = collections.slice(0, maxItems);
        const sectionBackground = normalizeOptionalColor(backgroundColor, "transparent");
        const gridClass =
          columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : columns === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-10">
                <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
                {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
              </div>
              <div className={`grid ${gridClass} gap-6`}>
                {visibleCollections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/store/${store.slug}/collections/${col.slug}`}
                    className="group relative overflow-hidden hover:shadow-lg transition-all"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}
                  >
                    <div
                      className="h-48 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${withAlpha(theme.primary, "20")}, ${withAlpha(theme.primary, "05")})` }}
                    >
                      <ShoppingBag className="w-12 h-12 group-hover:scale-110 transition-transform" style={{ color: theme.textMuted }} />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold group-hover:underline" style={{ color: theme.textPrimary }}>{col.name}</h3>
                      <span className="text-sm flex items-center gap-1 mt-1" style={{ color: theme.textSecondary }}>
                        {translatePuckText("Browse collection")} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Handpicked Products ─────────── */
    HandpickedProducts: {
      label: "Handpicked Products",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        productSlugs: {
          type: "custom" as const,
          label: "Products",
          render: ({ value, onChange, readOnly }: { value: string[]; onChange: (v: string[]) => void; readOnly?: boolean }) => {
            const products = getStorefrontData()?.products ?? [];
            const selected: string[] = Array.isArray(value) ? value : [];
            return (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2">
                {products.length === 0 && <p className="text-xs text-slate-400">No products available.</p>}
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={selected.includes(p.slug)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...selected, p.slug] : selected.filter((s) => s !== p.slug);
                        onChange(next);
                      }}
                    />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
              </div>
            );
          },
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [{ label: "2", value: 2 }, { label: "3", value: 3 }, { label: "4", value: 4 }],
        },
        cardStyle: {
          type: "select",
          label: "Card style",
          options: [{ label: "Default", value: "default" }, { label: "Minimal", value: "minimal" }, { label: "Shadow", value: "shadow" }],
        },
        showBrand: { type: "select", label: "Show brand", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        showSaleBadge: { type: "select", label: "Show sale badge", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "XL", value: "xl" }],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [{ label: "Regular", value: "regular" }, { label: "Medium", value: "medium" }, { label: "Semi-bold", value: "semibold" }, { label: "Bold", value: "bold" }],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [{ label: "Compact", value: "sm" }, { label: "Comfortable", value: "md" }, { label: "Spacious", value: "lg" }],
        },
      },
      defaultProps: {
        title: "Our Selection",
        subtitle: "",
        productSlugs: [],
        columns: 4,
        cardStyle: "default",
        showBrand: true,
        showSaleBadge: true,
        cardRadius: "lg",
        shadow: "none",
        backgroundColor: "",
        titleSize: "md",
        titleWeight: "bold",
        spacing: "md",
      },
      render: ({ title, subtitle, productSlugs, columns, cardStyle, showBrand, showSaleBadge, cardRadius, shadow, backgroundColor, titleSize, titleWeight, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <div className="py-16 text-center text-gray-400">Loading products…</div>;
        const { store, products } = data;
        const theme = getThemeTokens(store);
        const slugSet = new Set<string>(Array.isArray(productSlugs) ? productSlugs : []);
        const shown = slugSet.size > 0 ? products.filter((p) => slugSet.has(p.slug)) : [];
        const gridClass = columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
        const sectionBackground = normalizeOptionalColor(backgroundColor, "transparent");
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              {(title || subtitle) && (
                <div className="mb-10">
                  {title && <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>}
                  {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
                </div>
              )}
              {shown.length === 0 ? (
                <p className="py-12 text-center" style={{ color: theme.textMuted }}>{translatePuckText("No products selected yet.")}</p>
              ) : (
                <div className={`grid ${gridClass} gap-4 sm:gap-6`}>
                  {shown.map((p) => (
                    <ProductCard key={p.id} product={p} slug={store.slug} currency={store.currency} cardStyle={cardStyle} showBrand={showBrand} showSaleBadge={showSaleBadge} radius={cardRadius} shadow={shadow} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Handpicked Categories ─────────── */
    HandpickedCategories: {
      label: "Handpicked Categories",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        categorySlugs: {
          type: "custom" as const,
          label: "Categories",
          render: ({ value, onChange, readOnly }: { value: string[]; onChange: (v: string[]) => void; readOnly?: boolean }) => {
            const categories = getStorefrontData()?.categories ?? [];
            const selected: string[] = Array.isArray(value) ? value : [];
            return (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2">
                {categories.length === 0 && <p className="text-xs text-slate-400">No categories available.</p>}
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={selected.includes(c.slug)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...selected, c.slug] : selected.filter((s) => s !== c.slug);
                        onChange(next);
                      }}
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            );
          },
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [{ label: "3", value: 3 }, { label: "4", value: 4 }, { label: "6", value: 6 }],
        },
        style: {
          type: "select",
          label: "Card style",
          options: [{ label: "Cards", value: "cards" }, { label: "Circles", value: "circles" }, { label: "Minimal", value: "minimal" }],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [{ label: "Regular", value: "regular" }, { label: "Medium", value: "medium" }, { label: "Semi-bold", value: "semibold" }, { label: "Bold", value: "bold" }],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "XL", value: "xl" }, { label: "Full", value: "full" }],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [{ label: "Compact", value: "sm" }, { label: "Comfortable", value: "md" }, { label: "Spacious", value: "lg" }],
        },
      },
      defaultProps: {
        title: "Browse Categories",
        subtitle: "",
        categorySlugs: [],
        columns: 3,
        style: "cards",
        backgroundColor: "",
        titleSize: "md",
        titleWeight: "bold",
        cardRadius: "xl",
        shadow: "sm",
        spacing: "md",
      },
      render: ({ title, subtitle, categorySlugs, columns, style, backgroundColor, titleSize, titleWeight, cardRadius, shadow, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, categories } = data;
        const theme = getThemeTokens(store);
        const slugSet = new Set<string>(Array.isArray(categorySlugs) ? categorySlugs : []);
        const shown = slugSet.size > 0 ? categories.filter((c) => slugSet.has(c.slug)) : [];
        const sectionBackground = normalizeOptionalColor(backgroundColor, "transparent");
        const gridClass = columns === 6 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : columns === 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        const radiusClass = cardRadius === "full" ? "9999px" : cardRadius === "xl" ? "1rem" : cardRadius === "lg" ? "0.75rem" : cardRadius === "md" ? "0.5rem" : cardRadius === "sm" ? "0.25rem" : "0";
        const shadowClass = shadow === "lg" ? "0 10px 25px rgba(0,0,0,0.12)" : shadow === "md" ? "0 4px 12px rgba(0,0,0,0.08)" : shadow === "sm" ? "0 1px 4px rgba(0,0,0,0.06)" : "none";
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              {(title || subtitle) && (
                <div className="mb-10">
                  {title && <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>}
                  {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
                </div>
              )}
              {shown.length === 0 ? (
                <p className="py-12 text-center" style={{ color: theme.textMuted }}>No categories selected yet.</p>
              ) : (
                <div className={`grid ${gridClass} gap-4`}>
                  {shown.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/store/${store.slug}/categories/${cat.slug}`}
                      className="group flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1"
                      style={{ borderRadius: radiusClass, boxShadow: shadowClass, backgroundColor: theme.surface, border: `1px solid ${theme.border}`, padding: "1.25rem 1rem" }}
                    >
                      {style === "circles" && (
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(theme.primary, "20") }}>
                          <Tag className="h-6 w-6" style={{ color: theme.primary }} />
                        </div>
                      )}
                      <span className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{cat.name}</span>
                      {cat.description && style !== "minimal" && (
                        <span className="mt-1 text-xs line-clamp-2" style={{ color: theme.textSecondary }}>{cat.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Category Spotlight ─────────── */
    CategorySpotlight: {
      label: "Category Spotlight",
      fields: {
        categorySlug: { type: "text", label: "Category slug" },
        showProducts: { type: "select", label: "Show products", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        maxProducts: {
          type: "select",
          label: "Max products",
          options: [{ label: "3", value: 3 }, { label: "4", value: 4 }, { label: "6", value: 6 }, { label: "8", value: 8 }],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [{ label: "Regular", value: "regular" }, { label: "Medium", value: "medium" }, { label: "Semi-bold", value: "semibold" }, { label: "Bold", value: "bold" }],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "XL", value: "xl" }],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [{ label: "Compact", value: "sm" }, { label: "Comfortable", value: "md" }, { label: "Spacious", value: "lg" }],
        },
      },
      defaultProps: {
        categorySlug: "",
        showProducts: true,
        maxProducts: 4,
        backgroundColor: "",
        titleSize: "lg",
        titleWeight: "bold",
        cardRadius: "lg",
        shadow: "none",
        spacing: "md",
      },
      render: ({ categorySlug, showProducts, maxProducts, backgroundColor, titleSize, titleWeight, cardRadius, shadow, spacing }) => {
        const data = getStorefrontData();
        if (!data) return <></>;
        const { store, categories, products } = data;
        const theme = getThemeTokens(store);
        const sectionBackground = normalizeOptionalColor(backgroundColor, "transparent");
        const category = categories.find((c) => c.slug === categorySlug);
        if (!category) {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
              <div className="mx-auto max-w-7xl">
                <p className="py-12 text-center text-sm" style={{ color: theme.textMuted }}>
                  {categorySlug ? `Category "${categorySlug}" not found.` : "Select a category in the editor panel."}
                </p>
              </div>
            </section>
          );
        }
        const categoryProducts = showProducts ? products.filter((p) => p.category?.slug === category.slug).slice(0, maxProducts) : [];
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: sectionBackground }}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-8">
                <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{category.name}</h2>
                {category.description && (
                  <p className="mt-3 max-w-2xl text-base" style={{ color: theme.textSecondary }}>{category.description}</p>
                )}
                <Link href={`/store/${store.slug}/categories/${category.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:opacity-80" style={{ color: theme.primary }}>
                  {translatePuckText("View all")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {showProducts && categoryProducts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {categoryProducts.map((p) => (
                    <ProductCard key={p.id} product={p} slug={store.slug} currency={store.currency} cardStyle="default" showBrand={false} showSaleBadge radius={cardRadius} shadow={shadow} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Promo Grid ─────────── */
    PromoGrid: {
      label: "Promo Grid",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "text", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        minTileHeight: { type: "text", label: "Tile minimum height" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        items: {
          type: "array",
          label: "Promo tiles",
          arrayFields: {
            eyebrow: { type: "text", label: "Eyebrow" },
            heading: { type: "text", label: "Heading" },
            description: { type: "textarea", label: "Description" },
            linkLabel: { type: "text", label: "Button label" },
            link: { type: "text", label: "Button link" },
            backgroundImage: { type: "text", label: "Background image URL" },
            accentColor: { type: "text", label: "Accent color" },
          },
          defaultItemProps: {
            eyebrow: "Featured",
            heading: "Seasonal campaign",
            description: "Highlight a promotion, category, or curated collection.",
            linkLabel: "Explore",
            link: "/products",
            backgroundImage: "",
            accentColor: "#2563eb",
          },
        },
      },
      defaultProps: {
        title: "Shop the moment",
        subtitle: "Guide customers into your most important campaigns.",
        columns: 3,
        spacing: "md",
        minTileHeight: "280px",
        titleSize: "lg",
        titleWeight: "bold",
        cardRadius: "xl",
        shadow: "none",
        buttonSize: "md",
        items: [
          {
            eyebrow: "New",
            heading: "Fresh arrivals",
            description: "Put the newest products in front of returning shoppers.",
            linkLabel: "See what is new",
            link: "/products",
            backgroundImage: "",
            accentColor: "#2563eb",
          },
          {
            eyebrow: "Collections",
            heading: "Gift-ready picks",
            description: "Send customers straight to your best curated collection.",
            linkLabel: "Browse collections",
            link: "/collections",
            backgroundImage: "",
            accentColor: "#0f766e",
          },
          {
            eyebrow: "Limited",
            heading: "This week only",
            description: "Use a clear merchandising tile for a limited-time push.",
            linkLabel: "View offer",
            link: "/products",
            backgroundImage: "",
            accentColor: "#c2410c",
          },
        ],
      },
      render: ({ title, subtitle, columns, spacing, minTileHeight, titleSize, titleWeight, cardRadius, shadow, buttonSize, items }) => {
        const data = getStorefrontData();
        const slug = data?.store?.slug || "";
        const theme = getThemeTokens(data?.store);
        const gridClass = columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3";
        const visibleItems = items.filter((item) => item.heading && item.linkLabel);
        const btnPad = buttonSize === "sm" ? "px-4 py-2 text-xs" : buttonSize === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm";

        if (visibleItems.length === 0) return <></>;

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 text-center">
                <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
                {subtitle && <p className="mt-2" style={{ color: theme.textSecondary }}>{subtitle}</p>}
              </div>
              <div className={`grid ${gridClass} gap-5`}>
                {visibleItems.map((item, index) => {
                  const href = resolveStoreHref(slug, item.link);
                  const accentColor = item.accentColor || data?.store?.theme_primary_color || "#2563eb";
                  return (
                    <article
                      key={`${item.heading}-${index}`}
                      className="relative overflow-hidden border border-gray-200 p-6 text-white"
                      style={{
                        borderRadius: resolveRadius(cardRadius),
                        boxShadow: resolveShadow(shadow),
                        background: item.backgroundImage
                          ? `linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.72)), url(${item.backgroundImage}) center/cover no-repeat`
                          : `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                        minHeight: minTileHeight,
                      }}
                    >
                      <div className="relative flex h-full flex-col justify-between gap-6">
                        <div>
                          {item.eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">{item.eyebrow}</p>}
                          <h3 className="mt-3 text-2xl font-semibold">{item.heading}</h3>
                          {item.description && <p className="mt-3 max-w-xs text-sm text-white/85">{item.description}</p>}
                        </div>
                        <div>
                          <Link
                            href={href}
                            className={`inline-flex items-center gap-2 rounded-full bg-white font-semibold text-slate-900 transition-opacity hover:opacity-90 ${btnPad}`}
                          >
                            {item.linkLabel}
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Product Spotlight ─────────── */
    ProductSpotlight: {
      label: "Product Spotlight",
      fields: {
        title: { type: "text", label: "Section title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        productSlug: {
          type: "select",
          label: "Product",
          options: [{ label: "Use the first available product", value: "__auto__" }],
        },
        ctaLabel: { type: "text", label: "Button label" },
        fallbackToFirstProduct: { type: "radio", label: "Fallback to first product if slug is missing", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Image left", value: "image-left" },
            { label: "Image right", value: "image-right" },
          ],
        },
        backgroundStyle: {
          type: "select",
          label: "Background style",
          options: [
            { label: "Muted", value: "muted" },
            { label: "Card", value: "card" },
            { label: "Outline", value: "outline" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        showSaleBadge: { type: "radio", label: "Show sale badge", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      defaultProps: {
        title: "Spotlight product",
        subtitle: "Feature one product with more context than a normal grid card.",
        productSlug: "__auto__",
        ctaLabel: "View product",
        fallbackToFirstProduct: true,
        layout: "image-left",
        backgroundStyle: "muted",
        spacing: "md",
        backgroundColor: "",
        showSaleBadge: true,
        titleSize: "lg",
        titleWeight: "bold",
        cardRadius: "xl",
        shadow: "sm",
        buttonSize: "md",
      },
      render: ({ title, subtitle, productSlug, ctaLabel, fallbackToFirstProduct, layout, backgroundStyle, showSaleBadge, spacing, backgroundColor, titleSize, titleWeight, cardRadius, shadow, buttonSize }) => {
        const data = getStorefrontData();
        if (!data) return <></>;

        const { store, products } = data;
        const theme = getThemeTokens(store);
        const matchedProduct = productSlug && productSlug !== "__auto__"
          ? products.find((product) => product.slug === productSlug)
          : undefined;
        const product = matchedProduct || (fallbackToFirstProduct ? products[0] : undefined);
        const btnPad = buttonSize === "sm" ? "px-4 py-2 text-xs" : buttonSize === "lg" ? "px-7 py-3.5 text-base" : "px-6 py-3 text-sm";

        if (!product) {
          return (
            <section className="py-16 px-4">
              <div className="mx-auto max-w-4xl border border-dashed px-6 py-12 text-center text-sm" style={{ borderColor: theme.border, color: theme.textSecondary, borderRadius: resolveRadius(cardRadius) }}>
                {translatePuckText("Add a product slug to the spotlight block, or keep fallback enabled so it uses the first live product.")}
              </div>
            </section>
          );
        }

        const image = product.images?.[0];
        const href = `/store/${store.slug}/products/${product.slug}`;
        const wrapperStyle = backgroundStyle === "muted"
          ? { background: isHexColor(backgroundColor) ? backgroundColor : withAlpha(store.theme_primary_color || "#2563eb", theme.isDark ? "18" : "10"), borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }
          : backgroundStyle === "card"
          ? { backgroundColor: normalizeOptionalColor(backgroundColor, theme.surface), borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }
          : { backgroundColor: normalizeOptionalColor(backgroundColor, theme.surface), borderColor: theme.border, border: `1px solid ${theme.border}`, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) };
        const imageOrderClass = layout === "image-right" ? "lg:order-2" : "";
        const copyOrderClass = layout === "image-right" ? "lg:order-1" : "";

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
            <div className={`mx-auto max-w-6xl overflow-hidden`} style={wrapperStyle}>
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div className={`relative min-h-80 ${imageOrderClass}`} style={{ backgroundColor: theme.surfaceAlt }}>
                  {image ? (
                    <Image
                      src={resolveMediaUrl(image.url_large || image.url_medium || image.url)}
                      alt={image.alt_text || product.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ color: theme.textMuted }}>
                      <ShoppingBag className="w-16 h-16" />
                    </div>
                  )}
                  {showSaleBadge && product.is_on_sale && (
                    <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                      {translatePuckText("Sale")}
                    </span>
                  )}
                </div>
                <div className={`p-8 lg:p-12 ${copyOrderClass}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.primary }}>
                    {title}
                  </p>
                  <h2 className="mt-3 tracking-tight" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{product.title}</h2>
                  {(subtitle || product.description) && (
                    <p className="mt-4 text-base leading-7" style={{ color: theme.textSecondary }}>{subtitle || product.description}</p>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-bold" style={{ color: theme.textPrimary }}>{formatPrice(product.effective_price, store.currency)}</span>
                    {product.is_on_sale && (
                      <span className="text-base line-through" style={{ color: theme.textMuted }}>{formatPrice(product.price, store.currency)}</span>
                    )}
                    {!product.in_stock && (
                      <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: theme.secondary }}>{translatePuckText("Out of stock")}</span>
                    )}
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={href}
                      className={`inline-flex items-center gap-2 rounded-full font-semibold text-white transition-opacity hover:opacity-90 ${btnPad}`}
                      style={{ backgroundColor: theme.primary }}
                    >
                      {ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/store/${store.slug}/products`}
                      className={`inline-flex items-center gap-2 rounded-full border font-semibold transition-colors ${btnPad}`}
                      style={{ borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceAlt }}
                    >
                      {translatePuckText("Browse catalog")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Newsletter ─────────── */
    Newsletter: {
      label: "Newsletter",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },
        buttonLabel: { type: "text", label: "Button text" },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Banner (full-width)", value: "banner" },
            { label: "Card (centered)", value: "card" },
            { label: "Inline", value: "inline" },
          ],
        },
        collectName: { type: "radio", label: "Collect first name", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        emailPlaceholder: { type: "text", label: "Email placeholder" },
        successMessage: { type: "text", label: "Success message (optional)" },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body text size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
      },
      defaultProps: {
        title: "Stay Updated",
        subtitle: "Subscribe for exclusive offers and updates.",
        buttonLabel: "Subscribe",
        style: "card",
        collectName: false,
        emailPlaceholder: "your@email.com",
        successMessage: "",
        backgroundColor: "",
        textColor: "",
        titleSize: "lg",
        titleWeight: "bold",
        bodySize: "md",
        cardRadius: "xl",
        shadow: "none",
        buttonSize: "md",
        spacing: "md",
      },
      render: ({ title, subtitle, buttonLabel, style: nlStyle, collectName, emailPlaceholder, successMessage, backgroundColor, textColor, titleSize, titleWeight, bodySize, cardRadius, shadow, buttonSize, spacing }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const primary = data?.store?.theme_primary_color || "#2563eb";
        const slug = data?.store?.slug || "";
        const resolvedBackground = normalizeOptionalColor(backgroundColor, primary);
        const resolvedText = normalizeOptionalColor(textColor, "#ffffff");

        if (nlStyle === "inline") {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
              <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h3>
                  <p style={{ ...bodyStyle(bodySize), color: theme.textSecondary }}>{subtitle}</p>
                </div>
                <NewsletterForm slug={slug} buttonLabel={buttonLabel} primaryColor={primary} variant="inline" collectName={collectName} emailPlaceholder={emailPlaceholder} successMessage={successMessage} />
              </div>
            </section>
          );
        }

        if (nlStyle === "banner") {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: resolvedBackground, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}>
              <div className="mx-auto max-w-3xl text-center" style={{ color: resolvedText }}>
                <h2 style={{ ...titleStyle(titleSize, titleWeight), marginBottom: "0.5rem" }}>{title}</h2>
                <p className="mb-6" style={{ ...bodyStyle(bodySize), color: withAlpha(resolvedText, "CC") }}>{subtitle}</p>
                <NewsletterForm slug={slug} buttonLabel={buttonLabel} primaryColor={primary} variant="banner" collectName={collectName} emailPlaceholder={emailPlaceholder} successMessage={successMessage} />
              </div>
            </section>
          );
        }

        // card (default)
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
            <div
              className="mx-auto max-w-2xl p-10 text-center text-white"
              style={{ backgroundColor: resolvedBackground, color: resolvedText, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}
            >
              <h2 style={{ ...titleStyle(titleSize, titleWeight), marginBottom: "0.75rem" }}>{title}</h2>
              <p className="mb-8" style={{ ...bodyStyle(bodySize), color: withAlpha(resolvedText, "CC") }}>{subtitle}</p>
              <NewsletterForm slug={slug} buttonLabel={buttonLabel} primaryColor={primary} variant="card" collectName={collectName} emailPlaceholder={emailPlaceholder} successMessage={successMessage} />
            </div>
          </section>
        );
      },
    },

    /* ─────────── Rich Text ─────────── */
    RichText: {
      label: "Rich Text",
      fields: {
        content: { type: "textarea", label: "Content (HTML supported)" },
        alignment: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        maxWidth: { type: "text", label: "Max width" },
        textColor: { type: "text", label: "Text color" },
        backgroundColor: { type: "text", label: "Background color" },
        fontSize: {
          type: "select",
          label: "Font size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        fontWeight: {
          type: "select",
          label: "Font weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
      },
      defaultProps: { content: "<p>Add your content here...</p>", alignment: "center", maxWidth: "800px", textColor: "", backgroundColor: "", fontSize: "md", fontWeight: "regular", spacing: "md" },
      render: ({ content, alignment, maxWidth, textColor, backgroundColor, fontSize, fontWeight, spacing }) => {
        const theme = getThemeTokens(getStorefrontData()?.store);
        return (
        <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
          <div
            className="mx-auto prose prose-gray"
            style={{ maxWidth, textAlign: alignment, color: normalizeOptionalColor(textColor, theme.textPrimary), ...bodyStyle(fontSize, fontWeight) }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </section>
      );
      },
    },

    /* ─────────── Image Banner ─────────── */
    ImageBanner: {
      label: "Image Banner",
      fields: {
        imageUrl: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt text" },
        link: { type: "text", label: "Link (optional)" },
        height: { type: "text", label: "Height" },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        borderRadius: { type: "text", label: "Border radius" },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        overlay: { type: "radio", label: "Dark overlay", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        overlayText: { type: "text", label: "Overlay text" },
      },
      defaultProps: {
        imageUrl: "",
        alt: "Banner image",
        link: "",
        height: "300px",
        spacing: "md",
        borderRadius: "0px",
        cardRadius: "none",
        shadow: "none",
        overlay: false,
        overlayText: "",
      },
      render: ({ imageUrl, alt, link, height, overlay, overlayText, spacing, borderRadius, cardRadius, shadow }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const slug = data?.store?.slug || "";
        const href = link ? resolveStoreHref(slug, link) : link;
        const radius = borderRadius || resolveRadius(cardRadius);
        const inner = (
          <div className="relative overflow-hidden" style={{ height, borderRadius: radius, boxShadow: resolveShadow(shadow) }}>
            {imageUrl ? (
              <Image
                src={resolveMediaUrl(imageUrl)}
                alt={alt}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: theme.surfaceAlt, color: theme.textMuted }}>
                {translatePuckText("No image set")}
              </div>
            )}
            {overlay && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {overlayText && (
                  <p className="text-white text-2xl sm:text-3xl font-bold">{overlayText}</p>
                )}
              </div>
            )}
          </div>
        );
        if (href) {
          return <section className={`px-4 ${resolveSectionPadding(spacing)}`}><Link href={href}>{inner}</Link></section>;
        }
        return <section className={`px-4 ${resolveSectionPadding(spacing)}`}>{inner}</section>;
      },
    },

    /* ─────────── Spacer ─────────── */
    Spacer: {
      label: "Spacer",
      fields: {
        height: { type: "text", label: "Height (CSS value)" },
      },
      defaultProps: { height: "48px" },
      render: ({ height }) => <div style={{ height }} />,
    },

    /* ─────────── Divider ─────────── */
    Divider: {
      label: "Divider",
      fields: {
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        color: { type: "text", label: "Color" },
        width: { type: "text", label: "Max width" },
      },
      defaultProps: { style: "solid", color: "#e5e7eb", width: "100%" },
      render: ({ style: borderStyle, color, width }) => (
        <div className="px-4 py-4">
          <hr
            className="mx-auto border-0"
            style={{
              borderTop: `1px ${borderStyle} ${color}`,
              maxWidth: width,
            }}
          />
        </div>
      ),
    },

    /* ─────────── Testimonials ─────────── */
    Testimonials: {
      label: "Testimonials",
      fields: {
        title: { type: "text", label: "Section title" },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        cardBackgroundColor: { type: "text", label: "Card background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body text size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        items: {
          type: "array",
          label: "Testimonials",
          arrayFields: {
            quote: { type: "textarea", label: "Quote" },
            author: { type: "text", label: "Author" },
            role: { type: "text", label: "Role / Location" },
            rating: {
              type: "select",
              label: "Rating",
              options: [
                { label: "5 stars", value: 5 },
                { label: "4 stars", value: 4 },
                { label: "3 stars", value: 3 },
              ],
            },
          },
          defaultItemProps: {
            quote: "Amazing products and fast delivery!",
            author: "Customer",
            role: "",
            rating: 5,
          },
        },
      },
      defaultProps: {
        title: "What Our Customers Say",
        spacing: "md",
        backgroundColor: "",
        cardBackgroundColor: "",
        titleSize: "lg",
        titleWeight: "bold",
        bodySize: "sm",
        cardRadius: "xl",
        shadow: "none",
        items: [
          { quote: "Amazing products and fast delivery!", author: "Sarah L.", role: "Verified Buyer", rating: 5 },
          { quote: "Great quality, will order again.", author: "Marc D.", role: "Verified Buyer", rating: 5 },
        ],
      },
      render: ({ title, items, spacing, backgroundColor, cardBackgroundColor, titleSize, titleWeight, bodySize, cardRadius, shadow }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const primary = data?.store?.theme_primary_color || "#2563eb";
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className="mx-auto max-w-7xl">
              <h2 className="text-center mb-10" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, i) => (
                  <div key={i} className="p-6 space-y-4" style={{ border: `1px solid ${theme.border}`, backgroundColor: normalizeOptionalColor(cardBackgroundColor, theme.surface), borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}>
                    <div className="flex gap-0.5">
                      {Array.from({ length: item.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6" style={{ color: primary }} />
                    <p className="leading-relaxed" style={{ ...bodyStyle(bodySize), color: theme.textSecondary }}>{item.quote}</p>
                    <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
                      <p className="font-medium text-sm" style={{ color: theme.textPrimary }}>{item.author}</p>
                      {item.role && <p className="text-xs" style={{ color: theme.textMuted }}>{item.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Feature Columns ─────────── */
    FeatureColumns: {
      label: "Feature Columns",
      fields: {
        title: { type: "text", label: "Section title" },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body text size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        columns: {
          type: "array",
          label: "Features",
          arrayFields: {
            icon: {
              type: "select",
              label: "Icon",
              options: [
                { label: "Truck (shipping)", value: "truck" },
                { label: "Shield (security)", value: "shield" },
                { label: "Refresh (returns)", value: "refresh" },
                { label: "Clock (24/7)", value: "clock" },
                { label: "Star", value: "star" },
                { label: "Tag (deals)", value: "tag" },
              ],
            },
            heading: { type: "text", label: "Heading" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: {
            icon: "star",
            heading: "Feature",
            description: "Description of this feature.",
          },
        },
      },
      defaultProps: {
        title: "",
        spacing: "md",
        titleSize: "lg",
        titleWeight: "bold",
        bodySize: "sm",
        columns: [
          { icon: "truck", heading: "Free Shipping", description: "On all orders over €50" },
          { icon: "shield", heading: "Secure Payment", description: "100% secure checkout" },
          { icon: "refresh", heading: "Easy Returns", description: "30-day return policy" },
          { icon: "clock", heading: "24/7 Support", description: "We're here to help" },
        ],
      },
      render: ({ title, columns, spacing, titleSize, titleWeight, bodySize }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const primary = data?.store?.theme_primary_color || "#2563eb";
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
            <div className="mx-auto max-w-7xl">
              {title && (
                <h2 className="text-center mb-10" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {columns.map((col, i) => {
                  const IconComponent = ICON_MAP[col.icon] || Star;
                  return (
                    <div key={i} className="text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}15` }}>
                        <span style={{ color: primary }}><IconComponent className="w-6 h-6" /></span>
                      </div>
                      <h3 className="font-semibold" style={{ color: theme.textPrimary }}>{col.heading}</h3>
                      <p style={{ ...bodyStyle(bodySize), color: theme.textSecondary }}>{col.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Trust Badges ─────────── */
    TrustBadges: {
      label: "Trust Badges",
      fields: {
        items: {
          type: "array",
          label: "Badges",
          arrayFields: {
            icon: {
              type: "select",
              label: "Icon",
              options: [
                { label: "Shield", value: "shield" },
                { label: "Truck", value: "truck" },
                { label: "Refresh", value: "refresh" },
                { label: "Clock", value: "clock" },
                { label: "Star", value: "star" },
              ],
            },
            label: { type: "text", label: "Label" },
            description: { type: "text", label: "Description" },
          },
          defaultItemProps: { icon: "shield", label: "Trustworthy", description: "" },
        },
        style: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Horizontal", value: "horizontal" },
            { label: "Grid", value: "grid" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        bodySize: {
          type: "select",
          label: "Text size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      defaultProps: {
        items: [
          { icon: "shield", label: "Secure Payment", description: "256-bit SSL" },
          { icon: "truck", label: "Free Delivery", description: "Over €50" },
          { icon: "refresh", label: "Free Returns", description: "30 days" },
        ],
        style: "horizontal",
        backgroundColor: "",
        bodySize: "sm",
      },
      render: ({ items, style: badgeStyle, backgroundColor, bodySize }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const primary = data?.store?.theme_primary_color || "#2563eb";
        const layoutClass = badgeStyle === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "flex flex-wrap justify-center gap-8";

        return (
          <section className="py-8 px-4 border-y" style={{ borderColor: theme.border, backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className={`mx-auto max-w-5xl ${layoutClass}`}>
              {items.map((item, i) => {
                const IconComponent = ICON_MAP[item.icon] || Shield;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span style={{ color: primary }}><IconComponent className="w-5 h-5 shrink-0" /></span>
                    <div>
                      <p className="font-medium" style={{ ...bodyStyle(bodySize), color: theme.textPrimary }}>{item.label}</p>
                      {item.description && <p className="text-xs" style={{ color: theme.textSecondary }}>{item.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      },
    },

    /* ─────────── Video Embed ─────────── */
    VideoEmbed: {
      label: "Video Embed",
      fields: {
        url: { type: "text", label: "Video URL (YouTube/Vimeo embed URL)" },
        title: { type: "text", label: "Title" },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "16:9", value: "16:9" },
            { label: "4:3", value: "4:3" },
            { label: "1:1", value: "1:1" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
      },
      defaultProps: { url: "", title: "", aspectRatio: "16:9", spacing: "md", backgroundColor: "", titleSize: "lg", titleWeight: "bold" },
      render: ({ url, title, aspectRatio, spacing, backgroundColor, titleSize, titleWeight }) => {
        const theme = getThemeTokens(getStorefrontData()?.store);
        const padding = aspectRatio === "4:3" ? "75%" : aspectRatio === "1:1" ? "100%" : "56.25%";
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className="mx-auto max-w-4xl">
              {title && <h2 className="text-center mb-6" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>}
              {url ? (
                <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: padding }}>
                  <iframe
                    src={url}
                    title={title || "Video"}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-xl flex items-center justify-center" style={{ paddingBottom: padding, position: "relative", backgroundColor: theme.surfaceAlt }}>
                  <p className="absolute inset-0 flex items-center justify-center" style={{ color: theme.textMuted }}>{translatePuckText("Enter a video embed URL")}</p>
                </div>
              )}
            </div>
          </section>
        );
      },
    },

    /* ─────────── FAQ ─────────── */
    FAQ: {
      label: "FAQ",
      fields: {
        title: { type: "text", label: "Section title" },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Section background color" },
        cardBackgroundColor: { type: "text", label: "Question card background" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Bold", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body text size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Card shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        items: {
          type: "array",
          label: "Questions",
          arrayFields: {
            question: { type: "text", label: "Question" },
            answer: { type: "textarea", label: "Answer" },
          },
          defaultItemProps: { question: "Your question?", answer: "Your answer." },
        },
      },
      defaultProps: {
        title: "Frequently Asked Questions",
        spacing: "md",
        backgroundColor: "",
        cardBackgroundColor: "",
        titleSize: "lg",
        titleWeight: "bold",
        bodySize: "sm",
        cardRadius: "xl",
        shadow: "none",
        items: [
          { question: "What payment methods do you accept?", answer: "We accept Visa, Mastercard, and PayPal." },
          { question: "How long does shipping take?", answer: "Standard shipping takes 3-5 business days." },
        ],
      },
      render: ({ title, items, spacing, backgroundColor, cardBackgroundColor, titleSize, titleWeight, bodySize, cardRadius, shadow }) => {
        const theme = getThemeTokens(getStorefrontData()?.store);
        return (
        <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center mb-10" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
            <div className="space-y-4">
              {items.map((item, i) => (
                <details key={i} className="group border" style={{ borderColor: theme.border, backgroundColor: normalizeOptionalColor(cardBackgroundColor, theme.surface), borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}>
                  <summary className="cursor-pointer px-6 py-4 font-medium flex items-center justify-between" style={{ color: theme.textPrimary }}>
                    {item.question}
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" style={{ color: theme.textMuted }} />
                  </summary>
                  <div className="px-6 pb-4 leading-relaxed" style={{ ...bodyStyle(bodySize), color: theme.textSecondary }}>
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
      },
    },

    /* ─────────── CallToAction ─────────── */
    CallToAction: {
      label: "Call to Action",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        buttonLabel: { type: "text", label: "Button text" },
        buttonLink: { type: "text", label: "Button link" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonRadius: {
          type: "select",
          label: "Button radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
            { label: "Full", value: "full" },
          ],
        },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Primary (filled)", value: "primary" },
            { label: "Secondary (subtle)", value: "secondary" },
            { label: "Outline", value: "outline" },
          ],
        },
      },
      defaultProps: {
        title: "Ready to get started?",
        subtitle: "Browse our full catalog and find what you need.",
        buttonLabel: "Shop Now",
        buttonLink: "/products",
        titleSize: "md",
        titleWeight: "bold",
        bodySize: "md",
        spacing: "md",
        backgroundColor: "",
        textColor: "",
        cardRadius: "xl",
        shadow: "none",
        buttonSize: "md",
        buttonRadius: "full",
        style: "primary",
      },
      render: ({ title, subtitle, buttonLabel, buttonLink, style: ctaStyle, spacing, backgroundColor, textColor, titleSize, titleWeight, bodySize, cardRadius, shadow, buttonSize, buttonRadius }) => {
        const data = getStorefrontData();
        const store = data?.store;
        const theme = getThemeTokens(store);
        const primary = store?.theme_primary_color || "#2563eb";
        const slug = store?.slug || "";
        const href = resolveStoreHref(slug, buttonLink);
        const resolvedText = normalizeOptionalColor(textColor, ctaStyle === "primary" ? "#ffffff" : theme.textPrimary);
        const resolvedBackground = normalizeOptionalColor(
          backgroundColor,
          ctaStyle === "primary" ? primary : ctaStyle === "secondary" ? `${primary}10` : "transparent",
        );

        const bgStyle =
          ctaStyle === "primary"
            ? { backgroundColor: resolvedBackground, color: resolvedText }
            : ctaStyle === "secondary"
            ? { backgroundColor: resolvedBackground, color: resolvedText }
            : { backgroundColor: resolvedBackground, color: resolvedText, border: `2px solid ${primary}` };

        const btnClass =
          ctaStyle === "primary"
            ? "bg-white hover:opacity-90"
            : "text-white hover:opacity-90";
        const btnStyle =
          ctaStyle === "primary"
            ? { color: primary }
            : { backgroundColor: primary };

        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
            <div className="mx-auto max-w-3xl p-10 text-center" style={{ ...bgStyle, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}>
              <h2 className="mb-3" style={titleStyle(titleSize, titleWeight)}>{title}</h2>
              {subtitle && <p className="mb-8 opacity-80" style={bodyStyle(bodySize)}>{subtitle}</p>}
              <Link
                href={href}
                className={`inline-flex items-center gap-2 font-semibold transition-all ${btnClass} ${resolveButtonSizeClasses(buttonSize)}`}
                style={{ ...btnStyle, borderRadius: resolveRadius(buttonRadius) }}
              >
                {buttonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Store Info ─────────── */
    StoreInfo: {
      label: "Store Info",
      fields: {
        title: { type: "text", label: "Section title" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        showEmail: { type: "radio", label: "Show email", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showPhone: { type: "radio", label: "Show phone", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        showAddress: { type: "radio", label: "Show address", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: { title: "Contact Us", titleSize: "md", titleWeight: "bold", bodySize: "md", spacing: "md", backgroundColor: "", showEmail: true, showPhone: true, showAddress: true },
      render: ({ title, showEmail, showPhone, showAddress, titleSize, titleWeight, bodySize, spacing, backgroundColor }) => {
        const data = getStorefrontData();
        const store = data?.store;
        if (!store) return <></>;
        const theme = getThemeTokens(store);
        const primary = store.theme_primary_color;
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className="mx-auto max-w-2xl text-center space-y-4">
              <h2 style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h2>
              <div className="space-y-3" style={{ ...bodyStyle(bodySize), color: theme.textSecondary }}>
                {showEmail && store.email && (
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: primary }} />
                    <a href={`mailto:${store.email}`} className="hover:underline">{store.email}</a>
                  </div>
                )}
                {showPhone && store.phone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: primary }} />
                    <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
                  </div>
                )}
                {showAddress && store.address && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: primary }} />
                    <span>{store.address}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Custom HTML ─────────── */
    CustomHTML: {
      label: "Custom HTML",
      fields: {
        code: { type: "textarea", label: "HTML code" },
      },
      defaultProps: { code: "" },
      render: ({ code }) => {
        if (!code) return <></>;
        return (
          <section className="py-4 px-4">
            <div className="mx-auto max-w-7xl" dangerouslySetInnerHTML={{ __html: code }} />
          </section>
        );
      },
    },

    /* ─────────── Countdown Banner ─────────── */
    CountdownBanner: {
      label: "Countdown Banner",
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },
        targetDate: { type: "text", label: "Target date (YYYY-MM-DD HH:mm)" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        bodySize: {
          type: "select",
          label: "Body size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Banner (full-width)", value: "banner" },
            { label: "Card (centered)", value: "card" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        cardRadius: {
          type: "select",
          label: "Card radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow level",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      defaultProps: {
        title: "Sale Ends Soon!",
        subtitle: "Don't miss our exclusive offers",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " "),
        titleSize: "md",
        titleWeight: "bold",
        bodySize: "md",
        spacing: "md",
        style: "banner",
        backgroundColor: "#ef4444",
        textColor: "#ffffff",
        cardRadius: "xl",
        shadow: "none",
      },
      render: ({ title, subtitle, targetDate, style: cdStyle, backgroundColor, textColor, titleSize, titleWeight, bodySize, cardRadius, shadow, spacing }) => {
        if (cdStyle === "card") {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)}`}>
              <div className="mx-auto max-w-lg p-10 text-center" style={{ backgroundColor, borderRadius: resolveRadius(cardRadius), boxShadow: resolveShadow(shadow) }}>
                <h2 className="mb-2" style={{ ...titleStyle(titleSize, titleWeight), color: textColor }}>{title}</h2>
                <p className="mb-6 opacity-80" style={{ ...bodyStyle(bodySize), color: textColor }}>{subtitle}</p>
                <CountdownTimer targetDate={targetDate} textColor={textColor} />
              </div>
            </section>
          );
        }
        return (
          <section className={`px-4 ${spacing === "sm" ? "py-8" : spacing === "lg" ? "py-12" : "py-10"}`} style={{ backgroundColor }}>
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-1" style={{ ...titleStyle(titleSize, titleWeight), color: textColor }}>{title}</h2>
              <p className="mb-4 opacity-80" style={{ ...bodyStyle(bodySize), color: textColor }}>{subtitle}</p>
              <CountdownTimer targetDate={targetDate} textColor={textColor} />
            </div>
          </section>
        );
      },
    },

    /* ─────────── Social Follow ─────────── */
    SocialFollow: {
      label: "Social Follow",
      fields: {
        title: { type: "text", label: "Title" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        buttonSize: {
          type: "select",
          label: "Button size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        buttonRadius: {
          type: "select",
          label: "Button radius",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
            { label: "Full", value: "full" },
          ],
        },
        style: {
          type: "select",
          label: "Display style",
          options: [
            { label: "Icons only", value: "icons" },
            { label: "Buttons with labels", value: "buttons" },
            { label: "Minimal text links", value: "minimal" },
          ],
        },
        links: {
          type: "array",
          label: "Social links",
          arrayFields: {
            platform: {
              type: "select",
              label: "Platform",
              options: [
                { label: "Instagram", value: "instagram" },
                { label: "Facebook", value: "facebook" },
                { label: "TikTok", value: "tiktok" },
                { label: "X (Twitter)", value: "twitter" },
                { label: "YouTube", value: "youtube" },
                { label: "Pinterest", value: "pinterest" },
                { label: "LinkedIn", value: "linkedin" },
              ],
            },
            url: { type: "text", label: "Profile URL" },
          },
          defaultItemProps: { platform: "instagram", url: "" },
        },
      },
      defaultProps: {
        title: "Follow Us",
        titleSize: "sm",
        titleWeight: "semibold",
        spacing: "md",
        backgroundColor: "",
        buttonSize: "md",
        buttonRadius: "full",
        style: "buttons",
        links: [
          { platform: "instagram", url: "" },
          { platform: "facebook", url: "" },
        ],
      },
      render: ({ title, style: sfStyle, links, spacing, backgroundColor, titleSize, titleWeight, buttonSize, buttonRadius }) => {
        const data = getStorefrontData();
        const theme = getThemeTokens(data?.store);
        const primary = data?.store?.theme_primary_color || "#2563eb";
        const PLATFORM_LABELS: Record<string, string> = {
          instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
          twitter: "X", youtube: "YouTube", pinterest: "Pinterest", linkedin: "LinkedIn",
        };
        const validLinks = links.filter((l) => l.url);
        if (validLinks.length === 0) {
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)} text-center`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
              <h3 className="mb-4" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h3>
              <p className="text-sm" style={{ color: theme.textMuted }}>{translatePuckText("Add your social links in the editor.")}</p>
            </section>
          );
        }
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="mb-6" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {validLinks.map((l, i) => {
                  if (sfStyle === "minimal") {
                    return (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: primary }}>
                        {PLATFORM_LABELS[l.platform] || l.platform}
                      </a>
                    );
                  }
                  if (sfStyle === "icons") {
                    return (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity" style={{ backgroundColor: primary, width: buttonSize === "lg" ? "3rem" : buttonSize === "sm" ? "2.25rem" : "2.5rem", height: buttonSize === "lg" ? "3rem" : buttonSize === "sm" ? "2.25rem" : "2.5rem", borderRadius: resolveRadius(buttonRadius) }}>
                        {(PLATFORM_LABELS[l.platform] || l.platform).slice(0, 2).toUpperCase()}
                      </a>
                    );
                  }
                  return (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 text-sm font-medium text-white hover:opacity-90 transition-opacity ${resolveButtonSizeClasses(buttonSize)}`} style={{ backgroundColor: primary, borderRadius: resolveRadius(buttonRadius) }}>
                      {PLATFORM_LABELS[l.platform] || l.platform}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Brand Logos ─────────── */
    BrandLogos: {
      label: "Brand Logos",
      fields: {
        title: { type: "text", label: "Title (optional)" },
        titleSize: {
          type: "select",
          label: "Title size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        titleWeight: {
          type: "select",
          label: "Title weight",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Medium", value: "medium" },
            { label: "Semi-bold", value: "semibold" },
            { label: "Large", value: "bold" },
          ],
        },
        spacing: {
          type: "select",
          label: "Vertical spacing",
          options: [
            { label: "Compact", value: "sm" },
            { label: "Comfortable", value: "md" },
            { label: "Spacious", value: "lg" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        logos: {
          type: "array",
          label: "Logos",
          arrayFields: {
            imageUrl: { type: "text", label: "Image URL" },
            alt: { type: "text", label: "Brand name" },
            link: { type: "text", label: "Link (optional)" },
          },
          defaultItemProps: { imageUrl: "", alt: "Brand", link: "" },
        },
        grayscale: { type: "radio", label: "Grayscale logos", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
        columns: {
          type: "select",
          label: "Logos per row",
          options: [
            { label: "4", value: 4 },
            { label: "5", value: 5 },
            { label: "6", value: 6 },
          ],
        },
      },
      defaultProps: {
        title: "",
        titleSize: "sm",
        titleWeight: "semibold",
        spacing: "md",
        backgroundColor: "",
        logos: [],
        grayscale: true,
        columns: 5,
      },
      render: ({ title, logos, grayscale, columns, spacing, backgroundColor, titleSize, titleWeight }) => {
        if (logos.length === 0) {
          const theme = getThemeTokens(getStorefrontData()?.store);
          return (
            <section className={`px-4 ${resolveSectionPadding(spacing)} text-center`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
              <p className="text-sm" style={{ color: theme.textMuted }}>{translatePuckText("Add brand logos in the editor.")}</p>
            </section>
          );
        }
        const theme = getThemeTokens(getStorefrontData()?.store);
        const gridClass = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : columns === 6 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5";
        return (
          <section className={`px-4 ${resolveSectionPadding(spacing)}`} style={{ backgroundColor: normalizeOptionalColor(backgroundColor, "transparent") }}>
            <div className="mx-auto max-w-5xl">
              {title && <h3 className="text-center mb-8" style={{ ...titleStyle(titleSize, titleWeight), color: theme.textPrimary }}>{title}</h3>}
              <div className={`grid ${gridClass} gap-8 items-center justify-items-center`}>
                {logos.map((logo, i) => {
                  const img = (
                    <Image
                      src={resolveMediaUrl(logo.imageUrl)}
                      alt={logo.alt}
                      width={120}
                      height={60}
                      className={`object-contain h-12 w-auto ${grayscale ? "grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" : ""}`}
                      unoptimized
                    />
                  );
                  if (logo.link) {
                    return <a key={i} href={logo.link} target="_blank" rel="noopener noreferrer">{img}</a>;
                  }
                  return <div key={i}>{img}</div>;
                })}
              </div>
            </div>
          </section>
        );
      },
    },

    /* ─────────── Marquee (Scrolling Text) ─────────── */
    Marquee: {
      label: "Scrolling Text",
      fields: {
        text: { type: "text", label: "Text" },
        speed: {
          type: "select",
          label: "Speed",
          options: [
            { label: "Slow", value: "slow" },
            { label: "Medium", value: "medium" },
            { label: "Fast", value: "fast" },
          ],
        },
        backgroundColor: { type: "text", label: "Background color" },
        textColor: { type: "text", label: "Text color" },
        pauseOnHover: { type: "radio", label: "Pause on hover", options: [
          { label: "Yes", value: true }, { label: "No", value: false },
        ]},
      },
      defaultProps: {
        text: "🔥 Free shipping on all orders today! 🔥",
        speed: "medium",
        backgroundColor: "#000000",
        textColor: "#ffffff",
        pauseOnHover: true,
      },
      render: ({ text, speed, backgroundColor, textColor, pauseOnHover }) => {
        const duration = speed === "slow" ? "30s" : speed === "fast" ? "10s" : "18s";
        return (
          <section className="overflow-hidden" style={{ backgroundColor }}>
            <div
              className={`puck-marquee-track flex whitespace-nowrap py-3 ${pauseOnHover ? "is-pausable" : ""}`}
              style={{
                animation: `marquee ${duration} linear infinite`,
                color: textColor,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="mx-8 text-sm font-medium">{text}</span>
              ))}
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .puck-marquee-track.is-pausable:hover { animation-play-state: paused; }`}</style>
          </section>
        );
      },
    },
  },
};

export function buildPuckConfig(
  options: CatalogFieldOptions = EMPTY_CATALOG_OPTIONS,
  lang: PuckEditorLang = "en",
): Config<PuckProps> {
  setPuckEditorLang(lang);

  const config: Config<PuckProps> = {
    ...puckConfig,
    components: {
      ...puckConfig.components,
      StoreNavigation: {
        ...puckConfig.components.StoreNavigation,
        fields: {
          ...puckConfig.components.StoreNavigation.fields,
          featuredCategorySlug: {
            type: "select",
            label: "Featured category",
            options: [{ label: "No featured category", value: "__all__" }, ...options.categoryOptions],
          },
          featuredCollectionSlug: {
            type: "select",
            label: "Featured collection",
            options: [{ label: "No featured collection", value: "__all__" }, ...options.collectionOptions],
          },
        } as any,
      },
      FeaturedProducts: {
        ...puckConfig.components.FeaturedProducts,
        fields: {
          ...puckConfig.components.FeaturedProducts.fields,
          categorySlug: {
            type: "select",
            label: "Category",
            options: [{ label: "All categories", value: "__all__" }, ...options.categoryOptions],
          },
          collectionSlug: {
            type: "select",
            label: "Collection",
            options: [{ label: "All collections", value: "__all__" }, ...options.collectionOptions],
          },
        } as any,
      },
      ProductSpotlight: {
        ...puckConfig.components.ProductSpotlight,
        fields: {
          ...puckConfig.components.ProductSpotlight.fields,
          productSlug: {
            type: "select",
            label: "Product",
            options: [{ label: "Use the first available product", value: "__auto__" }, ...options.productOptions],
          },
        } as any,
      },
      CategorySpotlight: {
        ...puckConfig.components.CategorySpotlight,
        fields: {
          ...puckConfig.components.CategorySpotlight.fields,
          categorySlug: {
            type: "select",
            label: "Category",
            options: [{ label: "Select a category…", value: "" }, ...options.categoryOptions],
          },
        } as any,
      },
    },
  };

  return localizePuckConfig(config, lang);
}

/* ─────────────── Shared product card ─────────────────────────────────── */

function ProductCard({
  product,
  slug,
  currency,
  cardStyle = "default",
  showBrand = true,
  showSaleBadge = true,
  radius = "lg",
  shadow = "none",
}: {
  product: ProductPublic;
  slug: string;
  currency: string;
  cardStyle?: "default" | "minimal" | "shadow";
  showBrand?: boolean;
  showSaleBadge?: boolean;
  radius?: RadiusScale;
  shadow?: ShadowScale;
}) {
  const image = product.images?.[0];
  const theme = getThemeTokens(getStorefrontData()?.store);
  const cardClass = cardStyle === "minimal"
    ? "group flex flex-col overflow-hidden hover:opacity-80 transition-all duration-200"
    : cardStyle === "shadow"
    ? "group flex flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
    : "group flex flex-col rounded-xl overflow-hidden hover:shadow-md transition-all duration-200";
  return (
    <Link
      href={`/store/${slug}/products/${product.slug}`}
      className={cardClass}
      style={{ backgroundColor: theme.surface, border: cardStyle === "minimal" ? "none" : `1px solid ${theme.border}`, borderRadius: resolveRadius(radius), boxShadow: resolveShadow(shadow) }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: theme.surfaceAlt }}>
        {image ? (
          <Image
            src={resolveMediaUrl(image.url_medium || image.url)}
            alt={image.alt_text || product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: theme.textMuted }}>
            <Tag className="w-12 h-12" />
          </div>
        )}
        {showSaleBadge && product.is_on_sale && (
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: "#ef4444" }}
          >
            {translatePuckText("Sale")}
          </span>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: theme.isDark ? "rgba(2,6,23,0.72)" : "rgba(255,255,255,0.6)" }}>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white">
              {translatePuckText("Out of stock")}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        {showBrand && product.brand && (
          <p className="text-xs uppercase tracking-wide" style={{ color: theme.textMuted }}>{product.brand}</p>
        )}
        <h3 className="text-sm font-medium line-clamp-2 flex-1" style={{ color: theme.textPrimary }}>{product.title}</h3>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-base font-bold" style={{ color: theme.textPrimary }}>
            {formatPrice(product.effective_price, currency)}
          </span>
          {product.is_on_sale && (
            <span className="text-sm line-through" style={{ color: theme.textMuted }}>
              {formatPrice(product.price, currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────── Empty data for Puck ─────────────────────────────────── */

export const emptyPuckData: Data = {
  root: { props: {} },
  content: [],
};

export function getDefaultPuckData(lang: PuckEditorLang = "en"): Data {
  const data: Data = {
    root: { props: {} },
    content: [
      {
        type: "StoreHeader",
        props: {
          id: "store-header-default",
          homeLabel: "Home",
          productsLabel: "Products",
          showCategories: true,
          showCollections: true,
          showPages: true,
          showSearch: true,
          showAuth: true,
          showCart: true,
          cartLabel: "Cart",
          showLogo: true,
        },
      },
      {
        type: "StoreNavigation",
        props: {
          id: "store-navigation-default",
          homeLabel: "Home",
          productsLabel: "Products",
          showCategories: true,
          showCollections: true,
          featuredCategorySlug: "__all__",
          featuredCollectionSlug: "__all__",
          ctaLabel: "Shop now",
          ctaLink: "/products",
          sticky: true,
        },
      },
      {
        type: "HeroBlock",
        props: {
          id: "hero-default",
          title: "Welcome to Our Store",
          subtitle: "Discover our latest products and exclusive offers",
          titleSize: "medium",
          ctaLabel: "Shop Now",
          ctaLink: "/products",
          secondCtaLabel: "",
          secondCtaLink: "",
          alignment: "center",
          backgroundImage: "",
          showOverlay: false,
          minHeight: "420px",
        },
      },
      {
        type: "TrustBadges",
        props: {
          id: "badges-default",
          items: [
            { icon: "shield", label: "Secure Payment", description: "256-bit SSL" },
            { icon: "truck", label: "Free Delivery", description: "Over €50" },
            { icon: "refresh", label: "Free Returns", description: "30 days" },
          ],
          style: "horizontal",
        },
      },
      {
        type: "FeaturedProducts",
        props: {
          id: "products-default",
          title: "Our Products",
          subtitle: "",
          columns: 4,
          maxProducts: 8,
          showViewAll: true,
          cardStyle: "default",
          showBrand: true,
          showSaleBadge: true,
          sortBy: "default",
        },
      },
      {
        type: "CategoriesGrid",
        props: {
          id: "categories-default",
          title: "Shop by Category",
          subtitle: "",
          columns: 6,
          style: "cards",
        },
      },
      {
        type: "PromoGrid",
        props: {
          id: "promo-grid-default",
          title: "Shop the moment",
          subtitle: "Drive visitors into the campaigns that matter most.",
          columns: 3,
          items: [
            {
              eyebrow: "New",
              heading: "Fresh arrivals",
              description: "Show what just landed in your catalog.",
              linkLabel: "Explore new products",
              link: "/products",
              backgroundImage: "",
              accentColor: "#2563eb",
            },
            {
              eyebrow: "Gift",
              heading: "Curated picks",
              description: "Promote a collection or seasonal edit.",
              linkLabel: "See collections",
              link: "/collections",
              backgroundImage: "",
              accentColor: "#0f766e",
            },
            {
              eyebrow: "Limited",
              heading: "Weekly spotlight",
              description: "Use one tile for your strongest short-term offer.",
              linkLabel: "View offer",
              link: "/products",
              backgroundImage: "",
              accentColor: "#c2410c",
            },
          ],
        },
      },
      {
        type: "Newsletter",
        props: {
          id: "newsletter-default",
          title: "Stay Updated",
          subtitle: "Subscribe for exclusive offers and updates.",
          buttonLabel: "Subscribe",
          style: "card",
          collectName: false,
          emailPlaceholder: "your@email.com",
          successMessage: "",
        },
      },
      {
        type: "StoreFooter",
        props: {
          id: "store-footer-default",
          description: "Explain your brand promise, support channels, and what customers should expect from your store.",
          showCategories: true,
          showCollections: true,
          showContact: true,
          copyrightText: "All rights reserved.",
        },
      },
    ],
  };

  return localizeDefaultValue(data, lang);
}
