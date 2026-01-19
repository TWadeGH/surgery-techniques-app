import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1Zm55Z2pka2RlbWFjcWJ4Y3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDg2NDEsImV4cCI6MjA4NDI4NDY0MX0.1NMNpLOQYBfs371lLxQf14APj7HrtSvbUmmbJiZG-tM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)