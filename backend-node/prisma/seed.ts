import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
console.log("prisma", prisma)
async function main() {
  // Seed badges
  const marathonBadge = await prisma.badge.upsert({
    where: { name: 'marathon runner' },
    update: {},
    create: {
      name: 'marathon runner',
      description: 'awarded for running 123km',
      distancesRequired: 123,
      stepsRequired: 123
    }
  });
  
  // Seed challenges
  const challenge = await prisma.challenge.create({
    data: {
      title: 'Daily Cleanup',
      description: 'Collect 10 pieces of litter in your neighborhood',
      points: 50
    }
  });
  
  // Seed a test user (only if the database is empty)
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: hashedPassword,
        description: 'This is a test account',
        totalSteps: 1234,
        totalDistance: 1234,
        totalTime: 1234,
        totalPoints: 32,
        totalLitters: 11,
        streak: 4,
        highestStreak: 4,
        pfp: 'https://example.com/default_profile_pic.jpg'
      }
    });
    
    // Add badge to user
    await prisma.userBadge.create({
      data: {
        userId: user.id,
        badgeId: marathonBadge.id
      }
    });
  }
  
  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 