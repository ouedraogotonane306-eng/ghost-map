import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    if (supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
      return () => subscription.unsubscribe()
    } else {
      console.error("Supabase 未初始化");
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('❌ 拒绝访问: ' + error.message)
    else { setEmail(''); setPassword(''); }
    setAuthLoading(false)
    return !error
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    alert('已安全断开连接。')
  }

  return { session, email, setEmail, password, setPassword, authLoading, handleLogin, handleLogout }
}
