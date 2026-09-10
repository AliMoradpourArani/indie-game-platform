// Dev seed — LOCAL ONLY. Never use these credentials anywhere real.
// Run: npm run db:seed (requires DATABASE_URL pointing at the dev database).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const hash = (pw) => bcrypt.hash(pw, 12);
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
            profile: { create: { displayName: 'Indie Studio Dev', locale: 'en' } },
            developerProfile: { create: { studioName: 'Pixel Lantern Studio' } },
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
    const game = await prisma.game.upsert({
        where: { slug: 'lantern-drift' },
        update: {},
        create: {
            slug: 'lantern-drift',
            title: 'Lantern Drift',
            description: 'A cozy drifting adventure through a lantern-lit archipelago.',
            genre: 'Adventure',
            tags: ['cozy', 'exploration', 'singleplayer'],
            priceCents: 999,
            currency: 'USD',
            developerId: dev.id,
            versions: {
                create: {
                    version: '0.1.0',
                    changelog: 'First playable prototype.',
                    builds: {
                        create: {
                            platform: 'WINDOWS',
                            storageKey: `games/placeholder/0.1.0/windows/demo.zip`,
                            sizeBytes: 0,
                            sha256: 'placeholder',
                            demo: true,
                        },
                    },
                },
            },
        },
    });
    const version = await prisma.gameVersion.findFirstOrThrow({
        where: { gameId: game.id, version: '0.1.0' },
    });
    await prisma.submission.upsert({
        where: { id: 'seed-submission-draft' },
        update: {},
        create: {
            id: 'seed-submission-draft',
            gameId: game.id,
            versionId: version.id,
            state: 'DRAFT',
            submittedBy: dev.id,
        },
    });
    await prisma.auditLog.create({
        data: {
            actorId: admin.id,
            action: 'seed.completed',
            entityType: 'system',
            entityId: 'seed',
            diff: { player: player.email },
        },
    });
    console.log('Seed complete:', { admin: admin.email, dev: dev.email, player: player.email });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map