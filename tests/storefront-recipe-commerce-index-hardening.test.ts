import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const paths=[
  'supabase/migrations/20260912222500_recipe_commerce_fk_index_hardening.sql',
  'supabase/customer-baseline/migrations/0021_recipe_commerce_fk_index_hardening.sql',
] as const;

const requiredIndexes=[
  'recipe_definitions_created_by_idx',
  'recipe_definitions_updated_by_idx',
  'recipe_ingredient_mappings_recipe_ingredient_fk_idx',
  'recipe_ingredient_mappings_product_instance_fk_idx',
  'recipe_ingredient_mappings_variant_product_instance_fk_idx',
] as const;

describe('Recipe Commerce FK index hardening',()=>{
  it('keeps production and customer-baseline hardening equivalent',()=>{
    for(const path of paths){
      const sql=readFileSync(path,'utf8');
      for(const index of requiredIndexes)expect(sql).toContain(index);
      expect(sql).toContain('drop index if exists public.recipe_food_claims_recipe_idx');
    }
  });
});
