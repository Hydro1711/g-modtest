// utils/seedShopItems.js
const ShopItem = require('../models/ShopItem');

const ITEMS = [
  // BOOSTS (cheap → mid → high)
  {
    itemId: 'work_gloves',
    name: 'Work Gloves',
    description: 'Increase your earnings from /work by 10%.',
    emoji: '🧤',
    category: 'boost',
    rarity: 'uncommon',
    basePrice: 2500,
    dynamicPricing: true,
    effects: { workMultiplier: 1.1 }
  },
  {
    itemId: 'coffee_thermos',
    name: 'Coffee Thermos',
    description: 'Gives a small boost to /work efficiency.',
    emoji: '☕',
    category: 'boost',
    rarity: 'common',
    basePrice: 800,
    dynamicPricing: false,
    effects: { workMultiplier: 1.03 }
  },
  {
    itemId: 'executive_briefcase',
    name: 'Executive Briefcase',
    description: 'Serious business. +20% /work rewards.',
    emoji: '💼',
    category: 'boost',
    rarity: 'rare',
    basePrice: 15000,
    dynamicPricing: true,
    effects: { workMultiplier: 1.2 }
  },
  {
    itemId: 'golden_briefcase',
    name: 'Golden Briefcase',
    description: 'Top-tier /work boost.',
    emoji: '🧳',
    category: 'boost',
    rarity: 'epic',
    basePrice: 45000,
    dynamicPricing: true,
    effects: { workMultiplier: 1.35 }
  },
  {
    itemId: 'infinite_coffee_machine',
    name: 'Infinite Coffee Machine',
    description: 'Your /work energy never fades. Huge boost.',
    emoji: '🧃',
    category: 'boost',
    rarity: 'legendary',
    basePrice: 200000,
    dynamicPricing: true,
    effects: { workMultiplier: 1.6 }
  },

  // CASINO BOOSTS
  {
    itemId: 'lucky_charm',
    name: 'Lucky Charm',
    description: 'Slightly increases your luck in casino games.',
    emoji: '🍀',
    category: 'boost',
    rarity: 'uncommon',
    basePrice: 7500,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.05, luckBonus: 2 }
  },
  {
    itemId: 'silver_chip_card',
    name: 'Silver Chip Card',
    description: 'A modest permanent boost to casino winnings.',
    emoji: '🎴',
    category: 'boost',
    rarity: 'rare',
    basePrice: 30000,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.1 }
  },
  {
    itemId: 'high_roller_card',
    name: 'High Roller Card',
    description: 'Big spender perks. Massive casino rewards boost.',
    emoji: '🎟️',
    category: 'boost',
    rarity: 'epic',
    basePrice: 120000,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.25, luckBonus: 5 }
  },
  {
    itemId: 'black_diamond_card',
    name: 'Black Diamond Card',
    description: 'Ultimate casino status. Huge payouts everywhere.',
    emoji: '💳',
    category: 'boost',
    rarity: 'legendary',
    basePrice: 750000,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.4, luckBonus: 10 }
  },

  // HEIST & CRIME BOOSTS
  {
    itemId: 'heist_mask',
    name: 'Heist Mask',
    description: 'Better odds & rewards in heists.',
    emoji: '🎭',
    category: 'boost',
    rarity: 'uncommon',
    basePrice: 10000,
    dynamicPricing: true,
    effects: { heistBoost: 0.1 }
  },
  {
    itemId: 'blueprint_kit',
    name: 'Blueprint Kit',
    description: 'Improved planning increases heist rewards.',
    emoji: '📐',
    category: 'boost',
    rarity: 'rare',
    basePrice: 45000,
    dynamicPricing: true,
    effects: { heistBoost: 0.25 }
  },
  {
    itemId: 'inside_man_contract',
    name: 'Inside Man Contract',
    description: 'Someone on the inside helps with your heists.',
    emoji: '🧾',
    category: 'special',
    rarity: 'epic',
    basePrice: 150000,
    dynamicPricing: true,
    effects: { heistBoost: 0.4 }
  },

  // UPGRADES (permanent, maybe later affect cooldowns)
  {
    itemId: 'ergonomic_keyboard',
    name: 'Ergonomic Keyboard',
    description: 'Slightly reduces /work cooldown.',
    emoji: '⌨️',
    category: 'upgrade',
    rarity: 'uncommon',
    basePrice: 12000,
    dynamicPricing: true,
    effects: { cooldownReductionMs: 60_000 } // 1 min
  },
  {
    itemId: 'time_management_course',
    name: 'Time Management Course',
    description: 'Reduces multiple cooldowns slightly.',
    emoji: '📘',
    category: 'upgrade',
    rarity: 'rare',
    basePrice: 35000,
    dynamicPricing: true,
    effects: { cooldownReductionMs: 180_000 }
  },
  {
    itemId: 'quantum_watch',
    name: 'Quantum Watch',
    description: 'Time bends around your grind.',
    emoji: '⌚',
    category: 'upgrade',
    rarity: 'legendary',
    basePrice: 220000,
    dynamicPricing: true,
    effects: { cooldownReductionMs: 600_000 }
  },

  // CASES (Gacha style, can be used later with /open case)
  {
    itemId: 'bronze_case',
    name: 'Bronze Case',
    description: 'Contains low–mid tier boosts.',
    emoji: '📦',
    category: 'case',
    rarity: 'common',
    basePrice: 5000,
    dynamicPricing: false
  },
  {
    itemId: 'silver_case',
    name: 'Silver Case',
    description: 'Better odds for rare items.',
    emoji: '🎁',
    category: 'case',
    rarity: 'uncommon',
    basePrice: 20000,
    dynamicPricing: false
  },
  {
    itemId: 'gold_case',
    name: 'Gold Case',
    description: 'High chance for rare & epic items.',
    emoji: '🧰',
    category: 'case',
    rarity: 'rare',
    basePrice: 60000,
    dynamicPricing: false
  },
  {
    itemId: 'diamond_case',
    name: 'Diamond Case',
    description: 'Contains only high-tier loot.',
    emoji: '💼',
    category: 'case',
    rarity: 'epic',
    basePrice: 200000,
    dynamicPricing: false
  },
  {
    itemId: 'mythic_vault',
    name: 'Mythic Vault',
    description: 'Ultra-rare case with insane rewards.',
    emoji: '🗄️',
    category: 'case',
    rarity: 'mythic',
    basePrice: 1_000_000,
    dynamicPricing: false
  },

  // COSMETICS
  {
    itemId: 'custom_profile_frame',
    name: 'Custom Profile Frame',
    description: 'Shows off your wealth in leaderboards.',
    emoji: '🖼️',
    category: 'cosmetic',
    rarity: 'rare',
    basePrice: 40000,
    dynamicPricing: false
  },
  {
    itemId: 'chat_name_tag',
    name: 'Fancy Name Tag',
    description: 'Adds flair to your profile (bot side).',
    emoji: '🏷️',
    category: 'cosmetic',
    rarity: 'uncommon',
    basePrice: 15000,
    dynamicPricing: false
  },
  {
    itemId: 'golden_title',
    name: 'Golden Title',
    description: 'A golden title visible in bot responses.',
    emoji: '👑',
    category: 'cosmetic',
    rarity: 'epic',
    basePrice: 125000,
    dynamicPricing: true
  },
  {
    itemId: 'cosmic_aura',
    name: 'Cosmic Aura',
    description: 'Particles & effects in your embeds.',
    emoji: '🌌',
    category: 'cosmetic',
    rarity: 'legendary',
    basePrice: 500000,
    dynamicPricing: true
  },

  // UTILITY
  {
    itemId: 'inventory_expander',
    name: 'Inventory Expander',
    description: 'Allows more active effects or slots (future use).',
    emoji: '🧺',
    category: 'utility',
    rarity: 'uncommon',
    basePrice: 18000,
    dynamicPricing: false
  },
  {
    itemId: 'statistics_tracker',
    name: 'Statistics Tracker',
    description: 'Unlocks more detailed personal stats.',
    emoji: '📊',
    category: 'utility',
    rarity: 'rare',
    basePrice: 50000,
    dynamicPricing: false
  },
  {
    itemId: 'backup_chip_wallet',
    name: 'Backup Chip Wallet',
    description: 'Protects a portion of chips from losses.',
    emoji: '👝',
    category: 'utility',
    rarity: 'epic',
    basePrice: 180000,
    dynamicPricing: true
  },

  // SPECIAL / EXTREME PRICE ITEMS
  {
    itemId: 'insurance_token',
    name: 'Insurance Token',
    description: 'Refunds 50% of your next big loss.',
    emoji: '🛡️',
    category: 'special',
    rarity: 'rare',
    basePrice: 85000,
    dynamicPricing: true,
    effects: { isConsumable: true }
  },
  {
    itemId: 'phoenix_token',
    name: 'Phoenix Token',
    description: 'If you hit 0 chips, revives you with a chunk.',
    emoji: '🔥',
    category: 'special',
    rarity: 'epic',
    basePrice: 250000,
    dynamicPricing: true,
    effects: { isConsumable: true }
  },
  {
    itemId: 'jackpot_key',
    name: 'Jackpot Key',
    description: 'One-time access to a special high-roll game.',
    emoji: '🔑',
    category: 'special',
    rarity: 'legendary',
    basePrice: 600000,
    dynamicPricing: true,
    effects: { isConsumable: true }
  },
  {
    itemId: 'golden_parachute',
    name: 'Golden Parachute',
    description: 'Softens the blow of catastrophic losses.',
    emoji: '🪂',
    category: 'special',
    rarity: 'legendary',
    basePrice: 900000,
    dynamicPricing: true
  },
  {
    itemId: 'server_sponsor',
    name: 'Server Sponsor',
    description: 'Extreme flex. Grants a cosmetic badge & massive boost.',
    emoji: '💰',
    category: 'special',
    rarity: 'mythic',
    basePrice: 2_500_000,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.5, workMultiplier: 1.5 }
  },
  {
    itemId: 'cosmic_patrons_pass',
    name: 'Cosmic Patron\'s Pass',
    description: 'Insane multi-boost item for the richest players.',
    emoji: '🌠',
    category: 'special',
    rarity: 'mythic',
    basePrice: 5_000_000,
    dynamicPricing: true,
    effects: { casinoMultiplier: 1.8, workMultiplier: 1.7, luckBonus: 15 }
  },

  // MORE FILLER TO HIT ~50
  {
    itemId: 'lucky_coin',
    name: 'Lucky Coin',
    description: 'Minor flat luck boost.',
    emoji: '🪙',
    category: 'boost',
    rarity: 'common',
    basePrice: 1500,
    dynamicPricing: false,
    effects: { luckBonus: 1 }
  },
  {
    itemId: 'rabbit_foot',
    name: 'Rabbit\'s Foot',
    description: 'Old-school luck charm.',
    emoji: '🐇',
    category: 'boost',
    rarity: 'uncommon',
    basePrice: 4000,
    dynamicPricing: true,
    effects: { luckBonus: 2 }
  },
  {
    itemId: 'rare_chip_sleeve',
    name: 'Rare Chip Sleeve',
    description: 'Makes your chips look high value.',
    emoji: '🧾',
    category: 'cosmetic',
    rarity: 'rare',
    basePrice: 22000,
    dynamicPricing: false
  },
  {
    itemId: 'led_desk_setup',
    name: 'LED Desk Setup',
    description: 'Boosts work vibes (and results).',
    emoji: '💡',
    category: 'upgrade',
    rarity: 'uncommon',
    basePrice: 9000,
    dynamicPricing: true,
    effects: { workMultiplier: 1.07 }
  },
  {
    itemId: 'luxury_penthouse',
    name: 'Luxury Penthouse',
    description: 'Insane flex housing cosmetic with minor bonus.',
    emoji: '🏙️',
    category: 'cosmetic',
    rarity: 'legendary',
    basePrice: 1_200_000,
    dynamicPricing: true,
    effects: { workMultiplier: 1.1 }
  },
  {
    itemId: 'crypto_mining_rig',
    name: 'Crypto Mining Rig',
    description: 'Generates small passive chips (future feature).',
    emoji: '🖥️',
    category: 'utility',
    rarity: 'epic',
    basePrice: 300000,
    dynamicPricing: true
  },
  {
    itemId: 'vault_upgrade',
    name: 'Vault Upgrade',
    description: 'Improves your chip protection & capacity.',
    emoji: '🏦',
    category: 'utility',
    rarity: 'epic',
    basePrice: 450000,
    dynamicPricing: true
  },
  {
    itemId: 'vip_lounge_access',
    name: 'VIP Lounge Access',
    description: 'Unlocks special VIP-only games & perks.',
    emoji: '🚪',
    category: 'special',
    rarity: 'legendary',
    basePrice: 1_750_000,
    dynamicPricing: true
  },
  {
    itemId: 'fortune_cookie_bundle',
    name: 'Fortune Cookie Bundle',
    description: 'Bundle of small, consumable luck boosts.',
    emoji: '🥠',
    category: 'boost',
    rarity: 'rare',
    basePrice: 25000,
    dynamicPricing: true,
    effects: { isConsumable: true }
  }
];

async function seedShopItems() {
  for (const data of ITEMS) {
    await ShopItem.findOneAndUpdate(
      { itemId: data.itemId },
      {
        $setOnInsert: {
          stock: data.maxStock || 0
        },
        $set: data
      },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded/updated ${ITEMS.length} shop items.`);
}

module.exports = { seedShopItems };
