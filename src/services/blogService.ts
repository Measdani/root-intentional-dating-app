import { supabase } from '@/lib/supabase'
import type { BlogArticle } from '@/types'

export const blogService = {
  async createBlog(blog: BlogArticle): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('blogs')
      .insert({
        id: blog.id,
        title: blog.title,
        content: blog.content,
        module_id: blog.moduleId,
        category: blog.category,
        excerpt: blog.excerpt,
        author: blog.author,
        read_time: blog.readTime,
        published: blog.published,
        created_at: blog.createdAt,
        updated_at: blog.updatedAt,
      })

    if (error) {
      console.warn('Supabase blog write failed:', error.message)
      return { error: error.message }
    }
    return { error: null }
  },

  async getAllBlogs(): Promise<BlogArticle[]> {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.warn('Failed to fetch blogs from Supabase:', error?.message)
      return []
    }
    return data.map(mapRowToBlog)
  },

  async getBlogsByModule(moduleId: string): Promise<BlogArticle[]> {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('module_id', moduleId)
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.warn('Failed to fetch module blogs:', error?.message)
      return []
    }
    return data.map(mapRowToBlog)
  },

  async updateBlog(blogId: string, updates: Partial<BlogArticle>): Promise<boolean> {
    const { error } = await supabase
      .from('blogs')
      .update({
        title: updates.title,
        content: updates.content,
        module_id: updates.moduleId,
        category: updates.category,
        excerpt: updates.excerpt,
        author: updates.author,
        read_time: updates.readTime,
        published: updates.published,
        updated_at: Date.now(),
      })
      .eq('id', blogId)

    if (error) {
      console.warn('Failed to update blog:', error.message)
      return false
    }
    return true
  },

  async deleteBlog(blogId: string): Promise<boolean> {
    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', blogId)

    if (error) {
      console.warn('Failed to delete blog:', error.message)
      return false
    }
    return true
  },
}

function mapRowToBlog(row: any): BlogArticle {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    moduleId: row.module_id,
    category: row.category,
    excerpt: row.excerpt,
    author: row.author,
    readTime: row.read_time,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
