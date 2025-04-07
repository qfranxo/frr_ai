// db/schema.ts
import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    numeric
  } from 'drizzle-orm/pg-core';
  
  // --- Users Table ---
  export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // --- Generations ---
  export const generations = pgTable('generations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    userName: varchar('user_name', { length: 255 }),
    imageUrl: text('image_url').notNull(),
    prompt: text('prompt'),
    aspectRatio: varchar('aspect_ratio', { length: 10 }),
    renderingStyle: varchar('rendering_style', { length: 20 }),
    gender: varchar('gender', { length: 10 }),
    age: varchar('age', { length: 10 }),
    background: varchar('background', { length: 20 }),
    skinType: varchar('skin_type', { length: 10 }),
    eyeColor: varchar('eye_color', { length: 10 }),
    hairStyle: varchar('hair_style', { length: 30 }),
    isShared: boolean('is_shared').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // --- Community Posts ---
  export const communityPosts = pgTable('community_posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id').references(() => generations.id),
    userId: uuid('user_id').references(() => users.id),
    content: text('content'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // --- Comments ---
  export const comments = pgTable('comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id'),
    userId: text('user_id'),
    content: text('content').notNull(),
    userName: text('user_name').notNull().default('사용자'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // --- Likes ---
  export const likes = pgTable('likes', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'),
    imageId: uuid('image_id'),
    userName: text('user_name').notNull().default('사용자'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // --- Plans ---
  export const plans = pgTable('plans', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 20 }),
    priceUsd: numeric('price_usd'),
    billingCycle: varchar('billing_cycle', { length: 20 }),
  });
  
  // --- User Subscriptions ---
  export const userSubscriptions = pgTable('user_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    planId: uuid('plan_id').references(() => plans.id),
    startedAt: timestamp('started_at').defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').default(true),
  });
  
  // --- Shared Images ---
  export const shared_images = pgTable('shared_images', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id').notNull(),
    user_name: text('user_name').notNull().default('사용자'),
    image_url: text('image_url').notNull(),
    prompt: text('prompt'),
    aspect_ratio: text('aspect_ratio').default('1:1'),
    category: text('category').default('portrait'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    show_on_community: boolean('show_on_community').default(true),
    original_generation_id: text('original_generation_id'),
  });
  