import { supabase } from '@/lib/supabase'
import type { BlogArticle } from '@/types'

export const blogService = {
  async createBlog(blog: BlogArticle): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('blogs')
        .insert({
          id: blog.id,
          title: blog.title,
          content: blog.content,
          module_only: blog.moduleOnly,
          category: blog.category,
          excerpt: blog.excerpt,
          author: blog.author,
          read_time: blog.readTime,
          published: blog.published,
          created_at: blog.createdAt,
          updated_at: blog.updatedAt,
        })

      if (error) {
        console.error('Supabase blog write failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
        })
        return { error: error.message }
      }
      console.log('Blog successfully saved to Supabase:', blog.id)
      return { error: null }
    } catch (e: any) {
      console.error('Unexpected error creating blog:', e)
      return { error: e.message || 'Unknown error' }
    }
  },

  async getAllBlogs(): Promise<BlogArticle[]> {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch blogs from Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
        })
        return []
      }

      if (!data) {
        console.warn('No data returned from Supabase blogs query')
        return []
      }

      console.log(`Successfully loaded ${data.length} published blogs from Supabase`)
      return data.map(mapRowToBlog)
    } catch (e: any) {
      console.error('Unexpected error fetching blogs:', e)
      return []
    }
  },

  async getBlogsByIds(blogIds: string[]): Promise<BlogArticle[]> {
    if (!blogIds.length) return []
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .in('id', blogIds)
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
        module_only: updates.moduleOnly,
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
    moduleOnly: row.module_only,
    category: row.category,
    excerpt: row.excerpt,
    author: row.author,
    readTime: row.read_time,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
