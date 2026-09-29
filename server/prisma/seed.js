import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { embed } from '../src/lib/embeddings.js'

const prisma = new PrismaClient()

const ads = [
  {
    advertiser: 'Backblaze',
    title: 'Unlimited cloud backup for $7/month',
    body: 'Automatic backup for your entire computer. Restore any file from anywhere.',
    url: 'https://www.backblaze.com',
    keywords: ['backup', 'cloud storage', 'data loss', 'recovery'],
    bidCpc: 1.20,
  },
  {
    advertiser: 'Notion',
    title: 'One workspace for notes, docs, and projects',
    body: 'Replace five tools with one. Notes, wikis, databases, and team collaboration.',
    url: 'https://notion.so',
    keywords: ['productivity', 'notes', 'project management', 'docs'],
    bidCpc: 0.90,
  },
  {
    advertiser: 'JetBrains',
    title: 'PyCharm — the Python IDE professionals use',
    body: 'Smart code completion, debugging, and refactoring for Python developers.',
    url: 'https://www.jetbrains.com/pycharm/',
    keywords: ['python', 'ide', 'programming', 'coding', 'developer tools'],
    bidCpc: 1.50,
  },
  {
    advertiser: 'Coursera',
    title: 'Learn AI and machine learning from top universities',
    body: 'Courses from Stanford, DeepLearning.AI, and IBM. Certificates included.',
    url: 'https://www.coursera.org',
    keywords: ['learning', 'online courses', 'education', 'career'],
    bidCpc: 0.70,
  },
  {
    advertiser: 'Hims',
    title: 'Hair loss treatment, prescribed online',
    body: 'Talk to a licensed provider. FDA-approved treatments delivered to your door.',
    url: 'https://www.hims.com',
    keywords: ['health', 'hair loss', 'telehealth', 'medical'],
    bidCpc: 2.10,
  },
  {
    advertiser: 'Robinhood',
    title: 'Commission-free investing, starting today',
    body: 'Buy and sell stocks, ETFs, and crypto with no commission fees.',
    url: 'https://robinhood.com',
    keywords: ['investing', 'stocks', 'finance', 'trading'],
    bidCpc: 1.80,
  },
  {
    advertiser: 'Grammarly',
    title: 'Write with confidence — Grammarly free',
    body: 'Real-time grammar, spelling, and tone suggestions everywhere you type.',
    url: 'https://www.grammarly.com',
    keywords: ['writing', 'grammar', 'editing', 'english'],
    bidCpc: 0.85,
  },
  {
    advertiser: 'Hostinger',
    title: 'Web hosting from $2.99/month',
    body: 'Fast, reliable hosting with a free domain and SSL certificate.',
    url: 'https://www.hostinger.com',
    keywords: ['hosting', 'website', 'server', 'domain'],
    bidCpc: 1.10,
  },
  {
    advertiser: 'Duolingo',
    title: 'Learn a language in 5 minutes a day',
    body: 'Free lessons in Spanish, French, Japanese, and 40+ other languages.',
    url: 'https://www.duolingo.com',
    keywords: ['language learning', 'education', 'spanish', 'french'],
    bidCpc: 0.60,
  },
  {
    advertiser: 'NordVPN',
    title: 'Browse privately with NordVPN',
    body: 'Encrypt your connection, hide your IP, and access content anywhere.',
    url: 'https://nordvpn.com',
    keywords: ['vpn', 'privacy', 'security', 'online safety'],
    bidCpc: 1.40,
  },
  {
    advertiser: 'DoorDash',
    title: 'Food delivery from your favorite restaurants',
    body: 'Get $0 delivery fees on your first order. Thousands of restaurants nearby.',
    url: 'https://www.doordash.com',
    keywords: ['food delivery', 'restaurants', 'takeout', 'delivery'],
    bidCpc: 0.95,
  },
  {
    advertiser: 'Booking.com',
    title: 'Find hotel deals worldwide',
    body: 'Book hotels, flights, and rentals with free cancellation on most stays.',
    url: 'https://www.booking.com',
    keywords: ['travel', 'hotels', 'flights', 'vacation', 'booking'],
    bidCpc: 1.30,
  },
  {
    advertiser: 'Figma',
    title: 'Design together in Figma',
    body: 'The collaborative interface design tool. Free for individuals.',
    url: 'https://www.figma.com',
    keywords: ['design', 'ui', 'ux', 'collaboration', 'prototyping'],
    bidCpc: 1.05,
  },
  {
    advertiser: 'Strava',
    title: 'Track every run, ride, and swim',
    body: 'Join 100M+ athletes. GPS tracking, segments, and social challenges.',
    url: 'https://www.strava.com',
    keywords: ['fitness', 'running', 'cycling', 'exercise', 'sports'],
    bidCpc: 0.75,
  },
  {
    advertiser: 'Brilliant',
    title: 'Learn math and science interactively',
    body: 'Bite-sized lessons in math, CS, and physics. Built by educators.',
    url: 'https://brilliant.org',
    keywords: ['learning', 'math', 'science', 'education', 'stem'],
    bidCpc: 1.15,
  },
  {
    advertiser: 'BetterHelp',
    title: 'Online therapy, on your schedule',
    body: 'Match with a licensed therapist. Text, video, or phone sessions.',
    url: 'https://www.betterhelp.com',
    keywords: ['therapy', 'mental health', 'counseling', 'wellness'],
    bidCpc: 2.50,
  },
  {
    advertiser: 'Square',
    title: 'Accept payments anywhere with Square',
    body: 'Card readers, invoicing, and online payments for small businesses.',
    url: 'https://squareup.com',
    keywords: ['payments', 'business', 'pos', 'invoicing', 'small business'],
    bidCpc: 1.60,
  },
  {
    advertiser: 'Audible',
    title: 'Try Audible free for 30 days',
    body: 'Thousands of audiobooks and podcasts. Two free titles to start.',
    url: 'https://www.audible.com',
    keywords: ['audiobooks', 'reading', 'books', 'podcasts'],
    bidCpc: 0.80,
  },
  {
    advertiser: 'Vercel',
    title: 'Deploy your frontend in seconds',
    body: 'The platform for modern web apps. Git push to deploy, free for hobby.',
    url: 'https://vercel.com',
    keywords: ['deployment', 'hosting', 'frontend', 'web development'],
    bidCpc: 1.25,
  },
  {
    advertiser: 'LeetCode',
    title: 'Ace your coding interview',
    body: 'Practice 3000+ coding problems. Prepare for FAANG interviews.',
    url: 'https://leetcode.com',
    keywords: ['coding interview', 'programming', 'algorithms', 'career'],
    bidCpc: 1.35,
  },
]

async function main() {
  console.log(`Seeding ${ads.length} ads…`)

  for (const ad of ads) {
    // Create the ad row (without embedding)
    const created = await prisma.ad.create({ data: ad })

    // Compute embedding for the ad's text content
    const text = `${ad.title}. ${ad.body}. Keywords: ${ad.keywords.join(', ')}`
    const vec = await embed(text)

    // Store the embedding via raw SQL (Prisma can't write vector columns natively)
    await prisma.$executeRawUnsafe(
      `UPDATE "Ad" SET embedding = $1::vector WHERE id = $2`,
      `[${vec.join(',')}]`,
      created.id
    )

    console.log(`  ✓ ${ad.advertiser}`)
  }

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())