/**
 * Menu Cleanup & Seeder
 * Removes all test/dummy menu data and seeds proper restaurant items.
 */
const pool = require('./connection');

const seedMenu = async () => {
  try {
    console.log('🧹 Cleaning up all dummy/test menu data...');

    // Temporarily disable FK checks to allow clean truncation
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Delete all existing menu items (hard delete)
    await pool.execute('DELETE FROM menu_items');
    await pool.execute('ALTER TABLE menu_items AUTO_INCREMENT = 1');

    // 2. Delete all existing categories
    await pool.execute('DELETE FROM menu_categories');
    await pool.execute('ALTER TABLE menu_categories AUTO_INCREMENT = 1');

    // Re-enable FK checks
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Old data cleared.');

    // 3. Seed proper categories
    console.log('📂 Seeding categories...');
    const categories = [
      ['Starters', '🥗'],
      ['Pizza', '🍕'],
      ['Burgers', '🍔'],
      ['Pasta', '🍝'],
      ['Indian', '🍛'],
      ['Chinese', '🍜'],
      ['Grills', '🥩'],
      ['Desserts', '🍰'],
      ['Drinks', '🥤'],
      ['Breakfast', '🍳'],
    ];

    const categoryIds = {};
    for (const [name, icon] of categories) {
      const [result] = await pool.execute(
        'INSERT INTO menu_categories (category_name, icon) VALUES (?, ?)',
        [name, icon]
      );
      categoryIds[name] = result.insertId;
      console.log(`  ✔ Category: ${name} (id=${result.insertId})`);
    }

    // 4. Seed proper menu items
    console.log('🍽️  Seeding menu items...');
    const items = [
      // Starters
      ['Veg Spring Rolls', categoryIds['Starters'], 149, '🥗', 'Crispy fried rolls with fresh veggies', 'In Stock'],
      ['Chicken Tikka', categoryIds['Starters'], 249, '🍗', 'Tandoor grilled spiced chicken', 'In Stock'],
      ['Paneer Tikka', categoryIds['Starters'], 199, '🧀', 'Grilled cottage cheese with spices', 'In Stock'],
      ['French Fries', categoryIds['Starters'], 99, '🍟', 'Golden crispy salted fries', 'In Stock'],
      ['Onion Rings', categoryIds['Starters'], 89, '🧅', 'Beer-battered crispy onion rings', 'In Stock'],

      // Pizza
      ['Margherita Pizza', categoryIds['Pizza'], 299, '🍕', 'Classic tomato, mozzarella, fresh basil', 'In Stock'],
      ['Pepperoni Pizza', categoryIds['Pizza'], 399, '🍕', 'Beef pepperoni with extra cheese', 'In Stock'],
      ['BBQ Chicken Pizza', categoryIds['Pizza'], 429, '🍕', 'Smoky BBQ sauce with grilled chicken', 'In Stock'],
      ['Veggie Supreme', categoryIds['Pizza'], 349, '🍕', 'Garden veggies on tangy tomato base', 'In Stock'],

      // Burgers
      ['Classic Beef Burger', categoryIds['Burgers'], 199, '🍔', 'Juicy beef patty with lettuce, tomato', 'In Stock'],
      ['Crispy Chicken Burger', categoryIds['Burgers'], 179, '🍔', 'Fried chicken fillet with coleslaw', 'In Stock'],
      ['Veggie Burger', categoryIds['Burgers'], 149, '🍔', 'Black bean patty with avocado spread', 'In Stock'],
      ['Double Smash Burger', categoryIds['Burgers'], 279, '🍔', 'Double smash patties, special sauce', 'In Stock'],

      // Pasta
      ['Spaghetti Bolognese', categoryIds['Pasta'], 299, '🍝', 'Minced meat in rich tomato sauce', 'In Stock'],
      ['Chicken Alfredo', categoryIds['Pasta'], 329, '🍝', 'Creamy alfredo with grilled chicken', 'In Stock'],
      ['Pesto Pasta', categoryIds['Pasta'], 269, '🍝', 'Basil pesto with cherry tomatoes', 'In Stock'],
      ['Arrabbiata Pasta', categoryIds['Pasta'], 249, '🍝', 'Spicy tomato garlic sauce', 'In Stock'],

      // Indian
      ['Butter Chicken', categoryIds['Indian'], 349, '🍛', 'Creamy tomato gravy with tender chicken', 'In Stock'],
      ['Dal Makhani', categoryIds['Indian'], 249, '🍛', 'Slow-cooked black lentils, cream', 'In Stock'],
      ['Paneer Butter Masala', categoryIds['Indian'], 299, '🍛', 'Cottage cheese in rich tomato gravy', 'In Stock'],
      ['Chicken Biryani', categoryIds['Indian'], 399, '🍛', 'Fragrant basmati with spiced chicken', 'In Stock'],
      ['Veg Biryani', categoryIds['Indian'], 299, '🍛', 'Aromatic basmati with mixed vegetables', 'In Stock'],
      ['Naan Bread', categoryIds['Indian'], 49, '🫓', 'Soft leavened tandoor bread', 'In Stock'],

      // Chinese
      ['Veg Manchurian', categoryIds['Chinese'], 189, '🍜', 'Fried veg balls in spicy sauce', 'In Stock'],
      ['Chicken Fried Rice', categoryIds['Chinese'], 229, '🍜', 'Wok-tossed rice with chicken & veggies', 'In Stock'],
      ['Hakka Noodles', categoryIds['Chinese'], 199, '🍜', 'Stir-fried noodles with fresh veggies', 'In Stock'],
      ['Chilli Chicken', categoryIds['Chinese'], 259, '🍜', 'Spicy tossed chicken with capsicum', 'In Stock'],

      // Grills
      ['Chicken Grill Platter', categoryIds['Grills'], 449, '🥩', 'Mixed grilled chicken with sides', 'In Stock'],
      ['Seekh Kebab', categoryIds['Grills'], 299, '🥩', 'Minced meat kebabs from the grill', 'In Stock'],
      ['Fish Tikka', categoryIds['Grills'], 349, '🐟', 'Marinated fish fillets, tandoor grilled', 'In Stock'],

      // Desserts
      ['Chocolate Lava Cake', categoryIds['Desserts'], 199, '🍫', 'Warm cake with molten chocolate core', 'In Stock'],
      ['Vanilla Ice Cream', categoryIds['Desserts'], 99, '🍨', 'Three scoops of creamy vanilla', 'In Stock'],
      ['Tiramisu', categoryIds['Desserts'], 229, '🍰', 'Classic Italian espresso dessert', 'In Stock'],
      ['Gulab Jamun', categoryIds['Desserts'], 99, '🍮', 'Soft milk dumplings in rose syrup', 'In Stock'],

      // Drinks
      ['Fresh Lime Soda', categoryIds['Drinks'], 79, '🍋', 'Sweet or salted, refreshing lime', 'In Stock'],
      ['Mango Lassi', categoryIds['Drinks'], 99, '🥛', 'Thick chilled mango yogurt drink', 'In Stock'],
      ['Cold Coffee', categoryIds['Drinks'], 129, '☕', 'Blended coffee with cream, chilled', 'In Stock'],
      ['Coca Cola', categoryIds['Drinks'], 49, '🥤', 'Chilled 300ml', 'In Stock'],
      ['Orange Juice', categoryIds['Drinks'], 89, '🍊', 'Freshly squeezed, no added sugar', 'In Stock'],
      ['Water Bottle', categoryIds['Drinks'], 20, '💧', '1 litre packaged mineral water', 'In Stock'],

      // Breakfast
      ['Full English Breakfast', categoryIds['Breakfast'], 299, '🍳', 'Eggs, toast, beans, sausage & grilled tomato', 'In Stock'],
      ['Masala Omelette', categoryIds['Breakfast'], 99, '🍳', 'Spiced egg omelette with onions & chilli', 'In Stock'],
      ['Pancakes with Maple Syrup', categoryIds['Breakfast'], 149, '🥞', 'Fluffy buttermilk pancakes, warm maple', 'In Stock'],
      ['Avocado Toast', categoryIds['Breakfast'], 179, '🥑', 'Smashed avocado on sourdough, poached egg', 'In Stock'],
      ['Fruit Bowl', categoryIds['Breakfast'], 129, '🍎', 'Seasonal fresh-cut fruits, honey drizzle', 'In Stock'],
    ];

    for (const [name, catId, price, icon, desc, avail] of items) {
      await pool.execute(
        'INSERT INTO menu_items (item_name, category_id, price, image, description, availability) VALUES (?, ?, ?, ?, ?, ?)',
        [name, catId, price, icon, desc, avail]
      );
      console.log(`  ✔ ${name} (₹${price})`);
    }

    console.log(`\n✅ Done! Seeded ${categories.length} categories and ${items.length} menu items.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedMenu();
