import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// Helper to generate a random integer between min and max (inclusive)
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to generate a random float between min and max with desired decimal places
function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

// Helper to generate random litter data
function generateRandomLitterData(): Record<string, number> {
  const litterTypes = ['bottle', 'paper', 'plastic', 'cigarette', 'can', 'glass', 'other'];
  const result: Record<string, number> = {};
  
  litterTypes.forEach(type => {
    // Not all users will have all types of litter
    if (Math.random() > 0.3) {
      result[type] = getRandomInt(1, 50);
    }
  });
  
  return result;
}

// Helper to generate a random profile picture URL
function getProfilePictureUrl(): string {
  const pictureUrls = [
    'https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250',
    'https://i.pravatar.cc/250?u=mail@ashallendesign.co.uk',
    'http://placebeard.it/250/250'
  ];
  
  return pictureUrls[Math.floor(Math.random() * pictureUrls.length)];
}

async function main() {
  console.log('Starting seed process...');

  try {
    // First, clean up existing data
    await prisma.userBadge.deleteMany({});
    await prisma.ploggingSession.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('Existing data deleted');

    // Create badges with different requirements
    console.log('Creating badges...');
    
    // Badge with 0 requirements that everyone should get
    const welcomeBadge = await prisma.badge.create({
      data: {
        name: 'Welcome',
        description: 'Welcome to PlogGo! Start your plogging journey.',
        distancesRequired: 0,
        stepsRequired: 0,
        imageUrl: 'https://placehold.co/200x200/4CAF50/FFFFFF?text=Welcome',
      },
    });
    
    // Create other badges with different requirements
    const badgeData = [
      // Step-based badges
      {
        name: 'Beginner Walker',
        description: 'Walk 10,000 steps',
        stepsRequired: 10000,
        distancesRequired: null,
        imageUrl: 'https://placehold.co/200x200/2196F3/FFFFFF?text=Beginner',
      },
      {
        name: 'Intermediate Walker',
        description: 'Walk 50,000 steps',
        stepsRequired: 50000,
        distancesRequired: null,
        imageUrl: 'https://placehold.co/200x200/673AB7/FFFFFF?text=Intermediate',
      },
      {
        name: 'Expert Walker',
        description: 'Walk 100,000 steps',
        stepsRequired: 100000,
        distancesRequired: null,
        imageUrl: 'https://placehold.co/200x200/FF9800/FFFFFF?text=Expert',
      },
      
      // Distance-based badges
      {
        name: 'Distance Rookie',
        description: 'Travel 5 km',
        stepsRequired: null,
        distancesRequired: 5,
        imageUrl: 'https://placehold.co/200x200/009688/FFFFFF?text=Rookie',
      },
      {
        name: 'Distance Pro',
        description: 'Travel 25 km',
        stepsRequired: null,
        distancesRequired: 25,
        imageUrl: 'https://placehold.co/200x200/9C27B0/FFFFFF?text=Pro',
      },
      {
        name: 'Distance Master',
        description: 'Travel 100 km',
        stepsRequired: null,
        distancesRequired: 100,
        imageUrl: 'https://placehold.co/200x200/F44336/FFFFFF?text=Master',
      },
      
      // Combined requirement badges
      {
        name: 'Complete Athlete',
        description: 'Walk 100,000 steps and travel 100 km',
        stepsRequired: 100000,
        distancesRequired: 100,
        imageUrl: 'https://placehold.co/200x200/E91E63/FFFFFF?text=Athlete',
      },
      
      // Litter collection badges
      {
        name: 'Litter Rookie',
        description: 'Collect 50 pieces of litter',
        stepsRequired: null,
        distancesRequired: null,
        littersRequired: 50,
        imageUrl: 'https://placehold.co/200x200/8BC34A/FFFFFF?text=Litter',
      },
      {
        name: 'Litter Hero',
        description: 'Collect 200 pieces of litter',
        stepsRequired: null,
        distancesRequired: null,
        littersRequired: 200,
        imageUrl: 'https://placehold.co/200x200/CDDC39/FFFFFF?text=Hero',
      },
      
      // Points-based badges
      {
        name: 'Point Collector',
        description: 'Earn 1,000 points',
        stepsRequired: null,
        distancesRequired: null,
        pointsRequired: 1000,
        imageUrl: 'https://placehold.co/200x200/FFC107/FFFFFF?text=Points',
      },
      {
        name: 'Point Master',
        description: 'Earn 5,000 points',
        stepsRequired: null,
        distancesRequired: null,
        pointsRequired: 5000,
        imageUrl: 'https://placehold.co/200x200/FF5722/FFFFFF?text=Master',
      },
      
      // Time-based badges
      {
        name: 'Time Dedicator',
        description: 'Spend 10 hours plogging',
        stepsRequired: null,
        distancesRequired: null,
        timeRequired: 36000, // 10 hours in seconds
        imageUrl: 'https://placehold.co/200x200/795548/FFFFFF?text=Time',
      },
      {
        name: 'Time Champion',
        description: 'Spend 50 hours plogging',
        stepsRequired: null,
        distancesRequired: null,
        timeRequired: 180000, // 50 hours in seconds
        imageUrl: 'https://placehold.co/200x200/9E9E9E/FFFFFF?text=Champion',
      },
      
      // Streak-based badges
      {
        name: 'Weekly Streak',
        description: 'Maintain a 7-day plogging streak',
        stepsRequired: null,
        distancesRequired: null,
        streakRequired: 7,
        imageUrl: 'https://placehold.co/200x200/607D8B/FFFFFF?text=Weekly',
      },
      {
        name: 'Monthly Streak',
        description: 'Maintain a 30-day plogging streak',
        stepsRequired: null,
        distancesRequired: null,
        streakRequired: 30,
        imageUrl: 'https://placehold.co/200x200/3F51B5/FFFFFF?text=Monthly',
      },
    ];

    const badges = await Promise.all(
      badgeData.map(badge => 
        prisma.badge.create({
          data: badge,
        })
      )
    );
    
    console.log(`Created ${badges.length + 1} badges`);

    // Create 50 random users
    console.log('Creating users...');
    const users: any[] = [];
    
    // Create one admin user with predictable credentials
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@plogging.com',
        password: await hash('password', 10),
        name: 'Admin User',
        description: 'Administrator account',
        pfp: 'https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250',
        totalSteps: 120000,
        totalDistance: 150.5,
        totalTime: 54000, // 15 hours in seconds
        totalPoints: 3500,
        totalLitters: 250,
        collectedLitters: generateRandomLitterData(),
        streak: 10,
        highestStreak: 15,
      },
    });
    
    users.push(adminUser);
    
    // Create random users
    for (let i = 0; i < 50; i++) {
      const steps = getRandomInt(1000, 200000);
      const distance = getRandomFloat(1, 300);
      const time = getRandomInt(3600, 108000); // 1 to 30 hours in seconds
      const litters = getRandomInt(0, 500);
      const points = getRandomInt(100, 10000);
      const streak = getRandomInt(0, 30);
      const highestStreak = getRandomInt(streak, 60);
      
      const user = await prisma.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          password: await hash('password', 10),
          name: `User ${i + 1}`,
          description: `This is user ${i + 1}'s profile.`,
          pfp: getProfilePictureUrl(),
          totalSteps: steps,
          totalDistance: distance,
          totalTime: time,
          totalPoints: points,
          totalLitters: litters,
          collectedLitters: generateRandomLitterData(),
          streak,
          highestStreak,
        },
      });
      
      users.push(user);
    }
    
    console.log(`Created ${users.length} users`);

    // Create plogging sessions for some users
    console.log('Creating plogging sessions...');
    
    const sessions: any[] = [];
    const sessionsPerUser = 5; // Create up to 5 sessions per user
    
    for (const user of users) {
      // Randomly decide how many sessions to create for this user
      const numSessions = getRandomInt(0, sessionsPerUser);
      
      for (let i = 0; i < numSessions; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - getRandomInt(1, 60)); // Random date within last 60 days
        
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + getRandomInt(1, 3)); // Session lasted 1-3 hours
        
        const elapsedTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // seconds
        const distance = getRandomFloat(1, 10); // 1-10 km per session
        const steps = getRandomInt(1000, 15000); // 1k-15k steps per session
        const litterCount = getRandomInt(0, 50); // 0-50 litters per session
        const litterData = generateRandomLitterData();
        const points = getRandomInt(50, 500); // 50-500 points per session
        
        const session = await prisma.ploggingSession.create({
          data: {
            sessionId: `session-${user.id}-${i}`,
            userId: user.id,
            startTime,
            endTime,
            elapsedTime,
            routes: JSON.stringify([]), // Empty routes for now
            distancesTravelled: distance,
            steps,
            points,
            litterCollected: litterData,
          },
        });
        
        sessions.push(session);
      }
    }
    
    console.log(`Created ${sessions.length} plogging sessions`);

    // Award Welcome badge to all users
    console.log('Awarding welcome badge to all users...');
    
    await Promise.all(
      users.map(user => 
        prisma.userBadge.create({
          data: {
            userId: user.id,
            badgeId: welcomeBadge.id,
          },
        })
      )
    );
    
    console.log('Welcome badge awarded to all users');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 