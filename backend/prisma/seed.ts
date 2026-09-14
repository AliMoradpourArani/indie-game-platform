// Dev seed — LOCAL ONLY. Never use these credentials anywhere real.
// Run: npm run db:seed (requires DATABASE_URL pointing at the dev database).
import { PrismaClient, type BuildPlatform, type MediaKind, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  console.log('Seeding users...');
  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test' },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test',
      passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!'),
      role: 'ADMIN',
      profile: { create: { displayName: 'Local Admin', locale: 'en' } },
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: process.env.SEED_DEV_EMAIL ?? 'dev@local.test' },
    update: {},
    create: {
      email: process.env.SEED_DEV_EMAIL ?? 'dev@local.test',
      passwordHash: await hash(process.env.SEED_DEV_PASSWORD ?? 'Dev1234!'),
      role: 'DEVELOPER',
      profile: { create: { displayName: 'Pixel Lantern Studio', locale: 'en' } },
      developerProfile: { create: { studioName: 'Pixel Lantern Studio', verified: true } },
    },
  });

  const devNeon = await prisma.user.upsert({
    where: { email: 'neon@local.test' },
    update: {},
    create: {
      email: 'neon@local.test',
      passwordHash: await hash('Dev1234!'),
      role: 'DEVELOPER',
      profile: { create: { displayName: 'Neon Forge Interactive', locale: 'en' } },
      developerProfile: { create: { studioName: 'Neon Forge Interactive', verified: true } },
    },
  });

  const player = await prisma.user.upsert({
    where: { email: process.env.SEED_PLAYER_EMAIL ?? 'player@local.test' },
    update: {},
    create: {
      email: process.env.SEED_PLAYER_EMAIL ?? 'player@local.test',
      passwordHash: await hash(process.env.SEED_PLAYER_PASSWORD ?? 'Player1234!'),
      role: 'PLAYER',
      profile: { create: { displayName: 'Curious Player', locale: 'en' } },
    },
  });

  console.log('Seeding discount codes...');
  const discountCodes = [
    { code: 'WELCOME20', percentOff: 20 },
    { code: 'INDIE10', percentOff: 10 },
    { code: 'LAUNCH50', percentOff: 50 },
  ];
  for (const dc of discountCodes) {
    await prisma.discountCode.upsert({
      where: { code: dc.code },
      update: { percentOff: dc.percentOff, active: true },
      create: { code: dc.code, percentOff: dc.percentOff, active: true },
    });
  }

  console.log('Seeding rich default games...');

  const gamesData = [
    {
      slug: 'lantern-drift',
      title: 'Lantern Drift',
      description:
        'A cozy drifting adventure through a lantern-lit archipelago.\n\nGuide your illuminated skiff through forgotten waterways, meet eccentric villagers, discover ancient spirit shrines, and unearth secrets beneath glowing waters. Experience atmospheric weather, day-night cycles, and a soothing ambient soundtrack.',
      genre: 'Adventure',
      tags: ['cozy', 'exploration', 'singleplayer', 'atmospheric', 'relaxing'],
      priceCents: 999,
      currency: 'USD',
      developerId: dev.id,
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '1.2.0',
      changelog: 'Added photo mode, 14 new hidden shrines, and improved water rendering performance.',
      requirements: { os: 'Windows 10 64-bit / Ubuntu 22.04', processor: 'Intel Core i5-4460 / AMD Ryzen 3 1200', memory: '8 GB RAM', graphics: 'NVIDIA GTX 960 / AMD Radeon R9 280' },
      comments: [
        { authorId: player.id, body: 'The atmosphere in Lantern Drift is extraordinary. Absolutely love the soundtrack and peaceful navigation mechanics!' },
        { authorId: admin.id, body: 'Verified build. Beautiful visuals, runs smooth on modern hardware.' },
      ],
      ratings: [
        { userId: player.id, stars: 5 },
        { userId: admin.id, stars: 5 },
      ],
    },
    {
      slug: 'cyber-neon-2088',
      title: 'Cyber Neon 2088',
      description:
        'High-octane synthwave slash-and-dash combat across the rain-drenched rooftops of Neo-Kyoto.\n\nDeflect plasma rounds, chain lightning blade combos, and outmaneuver rogue corporate security syndicates to an original electronic soundtrack. Fluid dash mechanics and responsive combat ensure pure adrenaline.',
      genre: 'Action',
      tags: ['cyberpunk', 'fast-paced', 'hack-and-slash', 'synthwave', 'action'],
      priceCents: 1499,
      currency: 'USD',
      developerId: devNeon.id,
      coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '1.0.4',
      changelog: 'Balance tweaks for chapter 3 bosses, remapped controller dash buffer, added 120Hz support.',
      requirements: { os: 'Windows 11 / Linux', processor: 'AMD Ryzen 5 3600 / Intel i7-8700', memory: '16 GB RAM', graphics: 'RTX 2060 / RX 5600 XT' },
      comments: [
        { authorId: player.id, body: 'Incredible combat flow! If you enjoy fast-paced action and synthwave aesthetics, this is a must-play.' },
      ],
      ratings: [
        { userId: player.id, stars: 5 },
      ],
    },
    {
      slug: 'chrono-weaver',
      title: 'Chrono Weaver',
      description:
        'A mind-bending spatial puzzle game where you record, rewind, and weave temporal clones of yourself to solve ancient clockwork mechanisms.\n\nManipulate paradoxical anomalies, synchronize past and present actions, and reconstruct broken timelines in a minimalist, contemplative universe. Completely free to play.',
      genre: 'Puzzle',
      tags: ['puzzle', 'time-manipulation', 'sci-fi', 'minimalist', 'free'],
      priceCents: 0,
      currency: 'USD',
      developerId: dev.id,
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '2.0.0',
      changelog: 'Complete remaster with 25 new temporal chamber challenges and undo timeline scrub.',
      requirements: { os: 'Windows / Mac / Linux / Web Browser', processor: 'Any dual core CPU', memory: '4 GB RAM', graphics: 'Integrated Graphics' },
      comments: [
        { authorId: player.id, body: 'The puzzles in the third sector blew my mind. Super clever mechanics and completely free!' },
      ],
      ratings: [
        { userId: player.id, stars: 4 },
      ],
    },
    {
      slug: 'pixel-dungeon-valdor',
      title: 'Pixel Dungeon: Depths of Valdor',
      description:
        'Procedurally generated tactical dungeon crawler featuring permadeath, hundreds of discoverable artifacts, dynamic potion crafting, and unforgiving boss encounters in the abyssal depths.\n\nEvery run offers new synergies and secrets. Choose from 4 unique character classes and master turn-based positioning.',
      genre: 'RPG',
      tags: ['roguelike', 'rpg', 'pixel-art', 'tactical', 'dungeon-crawler'],
      priceCents: 499,
      currency: 'USD',
      developerId: dev.id,
      coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '1.3.1',
      changelog: 'Added Necromancer class, 18 new dungeon room templates, and full steam deck controller support.',
      requirements: { os: 'Windows 10 / SteamOS / Linux', processor: '2.0 GHz CPU', memory: '4 GB RAM', graphics: 'DirectX 11 compatible GPU' },
      comments: [
        { authorId: player.id, body: 'Very deep roguelike! Hard as nails but rewarding once you figure out artifact synergies.' },
      ],
      ratings: [
        { userId: player.id, stars: 5 },
      ],
    },
    {
      slug: 'solaris-echoes',
      title: 'Solaris Echoes',
      description:
        'Command a derelict orbital station on the rim of an unstable dying star.\n\nManage critical energy reserves, decipher anomalous radio signals from deep space, negotiate with passing scavenger convoys, and make impossible choices to ensure the survival of your crew.\n\nA tense narrative strategy experience with multiple branching endings.',
      genre: 'Strategy',
      tags: ['strategy', 'space', 'simulation', 'sci-fi', 'story-rich'],
      priceCents: 1999,
      currency: 'USD',
      developerId: devNeon.id,
      coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '1.1.0',
      changelog: 'Solar flare storm event overhaul, 6 new diplomatic encounters, added endless survival mode.',
      requirements: { os: 'Windows 10 64-bit / macOS 12+', processor: 'Quad-Core 3.0 GHz', memory: '8 GB RAM', graphics: 'Dedicated GPU with 4GB VRAM' },
      comments: [
        { authorId: player.id, body: 'The tension during solar flare events is incredible. Every decision carries weight.' },
      ],
      ratings: [
        { userId: player.id, stars: 5 },
      ],
    },
    {
      slug: 'mystic-botanica',
      title: 'Mystic Botanica',
      description:
        'Cultivate magical flora in a greenhouse suspended between cloud realms.\n\nHybridize rare seeds, brew aromatic botanical elixirs, and fulfill orders for enchanting woodland creatures in a serene, stress-free garden paradise. No timers, no fail states — just botanical creativity.',
      genre: 'Casual',
      tags: ['casual', 'simulation', 'relaxing', 'botanical', 'cute'],
      priceCents: 799,
      currency: 'USD',
      developerId: dev.id,
      coverUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&q=80',
      ],
      version: '1.0.2',
      changelog: 'Added night-blooming lunar orchids and greenhouse weather customizer.',
      requirements: { os: 'Windows / Mac / Web', processor: 'Any modern processor', memory: '4 GB RAM', graphics: 'OpenGL 3.3 compatible' },
      comments: [
        { authorId: player.id, body: 'The most relaxing game I have played all year. The seed cross-breeding system is delightful.' },
      ],
      ratings: [
        { userId: player.id, stars: 4 },
      ],
    },
  ];

  for (const g of gamesData) {
    console.log(`Seeding game: ${g.title}`);
    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      update: {
        title: g.title,
        description: g.description,
        genre: g.genre,
        tags: g.tags,
        priceCents: g.priceCents,
        currency: g.currency,
        coverKey: g.coverUrl,
        isArchived: false,
      },
      create: {
        slug: g.slug,
        title: g.title,
        description: g.description,
        genre: g.genre,
        tags: g.tags,
        priceCents: g.priceCents,
        currency: g.currency,
        coverKey: g.coverUrl,
        developerId: g.developerId,
        isArchived: false,
      },
    });

    // Version
    const version = await prisma.gameVersion.upsert({
      where: { gameId_version: { gameId: game.id, version: g.version } },
      update: { changelog: g.changelog, requirements: g.requirements },
      create: {
        gameId: game.id,
        version: g.version,
        changelog: g.changelog,
        requirements: g.requirements,
      },
    });

    // Builds
    const platforms: BuildPlatform[] = ['WINDOWS', 'LINUX', 'WEB'];
    for (const platform of platforms) {
      // Demo build
      await prisma.gameBuild.upsert({
        where: { versionId_platform_demo: { versionId: version.id, platform, demo: true } },
        update: {},
        create: {
          versionId: version.id,
          platform,
          storageKey: `games/${game.id}/${version.version}/${platform.toLowerCase()}/demo.zip`,
          sizeBytes: BigInt(25 * 1024 * 1024),
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          demo: true,
        },
      });

      // Full build
      await prisma.gameBuild.upsert({
        where: { versionId_platform_demo: { versionId: version.id, platform, demo: false } },
        update: {},
        create: {
          versionId: version.id,
          platform,
          storageKey: `games/${game.id}/${version.version}/${platform.toLowerCase()}/full.zip`,
          sizeBytes: BigInt(150 * 1024 * 1024),
          sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
          demo: false,
        },
      });
    }

    // Media
    // Remove previous seeded media for clean state
    await prisma.gameMedia.deleteMany({ where: { gameId: game.id } });
    await prisma.gameMedia.create({
      data: {
        gameId: game.id,
        kind: 'COVER',
        storageKey: g.coverUrl,
        sortOrder: 0,
      },
    });
    for (let i = 0; i < g.screenshots.length; i++) {
      await prisma.gameMedia.create({
        data: {
          gameId: game.id,
          kind: 'SCREENSHOT',
          storageKey: g.screenshots[i],
          sortOrder: i + 1,
        },
      });
    }

    // Submission in PUBLISHED state so game is visible immediately
    const existingSub = await prisma.submission.findFirst({
      where: { gameId: game.id, versionId: version.id },
    });
    if (existingSub) {
      await prisma.submission.update({
        where: { id: existingSub.id },
        data: { state: 'PUBLISHED' },
      });
    } else {
      await prisma.submission.create({
        data: {
          gameId: game.id,
          versionId: version.id,
          state: 'PUBLISHED',
          submittedBy: g.developerId,
        },
      });
    }

    // Comments
    await prisma.gameComment.deleteMany({ where: { gameId: game.id } });
    for (const c of g.comments) {
      await prisma.gameComment.create({
        data: {
          gameId: game.id,
          authorId: c.authorId,
          body: c.body,
        },
      });
    }

    // Ratings
    for (const r of g.ratings) {
      await prisma.gameRating.upsert({
        where: { gameId_userId: { gameId: game.id, userId: r.userId } },
        update: { stars: r.stars },
        create: {
          gameId: game.id,
          userId: r.userId,
          stars: r.stars,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
  console.log('Accounts ready:');
  console.log('  Admin:     admin@local.test  / Admin1234!');
  console.log('  Developer: dev@local.test    / Dev1234!');
  console.log('  Player:    player@local.test / Player1234!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
