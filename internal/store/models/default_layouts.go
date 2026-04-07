package models

const DefaultHomeLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-default","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"HeroBlock","props":{"id":"hero-default","title":"Welcome to Our Store","subtitle":"Discover our latest products and exclusive offers","titleSize":"medium","ctaLabel":"Shop Now","ctaLink":"/products","secondCtaLabel":"","secondCtaLink":"","alignment":"center","backgroundImage":"","showOverlay":false,"minHeight":"420px","titleWeight":"bold","bodySize":"lg","buttonSize":"md","buttonRadius":"full","shadow":"none","spacing":"md"}},
    {"type":"TrustBadges","props":{"id":"badges-default","items":[{"icon":"shield","label":"Secure Payment","description":"256-bit SSL"},{"icon":"truck","label":"Free Delivery","description":"Over €50"},{"icon":"refresh","label":"Free Returns","description":"30 days"}],"style":"horizontal","backgroundColor":"","bodySize":"sm"}},
    {"type":"FeaturedProducts","props":{"id":"products-default","title":"Our Products","subtitle":"","columns":4,"maxProducts":8,"source":"all","categorySlug":"__all__","collectionSlug":"__all__","showViewAll":true,"cardStyle":"default","showBrand":true,"showSaleBadge":true,"sortBy":"default","backgroundColor":"","titleSize":"md","titleWeight":"bold","cardRadius":"lg","shadow":"none","spacing":"md"}},
    {"type":"CategoriesGrid","props":{"id":"categories-default","title":"Shop by Category","subtitle":"","columns":6,"style":"cards","maxItems":6,"backgroundColor":"","titleSize":"lg","titleWeight":"bold","cardRadius":"lg","shadow":"sm","spacing":"md"}},
    {"type":"PromoGrid","props":{"id":"promo-default","title":"Shop the moment","subtitle":"Guide customers into your most important campaigns.","columns":3,"spacing":"md","minTileHeight":"280px","titleSize":"lg","titleWeight":"bold","cardRadius":"xl","shadow":"none","buttonSize":"md","items":[{"eyebrow":"New","heading":"Fresh arrivals","description":"Show what just landed in your catalog.","linkLabel":"Explore","link":"/products","backgroundImage":"","accentColor":"#2563eb"},{"eyebrow":"Collections","heading":"Curated picks","description":"Promote a collection or seasonal edit.","linkLabel":"Browse","link":"/collections","backgroundImage":"","accentColor":"#0f766e"},{"eyebrow":"Limited","heading":"This week only","description":"Use one tile for your strongest short-term offer.","linkLabel":"View offer","link":"/products","backgroundImage":"","accentColor":"#c2410c"}]}},
    {"type":"Newsletter","props":{"id":"newsletter-default","title":"Stay Updated","subtitle":"Subscribe for exclusive offers and updates.","buttonLabel":"Subscribe","style":"card","collectName":false,"emailPlaceholder":"your@email.com","successMessage":"","backgroundColor":"","textColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"md","cardRadius":"xl","shadow":"none","buttonSize":"md","spacing":"md"}},
    {"type":"StoreFooter","props":{"id":"footer-default","description":"Tell customers what your store stands for and where they can reach you.","showCategories":true,"showCollections":true,"showContact":true,"copyrightText":"All rights reserved."}}
  ]
}`

const DefaultPromoLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-promo","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"AnnouncementBar","props":{"id":"announce-promo","text":"🎉 Special offers — limited time only!","backgroundColor":"#dc2626","textColor":"#ffffff","link":"/products"}},
    {"type":"CountdownBanner","props":{"id":"countdown-promo","title":"Sale Ends Soon!","subtitle":"Don't miss our exclusive offers","targetDate":"2025-12-31 23:59","style":"banner","backgroundColor":"#1e293b","textColor":"#ffffff","titleSize":"md","titleWeight":"bold","bodySize":"md","cardRadius":"xl","shadow":"none","spacing":"md"}},
    {"type":"HeroBlock","props":{"id":"hero-promo","title":"Our Best Deals","subtitle":"Handpicked promotions just for you","titleSize":"large","ctaLabel":"Shop All Deals","ctaLink":"/products","secondCtaLabel":"","secondCtaLink":"","alignment":"center","backgroundImage":"","showOverlay":false,"minHeight":"380px","titleWeight":"bold","bodySize":"lg","buttonSize":"lg","buttonRadius":"full","shadow":"none","spacing":"md"}},
    {"type":"FeaturedProducts","props":{"id":"products-promo","title":"Products on Sale","subtitle":"","columns":4,"maxProducts":8,"source":"all","categorySlug":"__all__","collectionSlug":"__all__","showViewAll":true,"cardStyle":"shadow","showBrand":true,"showSaleBadge":true,"sortBy":"price-asc","backgroundColor":"","titleSize":"md","titleWeight":"bold","cardRadius":"lg","shadow":"sm","spacing":"md"}},
    {"type":"TrustBadges","props":{"id":"badges-promo","items":[{"icon":"shield","label":"Secure Payment","description":"256-bit SSL"},{"icon":"truck","label":"Free Delivery","description":"Over €50"},{"icon":"refresh","label":"Free Returns","description":"30 days"}],"style":"horizontal","backgroundColor":"","bodySize":"sm"}},
    {"type":"CallToAction","props":{"id":"cta-promo","title":"Ready to shop?","subtitle":"Browse our full catalog and find what you need.","buttonLabel":"See All Products","buttonLink":"/products","style":"primary","spacing":"md","backgroundColor":"","textColor":"","cardRadius":"xl","shadow":"none","buttonSize":"lg","buttonRadius":"full","titleSize":"md","titleWeight":"bold","bodySize":"md"}},
    {"type":"StoreFooter","props":{"id":"footer-promo","description":"Tell customers what your store stands for.","showCategories":true,"showCollections":true,"showContact":true,"copyrightText":"All rights reserved."}}
  ]
}`

const DefaultBlogLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-blog","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"StoreHeader","props":{"id":"header-blog","eyebrow":"Our Blog","subtitle":"Tips, guides and inspiration for you.","ctaLabel":"Browse catalog","ctaLink":"/products","showLogo":true,"backgroundColor":"","titleSize":"lg","titleWeight":"bold","buttonSize":"md","buttonRadius":"full","spacing":"md"}},
    {"type":"HeroBlock","props":{"id":"hero-blog","title":"Latest Articles","subtitle":"Discover our tips and best practices","titleSize":"medium","ctaLabel":"Shop Now","ctaLink":"/products","secondCtaLabel":"","secondCtaLink":"","alignment":"center","backgroundImage":"","showOverlay":false,"minHeight":"300px","titleWeight":"bold","bodySize":"md","buttonSize":"md","buttonRadius":"full","shadow":"none","spacing":"sm"}},
    {"type":"RichText","props":{"id":"text-blog","content":"<h2>Welcome to our blog</h2><p>Share your stories, tutorials and advice with your customers. This block supports full HTML — use it to write engaging content that builds trust and drives traffic.</p>","alignment":"left","maxWidth":"800px","textColor":"","backgroundColor":"","fontSize":"md","fontWeight":"regular","spacing":"md"}},
    {"type":"VideoEmbed","props":{"id":"video-blog","url":"","title":"Watch our latest video","aspectRatio":"16:9","spacing":"md","backgroundColor":"","titleSize":"md","titleWeight":"bold"}},
    {"type":"Testimonials","props":{"id":"testimonials-blog","title":"What Our Customers Say","spacing":"md","backgroundColor":"","cardBackgroundColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"sm","cardRadius":"xl","shadow":"none","items":[{"quote":"Amazing products and fast delivery!","author":"Sarah L.","role":"Verified Buyer","rating":5},{"quote":"Great quality, will order again.","author":"Marc D.","role":"Verified Buyer","rating":5}]}},
    {"type":"FAQ","props":{"id":"faq-blog","title":"Frequently Asked Questions","spacing":"md","backgroundColor":"","cardBackgroundColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"sm","cardRadius":"xl","shadow":"none","items":[{"question":"What payment methods do you accept?","answer":"We accept Visa, Mastercard, and PayPal."},{"question":"How long does shipping take?","answer":"Standard shipping takes 3-5 business days."}]}},
    {"type":"BrandLogos","props":{"id":"logos-blog","title":"Our Partners","logos":[],"grayscale":true,"columns":5,"spacing":"md","backgroundColor":"","titleSize":"sm","titleWeight":"semibold"}},
    {"type":"Newsletter","props":{"id":"newsletter-blog","title":"Stay Updated","subtitle":"Subscribe for exclusive offers and updates.","buttonLabel":"Subscribe","style":"card","collectName":false,"emailPlaceholder":"your@email.com","successMessage":"","backgroundColor":"","textColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"md","cardRadius":"xl","shadow":"none","buttonSize":"md","spacing":"md"}},
    {"type":"StoreFooter","props":{"id":"footer-blog","description":"Tell customers what your store stands for.","showCategories":true,"showCollections":true,"showContact":true,"copyrightText":"All rights reserved."}}
  ]
}`

const DefaultAboutLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-about","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"StoreHeader","props":{"id":"header-about","eyebrow":"About Us","subtitle":"Learn more about our story and values.","ctaLabel":"Browse catalog","ctaLink":"/products","showLogo":true,"backgroundColor":"","titleSize":"lg","titleWeight":"bold","buttonSize":"md","buttonRadius":"full","spacing":"md"}},
    {"type":"RichText","props":{"id":"text-about","content":"<h2>Our Story</h2><p>Tell your customers who you are, what you stand for, and why they should trust you. This is your brand's voice — make it count.</p><h3>Our Values</h3><p>Describe your core values and what makes your store unique in the market.</p>","alignment":"left","maxWidth":"800px","textColor":"","backgroundColor":"","fontSize":"md","fontWeight":"regular","spacing":"md"}},
    {"type":"FeatureColumns","props":{"id":"features-about","title":"Why Choose Us","spacing":"md","titleSize":"lg","titleWeight":"bold","bodySize":"sm","columns":[{"icon":"truck","heading":"Fast Delivery","description":"We ship your orders within 24 hours."},{"icon":"shield","heading":"Secure Payment","description":"100% secure checkout guaranteed."},{"icon":"refresh","heading":"Easy Returns","description":"30-day hassle-free return policy."},{"icon":"clock","heading":"24/7 Support","description":"Our team is always here to help."}]}},
    {"type":"Testimonials","props":{"id":"testimonials-about","title":"What Our Customers Say","spacing":"md","backgroundColor":"","cardBackgroundColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"sm","cardRadius":"xl","shadow":"none","items":[{"quote":"Amazing products and fast delivery!","author":"Sarah L.","role":"Verified Buyer","rating":5},{"quote":"Great quality, will order again.","author":"Marc D.","role":"Verified Buyer","rating":5}]}},
    {"type":"StoreInfo","props":{"id":"info-about","title":"Contact Us","titleSize":"md","titleWeight":"bold","bodySize":"md","spacing":"md","backgroundColor":"","showEmail":true,"showPhone":true,"showAddress":true}},
    {"type":"CallToAction","props":{"id":"cta-about","title":"Ready to shop?","subtitle":"Browse our full catalog and find what you need.","buttonLabel":"Shop Now","buttonLink":"/products","style":"primary","spacing":"md","backgroundColor":"","textColor":"","cardRadius":"xl","shadow":"none","buttonSize":"md","buttonRadius":"full","titleSize":"md","titleWeight":"bold","bodySize":"md"}},
    {"type":"StoreFooter","props":{"id":"footer-about","description":"Tell customers what your store stands for.","showCategories":true,"showCollections":true,"showContact":true,"copyrightText":"All rights reserved."}}
  ]
}`

const DefaultContactLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-contact","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"StoreHeader","props":{"id":"header-contact","eyebrow":"Contact","subtitle":"We'd love to hear from you.","ctaLabel":"Browse catalog","ctaLink":"/products","showLogo":true,"backgroundColor":"","titleSize":"lg","titleWeight":"bold","buttonSize":"md","buttonRadius":"full","spacing":"md"}},
    {"type":"StoreInfo","props":{"id":"info-contact","title":"Get in Touch","titleSize":"lg","titleWeight":"bold","bodySize":"md","spacing":"lg","backgroundColor":"","showEmail":true,"showPhone":true,"showAddress":true}},
    {"type":"RichText","props":{"id":"text-contact","content":"<h3>Opening Hours</h3><p>Monday – Friday: 9:00 AM – 6:00 PM<br/>Saturday: 10:00 AM – 4:00 PM<br/>Sunday: Closed</p>","alignment":"center","maxWidth":"600px","textColor":"","backgroundColor":"","fontSize":"md","fontWeight":"regular","spacing":"md"}},
    {"type":"FAQ","props":{"id":"faq-contact","title":"Frequently Asked Questions","spacing":"md","backgroundColor":"","cardBackgroundColor":"","titleSize":"lg","titleWeight":"bold","bodySize":"sm","cardRadius":"xl","shadow":"none","items":[{"question":"How can I track my order?","answer":"Once your order is shipped, you will receive an email with a tracking number."},{"question":"What is your return policy?","answer":"We accept returns within 30 days of purchase."}]}},
    {"type":"StoreFooter","props":{"id":"footer-contact","description":"Tell customers what your store stands for.","showCategories":true,"showCollections":true,"showContact":true,"copyrightText":"All rights reserved."}}
  ]
}`

const DefaultLegalLayout = `{
  "root":{"props":{}},
  "content":[
    {"type":"StoreNavigation","props":{"id":"nav-legal","homeLabel":"Home","productsLabel":"Products","showCategories":true,"showCollections":true,"featuredCategorySlug":"__all__","featuredCollectionSlug":"__all__","ctaLabel":"Shop now","ctaLink":"/products","sticky":true}},
    {"type":"StoreHeader","props":{"id":"header-legal","eyebrow":"Legal","subtitle":"Terms and conditions of use.","ctaLabel":"Browse catalog","ctaLink":"/products","showLogo":true,"backgroundColor":"","titleSize":"md","titleWeight":"bold","buttonSize":"md","buttonRadius":"full","spacing":"sm"}},
    {"type":"RichText","props":{"id":"text-legal","content":"<h2>Terms and Conditions</h2><p>Replace this text with your actual terms and conditions, privacy policy, or legal notices. This block supports full HTML formatting.</p><h3>1. Introduction</h3><p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p><h3>2. Use License</h3><p>Permission is granted to temporarily download one copy of the materials on this website for personal, non-commercial transitory viewing only.</p>","alignment":"left","maxWidth":"800px","textColor":"","backgroundColor":"","fontSize":"md","fontWeight":"regular","spacing":"lg"}},
    {"type":"StoreFooter","props":{"id":"footer-legal","description":"Tell customers what your store stands for.","showCategories":true,"showCollections":true,"showContact":false,"copyrightText":"All rights reserved."}}
  ]
}`
