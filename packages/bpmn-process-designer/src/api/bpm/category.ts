// API stub
export interface CategoryVO { id?: number; name?: string; code?: string; sort?: number; status?: number; [k: string]: any }
export const CategoryApi = {
  getCategoryPage: async (params: any) => ({ list: [] as CategoryVO[], total: 0 }),
  getCategoryList: async () => [] as CategoryVO[],
  getCategory: async (id: any) => ({} as CategoryVO),
  createCategory: async (data: any) => ({}),
  updateCategory: async (data: any) => ({}),
  deleteCategory: async (id: any) => ({}),
  updateCategorySort: async (data: any) => ({})
}
