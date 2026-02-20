
-- Add calorie_target column to diet_plans
ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS calorie_target integer;

-- Create foods table
CREATE TABLE public.foods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  calories integer NOT NULL,
  protein real NOT NULL DEFAULT 0,
  carbs real NOT NULL DEFAULT 0,
  fats real NOT NULL DEFAULT 0,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  allergy_tags text[] DEFAULT '{}',
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Anyone can read foods (it's a reference table)
CREATE POLICY "Anyone can view foods" ON public.foods FOR SELECT USING (true);

-- Admins can manage foods
CREATE POLICY "Admins can manage foods" ON public.foods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed breakfast foods
INSERT INTO public.foods (name, calories, protein, carbs, fats, meal_type, allergy_tags, category) VALUES
('Oatmeal with Banana', 280, 8, 48, 6, 'breakfast', '{"gluten"}', 'general'),
('Paratha with Egg', 350, 14, 35, 18, 'breakfast', '{"gluten","egg"}', 'halal'),
('Greek Yogurt with Honey', 200, 15, 25, 5, 'breakfast', '{"dairy"}', 'general'),
('Aloo Paratha', 300, 7, 40, 13, 'breakfast', '{"gluten","dairy"}', 'vegetarian'),
('Scrambled Eggs on Toast', 320, 18, 28, 14, 'breakfast', '{"gluten","egg"}', 'general'),
('Fruit Smoothie Bowl', 250, 6, 45, 5, 'breakfast', '{}', 'vegan'),
('Halwa Puri', 450, 8, 55, 22, 'breakfast', '{"gluten","dairy"}', 'halal'),
('Avocado Toast', 280, 8, 30, 15, 'breakfast', '{"gluten"}', 'vegan'),
('Chana Chaat', 220, 10, 32, 6, 'breakfast', '{}', 'vegan'),
('Dahi Vada', 260, 9, 35, 10, 'breakfast', '{"dairy"}', 'vegetarian'),
('Protein Pancakes', 300, 20, 32, 8, 'breakfast', '{"gluten","egg","dairy"}', 'general'),
('Nihari with Naan', 420, 22, 38, 20, 'breakfast', '{"gluten"}', 'halal'),
('Peanut Butter Banana Wrap', 340, 12, 40, 16, 'breakfast', '{"gluten","nuts"}', 'vegan'),
('Boiled Eggs with Fruit', 200, 14, 18, 8, 'breakfast', '{"egg"}', 'general'),
('Cornflakes with Milk', 220, 6, 38, 4, 'breakfast', '{"dairy","gluten"}', 'general');

-- Seed lunch foods
INSERT INTO public.foods (name, calories, protein, carbs, fats, meal_type, allergy_tags, category) VALUES
('Chicken Biryani', 500, 28, 55, 18, 'lunch', '{}', 'halal'),
('Dal Chawal', 380, 14, 58, 8, 'lunch', '{}', 'vegetarian'),
('Grilled Chicken Salad', 350, 32, 15, 18, 'lunch', '{}', 'general'),
('Beef Kebab with Rice', 480, 30, 45, 20, 'lunch', '{}', 'halal'),
('Vegetable Pulao', 320, 8, 52, 8, 'lunch', '{}', 'vegan'),
('Fish Curry with Rice', 420, 28, 48, 14, 'lunch', '{"fish"}', 'general'),
('Chicken Karahi', 400, 30, 10, 28, 'lunch', '{}', 'halal'),
('Palak Paneer with Roti', 380, 16, 38, 18, 'lunch', '{"dairy","gluten"}', 'vegetarian'),
('Lentil Soup with Bread', 300, 16, 42, 6, 'lunch', '{"gluten"}', 'vegan'),
('Chicken Wrap', 420, 26, 38, 18, 'lunch', '{"gluten"}', 'general'),
('Chana Masala with Rice', 400, 14, 60, 10, 'lunch', '{}', 'vegan'),
('Mutton Qorma with Naan', 520, 28, 42, 26, 'lunch', '{"gluten"}', 'halal'),
('Turkey & Cheese Sandwich', 380, 24, 34, 16, 'lunch', '{"gluten","dairy"}', 'general'),
('Rajma Chawal', 400, 16, 58, 10, 'lunch', '{}', 'vegetarian'),
('Grilled Salmon with Veggies', 380, 34, 12, 22, 'lunch', '{"fish"}', 'general');

-- Seed dinner foods
INSERT INTO public.foods (name, calories, protein, carbs, fats, meal_type, allergy_tags, category) VALUES
('Chicken Tikka with Salad', 350, 32, 12, 20, 'dinner', '{}', 'halal'),
('Vegetable Stir Fry with Rice', 320, 10, 48, 10, 'dinner', '{"soy"}', 'vegan'),
('Grilled Fish with Vegetables', 300, 30, 15, 14, 'dinner', '{"fish"}', 'general'),
('Daal Makhani with Roti', 380, 14, 45, 16, 'dinner', '{"gluten","dairy"}', 'vegetarian'),
('Chicken Soup with Bread', 280, 20, 30, 8, 'dinner', '{"gluten"}', 'general'),
('Beef Steak with Salad', 400, 35, 8, 26, 'dinner', '{}', 'general'),
('Egg Curry with Rice', 350, 16, 42, 14, 'dinner', '{"egg"}', 'vegetarian'),
('Seekh Kebab with Raita', 380, 28, 15, 24, 'dinner', '{"dairy"}', 'halal'),
('Tofu Curry with Brown Rice', 340, 18, 44, 12, 'dinner', '{"soy"}', 'vegan'),
('Chicken Pasta', 420, 24, 48, 16, 'dinner', '{"gluten","dairy"}', 'general'),
('Mixed Vegetable Curry with Chapati', 300, 10, 42, 10, 'dinner', '{"gluten"}', 'vegetarian'),
('Lamb Chops with Veggies', 420, 32, 10, 28, 'dinner', '{}', 'halal'),
('Quinoa Salad with Chickpeas', 320, 14, 44, 10, 'dinner', '{}', 'vegan'),
('Shrimp Fried Rice', 380, 22, 46, 12, 'dinner', '{"shellfish","soy"}', 'general'),
('Khichdi with Dahi', 280, 12, 40, 8, 'dinner', '{"dairy"}', 'vegetarian');

-- Seed snack foods
INSERT INTO public.foods (name, calories, protein, carbs, fats, meal_type, allergy_tags, category) VALUES
('Mixed Nuts (30g)', 170, 5, 6, 15, 'snack', '{"nuts"}', 'general'),
('Banana', 105, 1, 27, 0.4, 'snack', '{}', 'vegan'),
('Apple with Peanut Butter', 200, 5, 28, 9, 'snack', '{"nuts"}', 'general'),
('Yogurt Cup', 120, 8, 15, 3, 'snack', '{"dairy"}', 'general'),
('Protein Bar', 200, 15, 22, 7, 'snack', '{"gluten","dairy","nuts"}', 'general'),
('Roasted Chana', 130, 8, 20, 3, 'snack', '{}', 'vegan'),
('Fruit Chat', 120, 2, 28, 1, 'snack', '{}', 'vegan'),
('Dates (4 pcs)', 110, 1, 28, 0.2, 'snack', '{}', 'vegan'),
('Cheese Crackers', 150, 4, 18, 7, 'snack', '{"gluten","dairy"}', 'general'),
('Green Tea with Biscuits', 100, 2, 18, 3, 'snack', '{"gluten"}', 'general'),
('Samosa (1 pc)', 180, 4, 22, 9, 'snack', '{"gluten"}', 'vegetarian'),
('Lassi', 150, 6, 22, 4, 'snack', '{"dairy"}', 'vegetarian'),
('Hummus with Carrots', 140, 5, 16, 7, 'snack', '{}', 'vegan'),
('Hard Boiled Egg', 78, 6, 1, 5, 'snack', '{"egg"}', 'general'),
('Dark Chocolate (20g)', 110, 2, 12, 7, 'snack', '{"dairy"}', 'general');
